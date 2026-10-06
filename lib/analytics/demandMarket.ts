import { DEMAND_THEMES } from '../../config/demand-themes';
import { numeric, record, type MarketKeyword, type MarketSnapshot } from './demandToDesk';

export const DENTAL_MARKET_DOMAIN = 'market:uae-dental';
export const DENTAL_MARKET_TTL = 7 * 86400_000;
type Language = 'en' | 'ar';
export interface KeywordResponse { result: Record<string, unknown> | null; error: string | null }
export type KeywordFetcher = (language: Language, keywords: string[]) => Promise<KeywordResponse>;
export const marketKeywords = (language: Language) => [...new Set(DEMAND_THEMES.flatMap((theme) => theme.keywords[language]))];

/** Exactly one request per language, with no paid retry or English fallback. */
export async function buildMarketSnapshot(fetchKeywords: KeywordFetcher, now = new Date()): Promise<MarketSnapshot> {
  const keywords: MarketKeyword[] = [];
  const errors: string[] = [];
  for (const language of ['en', 'ar'] as const) {
    const requested = marketKeywords(language);
    let response: KeywordResponse;
    try { response = await fetchKeywords(language, requested); }
    catch { response = { result: null, error: 'Keyword request failed' }; }
    if (response.error) errors.push(`${language}: keyword request unavailable`);
    const raw = response.result?.items;
    const items = Array.isArray(raw) ? raw.map(record) : [];
    const normalize = (s: string) => s.normalize('NFKC').toLowerCase().trim();
    const byKeyword = new Map(items.map((row) => [normalize(String(row.keyword ?? '')), record(row.keyword_info)]));
    let missing = 0;
    for (const keyword of requested) {
      const info = byKeyword.get(normalize(keyword));
      if (!info) missing++;
      const competition = numeric(info?.competition);
      keywords.push({ keyword, language, searches: numeric(info?.search_volume), cpcUsd: numeric(info?.cpc), competition: competition != null && competition <= 1 ? competition * 100 : null });
    }
    if (missing && !response.error) errors.push(`${language}: ${missing} requested keywords missing from the response`);
  }
  return { version: 1, fetchedAt: now.toISOString(), location: 2784, keywords, errors };
}

export function parseMarketSnapshot(value: unknown): MarketSnapshot | null {
  const data = record(value);
  if (data.version !== 1 || data.location !== 2784 || typeof data.fetchedAt !== 'string' || !Number.isFinite(Date.parse(data.fetchedAt)) || !Array.isArray(data.keywords) || !Array.isArray(data.errors) || !data.errors.every((e) => typeof e === 'string')) return null;
  const known = new Set(['en', 'ar'].flatMap((language) => marketKeywords(language as Language).map((keyword) => `${language}|${keyword}`)));
  const seen = new Set<string>();
  for (const item of data.keywords) {
    const row = record(item);
    const key = `${row.language}|${row.keyword}`;
    if (!known.has(key) || seen.has(key)) return null;
    seen.add(key);
    for (const field of ['searches', 'cpcUsd', 'competition']) if (row[field] !== null && (typeof row[field] !== 'number' || numeric(row[field]) == null)) return null;
    if (numeric(row.competition) != null && Number(row.competition) > 100) return null;
  }
  if (seen.size !== known.size) return null;
  return data as unknown as MarketSnapshot;
}

/** Injectable IO keeps the paid refresh and cache write verifiable offline. */
export async function refreshMarketCache(deps: {
  latest: () => Promise<unknown>;
  fetchKeywords: KeywordFetcher;
  save: (snapshot: MarketSnapshot) => Promise<void>;
  now?: Date;
}): Promise<{ refreshed: boolean }> {
  const now = deps.now ?? new Date();
  const last = parseMarketSnapshot(await deps.latest());
  if (last && now.getTime() - Date.parse(last.fetchedAt) >= 0 && now.getTime() - Date.parse(last.fetchedAt) < DENTAL_MARKET_TTL) return { refreshed: false };
  const snapshot = await buildMarketSnapshot(deps.fetchKeywords, now);
  await deps.save(snapshot);
  return { refreshed: true };
}
