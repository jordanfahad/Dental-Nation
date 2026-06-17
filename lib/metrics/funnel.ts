import type { FunnelStage } from '@/lib/types';
import { previousDate } from '@/lib/dates';
import type { PerfRow } from '@/lib/sync/normalize';

/** Minimal lead shape the metrics layer needs. */
export interface LeadLike {
  channel_source: string | null;
  inquiry_date: string | null;
  booking_date: string | null;
  appointment_date: string | null;
  booking_status: string | null;
  is_qualified: boolean | null;
  treatment_signal: string | null;
  proof_captured: boolean | null;
  review_captured: boolean | null;
}

const BOOKED_STATUSES = new Set(['booked', 'attended', 'no-show', 'rescheduled', 'cancelled']);

const isBooking = (l: LeadLike) =>
  Boolean(l.booking_date) || (l.booking_status != null && BOOKED_STATUSES.has(l.booking_status));
const isAttended = (l: LeadLike) => l.booking_status === 'attended';
const isTreatmentOpp = (l: LeadLike) =>
  isAttended(l) && l.treatment_signal != null && l.treatment_signal !== 'no';

/**
 * Funnel stage definitions (§D), in order. `upstream` stages are top-of-funnel
 * volume (reach/impressions/clicks/...) which come from the raw social report —
 * NOT available in Sheets-v1 until mapped, so they compute to null (a data gap,
 * never a fabricated zero). The inquiry→proof stages are sourced from `leads`.
 */
interface StageDef {
  key: string;
  label: string;
  upstream?: boolean;
  /** Counts leads matching this stage on a given report date (or all-time). */
  count?: (leads: LeadLike[], date: string | null) => number;
}

/** Date a lead is attributed to for a given stage. */
const onDate = (value: string | null, date: string | null) =>
  date == null ? true : value != null && value.slice(0, 10) === date;

const STAGES: StageDef[] = [
  { key: 'reach', label: 'Reach', upstream: true },
  { key: 'impressions', label: 'Impressions', upstream: true },
  { key: 'clicks', label: 'Clicks', upstream: true },
  { key: 'lp_visits', label: 'Landing-page visits', upstream: true },
  { key: 'wa_clicks', label: 'WhatsApp clicks', upstream: true },
  { key: 'call_clicks', label: 'Call clicks', upstream: true },
  {
    key: 'valid_inquiries',
    label: 'Valid inquiries',
    count: (leads, d) => leads.filter((l) => onDate(l.inquiry_date, d)).length,
  },
  {
    key: 'qualified_inquiries',
    label: 'Qualified inquiries',
    count: (leads, d) => leads.filter((l) => l.is_qualified && onDate(l.inquiry_date, d)).length,
  },
  {
    key: 'glow_up_bookings',
    label: 'Glow Up bookings',
    count: (leads, d) =>
      leads.filter((l) => isBooking(l) && onDate(l.booking_date ?? l.inquiry_date, d)).length,
  },
  {
    key: 'attended_visits',
    label: 'Attended visits',
    count: (leads, d) =>
      leads.filter((l) => isAttended(l) && onDate(l.appointment_date ?? l.booking_date, d)).length,
  },
  {
    key: 'treatment_opportunities',
    label: 'Treatment opportunities',
    count: (leads, d) =>
      leads.filter((l) => isTreatmentOpp(l) && onDate(l.appointment_date ?? l.booking_date, d)).length,
  },
  {
    key: 'proof_captured',
    label: 'Proof captured',
    count: (leads, d) =>
      leads.filter((l) => l.proof_captured && onDate(l.appointment_date ?? l.booking_date, d)).length,
  },
  {
    key: 'reviews_captured',
    label: 'Reviews captured',
    count: (leads, d) =>
      leads.filter((l) => l.review_captured && onDate(l.appointment_date ?? l.booking_date, d)).length,
  },
];

export function computeFunnel(leads: LeadLike[], reportDate: string): FunnelStage[] {
  const yesterday = previousDate(reportDate);
  const stages: FunnelStage[] = STAGES.map((s) => ({
    key: s.key,
    label: s.label,
    upstream: s.upstream,
    today: s.count ? s.count(leads, reportDate) : null,
    yesterday: s.count ? s.count(leads, yesterday) : null,
    total: s.count ? s.count(leads, null) : null,
    conversionFromPrev: null,
  }));

  // Stage-to-stage conversion vs. the previous MEASURED stage (today's values).
  let prev: number | null = null;
  for (const stage of stages) {
    if (stage.today != null) {
      stage.conversionFromPrev = prev != null && prev > 0 ? stage.today / prev : null;
      prev = stage.today;
    }
  }
  return stages;
}

