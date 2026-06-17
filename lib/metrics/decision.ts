import type { Decision } from '@/lib/types';
import { decisionRules } from '@/config/decision-rules';

export interface DecisionInputs {
  /** Qualified-inquiry counts for the trailing window (newest last). */
  qualifiedTrailing: number[];
  qualifiedToday: number;
  leadToBookingRate: number | null;
  unattributedShare: number; // 0–1
  /** Any OPEN high-impact blocker of type tracking or PAC. */
  hasOpenHighImpactTrackingOrPac: boolean;
}

export interface DecisionResult {
  decision: Decision;
  reason: string;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

/**
 * Suggested decision (§10). Always returns its reasoning — never a black-box
 * verdict; the reviewer overrides. Order: Stop → structural Fix → Hold (too
 * little volume to judge) → rate Fix → Continue. (Hold precedes the rate-based
 * Fix so a noisy low-volume day doesn't fire Fix on an unreliable rate — see
 * BUILD_NOTES.)
 */
export function suggestDecision(input: DecisionInputs): DecisionResult {
  const r = decisionRules;

  const window = input.qualifiedTrailing.slice(-r.stopWindowDays);
  const sumWindow = window.reduce((a, b) => a + b, 0);
  if (window.length >= r.stopWindowDays && sumWindow === 0) {
    return {
      decision: 'Stop',
      reason: `Stop — 0 qualified inquiries across the trailing ${r.stopWindowDays} days`,
    };
  }

  if (input.unattributedShare > r.unattributedShareCeiling) {
    return {
      decision: 'Fix',
      reason: `Fix — ${pct(input.unattributedShare)} of inquiries unattributed (above the ${pct(
        r.unattributedShareCeiling,
      )} ceiling)`,
    };
  }
  if (input.hasOpenHighImpactTrackingOrPac) {
    return {
      decision: 'Fix',
      reason: 'Fix — an open high-impact tracking/PAC blocker is in play',
    };
  }

  if (input.qualifiedToday < r.minQualifiedToJudge) {
    return {
      decision: 'Hold',
      reason: `Hold — only ${input.qualifiedToday} qualified inquiries today (below the ${r.minQualifiedToJudge} needed to judge)`,
    };
  }

  if (input.leadToBookingRate != null && input.leadToBookingRate < r.leadToBookingFloor) {
    return {
      decision: 'Fix',
      reason: `Fix — lead→booking ${pct(input.leadToBookingRate)} is below the ${pct(
        r.leadToBookingFloor,
      )} floor`,
    };
  }

  const rateLabel = input.leadToBookingRate != null ? pct(input.leadToBookingRate) : 'n/a';
  return {
    decision: 'Continue',
    reason: `Continue — lead→booking ${rateLabel} at or above the ${pct(
      r.leadToBookingFloor,
    )} floor with sufficient volume`,
  };
}
