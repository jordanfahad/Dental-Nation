import 'server-only';
import type { AdminClient } from '@/lib/supabase/server';
import { getGoogleAdsConfig, type GoogleAdsConfig } from '@/config/google-ads';

/**
 * Google Ads adapter — pulls campaign-level DAILY metrics via the Google Ads API
 * (GAQL searchStream) into bronze lane_e.google_ads_insights_raw.
 *
 * Auth: exchange the refresh token for an access token, then call
 *   POST /{ver}/customers/{cid}/googleAds:searchStream
 *   headers: Authorization: Bearer …, developer-token: …, login-customer-id: <MCC>
 * cost_micros / 1e6 = spend. Never throws — returns a typed result. The API
 * version is env-configurable (bump GOOGLE_ADS_API_VERSION if a version 404s).
 */

export interface GAdsSyncResult {
  ok: boolean;
  fetched: number;
  stored: number;
  customers: number;
  note?: string;
  error?: string;
}
export interface GAdsSyncOpts {
  days?: number; // trailing window when from/to absent (default 30)
  from?: string;
  to?: string;
  /** Override the API version (for finding the live version without a redeploy). */
  version?: string;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

async function getAccessToken(cfg: GoogleAdsConfig): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      refresh_token: cfg.refreshToken,
      grant_type: 'refresh_token',
    }),
    cache: 'no-store',
  });
  const body = (await res.json().catch(() => null)) as { access_token?: string; error_description?: string } | null;
  if (!body?.access_token) {
    throw new Error(`Google OAuth refresh failed: ${body?.error_description ?? res.status}`);
  }
  return body.access_token;
}

interface GAdsRow {
  campaign?: { id?: string; name?: string };
  segments?: { date?: string };
  metrics?: { costMicros?: string; impressions?: string; clicks?: string; conversions?: number };
}

/** Build request headers; login-customer-id is only sent when provided. */
function gAdsHeaders(cfg: GoogleAdsConfig, accessToken: string, loginCustomerId: string | null): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': cfg.developerToken,
    'Content-Type': 'application/json',
  };
  if (loginCustomerId) h['login-customer-id'] = loginCustomerId;
  return h;
}

async function fetchCustomer(
  cfg: GoogleAdsConfig,
  accessToken: string,
  customerId: string,
  from: string,
  to: string,
  version: string,
  loginCustomerId: string | null,
): Promise<GAdsRow[]> {
  const query =
    `SELECT campaign.id, campaign.name, segments.date, metrics.cost_micros, ` +
    `metrics.impressions, metrics.clicks, metrics.conversions ` +
    `FROM campaign WHERE segments.date BETWEEN '${from}' AND '${to}'`;
  // Non-streaming :search (paginated JSON) — more robust over REST than
  // :searchStream. Page through nextPageToken until exhausted. If querying via a
  // configured manager (login-customer-id) is permission-denied (that manager
  // doesn't manage this account), automatically fall back to DIRECT access.
  const out: GAdsRow[] = [];
  let pageToken: string | undefined;
  let effectiveLcid = loginCustomerId;
  let triedDirect = false;
  for (let guard = 0; guard < 200; guard++) {
    const res = await fetch(
      `https://googleads.googleapis.com/${version}/customers/${customerId}/googleAds:search`,
      {
        method: 'POST',
        headers: gAdsHeaders(cfg, accessToken, effectiveLcid),
        body: JSON.stringify({ query, ...(pageToken ? { pageToken } : {}) }),
        cache: 'no-store',
      },
    );
    const text = await res.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error(`Google Ads non-JSON (${res.status}): ${text.slice(0, 300)}`);
    }
    const obj = body as { results?: GAdsRow[]; nextPageToken?: string; error?: { message?: string; status?: string } };
    if (obj.error) {
      const denied = res.status === 403 || /permission/i.test(obj.error.message ?? '') || obj.error.status === 'PERMISSION_DENIED';
      if (denied && effectiveLcid && !triedDirect) {
        // Retry the same page with direct access (no login-customer-id).
        effectiveLcid = null;
        triedDirect = true;
        continue;
      }
      throw new Error(`Google Ads API: ${obj.error.message ?? text.slice(0, 300)}`);
    }
    if (Array.isArray(obj.results)) out.push(...obj.results);
    if (!obj.nextPageToken) break;
    pageToken = obj.nextPageToken;
  }
  return out;
}

