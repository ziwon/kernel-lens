-- Keep the rebuildable search index within the D1 Free database-size limit.
--
-- The original FTS table stored a second copy of every indexed field and the
-- collector rebuilt all rows after every incremental ingest. A contentless
-- table stores only the inverted index. Its rowid is the canonical messages.id,
-- so display data continues to come from messages.
DROP TABLE IF EXISTS message_search;

CREATE VIRTUAL TABLE message_search USING fts5(
    subject,
    body_text,
    author_name,
    mailing_list,
    topic_names,
    content = '',
    tokenize = "unicode61 remove_diacritics 2 tokenchars '_'"
);
