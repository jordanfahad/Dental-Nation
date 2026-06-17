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
