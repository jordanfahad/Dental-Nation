import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { COMPETITORS, OWN, type CompetitorDef, type Market } from '@/config/competitors';

/**
 * Competitor analysis snapshots (Digital & SEO › Competitor analysis).
 *
 * What can honestly be measured from outside a competitor's business:
 *  - Google search traffic by market: DataForSEO Labs estimates the monthly
 *    organic and paid clicks a domain gets from Google (ETV), how many keywords
 *    it ranks for, and what its Google Ads clicks would cost (≈ ad spend).
 *  - Brand affinity: how many people search for the brand by name each month
 *    (and the 12-month trend), and how much of the site's Google traffic comes
 *    from people already searching the brand.
 *  - Authority: referring domains and backlinks.
 * Total website traffic (direct, social, email) and real lead counts are
 * private; leads are estimated two ways and shown as ranges (see the page).
 *
 * The sync cron refreshes each domain weekly (DataForSEO credits) and stores
 * the result in lane_e.competitor_snapshots; the page only reads.
 */

const LABS = 'https://api.dataforseo.com/v3/dataforseo_labs/google';
const WEEK_MS = 7 * 86400_000;

export interface MarketRow {
  market: string;
  organicVisits: number | null;
  organicKeywords: number | null;
  top3: number | null;
  paidVisits: number | null;
  paidKeywords: number | null;
  /** What the paid clicks would cost at Google prices (USD) ≈ monthly Google Ads spend. */
  paidCostUsd: number | null;
  /** Monthly searches for the brand in this market. */
  brandSearches: number | null;
  /** Organic visits from searches that contain the brand name. */
  brandVisits: number | null;
  error?: string;
}

export interface KeywordRow { keyword: string; volume: number | null; position: number | null; visits: number | null }

export interface CompetitorSnapshot {
  domain: string;
  fetchedAt: string;
  markets: MarketRow[];
  /** Brand searches per month across the markets, oldest first ("YYYY-MM-01"). */
  brandTrend: { date: string; searches: number }[];
  /** Top non-brand keywords in the competitor's largest market. */
  topKeywords: { market: string; rows: KeywordRow[] } | null;
  backlinks: { rank: number | null; referringDomains: number | null; backlinks: number | null } | null;
  errors: string[];
}

async function readCreds(): Promise<string | null> {
  const db = getSupabaseAdmin();
  let login = (process.env.DATAFORSEO_LOGIN ?? '').trim();
  let password = (process.env.DATAFORSEO_PASSWORD ?? '').trim();
  if ((!login || !password) && db) {
    const { data } = await db.from('app_secrets').select('key, value').in('key', ['dataforseo_login', 'dataforseo_password']);
    const m = new Map((data ?? []).map((r: { key: string; value: string }) => [r.key, String(r.value ?? '').trim()]));
    login ||= m.get('dataforseo_login') ?? '';
    password ||= m.get('dataforseo_password') ?? '';
  }
  return login && password ? `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}` : null;
}

type Task = { status_code?: number; status_message?: string; result?: unknown[] | null };

