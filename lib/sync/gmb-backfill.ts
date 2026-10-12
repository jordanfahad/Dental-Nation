import 'server-only';
import type { AdminClient } from '@/lib/supabase/server';
import type { GmbConfig } from '@/config/gmb';
import { syncGmb } from './adapters/gmb-adapter';
import { syncGmbReviews } from './adapters/gmb-reviews-adapter';
import { syncGmbSearchKeywords } from './adapters/gmb-keywords-adapter';

export function validGmbBackfillDate(from: unknown, today = new Date().toISOString().slice(0, 10)): from is string {
  if (typeof from !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(from) || from > today) return false;
  const parsed = new Date(`${from}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === from;
}

export async function backfillGmb(db: AdminClient, config: GmbConfig, from: string) {
  if (!validGmbBackfillDate(from)) throw new Error('Choose a valid start date on or before today.');
  const to = new Date().toISOString().slice(0, 10);
  const months = (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(to.slice(5, 7)) - Number(from.slice(5, 7)) + 1;
  const performance = await syncGmb(db, { config, from, to });
  const reviews = await syncGmbReviews(db, { config });
  const keywords = await syncGmbSearchKeywords(db, { config, months });
  return { ok: performance.ok && reviews.ok && keywords.ok, from, to, performance, reviews, keywords };
}
