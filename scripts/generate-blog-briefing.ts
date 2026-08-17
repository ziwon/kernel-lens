#!/usr/bin/env tsx

import { generatePatchBriefing, type PatchBriefingEvidence } from "@lkmlens/ai";
import type { BlogPostLanguage, BlogPostSource } from "@lkmlens/shared";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { createGrokBlogProvider } from "../workers/blog/src/providers/grok.js";
import {
  execD1File,
  parseD1Target,
  queryD1,
  sqlNumber,
  sqlString,
} from "./lib/d1.js";

interface EvidenceRow {
  thread_id: number;
  series_id: number | null;
  patch_version: number | null;
  display_subject: string;
  message_id: string;
  subject: string;
  source_url: string;
  author_name: string | null;
  posted_at: string | null;
  message_type: string | null;
  body_text: string | null;
}

function argument(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function dequoteReply(body: string): string {
  return body
    .split("\n")
    .filter((line) => !line.trimStart().startsWith(">"))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function evidenceExcerpt(row: EvidenceRow): string {
  const body = row.body_text?.trim() ?? "";
  if (!body) return row.subject;
  if (/^Re:/i.test(row.subject)) return dequoteReply(body).slice(0, 8_000);
  const diffIndex = body.indexOf("\ndiff --git ");
  return (diffIndex >= 0 ? body.slice(0, diffIndex) : body).trim().slice(0, 14_000);
}

function language(value: string | undefined): BlogPostLanguage {
  if (value === undefined || value === "en") return "en";
  if (value === "ko") return "ko";
  throw new Error(`Unsupported BLOG_LANGUAGE: ${value}`);
}

async function main(): Promise<void> {
  if (existsSync(".env")) loadEnvFile(".env");

  const target = parseD1Target(process.argv);
  const threadId = Number(argument("--thread"));
  const slug = argument("--slug");
  const replaceExisting = process.argv.includes("--replace");
  if (!Number.isInteger(threadId) || threadId <= 0) {
    throw new Error("--thread must be a positive Kernel Lens thread ID");
  }
  if (!slug || !/^[a-z0-9-]{1,160}$/.test(slug)) {
    throw new Error("--slug must contain only lowercase letters, numbers, and hyphens");
  }

  const existing = queryD1<{ status: string }>(
    `SELECT status FROM blog_posts WHERE slug = ${sqlString(slug)}`,
    target,
  )[0];
  if (existing && !replaceExisting) {
    throw new Error(`A ${existing.status} blog post already uses slug ${slug}; pass --replace to regenerate it`);
  }

  const rows = queryD1<EvidenceRow>(
    `SELECT t.id AS thread_id,
            pr.series_id AS series_id,
            t.patch_version AS patch_version,
            t.display_subject AS display_subject,
            m.message_id AS message_id,
            m.subject AS subject,
            m.source_url AS source_url,
            m.author_name AS author_name,
            m.posted_at AS posted_at,
            m.message_type AS message_type,
            m.body_text AS body_text
     FROM threads t
     JOIN messages m ON m.thread_id = t.id
     LEFT JOIN patch_revisions pr ON pr.thread_id = t.id
     WHERE t.id = ${threadId}
     ORDER BY m.posted_at ASC, m.id ASC`,
    target,
  );
  if (rows.length < 2) throw new Error(`Thread ${threadId} does not have enough indexed evidence`);

  const evidence: PatchBriefingEvidence[] = rows
    .map((row, index) => ({
      sourceId: `s${index + 1}`,
      threadId: row.thread_id,
      messageId: row.message_id,
      subject: row.subject,
      sourceUrl: row.source_url,
      authorName: row.author_name,
      postedAt: row.posted_at,
      messageType: row.message_type,
      excerpt: evidenceExcerpt(row),
    }))
    .filter((source) => source.excerpt.length > 0);
  if (evidence.length < 2) throw new Error(`Thread ${threadId} has fewer than two usable messages`);

  const apiKey = process.env.BLOG_AI_API_KEY;
  if (!apiKey) throw new Error("BLOG_AI_API_KEY is required in .env or the process environment");
  const model = process.env.BLOG_AI_MODEL?.trim() || "grok-4.6";
  const articleLanguage = language(process.env.BLOG_LANGUAGE);
  const now = new Date().toISOString();
  const evidenceCutoff = now.slice(0, 10);
  const first = rows[0]!;
  const provider = createGrokBlogProvider(apiKey, model);
  const generated = await generatePatchBriefing(provider, {
    threadId,
    seriesId: first.series_id,
    patchVersion: first.patch_version,
    subject: first.display_subject,
    evidenceCutoff,
  }, evidence, articleLanguage);

  const usedSourceIds = new Set([
    ...generated.content.lead.sourceIds,
    ...generated.content.sections.flatMap((section) =>
      section.paragraphs.flatMap((paragraph) => paragraph.sourceIds)),
    ...generated.content.watchItems.flatMap((item) => item.sourceIds),
  ]);
  const sources: BlogPostSource[] = evidence
    .filter((source) => usedSourceIds.has(source.sourceId))
    .map((source) => ({
      sourceId: source.sourceId,
      threadId: source.threadId,
      messageId: source.messageId,
      subject: source.subject,
      sourceUrl: source.sourceUrl,
      evidenceUrls: [source.sourceUrl],
      authorName: source.authorName,
      postedAt: source.postedAt,
    }));

  const replaceClause = replaceExisting
    ? `DO UPDATE SET
         post_type = excluded.post_type,
         period_key = NULL,
         language = excluded.language,
         title = excluded.title,
         dek = excluded.dek,
         content_json = excluded.content_json,
         sources_json = excluded.sources_json,
         source_digest_id = NULL,
         series_id = excluded.series_id,
         evidence_cutoff = excluded.evidence_cutoff,
         last_verified_at = excluded.last_verified_at,
         source_thread_ids_json = excluded.source_thread_ids_json,
         provider = excluded.provider,
         model = excluded.model,
         prompt_version = excluded.prompt_version,
         input_tokens = excluded.input_tokens,
         output_tokens = excluded.output_tokens,
         status = 'draft',
         generated_at = CURRENT_TIMESTAMP,
         published_at = NULL`
    : "DO NOTHING";
  execD1File(
    `INSERT INTO blog_posts (
       post_type, period_key, slug, language, title, dek, content_json, sources_json,
       source_digest_id, series_id, evidence_cutoff, last_verified_at,
       source_thread_ids_json, provider, model, prompt_version,
       input_tokens, output_tokens, status
     ) VALUES (
       'briefing', NULL, ${sqlString(slug)}, ${sqlString(articleLanguage)},
       ${sqlString(generated.title)}, ${sqlString(generated.content.dek)},
       ${sqlString(JSON.stringify(generated.content))}, ${sqlString(JSON.stringify(sources))},
       NULL, ${sqlNumber(first.series_id)}, ${sqlString(evidenceCutoff)}, ${sqlString(now)},
       ${sqlString(JSON.stringify([threadId]))}, 'xai-grok', ${sqlString(generated.model)},
       ${sqlString(generated.promptVersion)}, ${generated.inputTokens}, ${generated.outputTokens}, 'draft'
     )
     ON CONFLICT(slug) ${replaceClause};`,
    target,
    `Saving Patch Briefing draft ${slug}`,
  );
  console.log(JSON.stringify({
    event: replaceExisting ? "briefing_draft_regenerated" : "briefing_draft_generated",
    slug,
    threadId,
    seriesId: first.series_id,
    evidenceCutoff,
    model,
    inputTokens: generated.inputTokens,
    outputTokens: generated.outputTokens,
  }));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
