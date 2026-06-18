import { inRange, metricDelta } from '@/lib/range';
import { ownerFor } from '@/config/data-gap-owners';
import type { PerfRow } from '@/lib/sync/normalize';
import type {
  BookingRecent,
  BookingsRangeReport,
  LeadsRangeReport,
  MixRow,
  PaidRangeReport,
  RangeMeta,
} from '@/lib/types';

/**
 * Pure, I/O-free range aggregation helpers (deliberately NOT `server-only`, so
 * they're independently unit-testable). Each source is aggregated for the
 * current range + an optional comparison window, producing {value, prev,
 * deltaPct} metrics with a hard null-guard against divide-by-zero (§ honesty).
 */

/** Top-N mix rows from a {label→count} map, descending, long tail → "Other". */
export function topMix(counts: Record<string, number>, limit = 6): MixRow[] {
  const rows = Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
  if (rows.length <= limit) return rows;
  const head = rows.slice(0, limit - 1);
  const tail = rows.slice(limit - 1).reduce((a, r) => a + r.value, 0);
  return [...head, { label: 'Other', value: tail }];
}

/** Aggregate paid perf rows for a current range + comparison range. */
export function aggregatePaid(rows: PerfRow[], range: RangeMeta): PaidRangeReport {
  const cur = rows.filter((r) => inRange(r.date, range.from, range.to));
  const prev =
    range.compareFrom && range.compareTo
      ? rows.filter((r) => inRange(r.date, range.compareFrom!, range.compareTo!))
      : null;

  const sum = (rs: PerfRow[], f: (r: PerfRow) => number) => rs.reduce((a, r) => a + f(r), 0);

  const curSpend = sum(cur, (r) => r.spend);
  const curImpr = sum(cur, (r) => r.impressions);
  const curClicks = sum(cur, (r) => r.clicks);
  const curLeads = sum(cur, (r) => r.leads);

  const prevSpend = prev ? sum(prev, (r) => r.spend) : null;
  const prevImpr = prev ? sum(prev, (r) => r.impressions) : null;
  const prevClicks = prev ? sum(prev, (r) => r.clicks) : null;
  const prevLeads = prev ? sum(prev, (r) => r.leads) : null;

  // Cost-per-lead is a data gap (null) when leads = 0 — never spend/0.
  const curCpl = curLeads > 0 ? curSpend / curLeads : null;
  const prevCpl = prev && prevLeads && prevLeads > 0 ? prevSpend! / prevLeads : null;

  const leadsByCh: Record<string, number> = {};
  const spendByCh: Record<string, number> = {};
  for (const r of cur) {
    const ch = r.channel?.trim() || 'Unattributed';
    leadsByCh[ch] = (leadsByCh[ch] ?? 0) + r.leads;
    spendByCh[ch] = (spendByCh[ch] ?? 0) + r.spend;
  }

  return {
    spend: metricDelta(curSpend, prevSpend),
    impressions: metricDelta(curImpr, prevImpr),
    clicks: metricDelta(curClicks, prevClicks),
    leads: metricDelta(curLeads, prevLeads),
    costPerLead: metricDelta(curCpl, prevCpl),
    channelLeads: topMix(leadsByCh),
    channelSpend: topMix(spendByCh),
    empty: cur.length === 0,
  };
}

/** Minimal lead row shape needed for range aggregation. */
export interface LeadRowLike {
  id?: string | number | null;
  inquiry_date: string | null;
  channel_source: string | null;
  clinic: string | null;
  utm_campaign?: string | null;
}

const emptyLead = (v: unknown) => v == null || String(v).trim() === '';

