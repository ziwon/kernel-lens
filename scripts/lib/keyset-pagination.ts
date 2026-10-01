export type KeysetPageFetcher<T> = (afterId: number, pageSize: number) => T[];

/**
 * Collects rows from bounded, ascending integer-key pages.
 *
 * Every page must be strictly ordered after the cursor. Enforcing that
 * contract prevents a faulty query from looping forever or duplicating rows.
 */
export function collectKeysetPages<T>(
  fetchPage: KeysetPageFetcher<T>,
  getId: (row: T) => number,
  pageSize: number,
): T[] {
  if (!Number.isSafeInteger(pageSize) || pageSize <= 0) {
    throw new Error(`Keyset page size must be a positive safe integer; received ${pageSize}`);
  }

  const rows: T[] = [];
  let cursor = 0;

  while (true) {
    const page = fetchPage(cursor, pageSize);
    if (page.length > pageSize) {
      throw new Error(`Keyset page exceeded requested size ${pageSize}`);
    }
    if (page.length === 0) return rows;

    let nextCursor = cursor;
    for (const row of page) {
      const id = getId(row);
      if (!Number.isSafeInteger(id) || id <= nextCursor) {
        throw new Error(
          `Keyset page did not advance in ascending order: received id ${id} after cursor ${nextCursor}`,
        );
      }
      nextCursor = id;
      rows.push(row);
    }

    if (page.length < pageSize) return rows;
    cursor = nextCursor;
  }
}
