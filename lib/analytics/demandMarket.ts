import { DEMAND_THEMES } from '../../config/demand-themes';
import { classifyTheme, numeric, record, type MarketKeyword, type MarketSnapshot } from './demandToDesk';

export const DENTAL_MARKET_DOMAIN = 'market:uae-dental';
export const DENTAL_MARKET_TTL = 7 * 86400_000;
// Seeds are always kept. Related terms are capped per theme, then per language,
// highest search volume first, so an oversized expansion never discards paid data.
export const MARKET_BUDGET = { requests: 50, reservePerRequestUsd: 0.10, maxUsd: 5, maxRelatedPerTheme: 150, maxRelatedPerLanguage: 3_000 } as const;
type Language = 'en' | 'ar';
export interface KeywordResponse { result: Record<string, unknown> | null; error: string | null; costUsd?: number }
export type KeywordFetcher = (language: Language, keywords: string[], kind: 'expand' | 'volume') => Promise<KeywordResponse>;
/** Keywords Data returns all keywords in task.result, unlike the Labs items wrapper. */
export function keywordResponse(value: unknown, httpOk = true): KeywordResponse {
  const json = record(value), task = record(Array.isArray(json.tasks) ? json.tasks[0] : null);
  const costUsd = numeric(json.cost) ?? undefined;
  if (!httpOk || json.status_code !== 20000 || task.status_code !== 20000 || !Array.isArray(task.result)) return { result: null, error: 'Keyword provider response unavailable', costUsd };
  return { result: { items: task.result }, error: null, costUsd };
}
const normalize = (s: string) => s.normalize('NFKC').toLowerCase().trim().replace(/\s+/g, ' ');
export const marketKeywords = (language: Language) => [...new Set(DEMAND_THEMES.flatMap((theme) => theme.keywords[language]).map(normalize))];

/** Bounded, sequential expansion and volume requests. No paid retry or language fallback. */
export async function buildMarketSnapshot(fetchKeywords: KeywordFetcher, now = new Date()): Promise<MarketSnapshot> {
  const keywords: MarketKeyword[] = [], errors: string[] = [];
  let requestCount = 0, costUsd = 0, reservedUsd = 0;
  const request: KeywordFetcher = async (language, terms, kind) => {
    if (requestCount >= MARKET_BUDGET.requests || reservedUsd + MARKET_BUDGET.reservePerRequestUsd > MARKET_BUDGET.maxUsd + 1e-9) throw new Error('Keyword request budget reached');
    requestCount++;
    reservedUsd += MARKET_BUDGET.reservePerRequestUsd;
    let result: KeywordResponse;
    try { result = await fetchKeywords(language, terms, kind); }
    catch { result = { result: null, error: 'Keyword request failed' }; }
    const cost = numeric(result.costUsd);
    if (cost != null) { costUsd += cost; reservedUsd += Math.max(0, cost - MARKET_BUDGET.reservePerRequestUsd); }
    return result;
  };
  const notes: string[] = [];
  const marketRow = (keyword: string, language: Language, info: Record<string, unknown> | undefined, readable: boolean): MarketKeyword => {
    // Successful no-volume responses count as zero; failed requests remain unknown.
    const competition = numeric(info?.competition_index);
    return { keyword, language, searches: readable ? numeric(info?.search_volume) ?? 0 : null,
      cpcUsd: numeric(info?.cpc), competition: competition != null && competition <= 100 ? competition : null };
  };
  try {
    for (const language of ['en', 'ar'] as const) {
      const seeds = new Set(marketKeywords(language));
      // Related terms per theme, with the volume data the expansion already returned.
      const related = new Map<string, Map<string, Record<string, unknown>>>();
      for (const theme of DEMAND_THEMES) {
        const themeSeeds = [...new Set(theme.keywords[language].map(normalize))];
        const found = new Map<string, Record<string, unknown>>();
        related.set(theme.key, found);
        for (let i = 0; i < themeSeeds.length; i += 20) {
          const response = await request(language, themeSeeds.slice(i, i + 20), 'expand');
          if (response.error) { errors.push(`${language}: ${theme.label} expansion unavailable`); break; }
          if (!Array.isArray(response.result?.items)) { errors.push(`${language}: ${theme.label} expansion response unavailable`); break; }
          for (const raw of response.result.items) {
            const row = record(raw);
            const keyword = normalize(String(row.keyword ?? ''));
            const matchText = keyword.replace(/[\u064b-\u065f\u0670]/g, '').replace(/[أإآ]/g, 'ا');
            if (keyword && keyword.length <= 80 && keyword.split(' ').length <= 10 && theme.pattern.test(matchText) && classifyTheme(keyword) === theme.key && !found.has(keyword)) found.set(keyword, row);
          }
        }
      }
      const byVolume = (a: [string, Record<string, unknown>], b: [string, Record<string, unknown>]) =>
        (numeric(b[1].search_volume) ?? -1) - (numeric(a[1].search_volume) ?? -1) || a[0].localeCompare(b[0]);
      const known = new Map<string, Record<string, unknown>>();
      let candidates: [string, Record<string, unknown>][] = [], dropped = 0;
      for (const found of related.values()) {
        const terms = [...found].sort(byVolume);
        for (const [keyword, row] of terms) if (seeds.has(keyword) && numeric(row.search_volume) != null) known.set(keyword, row);
        const extra = terms.filter(([keyword]) => !seeds.has(keyword));
        dropped += Math.max(0, extra.length - MARKET_BUDGET.maxRelatedPerTheme);
        candidates.push(...extra.slice(0, MARKET_BUDGET.maxRelatedPerTheme));
      }
      candidates = [...new Map(candidates)].sort(byVolume);
      dropped += Math.max(0, candidates.length - MARKET_BUDGET.maxRelatedPerLanguage);
      for (const [keyword, row] of candidates.slice(0, MARKET_BUDGET.maxRelatedPerLanguage)) known.set(keyword, row);
      if (dropped) notes.push(`${language}: related terms capped at ${MARKET_BUDGET.maxRelatedPerTheme} per theme and ${MARKET_BUDGET.maxRelatedPerLanguage} per language, highest volume first (${dropped} lower-volume terms not stored)`);
      // Expansion rows with a volume are stored as returned; only the rest need a volume request.
      const list = [...new Set([...seeds, ...known.keys()])];
      const pending = list.filter((keyword) => numeric(known.get(keyword)?.search_volume) == null);
      for (const keyword of list) if (!pending.includes(keyword)) keywords.push(marketRow(keyword, language, known.get(keyword), true));
      for (let i = 0; i < pending.length; i += 1000) {
        const batch = pending.slice(i, i + 1000);
        const response = await request(language, batch, 'volume');
        const readable = !response.error && Array.isArray(response.result?.items);
        if (!readable) errors.push(`${language}: keyword volumes unavailable`);
        const items = readable ? (response.result!.items as unknown[]).map(record) : [];
        const found = new Map(items.map((row) => [normalize(String(row.keyword ?? '')), row]));
        for (const keyword of batch) keywords.push(marketRow(keyword, language, found.get(keyword), readable));
      }
    }
  } catch (err) { errors.push(err instanceof Error ? err.message : 'Keyword refresh incomplete'); }
  return { version: 2, fetchedAt: now.toISOString(), location: 2784, keywords, errors: [...new Set(errors)], ...(notes.length ? { notes } : {}), requestCount, costUsd };
}

