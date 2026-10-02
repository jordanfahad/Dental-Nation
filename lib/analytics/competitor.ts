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
/** Bump when the snapshot gains fields: older snapshots are then refreshed on the next sync. */
const SNAPSHOT_VERSION = 7;
const WEEK_MS = 7 * 86400_000;
/** A failed read (no credit, outage) is retried after this long instead of waiting a week. */
const RETRY_MS = 6 * 3600_000;

/** True when the snapshot holds real figures (at least one market answered). */
export const hasData = (s: CompetitorSnapshot | null | undefined): s is CompetitorSnapshot => !!s && s.markets.some((m) => m.organicVisits !== null);

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

export interface PeerRow { domain: string; organicVisits: number | null; sharedKeywords: number | null; brandKeyword: string; brandSearches: number | null }
export interface MetaAdsSummary {
  /** Ads live in the EU countries checked (Meta discloses every EU ad). */
  activeAds: number;
  pages: string[];
  platforms: Record<string, number>;
  /** Sum of each ad's EU reach, as Meta reports it. */
  euReach: number;
  countries: string[];
  oldestStart: string | null;
  error?: string;
}

export interface CompetitorSnapshot {
  version?: number;
  domain: string;
  fetchedAt: string;
  markets: MarketRow[];
  /** Brand searches per month across the markets, oldest first ("YYYY-MM-01"). */
  brandTrend: { date: string; searches: number }[];
  /** Top non-brand keywords in the competitor's largest market. */
  topKeywords: { market: string; rows: KeywordRow[] } | null;
  backlinks: { rank: number | null; referringDomains: number | null; backlinks: number | null } | null;
  /** Domains competing for the same searches, per peer market, with their brand searches. */
  peers: { market: string; rows: PeerRow[] }[];
  metaAds: MetaAdsSummary | null;
  errors: string[];
}

/** Sites that compete for the same searches without being clinics: encyclopaedias, publishers, platforms, retailers. */
const NOT_A_CLINIC = /wikipedia|wikihow|healthline|doctissimo|gutefrage|justanswer|noon\.com|crest\.com|pierrefabre|sunstar|muenchener-verein|dentolo|zahn\.de|dentnet|smile2impress|webmd|nhs\.uk|mayoclinic|clevelandclinic|medicalnewstoday|verywell|youtube|facebook|instagram|tiktok|reddit|quora|pinterest|amazon|colgate|oral-?b|sensodyne|listerine|bupa|dentaly|bookimed|whatclinic|flymedi|trustpilot|medigo|qunomedical|clinicsoncall|theratravel|britannica|ada\.org|mouthhealthy|humana|aetna|cigna|deltadental|yelp|tripadvisor|google|apple|news|magazine|\.gov|\.edu|doctolib|zocdoc|practo|smile\.direct|invisalign|aligner|sci|journal|ncbi|pubmed/i;
/**
 * The spellings people search a clinic by, from its domain. "royalclinicdubai.com"
 * is searched as "royal clinic dubai", not as one word, so the label is split on
 * the words clinic names are built from and every variant is tried; the best
 * volume wins. Prefix words (dr, the, my) split only at the start.
 */
