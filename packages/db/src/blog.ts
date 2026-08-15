import type { D1Database } from "@cloudflare/workers-types";
import type {
  BlogPost,
  BlogPostContent,
  BlogPostLanguage,
  BlogPostListItem,
  BlogPostSource,
  BlogPostStatus,
  Digest,
  DigestContent,
} from "@lkmlens/shared";

interface BlogPostRow {
  id: number;
  period_key: string;
  slug: string;
  language: BlogPostLanguage;
  title: string;
  dek: string;
  content_json: string;
  sources_json: string;
  source_digest_id: number;
  source_thread_ids_json: string;
  provider: string;
  model: string;
  prompt_version: string;
  input_tokens: number;
  output_tokens: number;
  status: BlogPostStatus;
  generated_at: string;
  published_at: string | null;
  updated_at: string;
}

function rowToListItem(row: BlogPostRow): BlogPostListItem {
  return {
    id: row.id,
    periodKey: row.period_key,
    slug: row.slug,
    language: row.language,
    title: row.title,
    dek: row.dek,
    sourceThreadIds: JSON.parse(row.source_thread_ids_json) as number[],
    publishedAt: row.published_at,
  };
}

function rowToBlogPost(row: BlogPostRow): BlogPost {
  return {
    ...rowToListItem(row),
    content: JSON.parse(row.content_json) as BlogPostContent,
    sources: JSON.parse(row.sources_json) as BlogPostSource[],
    sourceDigestId: row.source_digest_id,
    provider: row.provider,
    model: row.model,
    promptVersion: row.prompt_version,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    status: row.status,
    generatedAt: row.generated_at,
    updatedAt: row.updated_at,
  };
}

const BLOG_POST_COLUMNS = `id, period_key, slug, language, title, dek, content_json, sources_json,
  source_digest_id, source_thread_ids_json, provider, model, prompt_version, input_tokens,
  output_tokens, status, generated_at, published_at, updated_at`;

export interface BlogCandidateDetailRow {
  threadId: number;
  seriesId: number | null;
  patchVersion: number | null;
  vendorsJson: string;
  affectedLayersJson: string;
  likelyStakeholdersJson: string;
  suggestedAction: string | null;
  explicitReviewCount: number;
  maintainerTreeUrl: string | null;
  mainlineCommitUrl: string | null;
  linuxVersion: string | null;
  stableVersionsJson: string;
  androidCommonBranchesJson: string;
  lifecycleSourceUrlsJson: string;
  sourceExcerpt: string | null;
}

export async function listBlogCandidateDetails(
  db: D1Database,
  threadIds: number[],
): Promise<BlogCandidateDetailRow[]> {
  const ids = Array.from(new Set(threadIds.filter(Number.isInteger))).slice(0, 20);
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(", ");
  const { results } = await db.prepare(
    `SELECT t.id AS threadId,
            pr.series_id AS seriesId,
            pr.version AS patchVersion,
            COALESCE(ti.vendors_json, '[]') AS vendorsJson,
            COALESCE(ti.affected_layers_json, '[]') AS affectedLayersJson,
            COALESCE(ti.likely_stakeholders_json, '[]') AS likelyStakeholdersJson,
            ti.suggested_action AS suggestedAction,
            (SELECT count(*) FROM review_signals rs
             WHERE rs.thread_id = t.id
               AND rs.signal_type IN ('Reviewed-by', 'Acked-by', 'Tested-by')) AS explicitReviewCount,
            pl.maintainer_tree_url AS maintainerTreeUrl,
            pl.mainline_commit_url AS mainlineCommitUrl,
            pl.linux_version AS linuxVersion,
            COALESCE(pl.stable_versions_json, '[]') AS stableVersionsJson,
            COALESCE(pl.android_common_branches_json, '[]') AS androidCommonBranchesJson,
            COALESCE(pl.source_urls_json, '[]') AS lifecycleSourceUrlsJson,
            substr(root.body_text, 1, 4000) AS sourceExcerpt
     FROM threads t
     LEFT JOIN thread_impact ti ON ti.thread_id = t.id
     LEFT JOIN patch_revisions pr ON pr.thread_id = t.id
     LEFT JOIN patch_lifecycle pl ON pl.series_id = pr.series_id
     LEFT JOIN messages root ON root.message_id = t.root_message_id
     WHERE t.id IN (${placeholders})`,
  ).bind(...ids).all<BlogCandidateDetailRow>();
  return results;
}

