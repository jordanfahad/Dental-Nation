import 'server-only';

/**
 * Google Business Profile (GMB) — local-search performance config. Uses a
 * user-consented OAuth 2.0 refresh token (the Business Profile Performance API
 * does NOT accept the Ads service account), exchanged at request time for a
 * short-lived access token.
 *
 * Required env (set in Vercel):
 *   GMB_CLIENT_ID       OAuth client id of the Google Cloud project
 *   GMB_CLIENT_SECRET   OAuth client secret
 *   GMB_REFRESH_TOKEN   refresh token for the account that MANAGES the listing
 *                       (scope: https://www.googleapis.com/auth/business.manage)
 *   GMB_LOCATION_IDS    one or more location ids, comma-separated. Accepts the
 *                       bare id, "locations/123", or "accounts/x/locations/123".
 *   GMB_LOCATION_LABELS optional, comma-separated display names (aligned to IDs)
 */
export interface GmbConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  /** Normalised to "locations/{id}". */
  locations: { path: string; label: string | null }[];
}

/** Normalise any accepted location form to "locations/{id}". */
function normLocation(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const m = s.match(/locations\/([^/]+)/i);
  const id = m ? m[1] : s.replace(/^locations\//i, '');
  return id ? `locations/${id}` : null;
}

export function getGmbConfig(): GmbConfig | null {
  const clientId = process.env.GMB_CLIENT_ID?.trim();
  const clientSecret = process.env.GMB_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GMB_REFRESH_TOKEN?.trim();
  const rawLocations = process.env.GMB_LOCATION_IDS?.trim();
  if (!clientId || !clientSecret || !refreshToken || !rawLocations) return null;

  const labels = (process.env.GMB_LOCATION_LABELS ?? '').split(',').map((s) => s.trim());
  const locations = rawLocations
    .split(',')
    .map((raw, i) => {
      const path = normLocation(raw);
      return path ? { path, label: labels[i] || null } : null;
    })
    .filter((x): x is { path: string; label: string | null } => x !== null);

  if (locations.length === 0) return null;
  return { clientId, clientSecret, refreshToken, locations };
}

export function isGmbConfigured(): boolean {
  return getGmbConfig() !== null;
}

/** Business Profile Performance daily metrics → our social_insights metric keys. */
export const GMB_METRICS: { api: string; key: string; label: string }[] = [
  { api: 'CALL_CLICKS', key: 'calls', label: 'Phone Calls' },
  { api: 'BUSINESS_DIRECTION_REQUESTS', key: 'directions', label: 'Direction Requests' },
  { api: 'WEBSITE_CLICKS', key: 'website_clicks', label: 'Website Clicks' },
  { api: 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS', key: 'map_views_desktop', label: 'Desktop Map Views' },
  { api: 'BUSINESS_IMPRESSIONS_MOBILE_MAPS', key: 'map_views_mobile', label: 'Mobile Map Views' },
];
