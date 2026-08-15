-- Evidence-linked weekly editorial posts generated from published weekly
-- digests. Generation always creates a private draft; publication is a
-- separate human action performed by scripts/manage-blog-post.ts.

CREATE TABLE blog_posts (
    id INTEGER PRIMARY KEY,
    period_key TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    language TEXT NOT NULL DEFAULT 'en',
    title TEXT NOT NULL,
    dek TEXT NOT NULL,
    content_json TEXT NOT NULL,
    sources_json TEXT NOT NULL,
    source_digest_id INTEGER NOT NULL,
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
    FOREIGN KEY (source_digest_id) REFERENCES digests(id) ON DELETE RESTRICT
);

CREATE INDEX idx_blog_posts_publication
    ON blog_posts(status, published_at DESC);

CREATE TRIGGER blog_posts_set_updated_at
AFTER UPDATE ON blog_posts
FOR EACH ROW
BEGIN
    UPDATE blog_posts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