export function parseMarketSnapshot(value: unknown): MarketSnapshot | null {
  const data = record(value);
  if (data.version !== 2 || data.location !== 2784 || typeof data.fetchedAt !== 'string' || !Number.isFinite(Date.parse(data.fetchedAt)) || !Array.isArray(data.keywords) || !Array.isArray(data.errors) || !data.errors.every((e) => typeof e === 'string')) return null;
  if (data.notes !== undefined && (!Array.isArray(data.notes) || !data.notes.every((n) => typeof n === 'string'))) return null;
  if (!Number.isInteger(data.requestCount) || numeric(data.requestCount) == null || numeric(data.costUsd) == null) return null;
  const seen = new Set<string>();
  for (const item of data.keywords) {
    const row = record(item);
    if (!['en', 'ar'].includes(String(row.language)) || typeof row.keyword !== 'string' || !row.keyword.trim()) return null;
    const key = `${row.language}|${normalize(row.keyword)}`;
    if (seen.has(key)) return null;
    seen.add(key);
    for (const field of ['searches', 'cpcUsd', 'competition']) if (row[field] !== null && (typeof row[field] !== 'number' || numeric(row[field]) == null)) return null;
    if (Number(row.competition) > 100) return null;
  }
  if (!data.errors.length && (['en', 'ar'] as const).some((lang) => marketKeywords(lang).some((keyword) => !seen.has(`${lang}|${keyword}`)))) return null;
  return data as unknown as MarketSnapshot;
}

export async function refreshMarketCache(deps: {
  latest: () => Promise<unknown>;
  fetchKeywords: KeywordFetcher;
  save: (snapshot: MarketSnapshot) => Promise<void>;
  now?: Date;
}): Promise<{ refreshed: boolean; requestCount: number; costUsd: number }> {
  const now = deps.now ?? new Date();
  const last = parseMarketSnapshot(await deps.latest());
  if (last && now.getTime() - Date.parse(last.fetchedAt) >= 0 && now.getTime() - Date.parse(last.fetchedAt) < DENTAL_MARKET_TTL) return { refreshed: false, requestCount: 0, costUsd: 0 };
  const snapshot = await buildMarketSnapshot(deps.fetchKeywords, now);
  await deps.save(snapshot);
  return { refreshed: true, requestCount: snapshot.requestCount ?? 0, costUsd: snapshot.costUsd ?? 0 };
}
