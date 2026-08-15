#!/usr/bin/env tsx
/**
 * Bounded backfill of one lore.kernel.org mailing list via a local git
 * mirror (see @lkmlens/lore-client — HTTP scraping is disallowed by
 * lore.kernel.org/robots.txt, so this uses the officially-sanctioned
 * git-mirroring path instead).
 *
 * Idempotent and incremental: tracks the last-processed git commit SHA in
 * collection_checkpoints, so re-running only pulls in new messages.
 *
 * KNOWN LIMITATION: thread grouping (@lkmlens/thread-builder) only sees the
 * messages fetched in the *current* run. A reply arriving in a later run
 * whose parent was ingested in an earlier run will not be attached to the
 * existing thread — it will start a new "partial-confidence" thread of its
 * own. Merging incremental replies into existing threads is not yet
 * implemented; this script is scoped to prove one-source ingestion
 * end-to-end (docs/PLANNING.md section 24 item 8), not continuous
 * collection (that's the collector/indexer Workers' job, still stubs).
 *
 * Usage:
 *   tsx scripts/backfill.ts --inbox rust-for-linux --local
 *   tsx scripts/backfill.ts --inbox rust-for-linux --epoch 0 --max 200 --remote
 */

import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseMessage, type ParsedMessage } from "@lkmlens/mail-parser";
import { syncMirror, readMirrorCommits } from "@lkmlens/lore-client";
import {
  buildThreads,
  dedupeByMessageId,
  extractFilePaths,
  extractReviewSignals,
  extractRevisionNotes,
  makeSeriesKey,
  parsePatchInfo,
  summarizeFileChanges,
  type ThreadDraft,
} from "@lkmlens/thread-builder";
import { classifyMessage, type TopicRuleSet } from "@lkmlens/classifier";
import { execD1File, parseD1Target, queryD1, sqlNumber, sqlString, type D1Target } from "./lib/d1.js";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIRROR_BASE_DIR = join(REPO_ROOT, ".data", "mirrors");
const DEFAULT_MAX_INITIAL_MESSAGES = 200;
const DEFAULT_SHALLOW_SINCE_DAYS = 30;
// Some patch emails carry huge diffs or embedded binary blobs (seen up to
// ~450KB raw on dri-devel) that trip D1/SQLite's per-statement size limit
// ("statement too long: SQLITE_TOOBIG") and add little FTS relevance beyond
// this point anyway. Large raw bodies are a good fit for R2 later
// (docs/PLANNING.md section 7.7); for now, cap what goes into D1.
const MAX_BODY_CHARS = 20_000;

interface Args {
  inbox: string;
  epoch: number;
  target: D1Target;
  max: number;
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i === -1 ? undefined : argv[i + 1];
  };
  const inbox = get("--inbox");
  if (!inbox) {
    console.error("Usage: tsx scripts/backfill.ts --inbox <list> [--epoch 0] [--max 200] --local|--remote");
    process.exit(1);
  }
  return {
    inbox,
    epoch: Number(get("--epoch") ?? "0"),
    target: parseD1Target(argv),
    max: Number(get("--max") ?? DEFAULT_MAX_INITIAL_MESSAGES),
  };
}

function sourceUrl(mailingList: string | null, messageId: string, fallbackInbox: string): string {
  const list = mailingList ?? fallbackInbox;
  return `https://lore.kernel.org/${list}/${messageId}/`;
}

function emailHash(email: string | undefined | null): string | null {
  if (!email) return null;
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 32);
}

function messageType(parsed: ParsedMessage, isThreadRoot: boolean): string {
  const info = parsePatchInfo(parsed.subject);
  if (info.isCoverLetter) return "cover_letter";
  if (info.threadType === "patch" || info.threadType === "rfc") return "patch";
  if (!isThreadRoot) return "reply";
  return "unknown";
}