export async function getBlogPostByPeriodKey(
  db: D1Database,
  periodKey: string,
): Promise<BlogPost | null> {
  const row = await db.prepare(
    `SELECT ${BLOG_POST_COLUMNS} FROM blog_posts WHERE period_key = ?`,
  ).bind(periodKey).first<BlogPostRow>();
  return row ? rowToBlogPost(row) : null;
}

/**
 * Returns the oldest completed weekly digest newer than the most recent blog
 * post. This preserves weekly ordering when a digest or AI run is recovered
 * after a transient failure instead of silently skipping to the newest week.
 */
export async function getNextWeeklyDigestForBlog(db: D1Database): Promise<Digest | null> {
  const row = await db.prepare(
    `SELECT id, period_type, period_key, title, content_json, source_thread_ids_json,
            generated_at, published_at
     FROM digests
     WHERE period_type = 'weekly' AND published_at IS NOT NULL
       AND period_key > COALESCE((SELECT MAX(period_key) FROM blog_posts), '')
     ORDER BY period_key ASC LIMIT 1`,
  ).first<{
    id: number;
    period_type: "weekly";
    period_key: string;
    title: string;
    content_json: string;
    source_thread_ids_json: string;
    generated_at: string;
    published_at: string | null;
  }>();
  if (!row) return null;
  return {
    id: row.id,
    periodType: row.period_type,
    periodKey: row.period_key,
    title: row.title,
    content: JSON.parse(row.content_json) as DigestContent,
    sourceThreadIds: JSON.parse(row.source_thread_ids_json) as number[],
    generatedAt: row.generated_at,
    publishedAt: row.published_at,
  };
}

export async function saveBlogDraft(
  db: D1Database,
  input: {
    periodKey: string;
    slug: string;
    language: BlogPostLanguage;
    title: string;
    content: BlogPostContent;
    sources: BlogPostSource[];
    sourceDigestId: number;
    provider: string;
    model: string;
    promptVersion: string;
    inputTokens: number;
    outputTokens: number;
    replaceExisting?: boolean;
  },
): Promise<boolean> {
  const conflictClause = input.replaceExisting
    ? `DO UPDATE SET
         slug = excluded.slug,
         language = excluded.language,
         title = excluded.title,
         dek = excluded.dek,
         content_json = excluded.content_json,
         sources_json = excluded.sources_json,
         source_digest_id = excluded.source_digest_id,
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
  const result = await db.prepare(
    `INSERT INTO blog_posts (
       period_key, slug, language, title, dek, content_json, sources_json,
       source_digest_id, source_thread_ids_json, provider, model, prompt_version,
       input_tokens, output_tokens, status
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
     ON CONFLICT(period_key) ${conflictClause}`,
  ).bind(
    input.periodKey,
    input.slug,
    input.language,
    input.title,
    input.content.dek,
    JSON.stringify(input.content),
    JSON.stringify(input.sources),
    input.sourceDigestId,
    JSON.stringify(input.sources.map((source) => source.threadId)),
    input.provider,
    input.model,
    input.promptVersion,
    input.inputTokens,
    input.outputTokens,
  ).run();
  // D1 may report zero changes for an ON CONFLICT update even though the
  // replacement completed. A replacement query either succeeds atomically or
  // throws, so reaching this point is a successful save.
  return input.replaceExisting || (result.meta.changes ?? 0) === 1;
}

export async function listPublishedBlogPosts(
  db: D1Database,
  limit = 12,
): Promise<BlogPostListItem[]> {
  const { results } = await db.prepare(
    `SELECT ${BLOG_POST_COLUMNS} FROM blog_posts
     WHERE status = 'published' AND published_at IS NOT NULL
     ORDER BY published_at DESC LIMIT ?`,
  ).bind(Math.max(1, Math.min(limit, 50))).all<BlogPostRow>();
  return results.map(rowToListItem);
}

export async function getPublishedBlogPostBySlug(
  db: D1Database,
  slug: string,
): Promise<BlogPost | null> {
  const row = await db.prepare(
    `SELECT ${BLOG_POST_COLUMNS} FROM blog_posts
     WHERE slug = ? AND status = 'published' AND published_at IS NOT NULL`,
  ).bind(slug).first<BlogPostRow>();
  return row ? rowToBlogPost(row) : null;
}