// ============================================================================
// Performance-driven funnel (paid acquisition). Built from aggregated PerfRows
// rather than lead-level rows. Stages sum the relevant metric columns. The
// "all-empty column ⇒ null data-gap" rule applies to bookings/showups/treatments.
// ============================================================================

interface PerfStageDef {
  key: string;
  label: string;
  upstream?: boolean;
  /** Sum field over rows, or null for an unmeasured (upstream) stage. */
  field?: keyof PerfRow;
  /** True when the source column is empty everywhere → report as data gap (null). */
  gapField?: 'bookings' | 'showups' | 'treatments';
}

const PERF_STAGES: PerfStageDef[] = [
  { key: 'reach', label: 'Reach', upstream: true },
  { key: 'impressions', label: 'Impressions', field: 'impressions' },
  { key: 'clicks', label: 'Clicks', field: 'clicks' },
  { key: 'lp_visits', label: 'Landing-page visits', upstream: true },
  { key: 'wa_clicks', label: 'WhatsApp clicks', upstream: true },
  { key: 'call_clicks', label: 'Call clicks', upstream: true },
  { key: 'valid_inquiries', label: 'Leads', field: 'leads' },
  { key: 'qualified_inquiries', label: 'Qualified leads', field: 'leads' },
  { key: 'glow_up_bookings', label: 'Bookings', field: 'bookings', gapField: 'bookings' },
  { key: 'attended_visits', label: 'Show-ups', field: 'showups', gapField: 'showups' },
  { key: 'treatment_opportunities', label: 'Treatments', field: 'treatments', gapField: 'treatments' },
  { key: 'proof_captured', label: 'Proof captured', upstream: true },
  { key: 'reviews_captured', label: 'Reviews captured', upstream: true },
];

const perfOnDate = (row: PerfRow, date: string | null) =>
  date == null ? true : row.date === date;

const sumField = (rows: PerfRow[], date: string | null, field: keyof PerfRow): number =>
  rows.reduce((acc, r) => (perfOnDate(r, date) ? acc + (Number(r[field]) || 0) : acc), 0);

/**
 * Compute the paid-acquisition funnel from aggregated performance rows.
 * `reportDate`/`prevDate` are YYYY-MM-DD. Columns that have no non-zero value
 * ANYWHERE (bookings/showups/treatments per the data) are reported as null
 * data gaps rather than fabricated zeros.
 */
export function computeFunnelFromPerformance(
  perf: PerfRow[],
  reportDate: string,
  prevDate: string,
): FunnelStage[] {
  // Determine which gap columns are entirely empty (no non-zero anywhere).
  const hasValue: Record<string, boolean> = { bookings: false, showups: false, treatments: false };
  for (const r of perf) {
    if (r.bookings > 0) hasValue.bookings = true;
    if (r.showups > 0) hasValue.showups = true;
    if (r.treatments > 0) hasValue.treatments = true;
  }

  const stages: FunnelStage[] = PERF_STAGES.map((s) => {
    // Upstream stage with no source field → null data gap.
    if (!s.field) {
      return { key: s.key, label: s.label, upstream: true, today: null, yesterday: null, total: null, conversionFromPrev: null };
    }
    // Source column empty everywhere → null data gap (not a 0).
    if (s.gapField && !hasValue[s.gapField]) {
      return { key: s.key, label: s.label, today: null, yesterday: null, total: null, conversionFromPrev: null };
    }
    return {
      key: s.key,
      label: s.label,
      today: sumField(perf, reportDate, s.field),
      yesterday: sumField(perf, prevDate, s.field),
      total: sumField(perf, null, s.field),
      conversionFromPrev: null,
    };
  });

  // Stage-to-stage conversion vs. the previous MEASURED stage (today's values).
  let prev: number | null = null;
  for (const stage of stages) {
    if (stage.today != null) {
      stage.conversionFromPrev = prev != null && prev > 0 ? stage.today / prev : null;
      prev = stage.today;
    }
  }
  return stages;
}

/** The largest stage-to-stage % drop among measured stages (the leakage). */
export function biggestLeakage(stages: FunnelStage[]): { from: string; to: string; drop: number } | null {
  let worst: { from: string; to: string; drop: number } | null = null;
  const measured = stages.filter((s) => s.today != null);
  for (let i = 1; i < measured.length; i++) {
    const conv = measured[i].conversionFromPrev;
    if (conv == null) continue;
    const drop = 1 - conv;
    if (!worst || drop > worst.drop) {
      worst = { from: measured[i - 1].label, to: measured[i].label, drop };
    }
  }
  return worst;
}
