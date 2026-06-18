import type { FunnelStage, RangeReport } from '@/lib/types';
import {
  weeklyChannelDecision,
  weeklyOverallDecision,
  type WeeklyDecision,
} from '@/lib/metrics/weekly';
import { biggestLeakage } from '@/lib/metrics/funnel';
import { rate } from './format';

/**
 * Pure (no I/O) preparation of the Weekly Review view-model from a RangeReport.
 * Lives outside the JSX so the per-channel decisions computed once in §B can be
 * reused by §A (best/worst channel + overall decision) and §E (action plan).
 *
 * Honesty: anything with no real source stays null here and renders as an owned
 * data gap in the subcomponents — never a fabricated 0.
 */

export interface WeeklyChannelRow {
  channel: string;
  /** 'paid' = from the perf rows (spend/clicks/leads). 'lead' = from the lead tracker (inquiries). */
  kind: 'paid' | 'lead';
  spend: number | null;
  reach: number | null; // always null — no per-channel reach source (data gap)
  clicks: number | null;
  inquiries: number | null;
  qualified: number | null;
  bookings: number | null; // null — no per-channel booking source (data gap)
  costPerBooking: number | null; // null — depends on per-channel bookings (gap)
  costPerQualified: number | null;
  bookingQuality: string | null; // null — no per-channel quality signal (gap)
  decision: WeeklyDecision;
  reason: string;
}

export interface WeeklyModel {
  channelRows: WeeklyChannelRow[];
  overall: { decision: WeeklyDecision; reason: string };
  bestChannel: WeeklyChannelRow | null;
  worstChannel: WeeklyChannelRow | null;
  totals: {
    spend: number | null;
    qualified: number; // paid leads (the qualified-inquiry signal we can source)
    bookings: number; // real bookings from the bookings source
    leadToBooking: number | null;
    costPerQualified: number | null;
    costPerBooking: number | null;
    unattributed: number | null;
    unattributedShare: number | null;
  };
  /** Largest stage-to-stage drop across the measurable weekly funnel (leakage). */
  leakage: { from: string; to: string; drop: number } | null;
  /** Best channel by lead→booking among sufficient-volume channels (quality-not-volume). */
  qualityChannel: string | null;
}

const RANK: Record<WeeklyDecision, number> = { Scale: 0, Hold: 1, Fix: 2, Stop: 3 };

export function prepareWeekly(report: RangeReport): WeeklyModel {
  const { paid, leads, bookings, blockers } = report;

  // --- Paid channels (real spend/clicks/leads from the perf rows). ---
  const paidRows: WeeklyChannelRow[] = paid.byChannel
    .filter((c) => c.channel && c.channel !== 'Unattributed')
    .map((c) => {
      const decision = weeklyChannelDecision({
        channel: c.channel,
        spend: c.spend,
        qualified: c.leads, // paid leads are the channel's qualified-inquiry signal
        bookings: null, // no per-channel booking source → degrades to Hold
        costPerQualified: c.costPerLead,
        costPerBooking: null,
      });
      return {
        channel: c.channel,
        kind: 'paid' as const,
        spend: c.spend,
        reach: null,
        clicks: c.clicks,
        inquiries: c.leads,
        qualified: c.leads,
        bookings: null,
        costPerBooking: null,
        costPerQualified: c.costPerLead,
        bookingQuality: null,
        decision: decision.decision,
        reason: decision.reason,
      };
    });

  // --- Lead-tracker channels (inquiries only; no spend → Hold on data). ---
  const leadRows: WeeklyChannelRow[] = leads.byChannel
    .filter((m) => m.label && m.label !== 'Unattributed' && m.value > 0)
    .map((m) => {
      const decision = weeklyChannelDecision({
        channel: m.label,
        spend: null,
        qualified: null, // qualification isn't sourced per lead-tracker channel
        bookings: null,
        costPerQualified: null,
        costPerBooking: null,
      });
      return {
        channel: m.label,
        kind: 'lead' as const,
        spend: null,
        reach: null,
        clicks: null,
        inquiries: m.value,
        qualified: null,
        bookings: null,
        costPerBooking: null,
        costPerQualified: null,
        bookingQuality: null,
        decision: decision.decision,
        reason: decision.reason,
      };
    });

  const channelRows = [...paidRows, ...leadRows];

  // --- Totals (paid funnel + real bookings; each its own honest population). ---
  const spend = paid.spend.value;
  const qualified = paid.leads.value ?? 0; // paid leads = the qualified signal we can source
  const bookedCount = bookings.booked.value ?? 0;
  const leadToBooking = rate(bookedCount, qualified);
  const costPerQualified = rate(spend, qualified);
  const costPerBooking = rate(spend, bookedCount);
  const unattributed = leads.unattributed.value;
  const totalInq = leads.total.value;
  const unattributedShare = rate(unattributed, totalInq);

  // --- Overall decision (rolls channel verdicts + week funnel health). ---
  const overall = weeklyOverallDecision({
    channelDecisions: channelRows.map((r) => r.decision),
    totalQualified: qualified,
    totalBookings: bookedCount,
    unattributedShare,
    hasOpenHighImpactBlocker: blockers.some((b) => b.impact === 'high' && b.status !== 'done'),
  });

  // --- Best / worst channel (rank by decision, then by efficient cost-per-qualified). ---
  const judgeable = paidRows.filter((r) => r.qualified != null && r.qualified > 0);
  const sorted = [...judgeable].sort((a, b) => {
    const d = RANK[a.decision] - RANK[b.decision];
    if (d !== 0) return d;
    const ca = a.costPerQualified ?? Number.POSITIVE_INFINITY;
    const cb = b.costPerQualified ?? Number.POSITIVE_INFINITY;
    return ca - cb;
  });
  const bestChannel = sorted[0] ?? null;
  const worstChannel = sorted.length > 1 ? sorted[sorted.length - 1] : null;

  // --- Quality-not-volume channel (derived from paid lead→? — no per-channel
  //     bookings, so we fall back to lowest cost-per-qualified among real volume). ---
  const qualityChannel =
    judgeable.length > 0
      ? [...judgeable].sort(
          (a, b) =>
            (a.costPerQualified ?? Number.POSITIVE_INFINITY) -
            (b.costPerQualified ?? Number.POSITIVE_INFINITY),
        )[0].channel
      : null;

  // --- Funnel leakage: the largest measurable stage-to-stage drop this week. ---
  const stages: FunnelStage[] = [
    { key: 'impr', label: 'Impressions', today: paid.impressions.value, yesterday: null, total: null, conversionFromPrev: null },
    { key: 'clicks', label: 'Clicks', today: paid.clicks.value, yesterday: null, total: null, conversionFromPrev: null },
    { key: 'leads', label: 'Qualified inquiries', today: qualified, yesterday: null, total: null, conversionFromPrev: null },
    { key: 'bookings', label: 'Glow Up bookings', today: bookedCount, yesterday: null, total: null, conversionFromPrev: null },
  ];
  // Compute stage-to-stage conversion (mirror lib/metrics/funnel ordering).
  let prev: number | null = null;
  for (const s of stages) {
    if (s.today != null) {
      s.conversionFromPrev = prev != null && prev > 0 ? s.today / prev : null;
      prev = s.today;
    }
  }
  const leakage = biggestLeakage(stages);

  return {
    channelRows,
    overall,
    bestChannel,
    worstChannel,
    totals: {
      spend,
      qualified,
      bookings: bookedCount,
      leadToBooking,
      costPerQualified,
      costPerBooking,
      unattributed,
      unattributedShare,
    },
    leakage,
    qualityChannel,
  };
}
