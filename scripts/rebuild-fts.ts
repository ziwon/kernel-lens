#!/usr/bin/env tsx
/**
 * Rebuilds the message_search FTS5 table from canonical tables
 * (messages, threads, thread_topics, topics). See docs/PLANNING.md
 * section 7.6 ("FTS5 tables are derived indexes and must be rebuildable")
 * and section 16 (Backup strategy, step 5: "Recreate FTS5 tables").
 *
 * Usage:
 *   tsx scripts/rebuild-fts.ts --local
 *   tsx scripts/rebuild-fts.ts --remote
 */

import { execD1File, parseD1Target } from "./lib/d1.js";

const SQL = `
INSERT INTO message_search(message_search) VALUES('delete-all');

INSERT INTO message_search (rowid, subject, body_text, author_name, mailing_list, topic_names)
SELECT
  m.id,
  m.subject,
  substr(m.body_text, 1, 1024),
  m.author_name,
  m.mailing_list,
  (
    SELECT group_concat(tp.name, ', ')
    FROM thread_topics tt
    JOIN topics tp ON tp.id = tt.topic_id
    WHERE tt.thread_id = m.thread_id
  )
FROM messages m;
`.trim();

function main() {
  const target = parseD1Target(process.argv);
  execD1File(SQL, target, "Rebuilding message_search");
  console.log("Done.");
}

main();
