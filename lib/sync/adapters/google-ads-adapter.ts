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

async function fetchCustomer(
  cfg: GoogleAdsConfig,
  accessToken: string,
  customerId: string,
  from: string,
  to: string,
): Promise<GAdsRow[]> {
  const query =
    `SELECT campaign.id, campaign.name, segments.date, metrics.cost_micros, ` +
    `metrics.impressions, metrics.clicks, metrics.conversions ` +
    `FROM campaign WHERE segments.date BETWEEN '${from}' AND '${to}'`;
  const res = await fetch(
    `https://googleads.googleapis.com/${cfg.version}/customers/${customerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': cfg.developerToken,
        'login-customer-id': cfg.loginCustomerId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
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
  // searchStream returns an array of batches: [{ results: [...] }, ...]
  if (Array.isArray(body)) {
    const out: GAdsRow[] = [];
    for (const batch of body as { results?: GAdsRow[]; error?: unknown }[]) {
      if (batch.error) throw new Error(`Google Ads API: ${JSON.stringify(batch.error).slice(0, 300)}`);
      if (Array.isArray(batch.results)) out.push(...batch.results);
    }
    return out;
  }
  // error envelope
  const errObj = body as { error?: { message?: string } };
  throw new Error(`Google Ads API: ${errObj.error?.message ?? text.slice(0, 300)}`);
}

export async function syncGoogleAds(supabase: AdminClient, opts: GAdsSyncOpts = {}): Promise<GAdsSyncResult> {
  const cfg = getGoogleAdsConfig();
  if (!cfg) return { ok: false, fetched: 0, stored: 0, customers: 0, error: 'not_configured' };
  try {
    const days = opts.days ?? 30;
    const to = opts.to ?? iso(new Date());
    const from = opts.from ?? iso(new Date(new Date(to).getTime() - (days - 1) * 86400_000));
    const accessToken = await getAccessToken(cfg);

    const all: { row: GAdsRow; customer: string }[] = [];
    for (const customer of cfg.customerIds) {
      const rows = await fetchCustomer(cfg, accessToken, customer, from, to);
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

/** Shape/credential probe: refresh the token + pull a small recent window. */
export async function googleAdsProbe(): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const cfg = getGoogleAdsConfig();
  if (!cfg) return { ok: false, error: 'not_configured' };
  try {
    const accessToken = await getAccessToken(cfg);
    const to = iso(new Date());
    const from = iso(new Date(Date.now() - 6 * 86400_000));
    const rows = await fetchCustomer(cfg, accessToken, cfg.customerIds[0], from, to);
    return { ok: true, data: { customer: cfg.customerIds[0], version: cfg.version, rowCount: rows.length, sampleRow: rows[0] ?? null } };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
