import 'server-only';
import type { AdminClient } from '@/lib/supabase/server';
import { getGmbConfig, GMB_METRICS, type GmbConfig } from '@/config/gmb';

/**
 * Google Business Profile (GMB) adapter — pulls DAILY local-search performance
 * from the Business Profile Performance API into lane_e.social_insights (the
 * organic/local lens, channel='gmb'). Mirrors the Meta/Google-Ads adapters:
 * best-effort, never throws — returns a typed result.
 *
 *   POST oauth2.googleapis.com/token         (refresh_token → access_token)
 *   GET  businessprofileperformance.googleapis.com/v1/
 *        locations/{id}:fetchMultiDailyMetricsTimeSeries
 *        ?dailyMetrics=CALL_CLICKS&dailyMetrics=BUSINESS_DIRECTION_REQUESTS…
 *        &dailyRange.startDate=…&dailyRange.endDate=…
 *
 * Metrics: phone calls, direction requests, website clicks, desktop/mobile map
 * views. Upserts one row per (clinic, channel='gmb', metric, day).
 */

export interface GmbSyncResult {
  ok: boolean;
  fetched: number;
  stored: number;
  locations: number;
  note?: string;
  error?: string;
}
export interface GmbSyncOpts {
  days?: number; // trailing window (default 30). GMB data lags ~2-3 days.
  from?: string;
  to?: string;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const CLINIC = 'dental-nation';

async function accessToken(cfg: GmbConfig): Promise<string> {
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
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; error_description?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(`OAuth token exchange failed (${res.status}): ${data.error_description ?? 'no access_token'}`);
  }
  return data.access_token;
}

function perfUrl(locationPath: string, from: string, to: string): string {
  const s = new Date(from);
  const e = new Date(to);
  const params = new URLSearchParams();
  for (const m of GMB_METRICS) params.append('dailyMetrics', m.api);
  params.set('dailyRange.startDate.year', String(s.getUTCFullYear()));
  params.set('dailyRange.startDate.month', String(s.getUTCMonth() + 1));
  params.set('dailyRange.startDate.day', String(s.getUTCDate()));
  params.set('dailyRange.endDate.year', String(e.getUTCFullYear()));
  params.set('dailyRange.endDate.month', String(e.getUTCMonth() + 1));
  params.set('dailyRange.endDate.day', String(e.getUTCDate()));
  return `https://businessprofileperformance.googleapis.com/v1/${locationPath}:fetchMultiDailyMetricsTimeSeries?${params.toString()}`;
}

interface DatedValue {
  date?: { year?: number; month?: number; day?: number };
  value?: string | number;
}
interface PerfResponse {
  multiDailyMetricTimeSeries?: {
    dailyMetricTimeSeries?: { dailyMetric?: string; timeSeries?: { datedValues?: DatedValue[] } }[];
  }[];
  error?: { message?: string };
}

const pad2 = (n: number) => String(n).padStart(2, '0');
function ymd(d: DatedValue['date']): string | null {
  if (!d?.year || !d?.month || !d?.day) return null;
  return `${d.year}-${pad2(d.month)}-${pad2(d.day)}`;
}

interface Row {
  clinic: string;
  channel: string;
  integration: string | null;
  metric: string;
  metric_label: string;
  day: string;
  value: number;
}

export async function syncGmb(supabase: AdminClient, opts: GmbSyncOpts = {}): Promise<GmbSyncResult> {
  const cfg = getGmbConfig();
  if (!cfg) return { ok: false, fetched: 0, stored: 0, locations: 0, error: 'GMB not configured' };

  const to = opts.to ?? iso(new Date());
  const from = opts.from ?? iso(new Date(Date.now() - (opts.days ?? 30) * 86400_000));

  let token: string;
  try {
    token = await accessToken(cfg);
  } catch (err) {
    return { ok: false, fetched: 0, stored: 0, locations: cfg.locations.length, error: (err as Error).message };
  }

  const labelOf = new Map(GMB_METRICS.map((m) => [m.api, m] as const));
  const rows: Row[] = [];
  let fetched = 0;

  for (const loc of cfg.locations) {
    let res: Response;
    try {
      res = await fetch(perfUrl(loc.path, from, to), {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
    } catch (err) {
      return { ok: false, fetched, stored: 0, locations: cfg.locations.length, error: (err as Error).message };
    }
    const data = (await res.json().catch(() => ({}))) as PerfResponse;
    if (!res.ok) {
      return {
        ok: false,
        fetched,
        stored: 0,
        locations: cfg.locations.length,
        error: `Performance API ${res.status}: ${data.error?.message ?? 'request failed'}`,
      };
    }
    const series = data.multiDailyMetricTimeSeries?.[0]?.dailyMetricTimeSeries ?? [];
    for (const s of series) {
      const def = labelOf.get(s.dailyMetric ?? '');
      if (!def) continue;
      for (const dv of s.timeSeries?.datedValues ?? []) {
        const day = ymd(dv.date);
        if (!day) continue;
        const value = Number(dv.value ?? 0) || 0;
        fetched += 1;
        rows.push({
          clinic: CLINIC,
          channel: 'gmb',
          integration: loc.label ?? loc.path,
          metric: def.key,
          metric_label: def.label,
          day,
          value,
        });
      }
    }
  }

  if (rows.length === 0) {
    return { ok: true, fetched, stored: 0, locations: cfg.locations.length, note: 'no GMB data in range' };
  }

  let stored = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500).map((r) => ({ ...r, synced_at: new Date().toISOString() }));
    const { error } = await supabase.from('social_insights').upsert(chunk, { onConflict: 'clinic,channel,metric,day' });
    if (error) return { ok: false, fetched, stored, locations: cfg.locations.length, error: error.message };
    stored += chunk.length;
  }

  return { ok: true, fetched, stored, locations: cfg.locations.length };
}
