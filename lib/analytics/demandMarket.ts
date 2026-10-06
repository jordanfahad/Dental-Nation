import { DEMAND_THEMES } from '../../config/demand-themes';
import { classifyTheme, numeric, record, type MarketKeyword, type MarketSnapshot } from './demandToDesk';

export const DENTAL_MARKET_DOMAIN = 'market:uae-dental';
export const DENTAL_MARKET_TTL = 7 * 86400_000;
export const MARKET_BUDGET = { requests: 50, reservePerRequestUsd: 0.10, maxUsd: 5, maxKeywords: 10_000 } as const;
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
  try {
    for (const language of ['en', 'ar'] as const) {
      const requested = new Set(marketKeywords(language));
      for (const theme of DEMAND_THEMES) {
        const seeds = [...new Set(theme.keywords[language].map(normalize))];
        for (let i = 0; i < seeds.length; i += 20) {
          const response = await request(language, seeds.slice(i, i + 20), 'expand');
          if (response.error) { errors.push(`${language}: ${theme.label} expansion unavailable`); break; }
          if (!Array.isArray(response.result?.items)) { errors.push(`${language}: ${theme.label} expansion response unavailable`); break; }
          for (const raw of response.result.items) {
            const keyword = normalize(String(record(raw).keyword ?? ''));
            const matchText = keyword.replace(/[\u064b-\u065f\u0670]/g, '').replace(/[أإآ]/g, 'ا');
            if (keyword && keyword.length <= 80 && keyword.split(' ').length <= 10 && theme.pattern.test(matchText) && classifyTheme(keyword) === theme.key) requested.add(keyword);
          }
          if (requested.size > MARKET_BUDGET.maxKeywords) throw new Error('Expanded keyword list exceeds 10,000 terms; totals withheld');
        }
      }
      const list = [...requested];
      for (let i = 0; i < list.length; i += 1000) {
        const batch = list.slice(i, i + 1000);
        const response = await request(language, batch, 'volume');
        const readable = !response.error && Array.isArray(response.result?.items);
        if (!readable) errors.push(`${language}: keyword volumes unavailable`);
        const items = readable ? (response.result!.items as unknown[]).map(record) : [];
        const found = new Map(items.map((row) => [normalize(String(row.keyword ?? '')), row]));
        for (const keyword of batch) {
          const info = found.get(keyword);
          // Successful no-volume responses count as zero; failed requests remain unknown.
          const competition = numeric(info?.competition_index);
          keywords.push({ keyword, language, searches: readable ? numeric(info?.search_volume) ?? 0 : null,
            cpcUsd: numeric(info?.cpc), competition: competition != null && competition <= 100 ? competition : null });
        }
      }
    }
  } catch (err) { errors.push(err instanceof Error ? err.message : 'Keyword refresh incomplete'); }
  return { version: 2, fetchedAt: now.toISOString(), location: 2784, keywords, errors: [...new Set(errors)], requestCount, costUsd };
}

export function parseMarketSnapshot(value: unknown): MarketSnapshot | null {
  const data = record(value);
  if (data.version !== 2 || data.location !== 2784 || typeof data.fetchedAt !== 'string' || !Number.isFinite(Date.parse(data.fetchedAt)) || !Array.isArray(data.keywords) || !Array.isArray(data.errors) || !data.errors.every((e) => typeof e === 'string')) return null;
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