function buildThreadSql(thread: ThreadDraft, inbox: string): string {
  return `
INSERT INTO threads (
  root_message_id, canonical_subject, display_subject, mailing_list, thread_type,
  patch_version, patch_total, author_name, source_url, first_posted_at, last_activity_at,
  message_count, summary_state, root_confidence
) VALUES (
  ${sqlString(thread.rootMessageId)}, ${sqlString(thread.canonicalSubject)}, ${sqlString(thread.displaySubject)},
  ${sqlString(thread.mailingList)}, ${sqlString(thread.threadType)}, ${sqlNumber(thread.patchVersion)},
  ${sqlNumber(thread.patchTotal)}, ${sqlString(thread.authorName)},
  ${sqlString(sourceUrl(thread.mailingList, thread.rootMessageId, inbox))},
  ${sqlString(thread.firstPostedAt)}, ${sqlString(thread.lastActivityAt)}, 0, 'pending',
  ${sqlString(thread.rootConfidence)}
)
ON CONFLICT(root_message_id) DO UPDATE SET
  root_confidence = CASE WHEN excluded.root_confidence = 'complete' THEN 'complete' ELSE threads.root_confidence END;`;
}

function truncateBody(bodyText: string): string {
  if (bodyText.length <= MAX_BODY_CHARS) return bodyText;
  return `${bodyText.slice(0, MAX_BODY_CHARS)}\n\n[... truncated, ${bodyText.length - MAX_BODY_CHARS} more characters]`;
}

function buildMessageSql(
  parsed: ParsedMessage,
  rootMessageId: string,
  isThreadRoot: boolean,
  inbox: string,
  rawObjectKey: string | null,
): string {
  const body = truncateBody(parsed.bodyText);
  const checksum = createHash("sha256").update(body).digest("hex");
  const patch = parsePatchInfo(parsed.subject);
  return `
INSERT INTO messages (
  message_id, thread_id, parent_message_id, subject, canonical_subject, author_name,
  author_email_hash, mailing_list, message_type, posted_at, source_url, body_text,
  body_checksum, raw_object_key, patch_index, patch_total
) VALUES (
  ${sqlString(parsed.messageId)},
  (SELECT id FROM threads WHERE root_message_id = ${sqlString(rootMessageId)}),
  ${sqlString(parsed.inReplyTo)}, ${sqlString(parsed.subject)}, ${sqlString(parsed.subject)},
  ${sqlString(parsed.from?.name ?? parsed.from?.email ?? null)}, ${sqlString(emailHash(parsed.from?.email))},
  ${sqlString(parsed.mailingList)}, ${sqlString(messageType(parsed, isThreadRoot))}, ${sqlString(parsed.postedAt)},
  ${sqlString(sourceUrl(parsed.mailingList, parsed.messageId, inbox))}, ${sqlString(body)}, ${sqlString(checksum)}, ${sqlString(rawObjectKey)},
  ${sqlNumber(patch.patchIndex)}, ${sqlNumber(patch.patchTotal)}
)
ON CONFLICT(message_id) DO NOTHING;`;
}

function buildReviewSignalSql(parsed: ParsedMessage, rootMessageId: string, inbox: string): string[] {
  return extractReviewSignals(parsed.bodyText).map((signal) => `
INSERT INTO review_signals (
  thread_id, message_id, signal_type, person_name, person_email_hash, source_url
) VALUES (
  (SELECT id FROM threads WHERE root_message_id = ${sqlString(rootMessageId)}),
  ${sqlString(parsed.messageId)}, ${sqlString(signal.type)}, ${sqlString(signal.personName)},
  ${sqlString(emailHash(signal.email))}, ${sqlString(sourceUrl(parsed.mailingList, parsed.messageId, inbox))}
)
ON CONFLICT(message_id, signal_type, person_name) DO NOTHING;`);
}

