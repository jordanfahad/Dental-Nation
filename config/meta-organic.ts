import 'server-only';
import type { AdminClient } from '@/lib/supabase/server';

/**
 * Meta ORGANIC insights (Instagram + Facebook Page) — separate from the Meta
 * ADS config (config/meta.ts). Organic insights need different scopes than
 * ads_read: pages_read_engagement, read_insights, instagram_basic,
 * instagram_manage_insights (+ business_management).
 *
 * Credentials resolve in this order (no Vercel env change required):
 *   1. Env vars (META_ORGANIC_TOKEN|META_ACCESS_TOKEN, META_FB_PAGE_ID, META_IG_USER_ID)
 *   2. lane_e.app_secrets rows (meta_organic_token / meta_fb_page_id / meta_ig_user_id)
 *
 * The system-user token is non-expiring, so storing it once in app_secrets makes
 * the daily cron self-sustaining. At least one of the two ids must be present.
 */
export interface MetaOrganicConfig {
  token: string;
  version: string;
  fbPageId: string | null;
  igUserId: string | null;
}

/** Env-only resolution (kept for callers that only need the fast path). */
export function getMetaOrganicConfig(): MetaOrganicConfig | null {
  const token = (process.env.META_ORGANIC_TOKEN || process.env.META_ACCESS_TOKEN)?.trim();
  if (!token) return null;
  const fbPageId = process.env.META_FB_PAGE_ID?.trim() || null;
  const igUserId = process.env.META_IG_USER_ID?.trim() || null;
  if (!fbPageId && !igUserId) return null;
  return { token, version: process.env.META_API_VERSION?.trim() || 'v21.0', fbPageId, igUserId };
}

/** Read the three credentials from lane_e.app_secrets. Best-effort, never throws. */
async function readSecrets(
  supabase: AdminClient | null,
): Promise<{ token?: string; fbPageId?: string; igUserId?: string }> {
  if (!supabase) return {};
  try {
    const { data } = await supabase
      .from('app_secrets')
      .select('key, value')
      .in('key', ['meta_organic_token', 'meta_fb_page_id', 'meta_ig_user_id']);
    const map = new Map((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
    return {
      token: map.get('meta_organic_token')?.trim() || undefined,
      fbPageId: map.get('meta_fb_page_id')?.trim() || undefined,
      igUserId: map.get('meta_ig_user_id')?.trim() || undefined,
    };
  } catch {
    return {};
  }
}

/** Env first, then Supabase-stored secrets. Preferred for the sync pipeline. */
export async function resolveMetaOrganicConfig(
  supabase: AdminClient | null,
): Promise<MetaOrganicConfig | null> {
  const env = getMetaOrganicConfig();
  if (env) return env;
  const s = await readSecrets(supabase);
  if (!s.token) return null;
  const fbPageId = s.fbPageId ?? null;
  const igUserId = s.igUserId ?? null;
  if (!fbPageId && !igUserId) return null;
  return { token: s.token, version: process.env.META_API_VERSION?.trim() || 'v21.0', fbPageId, igUserId };
}

export function isMetaOrganicConfigured(): boolean {
  return getMetaOrganicConfig() !== null;
}

/** True if env OR Supabase-stored secrets provide a usable config. */
export async function isMetaOrganicResolvable(supabase: AdminClient | null): Promise<boolean> {
  return (await resolveMetaOrganicConfig(supabase)) !== null;
}

/** Insight time-series metrics per channel → our social_insights metric keys.
 *  `field` metrics are single current values (stock); `insight` are daily series. */
export interface MetaMetricDef {
  kind: 'insight' | 'field';
  api: string; // graph metric or field name
  key: string; // social_insights metric key
  label: string;
  /** Newer IG insights (profile_views, etc.) must be requested with
   *  metric_type=total_value and return a single aggregate, not a daily series. */
  totalValue?: boolean;
}

export const IG_METRICS: MetaMetricDef[] = [
  { kind: 'field', api: 'followers_count', key: 'followers', label: 'Followers' },
  { kind: 'insight', api: 'reach', key: 'reach', label: 'Reach' },
  { kind: 'insight', api: 'profile_views', key: 'profile_views', label: 'Profile Views', totalValue: true },
];

// Facebook Page insights must be called with a PAGE access token (derived from
// the system-user token in the adapter). page_impressions was deprecated, so we
// keep the page-likes stock (fan_count) + post engagements only.
export const FB_METRICS: MetaMetricDef[] = [
  { kind: 'field', api: 'fan_count', key: 'followers', label: 'Page Likes' },
  { kind: 'insight', api: 'page_post_engagements', key: 'engagement', label: 'Post Engagements' },
];

/** Instagram audience demographic breakdowns → social_demographics.dimension. */
export const IG_DEMOGRAPHICS: { breakdown: string; dimension: string }[] = [
  { breakdown: 'age', dimension: 'age' },
  { breakdown: 'gender', dimension: 'gender' },
  { breakdown: 'city', dimension: 'city' },
  { breakdown: 'country', dimension: 'country' },
];
