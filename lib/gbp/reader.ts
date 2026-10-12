import 'server-only';
import { getSupabaseAdmin, type AdminClient } from '@/lib/supabase/server';
import { selectAll } from '@/lib/supabase/selectAll';
import { resolveGmbConfig } from '@/config/gmb';
import { addDays, buildGbpPlan, dubaiDay, parseDailyLog, type RawLogRow, type ReviewRow } from './plan';
import type { GmbMetricRow } from '@/lib/social/gmb-report';

/** Stored data only. Throws on failed reads so a briefing cannot turn failures into zeroes. */
export async function readGbpPlan(asOf = addDays(dubaiDay(), -1), db: AdminClient | null = getSupabaseAdmin()) {
  if (!db) throw new Error('GBP database unavailable');
  const [raw, sync, config] = await Promise.all([
    selectAll(() => db.from('raw_gbp_daily_log').select('row_index,data'), 'row_index'),
    db.from('gbp_daily_sync').select('synced_at').eq('id', 1).maybeSingle(),
    resolveGmbConfig(db, true),
  ]);
  if (sync.error) throw new Error('GBP sync state unavailable');
  const rows = raw.data as RawLogRow[];
  const first = parseDailyLog(rows).entries.filter((e) => e.date <= asOf).map((e) => e.date).sort()[0];
  const from = first ? [addDays(first, -28), addDays(asOf, -29)].sort()[0] : addDays(asOf, -29);
  const [metrics, reviews] = await Promise.all([
    selectAll(() => db.from('social_insights').select('clinic,metric,day,value').eq('channel', 'gmb').gte('day', from).lte('day', asOf), ['clinic', 'channel', 'metric', 'day']),
    selectAll(() => db.from('gmb_reviews').select('location_path,create_time,rating,synced_at').is('removed_at', null), 'review_id'),
  ]);
  const rr: ReviewRow[] = [];
  for (const r of reviews.data) {
    const clinic = config?.locations.find((l) => l.path === r.location_path)?.clinic;
    if (clinic) rr.push({ clinic, date: dubaiDay(new Date(r.create_time)), rating: Number(r.rating), syncedAt: r.synced_at });
  }
  return buildGbpPlan({ rows, metrics: metrics.data as GmbMetricRow[], reviews: rr,
    connected: config?.locations.map((l) => l.clinic) ?? [], asOf, syncedAt: sync.data?.synced_at ?? null });
}