export async function syncGoogleAds(supabase: AdminClient, opts: GAdsSyncOpts = {}): Promise<GAdsSyncResult> {
  const cfg = getGoogleAdsConfig();
  if (!cfg) return { ok: false, fetched: 0, stored: 0, customers: 0, error: 'not_configured' };
  try {
    const days = opts.days ?? 30;
    const to = opts.to ?? iso(new Date());
    const from = opts.from ?? iso(new Date(new Date(to).getTime() - (days - 1) * 86400_000));
    const version = opts.version || cfg.version;
    const accessToken = await getAccessToken(cfg);

    const all: { row: GAdsRow; customer: string }[] = [];
    for (const customer of cfg.customerIds) {
      const rows = await fetchCustomer(cfg, accessToken, customer, from, to, version, cfg.loginCustomerId);
      for (const row of rows) all.push({ row, customer });
    }

    const records = all.map(({ row, customer }) => {
      const date = row.segments?.date ?? null;
      const campaignId = row.campaign?.id ?? null;
      const costMicros = Number(row.metrics?.costMicros ?? 0);
      return {
        key: `${customer}|${campaignId ?? 'acct'}|${date ?? 'na'}`,
        customer_id: customer,
        campaign_id: campaignId,
        campaign_name: row.campaign?.name ?? null,
        date,
        spend: costMicros / 1_000_000,
        impressions: Number(row.metrics?.impressions ?? 0),
        clicks: Number(row.metrics?.clicks ?? 0),
        conversions: Number(row.metrics?.conversions ?? 0),
        data: row as unknown as Record<string, unknown>,
        fetched_at: new Date().toISOString(),
      };
    });
    const byKey = new Map(records.map((r) => [r.key, r]));
    const deduped = [...byKey.values()];
    for (let i = 0; i < deduped.length; i += 500) {
      await supabase.from('google_ads_insights_raw').upsert(deduped.slice(i, i + 500), { onConflict: 'key' });
    }
    return { ok: true, fetched: all.length, stored: deduped.length, customers: cfg.customerIds.length };
  } catch (err) {
    return { ok: false, fetched: 0, stored: 0, customers: 0, error: (err as Error).message };
  }
}

/** List the customers the authenticated refresh-token user can access (no
 *  login-customer-id needed). Definitive check of what the token can reach. */