const NAME_WORDS = ['dental', 'hospital', 'medical', 'clinics', 'clinic', 'centre', 'center', 'smile', 'dubai', 'abudhabi', 'care', 'studio', 'tooth', 'teeth', 'club', 'ortho', 'implant', 'family', 'perfect', 'whites', 'royal', 'best', 'ave'];
const PREFIX_WORDS = ['dr', 'the', 'your'];
export function brandVariants(domain: string): string[] {
  const label = domain.replace(/^www\./, '').split('.')[0].toLowerCase();
  let sp = label.replace(/-/g, ' ');
  for (const w of NAME_WORDS) sp = sp.replace(new RegExp(w, 'g'), ` ${w} `);
  for (const w of PREFIX_WORDS) if (sp.startsWith(w) && sp.length > w.length + 2 && !sp.startsWith(`${w} `)) sp = `${w} ${sp.slice(w.length)}`;
  sp = sp.replace(/\s+/g, ' ').trim();
  // Keep the prefix (plain "michaels" is a craft store, "dr michaels" is the clinic); also try the name without a trailing "clinic".
  const noClinic = sp.replace(/ (dental )?clinics?$/, '');
  // A one-word leftover ("noa") is too generic to count as the brand.
  const keepNoClinic = noClinic !== sp && noClinic.includes(' ');
  return [...new Set([label.replace(/-/g, ' '), sp, ...(keepNoClinic ? [noClinic] : [])])].filter(Boolean);
}
const brandOfDomain = (d: string) => brandVariants(d)[1] ?? brandVariants(d)[0];

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
  const names = [c.brand, ...(c.brandAliases ?? [])];
  // "like a or like b": DataForSEO's filter syntax interleaves conditions with 'or'.
  const brandFilter = names.flatMap((n, i) => (i ? ['or', ['keyword_data.keyword', 'like', `%${n}%`]] : [['keyword_data.keyword', 'like', `%${n}%`]]));
  const notBrandFilter = names.flatMap((n, i) => (i ? ['and', ['keyword_data.keyword', 'not_like', `%${n}%`]] : [['keyword_data.keyword', 'not_like', `%${n}%`]]));
  const trend = new Map<string, number>();

  const markets = await Promise.all(c.markets.map(async (m): Promise<MarketRow> => {
    const [ov, brand, kw] = await Promise.all([
      labs(auth, 'domain_rank_overview', m, { target: c.domain }),
      labs(auth, 'ranked_keywords', m, { target: c.domain, limit: 100, filters: brandFilter, order_by: ['ranked_serp_element.serp_item.etv,desc'] }),
      labs(auth, 'keyword_overview', m, { keywords: [c.brandKeyword, ...(c.brandAliases ?? [])] }),
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
      // All spellings of the brand added together (Latin and Arabic, for example).
      row.brandSearches = 0;
      for (const item of (get(kw.result, 'items') as unknown[] | null) ?? []) {
        row.brandSearches += num(get(item, 'keyword_info.search_volume')) ?? 0;
        for (const ms of (get(item, 'keyword_info.monthly_searches') as unknown[] | null) ?? []) {
          const y = num(get(ms, 'year')), mo = num(get(ms, 'month')), v = num(get(ms, 'search_volume'));
          if (y && mo) { const k = `${y}-${String(mo).padStart(2, '0')}-01`; trend.set(k, (trend.get(k) ?? 0) + (v ?? 0)); }
        }
      }
    }
    return row;
  }));

  // What they win on outside their own name: top keywords in their largest market.
  let topKeywords: CompetitorSnapshot['topKeywords'] = null;
  const lead = [...markets].sort((a, b) => (b.organicVisits ?? 0) - (a.organicVisits ?? 0))[0];
  const leadMarket = c.markets.find((m) => m.name === lead?.market);
  if (leadMarket && (lead.organicVisits ?? 0) > 0) {
    const r = await labs(auth, 'ranked_keywords', leadMarket, { target: c.domain, limit: 15, filters: notBrandFilter, order_by: ['ranked_serp_element.serp_item.etv,desc'] });
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

  // Where the brand stands: the clinics competing for the same searches in each
  // peer market, with their Google traffic and how many people search their name.
  const peers = await Promise.all(c.markets.filter((m) => m.peers).map(async (m) => {
    const r = await labs(auth, 'competitors_domain', m, { target: c.domain, limit: 40, exclude_top_domains: true, order_by: ['intersections,desc'] });
    if (r.error) { errors.push(`${m.name} peers: ${r.error}`); return { market: m.name, rows: [] as PeerRow[] }; }
    const items = ((get(r.result, 'items') as unknown[] | null) ?? [])
      .map((i) => ({ domain: String(get(i, 'domain') ?? ''), shared: num(get(i, 'intersections')), etv: num(get(i, 'full_domain_metrics.organic.etv')) ?? num(get(i, 'metrics.organic.etv')) }))
      // A clinic, even a chain, does not get 300k+ Google visits a month: above that it is a publisher, retailer or insurer.
      .filter((x) => x.domain && x.domain !== c.domain && !NOT_A_CLINIC.test(x.domain) && (x.etv ?? 0) < 300_000)
      .slice(0, 8);
    // One keyword_overview call per market for every spelling of every peer; the best volume per peer wins.
    const variants = new Map(items.map((x) => [x.domain, brandVariants(x.domain)]));
    const kw = await labs(auth, 'keyword_overview', m, { keywords: [...new Set([...variants.values()].flat())].slice(0, 200) });
    const vol = new Map<string, number>();
    for (const item of (get(kw.result, 'items') as unknown[] | null) ?? []) vol.set(String(get(item, 'keyword') ?? '').toLowerCase(), num(get(item, 'keyword_info.search_volume')) ?? 0);
    const rows = items.map((x): PeerRow => {
      const best = [...(variants.get(x.domain) ?? [])].sort((a, b) => (vol.get(b) ?? 0) - (vol.get(a) ?? 0))[0] ?? brandOfDomain(x.domain);
      return { domain: x.domain, organicVisits: x.etv !== null ? Math.round(x.etv) : null, sharedKeywords: x.shared, brandKeyword: best, brandSearches: kw.error ? null : vol.get(best) ?? 0 };
    });
    if (kw.error) errors.push(`${m.name} peer brands: ${kw.error}`);
    return { market: m.name, rows };
  }));

  return {
    version: SNAPSHOT_VERSION,
    domain: c.domain,
    fetchedAt: new Date().toISOString(),
    markets,
    brandTrend: [...trend.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, searches]) => ({ date, searches })),
    topKeywords,
    backlinks,
    peers,
    metaAds: await metaAdLibrary(c),
    errors,
  };
}

