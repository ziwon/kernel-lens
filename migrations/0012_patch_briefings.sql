-- Support event-driven, single-topic Patch Briefings alongside the weekly
-- digest-derived analysis. Briefings are keyed by slug and patch series,
-- carry an explicit evidence cutoff, and do not require a synthetic week or
-- source digest.

ALTER TABLE blog_posts RENAME TO blog_posts_weekly;

CREATE TABLE blog_posts (
    id INTEGER PRIMARY KEY,
    post_type TEXT NOT NULL DEFAULT 'weekly'
        CHECK (post_type IN ('weekly', 'briefing')),
    period_key TEXT UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    language TEXT NOT NULL DEFAULT 'en',
    title TEXT NOT NULL,
    dek TEXT NOT NULL,
    content_json TEXT NOT NULL,
    sources_json TEXT NOT NULL,
    source_digest_id INTEGER,
    series_id INTEGER,
    evidence_cutoff TEXT,
    last_verified_at TEXT,
    source_thread_ids_json TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),
    generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        (post_type = 'weekly' AND period_key IS NOT NULL AND source_digest_id IS NOT NULL)
        OR
        (post_type = 'briefing' AND period_key IS NULL AND source_digest_id IS NULL
         AND evidence_cutoff IS NOT NULL AND last_verified_at IS NOT NULL)
    ),
    FOREIGN KEY (source_digest_id) REFERENCES digests(id) ON DELETE RESTRICT,
    FOREIGN KEY (series_id) REFERENCES patch_series(id) ON DELETE SET NULL
);

INSERT INTO blog_posts (
    id, post_type, period_key, slug, language, title, dek, content_json,
    sources_json, source_digest_id, series_id, evidence_cutoff,
    last_verified_at, source_thread_ids_json, provider, model, prompt_version,
    input_tokens, output_tokens, status, generated_at, published_at, updated_at
)
SELECT
    id, 'weekly', period_key, slug, language, title, dek, content_json,
    sources_json, source_digest_id, NULL, NULL, NULL,
    source_thread_ids_json, provider, model, prompt_version,
    input_tokens, output_tokens, status, generated_at, published_at, updated_at
FROM blog_posts_weekly;

DROP TABLE blog_posts_weekly;

CREATE INDEX idx_blog_posts_publication
    ON blog_posts(status, published_at DESC);

CREATE INDEX idx_blog_posts_series
    ON blog_posts(series_id, post_type, status);

CREATE TRIGGER blog_posts_set_updated_at
AFTER UPDATE ON blog_posts
FOR EACH ROW
BEGIN
    UPDATE blog_posts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
