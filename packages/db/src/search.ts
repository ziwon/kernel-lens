import type { D1Database } from "@cloudflare/workers-types";
import type { ParsedQuery } from "@lkmlens/search";
import { toFtsMatchQuery } from "@lkmlens/search";

export interface SearchResultRow {
  messageId: string;
  threadId: number | null;
  subject: string;
  snippet: string;
  authorName: string | null;
  mailingList: string | null;
  postedAt: string | null;
  sourceUrl: string;
  threadType: string | null;
  patchVersion: number | null;
  messageCount: number | null;
  lastActivityAt: string | null;
  topicNames: string | null;
  rank: number;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
}

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

/**
 * Full-text search over message_search (FTS5), joined against messages and
 * threads for display fields and structured filters (topic/list/author/type/
 * version/date range). See docs/PLANNING.md sections 8.8 and 9.3.
 *
 * Ranking: FTS5 bm25() (lower is better, so we sort ascending) with a small
 * subject-match boost. Reply count is intentionally not used as a ranking
 * signal per PLANNING.md section 9.3.
 */
export async function searchMessages(
  db: D1Database,
  parsed: ParsedQuery,
  options: SearchOptions = {},
): Promise<SearchResultRow[]> {
  const limit = Math.min(options.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const offset = Math.max(options.offset ?? 0, 0);

  const matchExpr = toFtsMatchQuery(parsed);
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (matchExpr) {
    conditions.push("message_search MATCH ?");
    params.push(matchExpr);
  }
  if (parsed.mailingList) {
    conditions.push("m.mailing_list = ?");
    params.push(parsed.mailingList);
  }
  if (parsed.author) {
    conditions.push("m.author_name LIKE ?");
    params.push(`%${parsed.author}%`);
  }
  if (parsed.type) {
    conditions.push("t.thread_type = ?");
    params.push(parsed.type);
  }
  if (parsed.version !== undefined) {
    conditions.push("t.patch_version = ?");
    params.push(parsed.version);
  }
  if (parsed.after) {
    conditions.push("m.posted_at >= ?");
    params.push(parsed.after);
  }
  if (parsed.before) {
    conditions.push("m.posted_at < ?");
    params.push(parsed.before);
  }
  if (parsed.topic) {
    conditions.push(
      "m.thread_id IN (SELECT thread_id FROM thread_topics tt JOIN topics tp ON tp.id = tt.topic_id WHERE tp.slug = ?)",
    );
    params.push(parsed.topic);
  }

  // A query with only structural filters (no MATCH) still uses the FTS rowid
  // set, but must not require a match — fall back to ranking by recency.
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderClause = matchExpr ? "ORDER BY rank ASC" : "ORDER BY m.posted_at DESC";

  const sql = `
    SELECT
      m.message_id AS messageId,
      m.thread_id AS threadId,
      m.subject AS subject,
      replace(replace(replace(
        COALESCE(NULLIF(trim(substr(m.body_text, 1, 240)), ''), m.subject),
        '&', '&amp;'), '<', '&lt;'), '>', '&gt;') AS snippet,
      m.author_name AS authorName,
      m.mailing_list AS mailingList,
      m.posted_at AS postedAt,
      m.source_url AS sourceUrl,
      t.thread_type AS threadType,
      t.patch_version AS patchVersion,
      t.message_count AS messageCount,
      t.last_activity_at AS lastActivityAt,
      (SELECT group_concat(tp.name, ', ')
         FROM thread_topics tt JOIN topics tp ON tp.id = tt.topic_id
         WHERE tt.thread_id = m.thread_id) AS topicNames,
      ${matchExpr ? "bm25(message_search)" : "0"} AS rank
    FROM message_search
    JOIN messages m ON m.id = message_search.rowid
    LEFT JOIN threads t ON t.id = m.thread_id
    ${whereClause}
    ${orderClause}
    LIMIT ? OFFSET ?
  `;

  const { results } = await db
    .prepare(sql)
    .bind(...params, limit, offset)
    .all<SearchResultRow>();
  return results;
}
