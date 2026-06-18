/**
 * Thresholds for the SUGGESTED daily decision (§10). The rule must always show
 * its reasoning on the page — never a black-box verdict. The reviewer overrides.
 */
export const decisionRules = {
  /** Floor for lead→booking rate (qualified → Glow Up booking). Below → Fix. */
  leadToBookingFloor: 0.1, // 10%
  /** Share of inquiries that may be unattributed before it triggers Fix. */
  unattributedShareCeiling: 0.2, // 20%
  /** Below this many qualified inquiries, volume is too low to judge → Hold. */
  minQualifiedToJudge: 5,
  /** Trailing window (days) checked for the "0 qualified → Stop" rule. */
  stopWindowDays: 3,
} as const;

/** Minimum qualified inquiries a channel needs before it can be ranked
 *  best/worst — stops a 1-lead channel from "winning" (§10). */
export const MIN_CHANNEL_VOLUME = 3;

/** Default target for PAC first-response time, in minutes (§F gauge). */
export const RESPONSE_TIME_TARGET_MIN = 15;

/**
 * Thresholds for the SUGGESTED weekly Scale/Fix/Hold/Stop decision (§B/§A).
 * Like the daily rule, the weekly verdict always shows its reasoning — never a
 * black-box; the reviewer overrides. Cost ceilings are in AED.
 */
export const weeklyDecisionRules = {
  /** Cost per qualified inquiry (paid lead) ceiling, AED. Above → Fix. */
  costPerQualifiedCeiling: 250,
  /** Cost per booking ceiling, AED. Above → Fix (when bookings are sourced). */
  costPerBookingCeiling: 1500,
  /** Lead→booking floor (qualified → booking). Below → Fix. */
  leadToBookingFloor: 0.1, // 10%
  /** Below this many qualified inquiries in the week, volume is too low to judge → Hold. */
  minQualifiedToJudge: 5,
  /** A channel that is "good cost" (≤ this fraction of the ceiling) AND has
   *  sufficient volume → Scale. */
  scaleCostFraction: 0.7,
} as const;
