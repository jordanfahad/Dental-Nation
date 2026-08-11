import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Google reviews read layer — reads lane_e.gmb_reviews (synced hourly by the
 * cron from the Business Profile). Reputation is not range-filtered: a 4.9
 * average is a property of the clinic, not of the week being viewed, so the
 * report always covers the full history and the monthly trend shows movement.
 */

export interface GmbReview {
  reviewer: string | null;
  rating: number;
  comment: string | null;
  createdAt: string;
  replied: boolean;
}

export interface GmbReviewsMonth {
  month: string; // "2026-05"
  count: number;
  avg: number;
}

export interface GmbReviewsReport {
  total: number;
  avg: number;
  fiveStarShare: number; // 0..1
  responseRate: number; // 0..1 — reviews with a published reply
  unanswered: number; // reviews with text but no reply
  months: GmbReviewsMonth[]; // last 12 months with at least one review
  latest: GmbReview[]; // newest first
}

interface Row {
  reviewer_name: string | null;
  rating: number;
  comment: string | null;
  create_time: string;
  reply_comment: string | null;
}

export async function getGmbReviewsReport(): Promise<GmbReviewsReport | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('gmb_reviews')
    .select('reviewer_name, rating, comment, create_time, reply_comment')
    .order('create_time', { ascending: false })
    .limit(2000);
  if (error || !data || data.length === 0) return null;
  const rows = data as Row[];

  const total = rows.length;
  const avg = rows.reduce((s, r) => s + r.rating, 0) / total;
  const five = rows.filter((r) => r.rating === 5).length;
  const replied = rows.filter((r) => r.reply_comment).length;
  const unanswered = rows.filter((r) => r.comment && !r.reply_comment).length;

  const byMonth = new Map<string, { count: number; sum: number }>();
  for (const r of rows) {
    const m = r.create_time.slice(0, 7);
    const cur = byMonth.get(m) ?? { count: 0, sum: 0 };
    cur.count += 1;
    cur.sum += r.rating;
    byMonth.set(m, cur);
  }
  const months = [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([month, v]) => ({ month, count: v.count, avg: v.sum / v.count }));

  return {
    total,
    avg,
    fiveStarShare: five / total,
    responseRate: replied / total,
    unanswered,
    months,
    latest: rows.slice(0, 8).map((r) => ({
      reviewer: r.reviewer_name,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.create_time,
      replied: Boolean(r.reply_comment),
    })),
  };
}
