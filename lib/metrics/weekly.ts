import type { Decision } from '@/lib/types';
import { weeklyDecisionRules } from '@/config/decision-rules';

/**
 * Weekly SUGGESTED Scale/Fix/Hold/Stop decisions (§A/§B). Mirrors the daily
 * decision philosophy: every verdict carries its reasoning (never a black-box),
 * the reviewer overrides, and a metric with NO real source degrades the verdict
 * to an honest "Hold — insufficient data" rather than a fabricated judgement.
 *
 * `Decision` here reuses the daily union — for weekly we surface 'Continue' as
 * the label "Scale" in the UI (the UI maps it). Keeping the same union lets us
 * reuse DecisionPill styling without a second type.
 */

export type WeeklyDecision = 'Scale' | 'Fix' | 'Hold' | 'Stop';

export interface WeeklyDecisionResult {
  decision: WeeklyDecision;
  reason: string;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`;

export interface ChannelDecisionInputs {
  channel: string;
  spend: number | null;
  /** Qualified inquiries for the channel this week (paid leads, or tracked inquiries). */
  qualified: number | null;
  /** Bookings attributed to this channel, or null when there is NO per-channel
   *  booking source (the honest weekly case → degrades to Hold). */
  bookings: number | null;
  /** Cost per qualified inquiry (spend / qualified), or null (data gap). */
  costPerQualified: number | null;
  /** Cost per booking (spend / bookings), or null (no per-channel booking source). */
  costPerBooking: number | null;
}

/**
 * Suggested per-channel weekly decision (§B). Rule order:
 *   Stop  → real spend but 0 qualified (money in, nothing out)
 *   Hold  → too little volume / a data gap that blocks a fair judgement
 *   Fix   → cost above ceiling OR lead→booking below floor
 *   Scale → good cost AND sufficient volume
 * When bookings/qualified can't be judged (no per-channel booking source), the
 * verdict honestly degrades to "Hold — insufficient data".
 */
export function weeklyChannelDecision(input: ChannelDecisionInputs): WeeklyDecisionResult {
  const r = weeklyDecisionRules;
  const spend = input.spend ?? 0;
  const qualified = input.qualified;

  // Stop — spent money, produced nothing qualified.
  if (spend > 0 && qualified != null && qualified === 0) {
    return {
      decision: 'Stop',
      reason: `Stop — ${aed(spend)} spent with 0 qualified inquiries this week`,
    };
  }

  // Hold — volume too low to judge, or qualified is itself a data gap.
  if (qualified == null) {
    return { decision: 'Hold', reason: 'Hold — qualified inquiries not sourced for this channel' };
  }
  if (qualified < r.minQualifiedToJudge) {
    return {
      decision: 'Hold',
      reason: `Hold — only ${qualified} qualified inquiries (below the ${r.minQualifiedToJudge} needed to judge)`,
    };
  }

  // Fix — cost-per-qualified above ceiling (the one cost we CAN source per channel).
  if (input.costPerQualified != null && input.costPerQualified > r.costPerQualifiedCeiling) {
    return {
      decision: 'Fix',
      reason: `Fix — ${aed(input.costPerQualified)} per qualified inquiry (above the ${aed(
        r.costPerQualifiedCeiling,
      )} ceiling)`,
    };
  }

  // Booking-based judgement only when a per-channel booking source exists.
  if (input.bookings == null) {
    return {
      decision: 'Hold',
      reason: 'Hold — insufficient data (no per-channel booking source to judge quality)',
    };
  }

  if (input.costPerBooking != null && input.costPerBooking > r.costPerBookingCeiling) {
    return {
      decision: 'Fix',
      reason: `Fix — ${aed(input.costPerBooking)} per booking (above the ${aed(
        r.costPerBookingCeiling,
      )} ceiling)`,
    };
  }
  const leadToBooking = qualified > 0 ? input.bookings / qualified : null;
  if (leadToBooking != null && leadToBooking < r.leadToBookingFloor) {
    return {
      decision: 'Fix',
      reason: `Fix — lead→booking ${pct(leadToBooking)} below the ${pct(r.leadToBookingFloor)} floor`,
    };
  }

  // Scale — good cost (well under the ceiling) AND enough volume to trust it.
  const goodCost =
    input.costPerQualified == null ||
    input.costPerQualified <= r.costPerQualifiedCeiling * r.scaleCostFraction;
  if (goodCost) {
    return {
      decision: 'Scale',
      reason: `Scale — efficient cost with ${qualified} qualified inquiries; volume supports more budget`,
    };
  }

  return {
    decision: 'Hold',
    reason: 'Hold — within thresholds but not clearly efficient enough to scale',
  };
}

export interface OverallDecisionInputs {
  /** All per-channel decisions for the week. */
  channelDecisions: WeeklyDecision[];
  /** Total qualified inquiries (paid leads) this week. */
  totalQualified: number;
  /** Total bookings this week (real, from the bookings source). */
  totalBookings: number;
  /** Share of inquiries unattributed this week, 0–1, or null (data gap). */
  unattributedShare: number | null;
  /** Any OPEN high-impact blocker. */
  hasOpenHighImpactBlocker: boolean;
}

/**
 * Suggested OVERALL weekly decision (§A). Rolls the per-channel verdicts up with
 * the week's funnel health into one Scale/Fix/Hold/Stop call, always reasoned.
 */
export function weeklyOverallDecision(input: OverallDecisionInputs): WeeklyDecisionResult {
  const r = weeklyDecisionRules;
  const d = input.channelDecisions;
  const has = (x: WeeklyDecision) => d.includes(x);

  if (input.totalQualified < r.minQualifiedToJudge) {
    return {
      decision: 'Hold',
      reason: `Hold — only ${input.totalQualified} qualified inquiries this week (below the ${r.minQualifiedToJudge} needed to judge)`,
    };
  }

  // A channel burning money with nothing qualified drags the week to Stop-on-that-channel,
  // but the overall call is Fix unless EVERY judged channel is Stop.
  if (d.length > 0 && d.every((x) => x === 'Stop')) {
    return { decision: 'Stop', reason: 'Stop — every judged channel produced 0 qualified inquiries' };
  }

  const leadToBooking = input.totalQualified > 0 ? input.totalBookings / input.totalQualified : null;
  if (input.hasOpenHighImpactBlocker) {
    return { decision: 'Fix', reason: 'Fix — an open high-impact blocker is constraining the week' };
  }
  if (input.unattributedShare != null && input.unattributedShare > 0.2) {
    return {
      decision: 'Fix',
      reason: `Fix — ${pct(input.unattributedShare)} of inquiries unattributed (above the 20% ceiling)`,
    };
  }
  if (has('Stop') || has('Fix')) {
    return {
      decision: 'Fix',
      reason: 'Fix — one or more channels need attention before scaling spend',
    };
  }
  if (leadToBooking != null && leadToBooking < r.leadToBookingFloor) {
    return {
      decision: 'Fix',
      reason: `Fix — overall lead→booking ${pct(leadToBooking)} below the ${pct(r.leadToBookingFloor)} floor`,
    };
  }
  if (has('Scale')) {
    return {
      decision: 'Scale',
      reason: 'Scale — channels are efficient with sufficient volume; increase budget next week',
    };
  }
  return { decision: 'Hold', reason: 'Hold — steady; no clear signal to scale or fix this week' };
}

/** Map a weekly decision to the daily `Decision` union for DecisionPill reuse. */
export function asPillDecision(d: WeeklyDecision): Decision {
  return d === 'Scale' ? 'Continue' : (d as Decision);
}
