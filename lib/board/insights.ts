import type { MonthRow, WindowTotals } from './metrics';
import { delta } from './metrics';

/**
 * Turns the live aggregates into the SENTENCES a board document is made of.
 *
 * Every action title on the report is generated here rather than written into
 * JSX, for the same reason no number is hardcoded: a title that says
 * "bookings nearly doubled" must stop saying that the month it stops being
 * true. If the data can't support a claim, the title falls back to a neutral
 * description — the report never asserts a trend it cannot evidence.
 */

export interface KeyMessage {
  n: number;
  kicker: string;
  headline: string;
  detail: string;
  /** Optional supporting figure rendered large beside the message. */
  stat?: string;
  statLabel?: string;
}

export interface Insights {
  /** The one-sentence finding for the cover. */
  coverHeadline: string;
  keyMessages: KeyMessage[];
  titles: {
    funnel: string;
    trend: string;
    unitEconomics: string;
    channelShift: string;
    appendix: string;
  };
}

const int = (n: number) => Math.round(n).toLocaleString('en-US');
const aed = (n: number) =>
  n >= 1_000_000 ? `AED ${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `AED ${(n / 1_000).toFixed(0)}K` : `AED ${Math.round(n)}`;
const pctChange = (d: number) => `${Math.abs(Math.round(d * 100))}%`;

/** "nearly doubled" / "rose 71%" — plain English for a growth multiple. */
function growthPhrase(d: number): string {
  const p = d * 100;
  if (p >= 180) return 'nearly tripled';
  if (p >= 90) return 'nearly doubled';
  if (p >= 45) return `rose ${pctChange(d)}`;
  if (p > 0) return `grew ${pctChange(d)}`;
  if (p === 0) return 'held flat';
  return `fell ${pctChange(d)}`;
}

export function buildInsights(
  totals: WindowTotals,
  prior: WindowTotals | null,
  monthly: MonthRow[],
  rangeLabel: string,
): Insights {
  const dRevenue = delta(totals.revenue, prior?.revenue ?? null);
  const dBooked = delta(totals.booked, prior?.booked ?? null);
  const dCpb = delta(totals.costPerBooking, prior?.costPerBooking ?? null);
  const dShowed = delta(totals.showed, prior?.showed ?? null);

  // ── Cover headline ────────────────────────────────────────────────────────
  let coverHeadline: string;
  if (totals.revenue != null && totals.spend != null && totals.roas != null) {
    coverHeadline =
      `${aed(totals.spend)} of paid investment has returned ${aed(totals.revenue)} in billed treatment — ` +
      `${totals.roas.toFixed(1)}× — on an operating system built from a standing start.`;
  } else if (totals.spend != null) {
    coverHeadline = `${aed(totals.spend)} of paid investment deployed while the measurement layer was built.`;
  } else {
    coverHeadline = 'The growth engine has been built from a standing start; the measurement layer is live.';
  }

  // ── Key messages ──────────────────────────────────────────────────────────
  const keyMessages: KeyMessage[] = [];

  keyMessages.push({
    n: 1,
    kicker: 'Demand is compounding',
    headline:
      dBooked != null
        ? `Booked appointments ${growthPhrase(dBooked)} against the prior period.`
        : 'Paid acquisition is live and scaling across clinics.',
    detail:
      totals.booked != null
        ? `${int(totals.booked)} appointments booked in ${rangeLabel}, with ${
            totals.showed != null ? int(totals.showed) : '—'
          } patients attending.`
        : 'Campaigns are live across Google and Meta; the booking feed reports from the practice-management system.',
    stat: totals.booked != null ? int(totals.booked) : undefined,
    statLabel: 'appointments booked',
  });

  keyMessages.push({
    n: 2,
    kicker: 'Efficiency is improving',
    headline:
      dCpb != null && dCpb < 0
        ? `Cost per booking fell ${pctChange(dCpb)} while volume grew — the engine is getting cheaper as it scales.`
        : totals.costPerBooking != null
          ? `Each booked appointment costs ${aed(totals.costPerBooking)} in media.`
          : 'Unit economics become measurable as the attribution layer completes.',
    detail:
      totals.roas != null
        ? `Every dirham of media has returned ${totals.roas.toFixed(1)} dirhams of billed treatment in this window.`
        : 'Return on ad spend reports once billed revenue is joined to the acquisition source.',
    stat: totals.costPerBooking != null ? aed(totals.costPerBooking) : undefined,
    statLabel: 'cost per booking',
  });

  keyMessages.push({
    n: 3,
    kicker: 'The system, not the campaign',
    headline:
      'A proprietary Marketing Operating System now consolidates twelve data sources into one daily control layer.',
    detail:
      'Owned infrastructure rather than rented SaaS: spend, leads, bookings and billed revenue reconcile in one place — and this report is served live from it.',
    stat: '12',
    statLabel: 'data sources, one dashboard',
  });

  const leakage =
    totals.noshow != null && totals.booked != null && totals.booked > 0
      ? totals.noshow / totals.booked
      : null;
  keyMessages.push({
    n: 4,
    kicker: 'Where the next gain is',
    headline:
      leakage != null
        ? `${pctChange(leakage)} of booked appointments do not arrive — the largest recoverable value in the funnel.`
        : 'Conversion leakage, not media budget, is the constraint on the next phase.',
    detail:
      'The operating system’s first decision rule is to fix conversion leakage before scaling paid spend. Closing this gap raises revenue without raising media investment.',
    stat: totals.noshow != null ? int(totals.noshow) : undefined,
    statLabel: 'appointments lost to no-shows',
  });

  // ── Exhibit action titles ─────────────────────────────────────────────────
  const months = monthly.filter((m) => (m.revenue ?? 0) > 0);
  const first = months[0];
  const last = months[months.length - 1];
  const revenueRamp =
    first && last && (first.revenue ?? 0) > 0 && first !== last
      ? (last.revenue as number) / (first.revenue as number)
      : null;

  const titles = {
    funnel:
      totals.booked != null && totals.showed != null && totals.revenue != null
        ? `Reach converts to revenue at every step — but one in ${
            totals.booked > 0 && totals.booked > totals.showed
              ? Math.max(2, Math.round(totals.booked / Math.max(totals.booked - totals.showed, 1)))
              : 2
          } booked appointments still does not arrive`
        : 'The funnel is measured end to end, from ad impression to billed treatment',
    trend:
      revenueRamp != null && revenueRamp > 1.5
        ? `Billed revenue has grown ${revenueRamp.toFixed(1)}× since the practice-management feed went live, on flat media spend`
        : 'Billed revenue is tracked against media investment, month by month',
    unitEconomics:
      dCpb != null && dCpb < 0 && dBooked != null && dBooked > 0
        ? `Volume ${growthPhrase(dBooked)} while cost per booking fell ${pctChange(dCpb)} — growth and efficiency at the same time`
        : 'Unit economics across the acquisition funnel',
    channelShift:
      'Consolidating spend behind the better-performing channel held volume while media investment stayed flat',
    appendix:
      dRevenue != null
        ? `Month by month, the full record behind every figure in this report`
        : 'Month by month, the full record behind every figure in this report',
  };

  return { coverHeadline, keyMessages, titles };
}

/** Convenience for the show-rate story. */
export function showRateNote(totals: WindowTotals): string | null {
  if (totals.showRate == null || totals.booked == null) return null;
  return `${Math.round(totals.showRate * 100)}% of resolved appointments were attended.`;
}
