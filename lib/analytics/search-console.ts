import 'server-only';
import { unstable_cache } from 'next/cache';
import { fetchSearchConsole, type SearchConsoleReport } from '@/lib/sync/adapters/search-console-adapter';

/**
 * Cached Search Console read (30 min per window). GSC data lags ~2–3 days, so a
 * short cache keeps the tab fast without meaningfully staling the numbers.
 */
export function getSearchConsoleReport(range: { from?: string; to?: string } = {}): Promise<SearchConsoleReport> {
  const to = range.to || new Date().toISOString().slice(0, 10);
  const from = range.from || '2026-01-01';
  return cached(from, to);
}

const cached = unstable_cache(
  async (from: string, to: string): Promise<SearchConsoleReport> => fetchSearchConsole(from, to),
  ['search-console-v1'],
  { revalidate: 1800 },
);
