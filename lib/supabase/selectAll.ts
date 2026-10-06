export interface PageResult<T> { data: T[] | null; error: unknown }
export interface PageQuery<T> {
  order(column: string, options?: { ascending?: boolean }): PageQuery<T>;
  range(from: number, to: number): PromiseLike<PageResult<T>>;
}

export const SELECT_ALL_LIMIT = 50_000;
const PAGE_SIZE = 1000;

/** Rebuild each query and append a unique key to any presentation ordering.
 * Offset pages assume the source is unchanged during a read. A changing source
 * needs a database snapshot; a ceiling or failed page never returns partial data.
 */
export async function selectAll<T>(
  query: () => PageQuery<T>,
  stableKeys: string | readonly string[],
  maxRows = SELECT_ALL_LIMIT,
): Promise<{ data: T[]; error: null }> {
  const keys = typeof stableKeys === 'string' ? [stableKeys] : stableKeys;
  if (!keys.length || keys.some((key) => !key.trim())) throw new Error('A stable pagination key is required');
  if (!Number.isSafeInteger(maxRows) || maxRows < 1) throw new Error('Invalid pagination ceiling');
  const rows: T[] = [];
  while (true) {
    let page = query();
    for (const key of keys) page = page.order(key, { ascending: true });
    // One-row probe permits exactly maxRows, without silently accepting overflow.
    const size = Math.min(PAGE_SIZE, maxRows - rows.length + 1);
    const result = await page.range(rows.length, rows.length + size - 1);
    if (result.error) throw new Error('Source read failed');
    if (!Array.isArray(result.data)) throw new Error('Source response unavailable');
    if (rows.length + result.data.length > maxRows) throw new Error(`Source exceeds ${maxRows.toLocaleString('en-US')}-row report limit`);
    rows.push(...result.data);
    if (result.data.length < size) return { data: rows, error: null };
  }
}
