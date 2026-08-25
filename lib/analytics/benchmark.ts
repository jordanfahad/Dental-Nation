import 'server-only';
import { unstable_cache } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Competitor benchmarking beyond backlinks — the technical and commercial
 * lenses, each built only on what can honestly be measured:
 *
 *  TECHNICAL — Lighthouse audits ANY public homepage, so the same four scores
 *  the site is graded on (performance / SEO / accessibility / best practices,
 *  mobile) are run for the competitor set with the existing PSI key. Weekly
 *  cache: a Lighthouse run is ~30s per site and scores move slowly. The cron
 *  warms it so a board member never pays the cold run.
 *
 *  COMMERCIAL — competitors' real lead counts are private, full stop. The
 *  honest proxy is DataForSEO Labs' estimated organic traffic (ETV) and
 *  ranked-keyword count, with an estimated lead RANGE at industry conversion
 *  (1–3% of organic visits). Dental Nation's own row uses REAL numbers from
 *  the platform; competitor call clicks do not exist outside their own
 *  Business Profiles and are never estimated here.
 */

const SITE_DOMAIN = 'dentalnation.com';

async function readConfig(): Promise<{ dfsLogin: string | null; dfsPassword: string | null; competitors: string[] }> {
  const db = getSupabaseAdmin();
  if (!db) return { dfsLogin: null, dfsPassword: null, competitors: [] };
  try {
    const { data } = await db
      .from('app_secrets')
      .select('key, value')
      .in('key', ['dataforseo_login', 'dataforseo_password', 'seo_competitor_domains']);
    const map = new Map((data ?? []).map((r: { key: string; value: string }) => [r.key, String(r.value ?? '').trim()]));
    return {
      dfsLogin: (process.env.DATAFORSEO_LOGIN ?? '').trim() || map.get('dataforseo_login') || null,
      dfsPassword: (process.env.DATAFORSEO_PASSWORD ?? '').trim() || map.get('dataforseo_password') || null,
      competitors: (map.get('seo_competitor_domains') ?? '')
        .split(',')
        .map((s) => s.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
        .filter(Boolean),
    };
  } catch {
    return { dfsLogin: null, dfsPassword: null, competitors: [] };
  }
}

/* ── Technical: Lighthouse via PSI for every domain's homepage ── */

export interface TechScore {
  domain: string;
  performance: number | null;
  seo: number | null;
  accessibility: number | null;
  bestPractices: number | null;
}

interface PsiResponse {
  lighthouseResult?: {
    categories?: {
      performance?: { score?: number | null };
      seo?: { score?: number | null };
      accessibility?: { score?: number | null };
      'best-practices'?: { score?: number | null };
    };
  };
}

const to100 = (s: number | null | undefined): number | null => (s == null ? null : Math.round(s * 100));

const fetchTechBenchmark = unstable_cache(
  async (domains: string[], apiKey: string | null): Promise<TechScore[]> =>
    Promise.all(
      domains.map(async (domain): Promise<TechScore> => {
        const none: TechScore = { domain, performance: null, seo: null, accessibility: null, bestPractices: null };
        try {
          const u = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
          u.searchParams.set('url', `https://${domain}/`);
          u.searchParams.set('strategy', 'mobile');
          for (const c of ['PERFORMANCE', 'SEO', 'ACCESSIBILITY', 'BEST_PRACTICES']) u.searchParams.append('category', c);
          if (apiKey) u.searchParams.set('key', apiKey);
          const res = await fetch(u.toString(), { cache: 'no-store' });
          if (!res.ok) return none;
          const json = (await res.json()) as PsiResponse;
          const cat = json.lighthouseResult?.categories;
          return {
            domain,
            performance: to100(cat?.performance?.score),
            seo: to100(cat?.seo?.score),
            accessibility: to100(cat?.accessibility?.score),
            bestPractices: to100(cat?.['best-practices']?.score),
          };
        } catch {
          return none;
        }
      }),
    ),
  ['tech-benchmark-v1'],
  { revalidate: 604800 }, // 7 days — Lighthouse runs are slow; the cron warms this
);

export async function getTechBenchmark(): Promise<TechScore[]> {
  const { competitors } = await readConfig();
  const domains = [SITE_DOMAIN, ...competitors.filter((c) => c !== SITE_DOMAIN)];
  return fetchTechBenchmark(domains, process.env.PAGESPEED_API_KEY?.trim() || null);
}

/* ── Commercial: estimated organic traffic (DataForSEO Labs) + our actuals ── */

export interface CommercialRow {
  domain: string;
  /** Estimated monthly organic visits from Google (DataForSEO Labs ETV). */
  estMonthlyOrganicVisits: number | null;
  /** Keywords the domain ranks for (top 100 positions). */
  keywordsRanked: number | null;
}

interface LabsResponse {
  status_code?: number;
  tasks?: {
    status_code?: number;
    result?: { items?: { metrics?: { organic?: { etv?: number; count?: number } } }[] | null }[] | null;
  }[];
}

const fetchCommercialBenchmark = unstable_cache(
  async (login: string, password: string, domains: string[]): Promise<CommercialRow[]> => {
    const auth = `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`;
    return Promise.all(
      domains.map(async (domain): Promise<CommercialRow> => {
        const none: CommercialRow = { domain, estMonthlyOrganicVisits: null, keywordsRanked: null };
        try {
          const res = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/domain_rank_overview/live', {
            method: 'POST',
            headers: { Authorization: auth, 'Content-Type': 'application/json' },
            // UAE market, English — the market the clinics actually compete in.
            body: JSON.stringify([{ target: domain, location_code: 2784, language_code: 'en' }]),
            cache: 'no-store',
          });
          if (!res.ok) return none;
          const json = (await res.json()) as LabsResponse;
          const task = json.tasks?.[0];
          const organic = task?.result?.[0]?.items?.[0]?.metrics?.organic;
          if (json.status_code !== 20000 || task?.status_code !== 20000 || !organic) return none;
          return {
            domain,
            estMonthlyOrganicVisits: organic.etv != null ? Math.round(organic.etv) : null,
            keywordsRanked: organic.count ?? null,
          };
        } catch {
          return none;
        }
      }),
    );
  },
  ['commercial-benchmark-v1'],
  { revalidate: 604800 }, // 7 days — spends DataForSEO credits
);