/** Aggregate lead-tracker rows for a current range + comparison range. */
export function aggregateLeads(rows: LeadRowLike[], range: RangeMeta): LeadsRangeReport {
  const cur = rows.filter((r) => inRange(r.inquiry_date, range.from, range.to));
  const prev =
    range.compareFrom && range.compareTo
      ? rows.filter((r) => inRange(r.inquiry_date, range.compareFrom!, range.compareTo!))
      : null;

  const attributedOf = (rs: LeadRowLike[]) => rs.filter((r) => !emptyLead(r.channel_source)).length;

  const curTotal = cur.length;
  const curAttr = attributedOf(cur);
  const curUnattr = curTotal - curAttr;

  const prevTotal = prev ? prev.length : null;
  const prevAttr = prev ? attributedOf(prev) : null;
  const prevUnattr = prev && prevTotal != null && prevAttr != null ? prevTotal - prevAttr : null;

  const byCh: Record<string, number> = {};
  const byClinic: Record<string, number> = {};
  for (const r of cur) {
    const ch = (r.channel_source ?? '').trim() || 'Unattributed';
    byCh[ch] = (byCh[ch] ?? 0) + 1;
    const clinic = (r.clinic ?? '').trim() || 'Unknown clinic';
    byClinic[clinic] = (byClinic[clinic] ?? 0) + 1;
  }

  const flagged = cur
    .filter((r) => emptyLead(r.channel_source) || emptyLead(r.utm_campaign))
    .slice(0, 8)
    .map((r) => ({
      ref: String(r.id ?? '—'),
      detail: emptyLead(r.channel_source) ? 'No channel source' : 'No UTM campaign',
      owner: ownerFor('attribution'),
    }));

  return {
    total: metricDelta(curTotal, prevTotal),
    attributed: metricDelta(curAttr, prevAttr),
    unattributed: metricDelta(curUnattr, prevUnattr),
    byChannel: topMix(byCh),
    byClinic: topMix(byClinic),
    flagged,
    empty: curTotal === 0,
  };
}

/** Minimal booking row shape needed for range aggregation. */
export interface BookingRowLike {
  booking_date: string | null;
  status: string | null;
  price: number | string | null;
  clinic: string | null;
  treatment: string | null;
  doctor?: string | null;
}

/** Aggregate booking rows for a current range + comparison range. */
export function aggregateBookings(rows: BookingRowLike[], range: RangeMeta): BookingsRangeReport {
  const inCur = rows.filter((r) => inRange(r.booking_date, range.from, range.to));
  const inPrev =
    range.compareFrom && range.compareTo
      ? rows.filter((r) => inRange(r.booking_date, range.compareFrom!, range.compareTo!))
      : null;

  const bookedOf = (rs: BookingRowLike[]) => rs.filter((r) => (r.status ?? '') === 'booked');
  const cancelledOf = (rs: BookingRowLike[]) => rs.filter((r) => (r.status ?? '') === 'cancelled');
  const revenueOf = (rs: BookingRowLike[]) =>
    bookedOf(rs).reduce((a, r) => a + (Number(r.price) || 0), 0);

  const curBooked = bookedOf(inCur);
  const curRevenue = revenueOf(inCur);
  const curCancel = cancelledOf(inCur).length;

  const prevBooked = inPrev ? bookedOf(inPrev).length : null;
  const prevRevenue = inPrev ? revenueOf(inPrev) : null;
  const prevCancel = inPrev ? cancelledOf(inPrev).length : null;

  const byClinic: Record<string, number> = {};
  const byTreatment: Record<string, number> = {};
  for (const r of curBooked) {
    const clinic = (r.clinic ?? '').trim() || 'Unknown clinic';
    byClinic[clinic] = (byClinic[clinic] ?? 0) + 1;
    const tx = (r.treatment ?? '').trim() || 'Unspecified';
    byTreatment[tx] = (byTreatment[tx] ?? 0) + 1;
  }

  const recent: BookingRecent[] = [...curBooked]
    .sort((a, b) => String(b.booking_date ?? '').localeCompare(String(a.booking_date ?? '')))
    .slice(0, 8)
    .map((r) => ({
      date: r.booking_date ?? null,
      treatment: r.treatment ?? null,
      clinic: r.clinic ?? null,
      doctor: r.doctor ?? null,
      price: r.price != null && r.price !== '' ? Number(r.price) : null,
    }));

  return {
    booked: metricDelta(curBooked.length, prevBooked),
    revenue: metricDelta(curRevenue, prevRevenue),
    cancellations: metricDelta(curCancel, prevCancel),
    byClinic: topMix(byClinic),
    byTreatment: topMix(byTreatment),
    recent,
    empty: inCur.length === 0,
  };
}