export async function googleAdsListAccessible(version?: string): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const cfg = getGoogleAdsConfig();
  if (!cfg) return { ok: false, error: 'not_configured' };
  try {
    const ver = version || cfg.version;
    const accessToken = await getAccessToken(cfg);
    const url = `https://googleads.googleapis.com/${ver}/customers:listAccessibleCustomers`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}`, 'developer-token': cfg.developerToken },
      cache: 'no-store',
    });
    const text = await res.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text.slice(0, 500) };
    }
    return { ok: res.status === 200, data: { status: res.status, version: ver, body } };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/** Raw debug: refresh token + do ONE search call, returning the exact URL, HTTP
 *  status and raw body (no parsing/throwing) so we can see what Google sees. */
export async function googleAdsDebug(
  version?: string,
  loginOverride?: string,
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const cfg = getGoogleAdsConfig();
  if (!cfg) return { ok: false, error: 'not_configured' };
  try {
    const ver = version || cfg.version;
    // ?lcid=none → omit header; ?lcid=<id> → use it; absent → configured value.
    const lcid = loginOverride === 'none' ? null : loginOverride ? loginOverride.replace(/[^0-9]/g, '') : cfg.loginCustomerId;
    const accessToken = await getAccessToken(cfg);
    const url = `https://googleads.googleapis.com/${ver}/customers/${cfg.customerIds[0]}/googleAds:search`;
    const res = await fetch(url, {
      method: 'POST',
      headers: gAdsHeaders(cfg, accessToken, lcid),
      body: JSON.stringify({ query: 'SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1' }),
      cache: 'no-store',
    });
    const text = await res.text();
    return {
      ok: true,
      data: { url, loginCustomerId: lcid, status: res.status, contentType: res.headers.get('content-type'), body: text.slice(0, 700) },
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/** Shape/credential probe: refresh the token + pull a small recent window.
 *  Pass `version` to test a specific API version without a redeploy. */
export async function googleAdsProbe(version?: string): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const cfg = getGoogleAdsConfig();
  if (!cfg) return { ok: false, error: 'not_configured' };
  try {
    const ver = version || cfg.version;
    const accessToken = await getAccessToken(cfg);
    const to = iso(new Date());
    const from = iso(new Date(Date.now() - 13 * 86400_000));
    const rows = await fetchCustomer(cfg, accessToken, cfg.customerIds[0], from, to, ver, cfg.loginCustomerId);
    return { ok: true, data: { customer: cfg.customerIds[0], version: ver, rowCount: rows.length, sampleRow: rows[0] ?? null } };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ============================================================================
// Detail report (Google Ads Performance sub-tab): the campaign → ad group → ad
// (+ responsive-search-ad assets) hierarchy with spend/impressions/clicks/
// conversions, plus per-campaign daily budget. Live GAQL over [from,to],
// aggregated (no segments.date) so each row is a single entity total. Reuses the
// auth + direct-access fallback above. Never throws.
// ============================================================================

const AED = (micros: unknown) => (Number(micros ?? 0) || 0) / 1_000_000;
const N = (v: unknown) => Number(v ?? 0) || 0;

/** Generic paginated GAQL search with the same manager→direct fallback. */
async function gaqlSearch(
  cfg: GoogleAdsConfig,
  accessToken: string,
  customerId: string,
  query: string,
  version: string,
  loginCustomerId: string | null,
): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  let pageToken: string | undefined;
  let effectiveLcid = loginCustomerId;
  let triedDirect = false;
  for (let guard = 0; guard < 200; guard++) {
    const res = await fetch(
      `https://googleads.googleapis.com/${version}/customers/${customerId}/googleAds:search`,
      {
        method: 'POST',
        headers: gAdsHeaders(cfg, accessToken, effectiveLcid),
        body: JSON.stringify({ query, ...(pageToken ? { pageToken } : {}) }),
        cache: 'no-store',
      },
    );
    const text = await res.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error(`Google Ads non-JSON (${res.status}): ${text.slice(0, 200)}`);
    }
    const obj = body as { results?: Record<string, unknown>[]; nextPageToken?: string; error?: { message?: string; status?: string } };
    if (obj.error) {
      const denied = res.status === 403 || /permission/i.test(obj.error.message ?? '') || obj.error.status === 'PERMISSION_DENIED';
      if (denied && effectiveLcid && !triedDirect) {
        effectiveLcid = null;
        triedDirect = true;
        continue;
      }
      throw new Error(`Google Ads API: ${obj.error.message ?? text.slice(0, 200)}`);
    }
    if (Array.isArray(obj.results)) out.push(...obj.results);
    if (!obj.nextPageToken) break;
    pageToken = obj.nextPageToken;
  }
  return out;
}

export interface GAdsMetrics {
  cost: number;
  impressions: number;
  clicks: number;
  conversions: number;
}
export interface GAdsCampaignDetail extends GAdsMetrics {
  id: string;
  name: string;
  status: string;
  channelType: string;
  dailyBudget: number | null;
}
export interface GAdsAdGroupDetail extends GAdsMetrics {
  id: string;
  name: string;
  campaign: string;
  status: string;
}
export interface GAdsAdDetail extends GAdsMetrics {
  id: string;
  campaign: string;
  adGroup: string;
  type: string;
  status: string;
  strength: string | null;
  headlines: string[];
  descriptions: string[];
}
export interface GoogleAdsDetailReport {
  available: boolean;
  note: string | null;
  period: { from: string; to: string } | null;
  totals: GAdsMetrics;
  campaigns: GAdsCampaignDetail[];
  adGroups: GAdsAdGroupDetail[];
  ads: GAdsAdDetail[];
}

const emptyGAdsDetail: GoogleAdsDetailReport = {
  available: false,
  note: null,
  period: null,
  totals: { cost: 0, impressions: 0, clicks: 0, conversions: 0 },
  campaigns: [],
  adGroups: [],
  ads: [],
};

const m = (r: Record<string, unknown>) => (r.metrics ?? {}) as Record<string, unknown>;
const assetTexts = (arr: unknown): string[] =>
  Array.isArray(arr) ? arr.map((a) => (a as { text?: string })?.text ?? '').filter(Boolean) : [];