export interface OwnActuals {
  /** Verified booking-widget lead forms, last 30 days (real). */
  widgetLeads30d: number | null;
  /** Campaign/site form entries (deduped people), last 30 days (real). */
  formLeads30d: number | null;
  /** Business Profile Call-button taps, last 30 days (real). */
  gmbCallTaps30d: number | null;
}

async function getOwnActuals(): Promise<OwnActuals> {
  const db = getSupabaseAdmin();
  const none: OwnActuals = { widgetLeads30d: null, formLeads30d: null, gmbCallTaps30d: null };
  if (!db) return none;
  const from = new Date(Date.now() - 30 * 86400_000).toISOString();
  const fromDay = from.slice(0, 10);
  try {
    const [widget, forms, gmb] = await Promise.all([
      db.from('raw_zavis').select('data'),
      db.from('ops_form_entries').select('phone9, entry_id, submitted_at').gte('submitted_at', from),
      db.from('social_insights').select('value').eq('channel', 'gmb').eq('metric', 'calls').gte('day', fromDay),
    ]);
    let widgetLeads = 0;
    for (const r of (widget.data as { data: Record<string, unknown> }[] | null) ?? []) {
      const d = r.data ?? {};
      const ts = String(d['Timestamp'] ?? '');
      const name = String(d['Full Name'] ?? d['Name'] ?? '');
      const email = String(d['Email'] ?? '');
      if (!ts || Number.isNaN(Date.parse(ts)) || new Date(ts).toISOString() < from) continue;
      if (/test|sagar/i.test(name) || /zavis|test/i.test(email)) continue;
      widgetLeads += 1;
    }
    const people = new Set(
      ((forms.data as { phone9: string | null; entry_id: string }[] | null) ?? []).map((r) => r.phone9 || r.entry_id),
    );
    const calls = ((gmb.data as { value: number | null }[] | null) ?? []).reduce((a, r) => a + (r.value ?? 0), 0);
    return { widgetLeads30d: widgetLeads, formLeads30d: people.size, gmbCallTaps30d: gmb.data ? calls : null };
  } catch {
    return none;
  }
}

/* ── Market granularity: organic demand per emirate (DataForSEO Labs) ──
 * Search Console only reports at COUNTRY level, so emirate-level visibility
 * comes from the Labs estimates instead — per Google Ads geotarget region.
 * Dubai (9041083) and Abu Dhabi (9041082) are verified against Google's
 * geotarget data; more markets can be added via app_secrets seo_market_codes
 * ("Label:code,Label:code") without a deploy. UAE-wide (2784) anchors scale.
 */

const DEFAULT_MARKETS: { label: string; code: number }[] = [
  { label: 'Dubai', code: 9041083 },
  { label: 'Abu Dhabi', code: 9041082 },
  { label: 'UAE-wide', code: 2784 },
];

async function readMarkets(): Promise<{ label: string; code: number }[]> {
  const db = getSupabaseAdmin();
  if (!db) return DEFAULT_MARKETS;
  try {
    const { data } = await db.from('app_secrets').select('value').eq('key', 'seo_market_codes').maybeSingle();
    const raw = String((data as { value?: string } | null)?.value ?? '').trim();
    if (!raw) return DEFAULT_MARKETS;
    const parsed = raw
      .split(',')
      .map((pair) => {
        const [label, code] = pair.split(':').map((s) => s.trim());
        return label && Number.isFinite(Number(code)) ? { label, code: Number(code) } : null;
      })
      .filter((m): m is { label: string; code: number } => m !== null);
    return parsed.length > 0 ? parsed : DEFAULT_MARKETS;
  } catch {
    return DEFAULT_MARKETS;
  }
}