async function post(auth: string, url: string, body: Record<string, unknown>): Promise<{ result: Record<string, unknown> | null; error: string | null }> {
  try {
    const res = await fetch(url, { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' }, body: JSON.stringify([body]), cache: 'no-store' });
    const json = (await res.json().catch(() => null)) as { status_code?: number; status_message?: string; tasks?: Task[] } | null;
    const task = json?.tasks?.[0];
    if (!res.ok || json?.status_code !== 20000) return { result: null, error: `${res.status} ${json?.status_message ?? ''}`.trim() };
    if (task?.status_code !== 20000) return { result: null, error: `${task?.status_code} ${task?.status_message ?? ''}`.trim() };
    return { result: (task.result?.[0] as Record<string, unknown>) ?? null, error: null };
  } catch (err) {
    return { result: null, error: (err as Error).message };
  }
}

/** A Labs call in the market's language, retried in English when that language is not offered. */
async function labs(auth: string, endpoint: string, m: Market, body: Record<string, unknown>) {
  const r = await post(auth, `${LABS}/${endpoint}/live`, { ...body, location_code: m.code, language_code: m.lang });
  if (r.error && m.lang !== 'en') return post(auth, `${LABS}/${endpoint}/live`, { ...body, location_code: m.code, language_code: 'en' });
  return r;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const get = (o: unknown, path: string): unknown => path.split('.').reduce<unknown>((a, k) => (a && typeof a === 'object' ? (a as Record<string, unknown>)[k] : undefined), o);

async function buildSnapshot(auth: string, c: CompetitorDef): Promise<CompetitorSnapshot> {
  const errors: string[] = [];
  const like = `%${c.brand}%`;
  const trend = new Map<string, number>();

  const markets = await Promise.all(c.markets.map(async (m): Promise<MarketRow> => {
    const [ov, brand, kw] = await Promise.all([
      labs(auth, 'domain_rank_overview', m, { target: c.domain }),
      labs(auth, 'ranked_keywords', m, { target: c.domain, limit: 100, filters: [['keyword_data.keyword', 'like', like]], order_by: ['ranked_serp_element.serp_item.etv,desc'] }),
      labs(auth, 'keyword_overview', m, { keywords: [c.brandKeyword] }),
    ]);
    const row: MarketRow = { market: m.name, organicVisits: null, organicKeywords: null, top3: null, paidVisits: null, paidKeywords: null, paidCostUsd: null, brandSearches: null, brandVisits: null };
    const errs = [ov.error && `overview ${ov.error}`, brand.error && `brand keywords ${brand.error}`, kw.error && `brand searches ${kw.error}`].filter(Boolean) as string[];
    if (errs.length) { row.error = errs.join('; '); errors.push(`${m.name}: ${row.error}`); }

    const metrics = get(ov.result, 'items.0.metrics');
    const org = get(metrics, 'organic');
    const paid = get(metrics, 'paid');
    if (org) {
      row.organicVisits = num(get(org, 'etv')) !== null ? Math.round(num(get(org, 'etv'))!) : null;
      row.organicKeywords = num(get(org, 'count'));
      row.top3 = (num(get(org, 'pos_1')) ?? 0) + (num(get(org, 'pos_2_3')) ?? 0);
    } else if (!ov.error) {
      row.organicVisits = 0; row.organicKeywords = 0; row.top3 = 0;
    }
    if (paid) {
      row.paidVisits = num(get(paid, 'etv')) !== null ? Math.round(num(get(paid, 'etv'))!) : null;
      row.paidKeywords = num(get(paid, 'count'));
      row.paidCostUsd = num(get(paid, 'estimated_paid_traffic_cost')) !== null ? Math.round(num(get(paid, 'estimated_paid_traffic_cost'))!) : null;
    } else if (!ov.error) {
      row.paidVisits = 0; row.paidKeywords = 0; row.paidCostUsd = 0;
    }

    if (!brand.error) {
      const items = (get(brand.result, 'items') as unknown[] | null) ?? [];
      row.brandVisits = Math.round(items.reduce<number>((n, i) => n + (num(get(i, 'ranked_serp_element.serp_item.etv')) ?? 0), 0));
    }
    if (!kw.error) {
      const item = ((get(kw.result, 'items') as unknown[] | null) ?? [])[0];
      row.brandSearches = num(get(item, 'keyword_info.search_volume')) ?? 0;
      for (const ms of (get(item, 'keyword_info.monthly_searches') as unknown[] | null) ?? []) {
        const y = num(get(ms, 'year')), mo = num(get(ms, 'month')), v = num(get(ms, 'search_volume'));
        if (y && mo) { const k = `${y}-${String(mo).padStart(2, '0')}-01`; trend.set(k, (trend.get(k) ?? 0) + (v ?? 0)); }
      }
    }
    return row;
  }));

  // What they win on outside their own name: top keywords in their largest market.
  let topKeywords: CompetitorSnapshot['topKeywords'] = null;
  const lead = [...markets].sort((a, b) => (b.organicVisits ?? 0) - (a.organicVisits ?? 0))[0];
  const leadMarket = c.markets.find((m) => m.name === lead?.market);
  if (leadMarket && (lead.organicVisits ?? 0) > 0) {
    const r = await labs(auth, 'ranked_keywords', leadMarket, { target: c.domain, limit: 15, filters: [['keyword_data.keyword', 'not_like', `%${c.brand}%`]], order_by: ['ranked_serp_element.serp_item.etv,desc'] });
    if (r.error) errors.push(`top keywords: ${r.error}`);
    else topKeywords = {
      market: leadMarket.name,
      rows: ((get(r.result, 'items') as unknown[] | null) ?? []).map((i) => ({
        keyword: String(get(i, 'keyword_data.keyword') ?? ''),
        volume: num(get(i, 'keyword_data.keyword_info.search_volume')),
        position: num(get(i, 'ranked_serp_element.serp_item.rank_group')),
        visits: num(get(i, 'ranked_serp_element.serp_item.etv')) !== null ? Math.round(num(get(i, 'ranked_serp_element.serp_item.etv'))!) : null,
      })),
    };
  }

  const bl = await post(auth, 'https://api.dataforseo.com/v3/backlinks/summary/live', { target: c.domain, include_subdomains: true, internal_list_limit: 1 });
  if (bl.error) errors.push(`backlinks: ${bl.error}`);
  const backlinks = bl.result ? { rank: num(bl.result.rank), referringDomains: num(bl.result.referring_main_domains) ?? num(bl.result.referring_domains), backlinks: num(bl.result.backlinks) } : null;

  return {
    domain: c.domain,
    fetchedAt: new Date().toISOString(),
    markets,
    brandTrend: [...trend.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, searches]) => ({ date, searches })),
    topKeywords,
    backlinks,
    errors,
  };
}

/** Called by the sync cron: refresh any tracked domain whose snapshot is missing or a week old. */
export async function refreshCompetitorSnapshots(force = false): Promise<{ refreshed: string[]; note?: string }> {
  const db = getSupabaseAdmin();
  if (!db) return { refreshed: [], note: 'no database' };
  const all = [OWN, ...COMPETITORS];
  const { data } = await db.from('competitor_snapshots').select('domain, fetched_at').in('domain', all.map((c) => c.domain)).order('fetched_at', { ascending: false });
  const latest = new Map<string, string>();
  for (const r of (data ?? []) as { domain: string; fetched_at: string }[]) if (!latest.has(r.domain)) latest.set(r.domain, r.fetched_at);
  const due = all.filter((c) => force || !latest.has(c.domain) || Date.now() - Date.parse(latest.get(c.domain)!) > WEEK_MS);
  if (!due.length) return { refreshed: [] };
  const auth = await readCreds();
  if (!auth) return { refreshed: [], note: 'DataForSEO not configured' };
  const refreshed: string[] = [];
  for (const c of due) {
    const snap = await buildSnapshot(auth, c);
    await db.from('competitor_snapshots').insert({ domain: c.domain, fetched_at: snap.fetchedAt, data: snap });
    refreshed.push(c.domain);
  }
  return { refreshed };
}

export async function getCompetitorSnapshots(): Promise<Map<string, CompetitorSnapshot>> {
  const db = getSupabaseAdmin();
  const out = new Map<string, CompetitorSnapshot>();
  if (!db) return out;
  const { data } = await db.from('competitor_snapshots').select('domain, data, fetched_at').order('fetched_at', { ascending: false }).limit(50);
  for (const r of (data ?? []) as { domain: string; data: CompetitorSnapshot }[]) if (!out.has(r.domain)) out.set(r.domain, r.data);
  return out;
}
