import 'server-only';
import type { AdminClient } from '@/lib/supabase/server';
import { WEBSITE_BACKFILL_FROM } from '@/config/website-enquiries';

export interface WebsiteReviewCounts { gross: number; actual: number; notYetReviewed: number; booked: number; converted: number }
export interface WebsiteReviewDay extends WebsiteReviewCounts { date: string }
export interface WebsiteReviewSnapshot { available: boolean; synced_at: string; days: WebsiteReviewDay[] }
export const emptyWebsiteReview = (): WebsiteReviewCounts => ({ gross: 0, actual: 0, notYetReviewed: 0, booked: 0, converted: 0 });

/** Aggregate-only storage: no names, phones or team notes. No Sheets IO on pages. */
export async function readWebsiteReview(
  db: AdminClient, range: { from?: string; to?: string }, gross: number, now = Date.now(),
): Promise<WebsiteReviewCounts | null> {
  try {
    if (!range.from || range.from < WEBSITE_BACKFILL_FROM) return null;
    const { data, error } = await db.from('website_review_snapshot').select('available,synced_at,days').eq('id', 'website').maybeSingle();
    if (error || !data?.available || !Array.isArray(data.days)) return null;
    const age = now - Date.parse(data.synced_at);
    if (!Number.isFinite(age) || age < 0 || age > 2 * 60 * 60 * 1000) return null;
    const total = emptyWebsiteReview();
    for (const day of data.days as WebsiteReviewDay[]) {
      if (day.date < range.from || (range.to && day.date > range.to)) continue;
      for (const key of Object.keys(total) as (keyof WebsiteReviewCounts)[]) {
        if (!Number.isSafeInteger(day[key]) || day[key] < 0) return null;
        total[key] += day[key];
      }
    }
    return total.gross === gross ? total : null; // stale/incomplete snapshots cannot masquerade as current
  } catch { return null; }
}

export function websiteReviewLine(review: WebsiteReviewCounts | null, fallback: { enquiries: number; booked: number; treated: number }): string {
  return review
    ? `Gross ${review.gross} · Actual ${review.actual} · Not yet reviewed ${review.notYetReviewed} · Booked ${review.booked} · Converted ${review.converted}`
    : `Gross ${fallback.enquiries} · Booked ${fallback.booked} · Converted ${fallback.treated} · team review unavailable`;
}
