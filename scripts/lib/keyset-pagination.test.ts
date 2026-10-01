import { describe, expect, it, vi } from "vitest";
import { collectKeysetPages } from "./keyset-pagination.js";
import {
  fetchThreadRoots,
  THREAD_ROOT_PAGE_SIZE,
  type ThreadRootRow,
  type ThreadRootQuery,
} from "./thread-roots.js";

describe("collectKeysetPages", () => {
  it("collects every row across pages without duplicates or omissions", () => {
    const rows = [1, 2, 3, 4, 5].map((id) => ({ id }));
    const cursors: number[] = [];

    const result = collectKeysetPages(
      (afterId, pageSize) => {
        cursors.push(afterId);
        return rows.filter((row) => row.id > afterId).slice(0, pageSize);
      },
      (row) => row.id,
      2,
    );

    expect(result.map((row) => row.id)).toEqual([1, 2, 3, 4, 5]);
    expect(cursors).toEqual([0, 2, 4]);
  });

  it("requests an empty terminating page when the last full page matches the page size", () => {
    const fetchPage = vi.fn((afterId: number, pageSize: number) =>
      [1, 2, 3, 4]
        .filter((id) => id > afterId)
        .slice(0, pageSize)
        .map((id) => ({ id })),
    );

    expect(collectKeysetPages(fetchPage, (row) => row.id, 2)).toHaveLength(4);
    expect(fetchPage.mock.calls.map(([cursor]) => cursor)).toEqual([0, 2, 4]);
  });

  it("rejects a page that does not advance beyond the cursor", () => {
    expect(() =>
      collectKeysetPages(
        () => [{ id: 1 }],
        (row) => row.id,
        1,
      ),
    ).toThrow(/advance/i);
  });
});

describe("fetchThreadRoots", () => {
  it("uses ascending thread-id keyset pages and preserves complete body text", () => {
    const source: ThreadRootRow[] = [
      { thread_id: 2, subject: "second", body_text: "full body\nwith 'quotes'" },
      { thread_id: 5, subject: "fifth", body_text: "another\ncomplete\nbody" },
      { thread_id: 9, subject: "ninth", body_text: "final body" },
    ];
    const queries: string[] = [];
    const query: ThreadRootQuery = <T>(sql: string) => {
      queries.push(sql);
      const cursor = Number(sql.match(/t\.id > (\d+)/)?.[1]);
      const limit = Number(sql.match(/LIMIT (\d+)/)?.[1]);
      return source
        .filter((row) => row.thread_id > cursor)
        .slice(0, limit) as T[];
    };

    const result = fetchThreadRoots("--local", query, 2);

    expect(result).toEqual(source);
    expect(queries).toHaveLength(2);
    expect(queries.every((sql) => /ORDER BY t\.id ASC/.test(sql))).toBe(true);
    expect(queries.map((sql) => Number(sql.match(/t\.id > (\d+)/)?.[1]))).toEqual([0, 5]);
    expect(THREAD_ROOT_PAGE_SIZE).toBeLessThanOrEqual(100);
  });
});
