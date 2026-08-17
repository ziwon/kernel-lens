#!/usr/bin/env tsx

import type { BlogPostContent, BlogPostSource } from "@lkmlens/shared";
import { execD1File, parseD1Target, queryD1, sqlString } from "./lib/d1.js";

interface BlogDraftRow {
  id: number;
  post_type: "weekly" | "briefing";
  period_key: string | null;
  slug: string;
  language: string;
  title: string;
  dek: string;
  content_json: string;
  sources_json: string;
  provider: string;
  model: string;
  status: string;
  generated_at: string;
  published_at: string | null;
}

function argument(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function renderParagraph(text: string, sourceIds: string[]): string {
  return `${text} ${sourceIds.map((id) => `[${id}]`).join(" ")}`;
}

function main(): void {
  const command = process.argv[2];
  if (command !== "preview" && command !== "publish") {
    console.error("Usage: manage-blog-post.ts preview|publish (--week YYYY-Www | --slug article-slug) --local|--remote");
    process.exit(1);
  }
  const periodKey = argument("--week");
  const slug = argument("--slug");
  if ((periodKey ? 1 : 0) + (slug ? 1 : 0) !== 1) {
    console.error("Select exactly one post with --week or --slug");
    process.exit(1);
  }
  if (periodKey && !/^\d{4}-W\d{2}$/.test(periodKey)) {
    console.error("--week must use ISO week format YYYY-Www");
    process.exit(1);
  }
  if (slug && !/^[a-z0-9-]{1,160}$/.test(slug)) {
    console.error("--slug must contain only lowercase letters, numbers, and hyphens");
    process.exit(1);
  }
  const target = parseD1Target(process.argv);
  const selector = periodKey
    ? `post_type = 'weekly' AND period_key = ${sqlString(periodKey)}`
    : `slug = ${sqlString(slug)}`;
  const label = periodKey ?? slug!;
  const rows = queryD1<BlogDraftRow>(
    `SELECT id, post_type, period_key, slug, language, title, dek, content_json, sources_json,
            provider, model, status, generated_at, published_at
     FROM blog_posts WHERE ${selector}`,
    target,
  );
  const row = rows[0];
  if (!row) {
    console.error(`No blog post exists for ${label}.`);
    process.exit(1);
  }

  if (command === "publish") {
    if (row.status !== "draft") {
      console.error(`Only drafts can be published; ${label} is ${row.status}.`);
      process.exit(1);
    }
    execD1File(
      `UPDATE blog_posts SET status = 'published', published_at = CURRENT_TIMESTAMP
       WHERE id = ${row.id} AND status = 'draft';`,
      target,
      `Publishing ${label}`,
    );
    console.log(`Published /blog/${row.slug}`);
    return;
  }

  const content = JSON.parse(row.content_json) as BlogPostContent;
  const sources = JSON.parse(row.sources_json) as BlogPostSource[];
  console.log(`# ${row.title}\n\n${content.dek}\n`);
  console.log(renderParagraph(content.lead.text, content.lead.sourceIds));
  for (const section of content.sections) {
    console.log(`\n## ${section.heading}\n`);
    for (const paragraph of section.paragraphs) {
      console.log(`${renderParagraph(paragraph.text, paragraph.sourceIds)}\n`);
    }
  }
  console.log("\n## What to watch\n");
  for (const item of content.watchItems) console.log(`- ${renderParagraph(item.text, item.sourceIds)}`);
  console.log("\n## Sources\n");
  for (const source of sources) console.log(`- [${source.sourceId}] ${source.subject}: ${source.sourceUrl}`);
  console.log(`\nType: ${row.post_type} · Status: ${row.status} · ${row.provider}/${row.model} · generated ${row.generated_at}`);
}

main();
