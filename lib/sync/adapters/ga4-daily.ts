import 'server-only';
import { getAnalyticsClient } from '../google-auth';
import { GA4_PROPERTY_ID } from '@/config/ga4';
import type { AdminClient } from '@/lib/supabase/server';

/**
 * GA4 stored DAILY.
 *
 * The dashboard's original GA4 read is a single rolling 28-day snapshot, which
 * is right for a "current website health" card but wrong everywhere a reader
 * picks a date window: the board deck would show a figure that quietly
 * described a different period from the one selected. This adapter writes one
 * row per day (and per channel grouping) so every GA4 figure can be summed for
 * an arbitrary window like every other feed on the platform.
 *
 * Two tables, both aggregate-only:
 *   lane_e.ga4_daily         — day × channel × sessions/users/conversions
 *   lane_e.ga4_daily_events  — day × event name × count
 *
 * Cost control: GA4 rejects very long ranges on some properties and the sync
 * runs every fifteen minutes, so a full backfill happens only when the table is
 * empty; after that each run refreshes a short trailing window, which also
 * picks up GA4's own late-arriving data.
 */

const num = (v: string | null | undefined): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** GA4 returns YYYYMMDD for the `date` dimension. */
const isoDay = (yyyymmdd: string): string =>
  `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;

export interface Ga4DailyResult {
  ok: boolean;
  days: number;
  events: number;
  backfilled: boolean;
  error?: string;
}

/** How far back the first (backfill) run reaches, and the trailing refresh. */
const BACKFILL_DAYS = 400;
const REFRESH_DAYS = 10;

export async function syncGa4Daily(supabase: AdminClient): Promise<Ga4DailyResult> {
  try {
    // Backfill only when we have nothing; otherwise refresh a short tail.
    const { count } = await supabase
      .from('ga4_daily')
      .select('day', { count: 'exact', head: true });
    const backfilled = (count ?? 0) === 0;
    const startDate = `${backfilled ? BACKFILL_DAYS : REFRESH_DAYS}daysAgo`;

    const analytics = getAnalyticsClient();
    const property = `properties/${GA4_PROPERTY_ID}`;
    const dateRanges = [{ startDate, endDate: 'today' }];

    // 1 — day × channel. The day TOTAL is stored as channel='ALL' so a reader
    // of the totals never has to trust that the channel rows sum correctly
    // (GA4 channel groupings can double-count across some dimensions).
    const [byChannel, totals, events] = await Promise.all([
      analytics.properties.runReport({
        property,
        requestBody: {
          dateRanges,
          dimensions: [{ name: 'date' }, { name: 'sessionDefaultChannelGroup' }],
          metrics: [
            { name: 'sessions' },
            { name: 'totalUsers' },
            { name: 'newUsers' },
            { name: 'engagedSessions' },
            { name: 'conversions' },
          ],
          limit: '100000',
        },
      }),
      analytics.properties.runReport({
        property,
        requestBody: {
          dateRanges,
          dimensions: [{ name: 'date' }],
          metrics: [
            { name: 'sessions' },
            { name: 'totalUsers' },
            { name: 'newUsers' },
            { name: 'engagedSessions' },
            { name: 'conversions' },
          ],
          limit: '100000',
        },
      }),
      analytics.properties.runReport({
        property,
        requestBody: {
          dateRanges,
          dimensions: [{ name: 'date' }, { name: 'eventName' }],
          metrics: [{ name: 'eventCount' }],
          limit: '100000',
        },
      }),
    ]);

    type RowOut = {
      day: string;
      channel: string;
      sessions: number;
      users: number;
      new_users: number;
      engaged_sessions: number;
      conversions: number;
      fetched_at: string;
    };
    const now = new Date().toISOString();
    const rows: RowOut[] = [];

    for (const r of totals.data.rows ?? []) {
      const d = r.dimensionValues?.[0]?.value;
      if (!d) continue;
      rows.push({
        day: isoDay(d),
        channel: 'ALL',
        sessions: num(r.metricValues?.[0]?.value),
        users: num(r.metricValues?.[1]?.value),
        new_users: num(r.metricValues?.[2]?.value),
        engaged_sessions: num(r.metricValues?.[3]?.value),
        conversions: num(r.metricValues?.[4]?.value),
        fetched_at: now,
      });
    }
    for (const r of byChannel.data.rows ?? []) {
      const d = r.dimensionValues?.[0]?.value;
      const ch = r.dimensionValues?.[1]?.value;
      if (!d || !ch) continue;
      rows.push({
        day: isoDay(d),
        channel: ch,
        sessions: num(r.metricValues?.[0]?.value),
        users: num(r.metricValues?.[1]?.value),
        new_users: num(r.metricValues?.[2]?.value),
        engaged_sessions: num(r.metricValues?.[3]?.value),
        conversions: num(r.metricValues?.[4]?.value),
        fetched_at: now,
      });
    }

    for (let i = 0; i < rows.length; i += 500) {
      await supabase.from('ga4_daily').upsert(rows.slice(i, i + 500), { onConflict: 'day,channel' });
    }

    const evRows = (events.data.rows ?? [])
      .map((r) => {
        const d = r.dimensionValues?.[0]?.value;
        const name = r.dimensionValues?.[1]?.value;
        if (!d || !name) return null;
        return { day: isoDay(d), event_name: name, event_count: num(r.metricValues?.[0]?.value), fetched_at: now };
      })
      .filter((r): r is { day: string; event_name: string; event_count: number; fetched_at: string } => r != null);

    for (let i = 0; i < evRows.length; i += 500) {
      await supabase.from('ga4_daily_events').upsert(evRows.slice(i, i + 500), { onConflict: 'day,event_name' });
    }

    return { ok: true, days: rows.length, events: evRows.length, backfilled };
  } catch (err) {
    return { ok: false, days: 0, events: 0, backfilled: false, error: (err as Error).message };
  }
}
