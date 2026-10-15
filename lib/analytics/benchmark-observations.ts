import 'server-only';
import { resolveGmbConfig } from '@/config/gmb';
import type { AdminClient } from '@/lib/supabase/server';
import { selectAll } from '@/lib/supabase/selectAll';
import { dubaiDay } from '@/lib/gbp/plan';
import type { BranchDemandGroup, BranchListing } from './benchmark';

const COMPETITOR_KEYS: Record<string, string> = {
  'drjoydentalclinic.com': 'dr-joy',
  'drmichaels.com': 'dr-michaels',
};
const roundRating = (value: number) => Math.round(value * 10) / 10;

/** Missing counters must not become zeroes or a partial brand total. */
export function listingObservation(listings: BranchListing[]) {
  if (!listings.length || listings.some((l) => l.reviews == null || !Number.isSafeInteger(l.reviews) || l.reviews < 0)) return null;
  const count = listings.reduce((n, l) => n + l.reviews!, 0);
  const rated = listings.filter((l) => l.reviews! > 0);
  const completeRating = rated.every((l) => l.rating != null && Number.isFinite(l.rating) && l.rating >= 1 && l.rating <= 5);
  return { count, rating: count > 0 && completeRating ? roundRating(rated.reduce((n, l) => n + l.rating! * l.reviews!, 0) / count) : null };
}

/** Called inside the existing weekly cache miss only, never on a cache hit.
 * Uses the existing social_insights columns and PK. No public API calls here.
 * Isolate storage failures so they do not cause another paid Maps fetch.
 */
export async function storeBenchmarkObservations(db: AdminClient, groups: BranchDemandGroup[], at = new Date()) {
  const day = dubaiDay(at);
  const failed: string[] = [];
  let stored = 0;
  const save = async (clinic: string, integration: string, observation: { count: number; rating: number | null }) => {
    const rows = [
      { metric: 'review_count', metric_label: 'Google review count', value: observation.count },
      { metric: 'rating', metric_label: 'Google rating', value: observation.rating },
    ].map((metric) => ({ ...metric, clinic, channel: 'benchmark', integration, day, synced_at: at.toISOString() }));
    const { error } = await db.from('social_insights').upsert(rows, { onConflict: 'clinic,channel,metric,day' });
    if (error) throw new Error('Benchmark observation storage failed');
    stored += rows.length;
  };
  // Configuration can repeat a domain. Persist each identity once per run.
  for (const [domain, group] of new Map(groups.map((g) => [g.domain.toLowerCase(), g]))) {
    const clinic = COMPETITOR_KEYS[domain];
    const observation = clinic && listingObservation(group.listings);
    if (!observation) continue;
    try { await save(clinic, domain, observation); } catch { failed.push(clinic); }
  }
  try {
    const config = await resolveGmbConfig(db, true);
    const wasl = config?.locations.find((l) => l.clinic === 'dental-nation');
    if (wasl) {
      const { data } = await selectAll(() => db.from('gmb_reviews').select('rating')
        .eq('location_path', wasl.path).is('removed_at', null), 'review_id');
      const ratings = data.map((r) => r.rating == null ? NaN : Number(r.rating));
      const validRatings = ratings.length > 0 && ratings.every((n) => Number.isFinite(n) && n >= 1 && n <= 5);
      await save('dental-nation', wasl.path, { count: data.length,
        rating: validRatings ? roundRating(ratings.reduce((n, r) => n + r, 0) / ratings.length) : null });
    }
  } catch { failed.push('dental-nation'); }
  return { stored, failed };
}