function buildSeriesSql(thread: ThreadDraft, root: ParsedMessage, changeNotes: string | null): string[] {
  if (thread.patchVersion == null) return [];
  const key = makeSeriesKey(root.subject);
  return [
    `INSERT INTO patch_series (series_key, canonical_subject, latest_version, latest_thread_id)
VALUES (
  ${sqlString(key)}, ${sqlString(thread.canonicalSubject)}, ${thread.patchVersion},
  (SELECT id FROM threads WHERE root_message_id = ${sqlString(thread.rootMessageId)})
)
ON CONFLICT(series_key) DO UPDATE SET
  latest_version = MAX(COALESCE(patch_series.latest_version, 0), excluded.latest_version),
  latest_thread_id = CASE
    WHEN excluded.latest_version >= COALESCE(patch_series.latest_version, 0) THEN excluded.latest_thread_id
    ELSE patch_series.latest_thread_id END;`,
    `INSERT INTO patch_revisions (series_id, version, thread_id, change_notes)
VALUES (
  (SELECT id FROM patch_series WHERE series_key = ${sqlString(key)}), ${thread.patchVersion},
  (SELECT id FROM threads WHERE root_message_id = ${sqlString(thread.rootMessageId)}),
  ${sqlString(changeNotes)}
)
ON CONFLICT(series_id, version) DO UPDATE SET
  thread_id = excluded.thread_id,
  change_notes = COALESCE(excluded.change_notes, patch_revisions.change_notes);`,
  ];
}

function buildThreadStatsSql(rootMessageId: string): string {
  return `UPDATE threads SET
  first_posted_at = (SELECT MIN(posted_at) FROM messages WHERE thread_id = threads.id),
  last_activity_at = (SELECT MAX(posted_at) FROM messages WHERE thread_id = threads.id),
  message_count = (SELECT COUNT(*) FROM messages WHERE thread_id = threads.id),
  summary_state = CASE WHEN summary_state = 'generated' THEN 'stale' ELSE summary_state END
WHERE root_message_id = ${sqlString(rootMessageId)};`;
}

function buildThreadTopicSql(rootMessageId: string, topicSlug: string, score: number, matchedBy: string[]): string {
  return `
INSERT INTO thread_topics (thread_id, topic_id, score, matched_by_json, is_manual)
VALUES (
  (SELECT id FROM threads WHERE root_message_id = ${sqlString(rootMessageId)}),
  (SELECT id FROM topics WHERE slug = ${sqlString(topicSlug)}),
  ${score}, ${sqlString(JSON.stringify(matchedBy))}, 0
)
ON CONFLICT(thread_id, topic_id) DO UPDATE SET
  score = excluded.score, matched_by_json = excluded.matched_by_json
WHERE thread_topics.is_manual = 0;`;
}

const SYNC_FTS_SQL = `
INSERT INTO message_search (rowid, subject, body_text, author_name, mailing_list, topic_names)
SELECT m.id, m.subject, substr(m.body_text, 1, 1024), m.author_name, m.mailing_list,
  (SELECT group_concat(tp.name, ', ') FROM thread_topics tt JOIN topics tp ON tp.id = tt.topic_id WHERE tt.thread_id = m.thread_id)
FROM messages m
WHERE NOT EXISTS (SELECT 1 FROM message_search WHERE rowid = m.id);`;

interface CheckpointRow {
  cursor: string | null;
}

// D1 rejects any single SQL statement over 100 KB with
// "statement too long: SQLITE_TOOBIG [code: 7500]". A large incremental batch
// (e.g. a high-volume list whose checkpoint fell days behind) can reference
// several thousand message-ids, so the known-roots lookup is chunked to keep
// each IN (...) statement well under that limit rather than sending one giant
// query. ~50 bytes/id means 400 ids is ~22 KB — comfortably safe.
const KNOWN_ROOTS_ID_CHUNK = 400;

