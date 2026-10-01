import { queryD1, type D1Target } from "./d1.js";
import { collectKeysetPages } from "./keyset-pagination.js";

export interface ThreadRootRow {
  thread_id: number;
  subject: string;
  body_text: string;
}

export type ThreadRootQuery = <T>(sql: string, target: D1Target) => T[];

/** Keep each Wrangler JSON response comfortably below its 64 MiB buffer. */
export const THREAD_ROOT_PAGE_SIZE = 100;

export function fetchThreadRoots(
  target: D1Target,
  query: ThreadRootQuery = queryD1,
  pageSize = THREAD_ROOT_PAGE_SIZE,
): ThreadRootRow[] {
  return collectKeysetPages(
    (afterThreadId, limit) =>
      queryD1Page(query, target, afterThreadId, limit),
    (row) => row.thread_id,
    pageSize,
  );
}

function queryD1Page(
  query: ThreadRootQuery,
  target: D1Target,
  afterThreadId: number,
  pageSize: number,
): ThreadRootRow[] {
  return query<ThreadRootRow>(
    `SELECT t.id AS thread_id, m.subject AS subject, m.body_text AS body_text
     FROM threads t
     JOIN messages m ON m.message_id = t.root_message_id
     WHERE t.id > ${afterThreadId}
     ORDER BY t.id ASC
     LIMIT ${pageSize}`,
    target,
  );
}
