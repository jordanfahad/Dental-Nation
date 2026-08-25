import { getSearchConsoleClient } from '../google-auth';

/**
 * Google Search Console adapter — organic search performance (clicks,
 * impressions, CTR, average position, top queries & pages) via the Search
 * Analytics API, plus pages-indexed from the Sitemaps API. Never throws: any
 * failure returns an honest note so the Digital & SEO tab degrades to a gap.
 *
 * The service account (GOOGLE_SERVICE_ACCOUNT_EMAIL) must be added as a user on
 * the Search Console property and the Search Console API enabled in the project.
 * The property (siteUrl) is auto-detected from the sites the account can see
 * (env SEARCH_CONSOLE_SITE overrides — e.g. "sc-domain:dentalnation.com").
 */

export interface ScQuery { query: string; clicks: number; impressions: number; ctr: number; position: number }
export interface ScPage { page: string; clicks: number; impressions: number }
export interface ScCountry { country: string; clicks: number; impressions: number; ctr: number }
export interface ScDevice { device: string; clicks: number; impressions: number; ctr: number }
export interface ScDaily { date: string; clicks: number; impressions: number }
export interface SearchConsoleReport {
  available: boolean;
  note: string | null;
  siteUrl: string | null;
  clicks: number;
  impressions: number;
  ctr: number; // 0..1
  position: number | null; // average
  pagesIndexed: number | null; // from submitted sitemaps
  pagesInSearch: number; // distinct pages with impressions (a floor for "indexed")
  topQueries: ScQuery[];
  topPages: ScPage[];
  countries: ScCountry[]; // top countries by impressions
  devices: ScDevice[];
  daily: ScDaily[]; // clicks/impressions per day for the window
  uaeQueries: ScQuery[]; // query report filtered to UAE searchers only
}

const empty: SearchConsoleReport = {
  available: false, note: null, siteUrl: null, clicks: 0, impressions: 0, ctr: 0, position: null,
  pagesIndexed: null, pagesInSearch: 0, topQueries: [], topPages: [], countries: [], devices: [], daily: [], uaeQueries: [],
};

/** ISO-3166-1 alpha-3 (as GSC returns) → display name, for the markets that matter here. */
const COUNTRY_NAMES: Record<string, string> = {
  are: 'United Arab Emirates', sau: 'Saudi Arabia', ind: 'India', phl: 'Philippines', pak: 'Pakistan',
  egy: 'Egypt', gbr: 'United Kingdom', usa: 'United States', omn: 'Oman', qat: 'Qatar', kwt: 'Kuwait',
  bhr: 'Bahrain', jor: 'Jordan', zaf: 'South Africa', idn: 'Indonesia', mys: 'Malaysia', nga: 'Nigeria',
  bgd: 'Bangladesh', lka: 'Sri Lanka', ken: 'Kenya', irq: 'Iraq', irn: 'Iran', dza: 'Algeria', mar: 'Morocco',
};
const countryName = (code: string): string => COUNTRY_NAMES[code.toLowerCase()] ?? code.toUpperCase();

/** Pick the property this account can see (prefer a domain property). */
async function resolveSite(
  sc: ReturnType<typeof getSearchConsoleClient>,
): Promise<{ site: string | null; error: string | null }> {
  const override = process.env.SEARCH_CONSOLE_SITE?.trim();
  if (override) return { site: override, error: null };
  try {
    const { data } = await sc.sites.list();
    const entries = (data.siteEntry ?? []).map((e) => e.siteUrl ?? '').filter(Boolean);
    const dn = entries.filter((u) => /dentalnation/i.test(u));
    // Prefer a domain property (sc-domain:), then https, then anything.
    const site =
      dn.find((u) => u.startsWith('sc-domain:')) ?? dn.find((u) => u.startsWith('https://')) ?? dn[0] ?? entries[0] ?? null;
    return { site, error: site ? null : 'the service account sees an empty property list — permission may still be propagating' };
  } catch (e) {
    // Surface the REAL reason (API disabled vs permission vs quota) instead of
    // collapsing every failure into "add it as a user".
    return { site: null, error: (e as Error).message };
  }
}