/**
 * Meta Ad Library: in the EU, Meta discloses every ad a page runs, with its
 * reach. Reads the live ads whose page name carries the brand, in the
 * brand's EU markets. Needs the Meta token the ads sync already uses; any
 * refusal is reported on the page rather than hidden. Best-effort.
 */
async function metaAdLibrary(c: CompetitorDef): Promise<MetaAdsSummary | null> {
  const countries = c.markets.map((m) => m.adLibrary).filter((x): x is string => !!x);
  if (!countries.length) return null;
  const token = (process.env.META_ACCESS_TOKEN ?? '').trim();
  const version = (process.env.META_API_VERSION ?? '').trim() || 'v21.0';
  const empty: MetaAdsSummary = { activeAds: 0, pages: [], platforms: {}, euReach: 0, countries, oldestStart: null };
  if (!token) return { ...empty, error: 'Meta token not configured' };
  try {
    const u = new URL(`https://graph.facebook.com/${version}/ads_archive`);
    u.searchParams.set('search_terms', c.brand);
    u.searchParams.set('ad_type', 'ALL');
    u.searchParams.set('ad_active_status', 'ACTIVE');
    u.searchParams.set('ad_reached_countries', JSON.stringify(countries));
    u.searchParams.set('fields', 'id,page_name,ad_delivery_start_time,publisher_platforms,eu_total_reach');
    u.searchParams.set('limit', '250');
    u.searchParams.set('access_token', token);
    const out = { ...empty, platforms: {} as Record<string, number> };
    const pages = new Set<string>();
    let url: string | null = u.toString();
    for (let guard = 0; url && guard < 8; guard++) {
      const res: Response = await fetch(url, { cache: 'no-store' });
      const json = (await res.json().catch(() => null)) as { data?: Record<string, unknown>[]; paging?: { next?: string }; error?: { message?: string } } | null;
      if (!res.ok || !json || json.error) return { ...empty, error: json?.error?.message ?? `HTTP ${res.status}` };
      for (const ad of json.data ?? []) {
        const page = String(ad.page_name ?? '');
        if (!page.toLowerCase().includes(c.brand)) continue;
        out.activeAds += 1;
        pages.add(page);
        out.euReach += num(ad.eu_total_reach) ?? 0;
        for (const p of (ad.publisher_platforms as string[] | undefined) ?? []) out.platforms[p] = (out.platforms[p] ?? 0) + 1;
        const start = typeof ad.ad_delivery_start_time === 'string' ? ad.ad_delivery_start_time : null;
        if (start && (!out.oldestStart || start < out.oldestStart)) out.oldestStart = start;
      }
      url = json.paging?.next ?? null;
    }
    out.pages = [...pages];
    return out;
  } catch (err) {
    return { ...empty, error: (err as Error).message };
  }
}

/** Called by the sync cron: refresh any tracked domain whose snapshot is missing or a week old. */
export async function refreshCompetitorSnapshots(force = false): Promise<{ refreshed: string[]; note?: string }> {
  const db = getSupabaseAdmin();
  if (!db) return { refreshed: [], note: 'no database' };
  const all = [OWN, ...COMPETITORS];
  const { data } = await db.from('competitor_snapshots').select('domain, fetched_at, data').in('domain', all.map((c) => c.domain)).order('fetched_at', { ascending: false }).limit(40);
  const lastGood = new Map<string, number>();
  const lastTry = new Map<string, number>();
  for (const r of (data ?? []) as { domain: string; fetched_at: string; data: CompetitorSnapshot }[]) {
    const at = Date.parse(r.fetched_at);
    // Only failed reads gate the retry; a good snapshot of an older version is refreshed straight away.
    if (!hasData(r.data) && !lastTry.has(r.domain)) lastTry.set(r.domain, at);
    if (!lastGood.has(r.domain) && hasData(r.data) && (r.data.version ?? 1) >= SNAPSHOT_VERSION) lastGood.set(r.domain, at);
  }
  const now = Date.now();
  const due = all.filter((c) => force || (
    now - (lastGood.get(c.domain) ?? 0) > WEEK_MS && now - (lastTry.get(c.domain) ?? 0) > RETRY_MS
  ));
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
  const rows = (data ?? []) as { domain: string; data: CompetitorSnapshot }[];
  // Latest snapshot with real figures; otherwise the latest attempt (so the page can say why it is empty).
  for (const r of rows) if (!out.has(r.domain) && hasData(r.data)) out.set(r.domain, { ...r.data, peers: r.data.peers ?? [], metaAds: r.data.metaAds ?? null });
  for (const r of rows) if (!out.has(r.domain)) out.set(r.domain, r.data);
  return out;
}
