/**
 * Campaign recency — a PLAIN module (client-safe, no server imports) so the
 * channel tree's client view and the tests share one definition of "live".
 *
 * LIVE is a data fact, not a status guess: a campaign is live when it has
 * insight rows within the trailing week of the freshest insight date in the
 * set (anchoring on the data keeps the rule correct for historical windows).
 */

export interface DatedCampaign {
  firstDate: string | null;
  lastDate: string | null;
}

const DAY = 86400_000;

/** The freshest lastDate across the set (ISO date), or null when none. */
export function maxLastDate(campaigns: readonly DatedCampaign[]): string | null {
  let max: string | null = null;
  for (const c of campaigns) if (c.lastDate && (!max || c.lastDate > max)) max = c.lastDate;
  return max;
}

/** Live = has rows within 7 days of the anchor (the set's freshest date). */
export function isLiveCampaign(c: DatedCampaign, anchor: string | null): boolean {
  if (!c.lastDate || !anchor) return false;
  const last = Date.parse(`${c.lastDate}T00:00:00Z`);
  const ref = Date.parse(`${anchor}T00:00:00Z`);
  if (Number.isNaN(last) || Number.isNaN(ref)) return false;
  return ref - last <= 6 * DAY;
}
