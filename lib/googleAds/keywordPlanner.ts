import 'server-only';
/**
 * Google Ads Keyword Planner (Fahad, 20 Nov 2026: keyword volumes for the
 * lead-magnet sites must come from Google Ads). Uses the same Google Ads
 * credentials as the daily sync. Run on request only: a row in
 * lane_e.app_secrets under REQUEST_KEY holding JSON
 *   {"keywords": ["dental implants dubai", ...], "ideas": true, "language": "en"}
 * is consumed by the alerts cron (every 15 minutes); results land in
 * lane_e.keyword_volumes. Geography is the UAE. Bids are in the ad account's
 * currency. Never throws.
 */
import type { AdminClient } from '@/lib/supabase/server';
import { getGoogleAdsConfig } from '@/config/google-ads';
import { getAccessToken } from '@/lib/sync/adapters/google-ads-adapter';

export const REQUEST_KEY = 'keyword_planner_request';
const UAE = 'geoTargetConstants/2784';
const LANGUAGES: Record<string, string> = { en: 'languageConstants/1000', ar: 'languageConstants/1019', ru: 'languageConstants/1031' };

interface Metrics {
  avgMonthlySearches?: string | number;
  competition?: string;
  competitionIndex?: string | number;
  lowTopOfPageBidMicros?: string | number;
  highTopOfPageBidMicros?: string | number;
  monthlySearchVolumes?: { year?: string | number; month?: string; monthlySearches?: string | number }[];
}
const num = (v: unknown): number | null => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const bid = (v: unknown): number | null => { const n = num(v); return n == null ? null : Math.round(n / 10_000) / 100; };

/** Pure: one stored row from an API result. */
export function rowOf(keyword: string, m: Metrics | undefined, source: 'historical' | 'idea', language: string, seed: string | null) {
  return {
    keyword: keyword.toLowerCase().trim(), geo: 'AE', language, source, seed,
    avg_monthly_searches: num(m?.avgMonthlySearches), competition: m?.competition ?? null,
    competition_index: num(m?.competitionIndex), low_bid: bid(m?.lowTopOfPageBidMicros), high_bid: bid(m?.highTopOfPageBidMicros),
    monthly: (m?.monthlySearchVolumes ?? []).map((x) => ({ year: num(x.year), month: x.month ?? null, searches: num(x.monthlySearches) })),
    fetched_at: new Date().toISOString(),
  };
}

export async function runKeywordPlannerRequest(db: AdminClient): Promise<string | null> {
  const { data: claimed } = await db.from('app_secrets').delete().eq('key', REQUEST_KEY).select('value');
  if (!claimed?.length) return null;
  try {
    const req = JSON.parse(String(claimed[0].value)) as { keywords?: string[]; ideas?: boolean; language?: string };
    const keywords = [...new Set((req.keywords ?? []).map((k) => k.toLowerCase().trim()).filter(Boolean))].slice(0, 1000);
    const lang = LANGUAGES[req.language ?? 'en'] ? (req.language ?? 'en') : 'en';
    const cfg = getGoogleAdsConfig();
    if (!cfg || !keywords.length) return 'keyword planner: nothing to do';
    const token = await getAccessToken(cfg);
    const cid = cfg.customerIds[0];
    const headers: Record<string, string> = { Authorization: `Bearer ${token}`, 'developer-token': cfg.developerToken, 'Content-Type': 'application/json' };
    if (cfg.loginCustomerId) headers['login-customer-id'] = cfg.loginCustomerId;
    const base = `https://googleads.googleapis.com/${cfg.version}/customers/${cid}`;
    const common = { geoTargetConstants: [UAE], language: LANGUAGES[lang], keywordPlanNetwork: 'GOOGLE_SEARCH' };
    const rows: ReturnType<typeof rowOf>[] = [];
    const notes: string[] = [];

    const hist = await fetch(`${base}:generateKeywordHistoricalMetrics`, { method: 'POST', headers, body: JSON.stringify({ ...common, keywords }), cache: 'no-store' });
    const hb = (await hist.json().catch(() => null)) as { results?: { text?: string; keywordMetrics?: Metrics }[]; error?: { message?: string } } | null;
    if (!hist.ok) notes.push(`historical ${hist.status}: ${hb?.error?.message ?? 'error'}`);
    for (const r of hb?.results ?? []) if (r.text) rows.push(rowOf(r.text, r.keywordMetrics, 'historical', lang, null));

    if (req.ideas) {
      for (let i = 0; i < keywords.length; i += 10) {
        const seeds = keywords.slice(i, i + 10);
        const res = await fetch(`${base}:generateKeywordIdeas`, {
          method: 'POST', headers, cache: 'no-store',
          body: JSON.stringify({ ...common, includeAdultKeywords: false, keywordSeed: { keywords: seeds }, pageSize: 200 }),
        });
        const b = (await res.json().catch(() => null)) as { results?: { text?: string; keywordIdeaMetrics?: Metrics }[]; error?: { message?: string } } | null;
        if (!res.ok) { notes.push(`ideas ${res.status}: ${b?.error?.message ?? 'error'}`); break; }
        for (const r of b?.results ?? []) if (r.text) rows.push(rowOf(r.text, r.keywordIdeaMetrics, 'idea', lang, seeds.join(', ')));
      }
    }
    const unique = [...new Map(rows.map((r) => [`${r.keyword}|${r.source}`, r])).values()];
    for (let i = 0; i < unique.length; i += 500) {
      const { error } = await db.from('keyword_volumes').upsert(unique.slice(i, i + 500), { onConflict: 'keyword,geo,language,source' });
      if (error) notes.push(`store: ${error.message}`);
    }
    const msg = `keyword planner: ${unique.length} rows stored${notes.length ? `; ${notes.join('; ')}` : ''}`;
    await db.from('app_secrets').upsert({ key: 'keyword_planner_last_result', value: msg }, { onConflict: 'key' });
    return msg;
  } catch (e) {
    const msg = `keyword planner failed: ${(e as Error).message.slice(0, 300)}`;
    await db.from('app_secrets').upsert({ key: 'keyword_planner_last_result', value: msg }, { onConflict: 'key' });
    return msg;
  }
}
