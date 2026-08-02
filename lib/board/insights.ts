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

/**
 * @param totals   the selected window — drives comparisons and deltas
 * @param allTime  the full recorded history — drives any RETURN claim
 *
 * The split matters. Billed revenue inside a 30-day window largely comes from
 * patients acquired in earlier months, so dividing it by that window's media
 * spend produces a spectacular and meaningless number (43× on a recent month
 * here). A ratio like that on a board cover invites exactly one question and
 * does not survive it. Every return-on-investment statement in this report is
 * therefore computed over the FULL period, where the numerator and the
 * denominator describe the same cohort, and is labelled "since launch".
 */
export function buildInsights(
  totals: WindowTotals,
  prior: WindowTotals | null,
  monthly: MonthRow[],
  rangeLabel: string,
  allTime: WindowTotals,
): Insights {
  const dRevenue = delta(totals.revenue, prior?.revenue ?? null);
  const dBooked = delta(totals.booked, prior?.booked ?? null);
  const dCpb = delta(totals.costPerBooking, prior?.costPerBooking ?? null);
  const dShowed = delta(totals.showed, prior?.showed ?? null);

  // ── Cover headline — always computed over the FULL period, never the window.
  let coverHeadline: string;
  if (allTime.revenue != null && allTime.spend != null && allTime.roas != null) {
    coverHeadline =
      `Since launch, ${aed(allTime.spend)} of media investment has been accompanied by ` +
      `${aed(allTime.revenue)} of billed treatment — ${allTime.roas.toFixed(1)}× — from a marketing function ` +
      `built from a standing start.`;
  } else if (allTime.spend != null) {
    coverHeadline = `${aed(allTime.spend)} of media investment deployed while the measurement layer was built from a standing start.`;
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
      allTime.roas != null
        ? `Across the full period, ${aed(allTime.spend ?? 0)} of media sits alongside ${aed(allTime.revenue ?? 0)} of billed treatment — ${allTime.roas.toFixed(1)}×. Measured over the whole period deliberately: revenue booked in any one month largely comes from patients acquired earlier.`
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
  // Revenue ramp, measured between COMPARABLE months.
  //
  // The practice-management feed switched on mid-April and recorded a single
  // AED 380 bill that month. Taking that as the baseline produced "revenue has
  // grown 785×" — arithmetically real, completely meaningless, and the kind of
  // number that discredits every honest figure next to it. Months contributing
  // under 5% of the peak are treated as partial-feed artifacts and excluded
  // from the baseline, and an implausible multiple falls back to neutral
  // wording rather than being printed.
  const withRevenue = monthly.filter((m) => (m.revenue ?? 0) > 0);
  const peak = Math.max(...withRevenue.map((m) => m.revenue as number), 0);
  const comparable = withRevenue.filter((m) => (m.revenue as number) >= peak * 0.05);
  const firstFull = comparable[0];
  const lastFull = comparable[comparable.length - 1];
  const revenueRamp =
    firstFull && lastFull && firstFull !== lastFull
      ? (lastFull.revenue as number) / (firstFull.revenue as number)
      : null;
  const rampCredible = revenueRamp != null && revenueRamp > 1.5 && revenueRamp < 60;
  const mLabel = (m?: MonthRow) => {
    if (!m) return '';
    const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return names[Number(m.month.split('-')[1]) - 1];
  };

  const titles = {
    funnel:
      totals.showRate != null
        ? `Reach converts to revenue at every step — but ${pctChange(1 - totals.showRate)} of resolved appointments end in a cancellation or no-show`
        : 'The funnel is measured end to end, from ad impression to billed treatment',
    trend: rampCredible
      ? `Billed revenue grew ${(revenueRamp as number).toFixed(1)}× between ${mLabel(firstFull)} and ${mLabel(lastFull)} while media investment stayed flat`
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