function fetchKnownRoots(target: D1Target, messages: ParsedMessage[]): Map<string, string> {
  const ids = new Set<string>();
  for (const message of messages) {
    ids.add(message.messageId);
    if (message.inReplyTo) ids.add(message.inReplyTo);
    for (const reference of message.references) ids.add(reference);
  }
  if (ids.size === 0) return new Map();

  const known = new Map<string, string>();
  const allIds = Array.from(ids);
  for (let start = 0; start < allIds.length; start += KNOWN_ROOTS_ID_CHUNK) {
    const chunk = allIds.slice(start, start + KNOWN_ROOTS_ID_CHUNK);
    const rows = queryD1<{ message_id: string; root_message_id: string }>(
      `SELECT m.message_id, t.root_message_id
       FROM messages m JOIN threads t ON t.id = m.thread_id
       WHERE m.message_id IN (${chunk.map(sqlString).join(",")})`,
      target,
    );
    for (const row of rows) known.set(row.message_id, row.root_message_id);
  }
  return known;
}

function inferChangeNotes(target: D1Target, thread: ThreadDraft, root: ParsedMessage): string | null {
  const authored = extractRevisionNotes(root.bodyText);
  if (authored || thread.patchVersion == null || thread.patchVersion <= 1) return authored;

  const key = makeSeriesKey(root.subject);
  const previous = queryD1<{ body_text: string }>(
    `SELECT m.body_text FROM patch_series ps
     JOIN patch_revisions pr ON pr.series_id = ps.id
     JOIN threads t ON t.id = pr.thread_id
     JOIN messages m ON m.message_id = t.root_message_id
     WHERE ps.series_key = ${sqlString(key)} AND pr.version < ${thread.patchVersion}
     ORDER BY pr.version DESC LIMIT 1`,
    target,
  )[0];
  return previous ? summarizeFileChanges(extractFilePaths(previous.body_text), extractFilePaths(root.bodyText)) : null;
}

function fetchTopicRuleSets(target: D1Target): TopicRuleSet[] {
  const rows = queryD1<{
    topic_slug: string;
    rule_type: TopicRuleSet["rules"][number]["ruleType"];
    pattern: string;
    weight: number;
    is_negative: number;
  }>(
    `SELECT t.slug AS topic_slug, r.rule_type, r.pattern, r.weight, r.is_negative
     FROM topic_rules r JOIN topics t ON t.id = r.topic_id
     WHERE t.enabled = 1 AND r.enabled = 1`,
    target,
  );

  const bySlug = new Map<string, TopicRuleSet>();
  for (const row of rows) {
    const set = bySlug.get(row.topic_slug) ?? { topicSlug: row.topic_slug, rules: [] };
    set.rules.push({
      id: 0,
      topicId: 0,
      ruleType: row.rule_type,
      pattern: row.pattern,
      weight: row.weight,
      isNegative: row.is_negative === 1,
      enabled: true,
    });
    bySlug.set(row.topic_slug, set);
  }
  return Array.from(bySlug.values());
}

