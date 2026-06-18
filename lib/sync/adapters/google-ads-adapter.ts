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
        body: JSON.stringify({ query, pageSize: 10000, ...(pageToken ? { pageToken } : {}) }),
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
