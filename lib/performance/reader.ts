import 'server-only';
import { getSupabaseAdmin, type AdminClient } from '@/lib/supabase/server';
import { selectAll } from '@/lib/supabase/selectAll';
import { getChannelPerformance } from '@/lib/growth/channelPerformance';
import { META_ADS_PAUSED_SINCE } from '@/config/meta';
import { isBlockAppt, isTestAppt } from '@/lib/growth/attribution';
import type { BillInput } from '@/lib/executive/acquisitionCore';
import { readGbpPlan } from '@/lib/gbp/reader';
import { addDays, type GbpPlan } from '@/lib/gbp/plan';
import { benchmarks, buildPeriod, parseGrossRows, performanceWhy, type PerformanceBrief, type Signal, type SmilePerformance } from './core';

export async function readPerformanceNote(db: AdminClient | null = getSupabaseAdmin()) {
  if (!db) throw new Error('Performance note unavailable');
  const result = await db.from('performance_notes').select('body,updated_at').eq('key', 'akbar-plan').maybeSingle();
  if (result.error) throw new Error('Performance note read failed');
  return { body: String(result.data?.body ?? ''), updatedAt: result.data?.updated_at as string | null ?? null };
}

export async function readPerformanceBrief(today: string, db: AdminClient | null = getSupabaseAdmin(), existingGbp?: GbpPlan): Promise<PerformanceBrief> {
  if (!db) throw new Error('Performance database unavailable');
  const yesterday = addDays(today, -1);
  // On the first day of a month the completed reporting month is yesterday's month.
  const month = `${yesterday.slice(0, 7)}-01`;
  const period = async (from: string, to: string) => {
    const [all, wasl, tosun] = await Promise.all(['all', 'dn-alwasl', 'dr-tosun'].map((c) => getChannelPerformance({ from, to }, c as 'all' | 'dn-alwasl' | 'dr-tosun', db, { strict: true, excludeCancelledBills: true })));
    return { all, wasl, tosun };
  };
  const [day, mtd, week, prior, gross, bills, note, gbp, social, companies, historical, appointments] = await Promise.all([
    period(yesterday, yesterday), period(month, yesterday),
    getChannelPerformance({ from: addDays(yesterday, -6), to: yesterday }, 'all', db, { strict: true, excludeCancelledBills: true }),
    getChannelPerformance({ from: addDays(yesterday, -13), to: addDays(yesterday, -7) }, 'all', db, { strict: true, excludeCancelledBills: true }),
    selectAll(() => db.from('raw_lead_tracker').select('data'), 'id'),
    selectAll(() => db.from('practo_bills_raw').select('bill_date,amount,data'), 'bill_key'),
    readPerformanceNote(db), existingGbp ? Promise.resolve(existingGbp) : readGbpPlan(yesterday, db),
    selectAll(() => db.from('social_insights').select('clinic,channel,metric,day,value').in('metric', ['followers', 'review_count', 'rating']).lte('day', yesterday), ['clinic', 'channel', 'metric', 'day']),
    selectAll(() => db.from('sc_companies').select('members,updated_at'), 'id'),
    db.from('tasks').select('raw').eq('source', 'smileclub-team').eq('external_id', 'sc-team:g-crm-test').maybeSingle(),
    selectAll(() => db.from('practo_appointments_raw').select('appt_date,status,patient_name,data').gte('appt_date', month).lte('appt_date', yesterday), 'appt_key'),
  ]);
  if (historical.error) throw new Error('Smile Club evidence read failed');
  const raw = parseGrossRows(gross.data as { data: Record<string, unknown> }[]);
  const bb = bills.data as BillInput[];
  const signalRows = social.data as Signal[];
  const tagged = appointments.data.filter((r) => {
    const text = `${r.data?.remarks ?? ''} ${r.data?.complaint ?? ''}`;
    return /\bsmile\s*club\b/i.test(text) && !isTestAppt(`${r.patient_name ?? ''} ${text}`) && !isBlockAppt(String(r.patient_name ?? ''));
  });
  const smilePeriod = (from: string): SmilePerformance['yesterday'] => {
    const rows = tagged.filter((r) => r.appt_date >= from);
    return { enrolments: null, messages: null, replies: null, bookings: rows.length,
      shows: rows.filter((r) => /^(arrived|completed)$/i.test(String(r.status))).length };
  };
  const verify = historical.data?.raw?.verify as { pass?: boolean; confirmed?: number; at?: string } | undefined;
  const smile: SmilePerformance = {
    members: companies.data.length ? companies.data.reduce((n, r) => n + Number(r.members ?? 0), 0) : null,
    membersAsOf: companies.data.map((r) => String(r.updated_at)).sort().at(-1) ?? null,
    verifiedHistoricalMembers: verify?.pass && Number.isFinite(verify.confirmed) ? verify.confirmed! : null,
    verifiedAt: verify?.at ?? null, yesterday: smilePeriod(yesterday), mtd: smilePeriod(month),
    notes: ['Members are company-reported current totals, not a dated enrolment or payment ledger. Last update is the latest company update; individual rows may be older.',
      'Dated enrolments, messages sent and replies are not stored as a performance feed. Unavailable is not zero. Historical WhatsApp reconciliation is a separate snapshot and is not added to current members.',
      'Bookings and shows use explicit Smile Club text tags in Practo; bookings are appointment records dated in the period, including cancellations. Untagged activity is not counted.'],
  };
  const benchmark = benchmarks(signalRows, yesterday);
  const ours = gbp.branches.find((b) => b.key === 'dental-nation')?.reputation;
  // Current reconciled reviews are an observed snapshot, not a retrospective
  // public counter. Never manufacture a 30-day count delta from review dates.
  if (ours?.observedAt && benchmark[0].reviews.date == null) {
    benchmark[0].reviews = { value: ours.count, date: ours.observedAt.slice(0, 10), delta30: null };
    benchmark[0].rating = { value: ours.rating, date: ours.observedAt.slice(0, 10), delta30: null };
  }
  return { today, yesterday: buildPeriod(yesterday, yesterday, day, raw, bb), mtd: buildPeriod(month, yesterday, mtd, raw, bb),
    action: note.body, gbp, benchmark, smile,
    why: performanceWhy(week, prior, gbp, META_ADS_PAUSED_SINCE) };
}