export async function fetchSearchConsole(from: string, to: string): Promise<SearchConsoleReport> {
  let sc: ReturnType<typeof getSearchConsoleClient>;
  try {
    sc = getSearchConsoleClient();
  } catch (e) {
    return { ...empty, note: (e as Error).message };
  }

  const { site: siteUrl, error: siteError } = await resolveSite(sc);
  if (!siteUrl) return { ...empty, note: `Search Console: ${siteError ?? 'no property visible to the service account (add it as a user)'}` };

  try {
    const [totalsRes, queriesRes, pagesRes, countryRes, deviceRes, dailyRes, uaeRes] = await Promise.all([
      sc.searchanalytics.query({ siteUrl, requestBody: { startDate: from, endDate: to, dimensions: [], rowLimit: 1 } }),
      sc.searchanalytics.query({ siteUrl, requestBody: { startDate: from, endDate: to, dimensions: ['query'], rowLimit: 250 } }),
      sc.searchanalytics.query({ siteUrl, requestBody: { startDate: from, endDate: to, dimensions: ['page'], rowLimit: 1000 } }),
      sc.searchanalytics.query({ siteUrl, requestBody: { startDate: from, endDate: to, dimensions: ['country'], rowLimit: 25 } }),
      sc.searchanalytics.query({ siteUrl, requestBody: { startDate: from, endDate: to, dimensions: ['device'], rowLimit: 5 } }),
      sc.searchanalytics.query({ siteUrl, requestBody: { startDate: from, endDate: to, dimensions: ['date'], rowLimit: 1000 } }),
      // The UAE-only query report — the demand that can actually walk into a
      // Dubai clinic, cleaned of the international long tail.
      sc.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: from, endDate: to, dimensions: ['query'], rowLimit: 250,
          dimensionFilterGroups: [{ filters: [{ dimension: 'country', operator: 'equals', expression: 'are' }] }],
        },
      }),
    ]);

    const t = totalsRes.data.rows?.[0];
    const topQueries: ScQuery[] = (queriesRes.data.rows ?? []).map((r) => ({
      query: r.keys?.[0] ?? '(unknown)',
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      ctr: r.ctr ?? 0,
      position: r.position ?? 0,
    }));
    const pageRows = pagesRes.data.rows ?? [];
    const topPages: ScPage[] = pageRows
      .slice()
      .sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0))
      .slice(0, 10)
      .map((r) => ({ page: r.keys?.[0] ?? '', clicks: r.clicks ?? 0, impressions: r.impressions ?? 0 }));

    // Pages indexed: sum "indexed" across submitted sitemaps (best-effort).
    let pagesIndexed: number | null = null;
    try {
      const sm = await sc.sitemaps.list({ siteUrl });
      let idx = 0;
      let sawCount = false;
      for (const s of sm.data.sitemap ?? []) {
        for (const c of s.contents ?? []) {
          const n = Number(c.indexed ?? c.submitted ?? 0);
          if (Number.isFinite(n) && n > 0) { idx += n; sawCount = true; }
        }
      }
      pagesIndexed = sawCount ? idx : null;
    } catch {
      pagesIndexed = null;
    }

    const asQuery = (r: { keys?: string[] | null; clicks?: number | null; impressions?: number | null; ctr?: number | null; position?: number | null }): ScQuery => ({
      query: r.keys?.[0] ?? '(unknown)',
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      ctr: r.ctr ?? 0,
      position: r.position ?? 0,
    });

    return {
      available: (t?.impressions ?? 0) > 0 || (t?.clicks ?? 0) > 0,
      note: null,
      siteUrl,
      clicks: t?.clicks ?? 0,
      impressions: t?.impressions ?? 0,
      ctr: t?.ctr ?? 0,
      position: t?.position ?? null,
      pagesIndexed,
      pagesInSearch: pageRows.length,
      topQueries,
      topPages,
      countries: (countryRes.data.rows ?? []).map((r) => ({
        country: countryName(r.keys?.[0] ?? ''),
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
        ctr: r.ctr ?? 0,
      })),
      devices: (deviceRes.data.rows ?? []).map((r) => ({
        device: (r.keys?.[0] ?? '').toLowerCase(),
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
        ctr: r.ctr ?? 0,
      })),
      daily: (dailyRes.data.rows ?? [])
        .map((r) => ({ date: r.keys?.[0] ?? '', clicks: r.clicks ?? 0, impressions: r.impressions ?? 0 }))
        .filter((r) => r.date)
        .sort((a, b) => a.date.localeCompare(b.date)),
      uaeQueries: (uaeRes.data.rows ?? []).map(asQuery),
    };
  } catch (e) {
    return { ...empty, siteUrl, note: (e as Error).message };
  }
}
