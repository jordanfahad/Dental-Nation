/**
 * Minimal in-memory rate limiter to blunt brute-force on /login (§12).
 * NOTE: serverless instances don't share memory, so this is best-effort per
 * instance. For hard guarantees, back it with a Supabase counter table — noted
 * in BUILD_NOTES. Adequate for a single-reviewer shared-secret gate.
 */
interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function checkRateLimit(
  key: string,
  limit = 8,
  windowMs = 10 * 60 * 1000,
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { allowed: false, remaining: 0, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true, remaining: limit - bucket.count, retryAfterSec: 0 };
}
