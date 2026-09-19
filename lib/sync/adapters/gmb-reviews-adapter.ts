import 'server-only';
import type { AdminClient } from '@/lib/supabase/server';
import { resolveGmbConfig, type GmbConfig } from '@/config/gmb';
import { missingGmbReviewIds, parseGmbReviewsPage, type ApiReview } from '../gmb-reviews-reconciliation';

/**
 * Google reviews adapter — pulls every review on the Business Profile into
 * lane_e.gmb_reviews via the My Business v4 API (the Performance API carries
 * counts only; reviews live in v4). Same OAuth credentials as the GMB
 * performance pull; the account id the v4 path needs is resolved with one
 * accounts.list call. Mirrors the other adapters: best-effort, never throws.
 *
 *   POST oauth2.googleapis.com/token                     (refresh → access)
 *   GET  mybusinessaccountmanagement.googleapis.com/v1/accounts
 *   GET  mybusiness.googleapis.com/v4/{account}/{location}/reviews  (paged)
 *
 * Upserts by review_id, so edited reviews and late replies update in place —
 * a full pull every run also reconciles removals per location. Only a complete,
 * valid, non-empty snapshot can mark missing reviews removed.
 */

export interface GmbReviewsSyncResult {
  ok: boolean;
  fetched: number;
  stored: number;
  averageRating: number | null; // Google's own average, straight from the API
  totalOnGoogle: number | null; // Google's own total review count
  error?: string;
}

const V4 = 'https://mybusiness.googleapis.com/v4';

async function accessToken(cfg: GmbConfig): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      refresh_token: cfg.refreshToken,
      grant_type: 'refresh_token',
    }),
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; error_description?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(`OAuth token exchange failed (${res.status}): ${data.error_description ?? 'no access_token'}`);
  }
  return data.access_token;
}

async function firstAccount(token: string): Promise<string> {
  const res = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => ({}))) as { accounts?: { name?: string }[]; error?: { message?: string } };
  const name = data.accounts?.[0]?.name;
  if (!res.ok || !name) throw new Error(`accounts.list ${res.status}: ${data.error?.message ?? 'no accounts visible'}`);
  return name; // "accounts/{id}"
}

const STARS: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

export async function syncGmbReviews(supabase: AdminClient, opts: { config?: GmbConfig } = {}): Promise<GmbReviewsSyncResult> {
  const cfg = opts.config ?? (await resolveGmbConfig(supabase));
  if (!cfg) return { ok: false, fetched: 0, stored: 0, averageRating: null, totalOnGoogle: null, error: 'GMB not configured' };

  let token: string;
  let account: string;
  try {
    token = await accessToken(cfg);
    account = await firstAccount(token);
  } catch (err) {
    return { ok: false, fetched: 0, stored: 0, averageRating: null, totalOnGoogle: null, error: (err as Error).message };
  }

  let fetched = 0;
  let stored = 0;
  let averageRating: number | null = null;
  let totalOnGoogle: number | null = null;

  for (const loc of cfg.locations) {
    try {
      const reviews: ApiReview[] = [];
      const reviewIds = new Set<string>();
      const pageTokens = new Set<string>();
      let locationTotal: number | undefined;
      let pageToken: string | undefined;
      do {
        const u = new URL(`${V4}/${account}/${loc.path}/reviews`);
        u.searchParams.set('pageSize', '50');
        if (pageToken) u.searchParams.set('pageToken', pageToken);
        const res = await fetch(u.toString(), { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        if (!res.ok) throw new Error(`reviews.list ${res.status}: request failed`);
        const data = parseGmbReviewsPage(await res.json());
        fetched += data.reviews.length;
        averageRating = data.averageRating ?? averageRating;
        totalOnGoogle = data.totalReviewCount ?? totalOnGoogle;

        if (data.totalReviewCount != null) {
          if (locationTotal != null && locationTotal !== data.totalReviewCount) {
            throw new Error('reviews.list count changed during pagination; reconciliation skipped');
          }
          locationTotal = data.totalReviewCount;
        }
        if (data.reviews.length === 0 && (reviews.length > 0 || data.nextPageToken)) {
          throw new Error('reviews.list returned an empty page during pagination; reconciliation skipped');
        }
        for (const review of data.reviews) {
          if (reviewIds.has(review.reviewId)) {
            throw new Error('reviews.list returned a duplicate review; reconciliation skipped');
          }
          reviewIds.add(review.reviewId);
          reviews.push(review);
        }
        pageToken = data.nextPageToken;
        if (pageToken) {
          if (pageTokens.has(pageToken)) {
            throw new Error('reviews.list repeated a page token; reconciliation skipped');
          }
          pageTokens.add(pageToken);
        }
      } while (pageToken);

      // An empty source is not evidence that every stored review was removed.
      if (reviews.length === 0) continue;
      if (locationTotal != null && locationTotal !== reviews.length) {
        throw new Error('reviews.list count does not match the snapshot; reconciliation skipped');
      }

      const syncedAt = new Date().toISOString();
      const rows = reviews.map((r) => ({
        review_id: r.reviewId,
        location_path: loc.path,
        location_label: loc.label,
        reviewer_name: r.reviewer?.displayName ?? null,
        rating: STARS[r.starRating],
        comment: r.comment ?? null,
        create_time: r.createTime,
        update_time: r.updateTime ?? null,
        reply_comment: r.reviewReply?.comment ?? null,
        reply_time: r.reviewReply?.updateTime ?? null,
        synced_at: syncedAt,
        removed_at: null,
      }));

      // Read the full active set before writing; PostgREST caps individual pages.
      const activeIds: string[] = [];
      const pageSize = 500;
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await supabase.from('gmb_reviews')
          .select('review_id')
          .eq('location_path', loc.path)
          .is('removed_at', null)
          .order('review_id', { ascending: true })
          .range(offset, offset + pageSize - 1);
        if (error) throw new Error(`review lookup failed: ${error.message}`);
        if (!data) throw new Error('review lookup returned no data');
        activeIds.push(...data.map((r: { review_id: string }) => r.review_id));
        if (data.length < pageSize) break;
      }

      const missingIds = missingGmbReviewIds(activeIds, [...reviewIds]);
      const { error } = await supabase.from('gmb_reviews').upsert(rows, { onConflict: 'review_id' });
      if (error) throw new Error(`upsert failed: ${error.message}`);
      stored += rows.length;

      for (let i = 0; i < missingIds.length; i += 100) {
        const { error: removalError } = await supabase.from('gmb_reviews')
          .update({ removed_at: syncedAt })
          .eq('location_path', loc.path)
          .is('removed_at', null)
          .in('review_id', missingIds.slice(i, i + 100));
        if (removalError) throw new Error(`review removal failed: ${removalError.message}`);
      }
    } catch (err) {
      return { ok: false, fetched, stored, averageRating, totalOnGoogle, error: (err as Error).message };
    }
  }

  return { ok: true, fetched, stored, averageRating, totalOnGoogle };
}
