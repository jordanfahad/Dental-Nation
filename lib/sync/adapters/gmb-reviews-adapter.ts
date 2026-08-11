import 'server-only';
import type { AdminClient } from '@/lib/supabase/server';
import { resolveGmbConfig, type GmbConfig } from '@/config/gmb';

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
 * a full pull every run is fine (a clinic has hundreds of reviews, not
 * millions), and it means deleted replies / re-ratings never go stale.
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

interface ApiReview {
  reviewId?: string;
  reviewer?: { displayName?: string };
  starRating?: string;
  comment?: string;
  createTime?: string;
  updateTime?: string;
  reviewReply?: { comment?: string; updateTime?: string };
}
interface ReviewsPage {
  reviews?: ApiReview[];
  averageRating?: number;
  totalReviewCount?: number;
  nextPageToken?: string;
  error?: { message?: string };
}

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
    let pageToken: string | undefined;
    do {
      const u = new URL(`${V4}/${account}/${loc.path}/reviews`);
      u.searchParams.set('pageSize', '50');
      if (pageToken) u.searchParams.set('pageToken', pageToken);
      let data: ReviewsPage;
      try {
        const res = await fetch(u.toString(), { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        data = (await res.json().catch(() => ({}))) as ReviewsPage;
        if (!res.ok) {
          return {
            ok: false, fetched, stored, averageRating, totalOnGoogle,
            error: `reviews.list ${res.status}: ${data.error?.message ?? 'request failed'}`,
          };
        }
      } catch (err) {
        return { ok: false, fetched, stored, averageRating, totalOnGoogle, error: (err as Error).message };
      }

      averageRating = data.averageRating ?? averageRating;
      totalOnGoogle = data.totalReviewCount ?? totalOnGoogle;

      const rows = (data.reviews ?? [])
        .filter((r) => r.reviewId && r.createTime && STARS[r.starRating ?? ''])
        .map((r) => ({
          review_id: r.reviewId!,
          location_path: loc.path,
          location_label: loc.label,
          reviewer_name: r.reviewer?.displayName ?? null,
          rating: STARS[r.starRating!],
          comment: r.comment ?? null,
          create_time: r.createTime!,
          update_time: r.updateTime ?? null,
          reply_comment: r.reviewReply?.comment ?? null,
          reply_time: r.reviewReply?.updateTime ?? null,
          synced_at: new Date().toISOString(),
        }));
      fetched += data.reviews?.length ?? 0;

      if (rows.length > 0) {
        const { error } = await supabase.from('gmb_reviews').upsert(rows, { onConflict: 'review_id' });
        if (error) return { ok: false, fetched, stored, averageRating, totalOnGoogle, error: `upsert failed: ${error.message}` };
        stored += rows.length;
      }
      pageToken = data.nextPageToken;
    } while (pageToken);
  }

  return { ok: true, fetched, stored, averageRating, totalOnGoogle };
}
