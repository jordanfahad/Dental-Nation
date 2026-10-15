import 'server-only';
import { getSupabaseAdmin, type AdminClient } from '@/lib/supabase/server';
import { selectAll } from '@/lib/supabase/selectAll';
import { getChannelPerformance } from '@/lib/growth/channelPerformance';
import type { Signal } from '@/lib/performance/core';
import type { BillInput } from '@/lib/executive/acquisitionCore';
import { dubaiDay } from './plan';
import { buildClinicComparison, comparisonPeriods } from './clinic-comparison';

/** Stored feeds only. A failed read must not turn into a zero in the table. */
export async function readClinicComparison(today = dubaiDay(), db: AdminClient | null = getSupabaseAdmin()) {
  if (!db) throw new Error('GBP vs clinic database unavailable');
  const periods = comparisonPeriods(today);
  const growth = async (range: { from: string; to: string }) => {
    const [wasl, tosun] = await Promise.all([
      getChannelPerformance(range, 'dn-alwasl', db, { strict: true, excludeCancelledBills: true }),
      getChannelPerformance(range, 'dr-tosun', db, { strict: true, excludeCancelledBills: true }),
    ]);
    return { 'dental-nation': wasl, 'dr-tosun': tosun };
  };
  const [metrics, tracker, bills, mtd, lastMonth] = await Promise.all([
    selectAll(() => db.from('social_insights').select('clinic,channel,metric,day,value').eq('channel', 'gmb')
      .in('metric', ['calls', 'directions', 'website_clicks']).gte('day', periods.lastMonth.from).lte('day', periods.mtd.to), ['clinic', 'channel', 'metric', 'day']),
    selectAll(() => db.from('raw_lead_tracker').select('data'), 'id'),
    selectAll(() => db.from('practo_bills_raw').select('bill_date,amount,data'), 'bill_key'),
    growth(periods.mtd), growth(periods.lastMonth),
  ]);
  return buildClinicComparison({ today, metrics: metrics.data as Signal[], tracker: tracker.data,
    bills: bills.data as BillInput[], growth: { mtd, lastMonth } });
}