function main() {
  const args = parseArgs(process.argv);
  const sourceKey = `${args.inbox}/${args.epoch}`;
  const shallowSince = new Date(Date.now() - DEFAULT_SHALLOW_SINCE_DAYS * 86400_000)
    .toISOString()
    .slice(0, 10);

  console.log(`Syncing mirror for ${args.inbox} epoch ${args.epoch} ...`);
  const { path: mirrorDir, created } = syncMirror(
    MIRROR_BASE_DIR,
    { inbox: args.inbox, epoch: args.epoch },
    { shallowSince },
  );
  console.log(created ? `Cloned to ${mirrorDir}` : `Fetched updates into ${mirrorDir}`);

  const checkpoint = queryD1<CheckpointRow>(
    `SELECT cursor FROM collection_checkpoints WHERE source_key = ${sqlString(sourceKey)}`,
    args.target,
  )[0];

  const commits = readMirrorCommits(mirrorDir, {
    sinceSha: checkpoint?.cursor ?? undefined,
    maxCount: checkpoint?.cursor ? undefined : args.max,
  });

  if (commits.length === 0) {
    console.log("No new commits since last checkpoint. Nothing to do.");
    return;
  }
  console.log(`Found ${commits.length} new commit(s).`);

  const parsedByMessageId = new Map<string, ParsedMessage>();
  const rawObjectKeyByMessageId = new Map<string, string>();
  let lastSha = checkpoint?.cursor ?? null;
  for (const commit of commits) {
    const parsed = parseMessage(commit.raw);
    if (!parsed.messageId) {
      console.warn(`Skipping commit ${commit.sha}: no Message-ID`);
      continue;
    }
    parsedByMessageId.set(parsed.messageId, parsed);
    // The git mirror retains the full RFC822 object even when the searchable
    // D1 body is truncated. This key is rebuildable and can later be copied
    // to R2 without changing canonical message records.
    rawObjectKeyByMessageId.set(parsed.messageId, `lore-git://${args.inbox}/${args.epoch}/${commit.sha}`);
    lastSha = commit.sha;
  }

  const messages = dedupeByMessageId(Array.from(parsedByMessageId.values()));
  const knownRoots = fetchKnownRoots(args.target, messages);
  const newMessages = messages.filter((message) => !knownRoots.has(message.messageId));
  const { threads, assignments } = buildThreads(newMessages, { knownRootByMessageId: knownRoots });
  const assignmentByMessageId = new Map(assignments.map((item) => [item.messageId, item.rootMessageId]));
  const topicRuleSets = fetchTopicRuleSets(args.target);

  console.log(`Parsed ${messages.length} message(s); ${newMessages.length} new message(s) in ${threads.length} new thread(s).`);

  const statements: string[] = [];
  let lastMessageAt: string | null = null;

  for (const thread of threads) {
    statements.push(buildThreadSql(thread, args.inbox));
  }

  for (const parsed of newMessages) {
    const rootMessageId = assignmentByMessageId.get(parsed.messageId);
    if (!rootMessageId) continue;
    statements.push(buildMessageSql(
      parsed,
      rootMessageId,
      parsed.messageId === rootMessageId,
      args.inbox,
      rawObjectKeyByMessageId.get(parsed.messageId) ?? null,
    ));
    statements.push(...buildReviewSignalSql(parsed, rootMessageId, args.inbox));
    if (parsed.postedAt && (!lastMessageAt || parsed.postedAt > lastMessageAt)) {
      lastMessageAt = parsed.postedAt;
    }
  }

  for (const thread of threads) {
    const rootMessage = parsedByMessageId.get(thread.rootMessageId);
    if (rootMessage) {
      const matches = classifyMessage(
        { subject: rootMessage.subject, mailingList: rootMessage.mailingList, bodyText: rootMessage.bodyText },
        topicRuleSets,
      );
      for (const match of matches) {
        statements.push(buildThreadTopicSql(thread.rootMessageId, match.topic, match.score, match.matchedBy));
      }
      statements.push(...buildSeriesSql(thread, rootMessage, inferChangeNotes(args.target, thread, rootMessage)));
    }
  }

  for (const rootMessageId of new Set(assignments.map((item) => item.rootMessageId))) {
    statements.push(buildThreadStatsSql(rootMessageId));
  }

  statements.push(`
INSERT INTO collection_checkpoints (source_key, last_message_at, cursor, last_success_at, failure_count, last_error)
VALUES (${sqlString(sourceKey)}, ${sqlString(lastMessageAt)}, ${sqlString(lastSha)}, CURRENT_TIMESTAMP, 0, NULL)
ON CONFLICT(source_key) DO UPDATE SET
  last_message_at = excluded.last_message_at, cursor = excluded.cursor,
  last_success_at = excluded.last_success_at, failure_count = 0, last_error = NULL;`);

  statements.push(SYNC_FTS_SQL);

  execD1File(statements.join("\n"), args.target, `Ingesting ${newMessages.length} new message(s)`);
  console.log("Done.");
}

main();
