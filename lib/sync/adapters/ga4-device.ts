import 'server-only';
import { getAnalyticsClient } from '../google-auth';
import { GA4_PROPERTY_ID } from '@/config/ga4';
import type { AdminClient } from '@/lib/supabase/server';

/**
 * GA4 by device (added 5 Oct 2026): one row per day × operating system ×
 * device category × channel × source/medium, with sessions, users, key events
 * and on-site leads (generate_lead). Answers "which phones do our visitors and
 * leads use?", e.g. whether website traffic follows the iPhone-only Meta
 * targeting, and which devices sit behind a "(not set)" source.
 *
 * Also lead clicks (WhatsApp, phone, generate_lead) by phone brand and model
 * (lane_e.ga4_lead_devices).
 *
 * Aggregate only (lane_e.ga4_device_daily). Each run refreshes the trailing
 * window; the first run backfills 90 days.
 */

const num = (v: string | null | undefined): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const isoDay = (d: string) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;

const BACKFILL_DAYS = 90;
const REFRESH_DAYS = 10;
const LEAD_EVENT = process.env.GA4_LEAD_EVENT || 'generate_lead';
const LEAD_CLICK_EVENTS = ['whatsapp_click', 'phone_click', 'whatsapp_widget_open', LEAD_EVENT];

export async function syncGa4Device(supabase: AdminClient): Promise<{ ok: boolean; rows: number; error?: string }> {
  try {
    const { count } = await supabase.from('ga4_device_daily').select('day', { count: 'exact', head: true });
    const startDate = `${(count ?? 0) === 0 ? BACKFILL_DAYS : REFRESH_DAYS}daysAgo`;
    const analytics = getAnalyticsClient();
    const property = `properties/${GA4_PROPERTY_ID}`;
    const dateRanges = [{ startDate, endDate: 'today' }];
    const dimensions = [{ name: 'date' }, { name: 'operatingSystem' }, { name: 'deviceCategory' }, { name: 'sessionDefaultChannelGroup' }, { name: 'sessionSourceMedium' }];

    const [traffic, leads] = await Promise.all([
      analytics.properties.runReport({
        property,
        requestBody: { dateRanges, dimensions, metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'conversions' }], limit: '100000' },
      }),
      analytics.properties.runReport({
        property,
        requestBody: {
          dateRanges,
          dimensions,
          metrics: [{ name: 'eventCount' }],
          dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: LEAD_EVENT, matchType: 'EXACT' } } },
          limit: '100000',
        },
      }),
    ]);

    const now = new Date().toISOString();
    const rows = new Map<string, { day: string; os: string; device: string; channel: string; source_medium: string; sessions: number; users: number; key_events: number; leads: number; fetched_at: string }>();
    const keyOf = (v: string[]) => v.join('|');
    const rowFor = (v: string[]) => {
      const k = keyOf(v);
      let r = rows.get(k);
      if (!r) {
        r = { day: isoDay(v[0]), os: v[1] || '(not set)', device: v[2] || '(not set)', channel: v[3] || '(not set)', source_medium: v[4] || '(not set)', sessions: 0, users: 0, key_events: 0, leads: 0, fetched_at: now };
        rows.set(k, r);
      }
      return r;
    };
    for (const r of traffic.data.rows ?? []) {
      const v = (r.dimensionValues ?? []).map((x) => x.value ?? '');
      if (!v[0]) continue;
      const o = rowFor(v);
      o.sessions += num(r.metricValues?.[0]?.value);
      o.users += num(r.metricValues?.[1]?.value);
      o.key_events += num(r.metricValues?.[2]?.value);
    }
    for (const r of leads.data.rows ?? []) {
      const v = (r.dimensionValues ?? []).map((x) => x.value ?? '');
      if (!v[0]) continue;
      rowFor(v).leads += num(r.metricValues?.[0]?.value);
    }
    // Lead clicks by phone brand and model: which phones tap WhatsApp or call from the site.
    const { count: clickCount } = await supabase.from('ga4_lead_devices').select('day', { count: 'exact', head: true });
    const clicks = await analytics.properties.runReport({
      property,
      requestBody: {
        dateRanges: [{ startDate: `${(clickCount ?? 0) === 0 ? BACKFILL_DAYS : REFRESH_DAYS}daysAgo`, endDate: 'today' }],
        dimensions: [{ name: 'date' }, { name: 'eventName' }, { name: 'operatingSystem' }, { name: 'deviceCategory' }, { name: 'mobileDeviceBranding' }, { name: 'mobileDeviceModel' }, { name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: LEAD_CLICK_EVENTS } } },
        limit: '100000',
      },
    });
    const clickRows = (clicks.data.rows ?? []).map((r) => {
      const v = (r.dimensionValues ?? []).map((x) => x.value || '(not set)');
      return { day: isoDay(v[0]), event_name: v[1], os: v[2], device: v[3], brand: v[4], model: v[5], channel: v[6], events: num(r.metricValues?.[0]?.value), fetched_at: now };
    });
    for (let i = 0; i < clickRows.length; i += 500) {
      const { error } = await supabase.from('ga4_lead_devices').upsert(clickRows.slice(i, i + 500), { onConflict: 'day,event_name,os,device,brand,model,channel' });
      if (error) throw new Error(error.message);
    }

    const out = [...rows.values()];
    for (let i = 0; i < out.length; i += 500) {
      const { error } = await supabase.from('ga4_device_daily').upsert(out.slice(i, i + 500), { onConflict: 'day,os,device,channel,source_medium' });
      if (error) throw new Error(error.message);
    }
    return { ok: true, rows: out.length };
  } catch (err) {
    return { ok: false, rows: 0, error: (err as Error).message };
  }
}
