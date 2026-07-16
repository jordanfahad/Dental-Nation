import 'server-only';

/**
 * Meta ORGANIC insights (Instagram + Facebook Page) — separate from the Meta
 * ADS config (config/meta.ts). Organic insights need different scopes than
 * ads_read: pages_read_engagement, read_insights, instagram_basic,
 * instagram_manage_insights (+ business_management).
 *
 * Required env (set in Vercel):
 *   META_ORGANIC_TOKEN   long-lived token with the scopes above. Falls back to
 *                        META_ACCESS_TOKEN if that token already has them.
 *   META_FB_PAGE_ID      Facebook Page id (for FB Page insights)
 *   META_IG_USER_ID      Instagram Business account id (for IG insights). If
 *                        omitted but a Page id is set, the adapter tries to
 *                        derive it from the Page (instagram_business_account).
 *   META_API_VERSION     optional, default v21.0
 *
 * At least one of META_FB_PAGE_ID / META_IG_USER_ID must be present.
 */
export interface MetaOrganicConfig {
  token: string;
  version: string;
  fbPageId: string | null;
  igUserId: string | null;
}

export function getMetaOrganicConfig(): MetaOrganicConfig | null {
  const token = (process.env.META_ORGANIC_TOKEN || process.env.META_ACCESS_TOKEN)?.trim();
  if (!token) return null;
  const fbPageId = process.env.META_FB_PAGE_ID?.trim() || null;
  const igUserId = process.env.META_IG_USER_ID?.trim() || null;
  if (!fbPageId && !igUserId) return null;
  return { token, version: process.env.META_API_VERSION?.trim() || 'v21.0', fbPageId, igUserId };
}

export function isMetaOrganicConfigured(): boolean {
  return getMetaOrganicConfig() !== null;
}

/** Insight time-series metrics per channel → our social_insights metric keys.
 *  `field` metrics are single current values (stock); `insight` are daily series. */
export interface MetaMetricDef {
  kind: 'insight' | 'field';
  api: string; // graph metric or field name
  key: string; // social_insights metric key
  label: string;
}

export const IG_METRICS: MetaMetricDef[] = [
  { kind: 'field', api: 'followers_count', key: 'followers', label: 'Followers' },
  { kind: 'insight', api: 'reach', key: 'reach', label: 'Reach' },
  { kind: 'insight', api: 'profile_views', key: 'profile_views', label: 'Profile Views' },
];

export const FB_METRICS: MetaMetricDef[] = [
  { kind: 'field', api: 'fan_count', key: 'followers', label: 'Page Likes' },
  { kind: 'insight', api: 'page_impressions', key: 'reach', label: 'Impressions' },
  { kind: 'insight', api: 'page_post_engagements', key: 'engagement', label: 'Post Engagements' },
];