/** Pull the full Google Ads detail hierarchy across all configured customers. */
export async function getGoogleAdsDetail(opts: { from?: string; to?: string } = {}): Promise<GoogleAdsDetailReport> {
  const cfg = getGoogleAdsConfig();
  if (!cfg) return { ...emptyGAdsDetail, note: 'Google Ads not configured' };
  try {
    const to = opts.to ?? iso(new Date());
    const from = opts.from ?? '2026-01-01';
    const version = cfg.version;
    const accessToken = await getAccessToken(cfg);
    const where = `WHERE segments.date BETWEEN '${from}' AND '${to}'`;

    const campaigns: GAdsCampaignDetail[] = [];
    const adGroups: GAdsAdGroupDetail[] = [];
    const ads: GAdsAdDetail[] = [];

    for (const customer of cfg.customerIds) {
      const campRows = await gaqlSearch(
        cfg, accessToken, customer,
        `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, ` +
        `campaign_budget.amount_micros, metrics.cost_micros, metrics.impressions, metrics.clicks, ` +
        `metrics.conversions FROM campaign ${where}`,
        version, cfg.loginCustomerId,
      );
      for (const r of campRows) {
        const c = (r.campaign ?? {}) as Record<string, unknown>;
        const b = (r.campaignBudget ?? {}) as Record<string, unknown>;
        const mm = m(r);
        campaigns.push({
          id: String(c.id ?? ''),
          name: String(c.name ?? '(unnamed)'),
          status: String(c.status ?? ''),
          channelType: String(c.advertisingChannelType ?? ''),
          dailyBudget: b.amountMicros != null ? AED(b.amountMicros) : null,
          cost: AED(mm.costMicros), impressions: N(mm.impressions), clicks: N(mm.clicks), conversions: N(mm.conversions),
        });
      }

      const agRows = await gaqlSearch(
        cfg, accessToken, customer,
        `SELECT ad_group.id, ad_group.name, ad_group.status, campaign.name, metrics.cost_micros, ` +
        `metrics.impressions, metrics.clicks, metrics.conversions FROM ad_group ${where}`,
        version, cfg.loginCustomerId,
      );
      for (const r of agRows) {
        const g = (r.adGroup ?? {}) as Record<string, unknown>;
        const c = (r.campaign ?? {}) as Record<string, unknown>;
        const mm = m(r);
        adGroups.push({
          id: String(g.id ?? ''), name: String(g.name ?? '(unnamed)'), campaign: String(c.name ?? ''),
          status: String(g.status ?? ''),
          cost: AED(mm.costMicros), impressions: N(mm.impressions), clicks: N(mm.clicks), conversions: N(mm.conversions),
        });
      }

      const adRows = await gaqlSearch(
        cfg, accessToken, customer,
        `SELECT ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.ad.type, ad_group_ad.status, ` +
        `ad_group_ad.ad_strength, ad_group_ad.ad.responsive_search_ad.headlines, ` +
        `ad_group_ad.ad.responsive_search_ad.descriptions, ad_group.name, campaign.name, ` +
        `metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions FROM ad_group_ad ${where}`,
        version, cfg.loginCustomerId,
      );
      for (const r of adRows) {
        const aga = (r.adGroupAd ?? {}) as Record<string, unknown>;
        const ad = (aga.ad ?? {}) as Record<string, unknown>;
        const rsa = (ad.responsiveSearchAd ?? {}) as Record<string, unknown>;
        const g = (r.adGroup ?? {}) as Record<string, unknown>;
        const c = (r.campaign ?? {}) as Record<string, unknown>;
        const mm = m(r);
        ads.push({
          id: String(ad.id ?? ''), campaign: String(c.name ?? ''), adGroup: String(g.name ?? ''),
          type: String(ad.type ?? ''), status: String(aga.status ?? ''),
          strength: aga.adStrength != null ? String(aga.adStrength) : null,
          headlines: assetTexts(rsa.headlines), descriptions: assetTexts(rsa.descriptions),
          cost: AED(mm.costMicros), impressions: N(mm.impressions), clicks: N(mm.clicks), conversions: N(mm.conversions),
        });
      }
    }

    const totals = campaigns.reduce(
      (t, c) => ({ cost: t.cost + c.cost, impressions: t.impressions + c.impressions, clicks: t.clicks + c.clicks, conversions: t.conversions + c.conversions }),
      { cost: 0, impressions: 0, clicks: 0, conversions: 0 },
    );
    campaigns.sort((a, b) => b.cost - a.cost);
    adGroups.sort((a, b) => b.cost - a.cost);
    ads.sort((a, b) => b.cost - a.cost);

    const available = campaigns.length > 0 || adGroups.length > 0 || ads.length > 0;
    return { available, note: available ? null : 'no Google Ads entities in this window', period: { from, to }, totals, campaigns, adGroups, ads };
  } catch (err) {
    return { ...emptyGAdsDetail, note: (err as Error).message };
  }
}