/**
 * Physical clinic footprint per domain — researched Aug 2026 from each
 * group's own locations page (counts rounded where sources disagree; Dr Joy
 * lists 11–13 branches depending on source). Static and editable: update
 * here when a group opens or closes clinics. Every group in the set operates
 * in Dubai; none list Abu Dhabi or Sharjah branches, which makes the
 * demand-per-clinic normalisation a like-for-like Dubai comparison.
 */
export const CLINIC_FOOTPRINT: Record<string, { clinics: number; footprint: string }> = {
  'dentalnation.com': { clinics: 3, footprint: 'Al Wasl · Dr Tosun · Al Maher' },
  'thedentalstudio.ae': { clinics: 4, footprint: 'Jumeirah · Jumeirah Park · Umm Al Sheif · Science Park' },
  'drjoydentalclinic.com': { clinics: 12, footprint: '~12 branches, all Dubai (Palm, Marina, Mirdif, Hills…)' },
  'drmichaels.com': { clinics: 4, footprint: 'Jumeirah · Umm Suqeim, all Dubai' },
};

export interface MarketCell {
  market: string;
  visits: number | null;
  keywords: number | null;
}
export interface MarketDemandRow {
  domain: string;
  cells: MarketCell[];
}
export interface MarketDemand {
  available: boolean;
  note: string | null;
  markets: string[];
  rows: MarketDemandRow[];
}

const fetchMarketDemand = unstable_cache(
  async (login: string, password: string, domains: string[], markets: { label: string; code: number }[]): Promise<MarketDemandRow[]> => {
    const auth = `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`;
    const one = async (domain: string, code: number): Promise<{ visits: number | null; keywords: number | null }> => {
      try {
        const res = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/domain_rank_overview/live', {
          method: 'POST',
          headers: { Authorization: auth, 'Content-Type': 'application/json' },
          body: JSON.stringify([{ target: domain, location_code: code, language_code: 'en' }]),
          cache: 'no-store',
        });
        if (!res.ok) return { visits: null, keywords: null };
        const json = (await res.json()) as LabsResponse;
        const task = json.tasks?.[0];
        const organic = task?.result?.[0]?.items?.[0]?.metrics?.organic;
        if (json.status_code !== 20000 || task?.status_code !== 20000 || !organic) return { visits: null, keywords: null };
        return { visits: organic.etv != null ? Math.round(organic.etv) : null, keywords: organic.count ?? null };
      } catch {
        return { visits: null, keywords: null };
      }
    };
    return Promise.all(
      domains.map(async (domain) => ({
        domain,
        cells: await Promise.all(markets.map(async (m) => ({ market: m.label, ...(await one(domain, m.code)) }))),
      })),
    );
  },
  ['market-demand-v1'],
  { revalidate: 604800 }, // 7 days — domains × markets tasks per refresh
);

export async function getMarketDemand(): Promise<MarketDemand> {
  const { dfsLogin, dfsPassword, competitors } = await readConfig();
  const markets = await readMarkets();
  if (!dfsLogin || !dfsPassword) {
    return { available: false, note: 'DataForSEO credentials not configured.', markets: markets.map((m) => m.label), rows: [] };
  }
  const domains = [SITE_DOMAIN, ...competitors.filter((c) => c !== SITE_DOMAIN)];
  try {
    const rows = await fetchMarketDemand(dfsLogin, dfsPassword, domains, markets);
    return {
      available: rows.some((r) => r.cells.some((c) => c.visits != null)),
      note: null,
      markets: markets.map((m) => m.label),
      rows,
    };
  } catch (err) {
    return { available: false, note: `Market demand lookup failed: ${(err as Error).message}`, markets: markets.map((m) => m.label), rows: [] };
  }
}

export interface CommercialBenchmark {
  available: boolean;
  note: string | null;
  rows: CommercialRow[];
  actuals: OwnActuals;
}

export async function getCommercialBenchmark(): Promise<CommercialBenchmark> {
  const { dfsLogin, dfsPassword, competitors } = await readConfig();
  const actuals = await getOwnActuals();
  if (!dfsLogin || !dfsPassword) {
    return { available: false, note: 'DataForSEO credentials not configured.', rows: [], actuals };
  }
  const domains = [SITE_DOMAIN, ...competitors.filter((c) => c !== SITE_DOMAIN)];
  try {
    const rows = await fetchCommercialBenchmark(dfsLogin, dfsPassword, domains);
    return { available: rows.some((r) => r.estMonthlyOrganicVisits != null), note: null, rows, actuals };
  } catch (err) {
    return { available: false, note: `Commercial benchmark failed: ${(err as Error).message}`, rows: [], actuals };
  }
}
