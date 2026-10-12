import 'server-only';
import type { AdminClient } from '@/lib/supabase/server';
import { GMB_CLINICS, inferGmbClinic, type GmbClinicKey } from './gmb-clinics';

/**
 * Google Business Profile (GMB) — local-search performance config. Uses a
 * user-consented OAuth 2.0 refresh token (the Business Profile Performance API
 * does NOT accept the Ads service account), exchanged at request time for a
 * short-lived access token.
 *
 * Credentials resolve in this order (same pattern as Meta organic — no Vercel
 * env change required once the secrets are stored in the database):
 *   1. Env vars (below)
 *   2. lane_e.app_secrets rows: gmb_client_id / gmb_client_secret /
 *      gmb_refresh_token / gmb_location_ids / gmb_location_labels / gmb_location_clinics
 *
 * Env names:
 *   GMB_CLIENT_ID       OAuth client id of the Google Cloud project
 *   GMB_CLIENT_SECRET   OAuth client secret
 *   GMB_REFRESH_TOKEN   refresh token for the account that MANAGES the listing
 *                       (scope: https://www.googleapis.com/auth/business.manage)
 *   GMB_LOCATION_IDS    one or more location ids, comma-separated. Accepts the
 *                       bare id, "locations/123", or "accounts/x/locations/123".
 *   GMB_LOCATION_LABELS optional, comma-separated display names (aligned to IDs)
 *   GMB_LOCATION_CLINICS optional, aligned dental-nation, dr-tosun, al-maher keys
 */
export interface GmbConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  /** Normalised to "locations/{id}". */
  locations: { path: string; label: string | null; clinic: GmbClinicKey }[];
}

/** Normalise any accepted location form to "locations/{id}". */
function normLocation(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const m = s.match(/locations\/([^/]+)/i);
  const id = m ? m[1] : s.replace(/^locations\//i, '');
  return id ? `locations/${id}` : null;
}

export function buildGmbConfig(
  clientId?: string,
  clientSecret?: string,
  refreshToken?: string,
  rawLocations?: string,
  rawLabels?: string,
  rawClinics?: string,
): GmbConfig | null {
  if (!clientId || !clientSecret || !refreshToken || !rawLocations) return null;

  const labels = (rawLabels ?? '').split(',').map((s) => s.trim());
  const ids = rawLocations.split(',');
  const clinics = rawClinics?.trim() ? rawClinics.split(',').map((s) => s.trim()) : null;
  // Fail closed on a misaligned explicit list, rather than assigning a branch's
  // history to a neighbour. Blank ID slots retain their original list index.
  if (clinics && (clinics.length !== ids.length || clinics.some((c) => !GMB_CLINICS.some((def) => def.key === c)))) return null;
  if (rawLabels?.trim() && labels.length !== ids.length) return null;
  const locations = rawLocations
    .split(',')
    .map((raw, i) => {
      const path = normLocation(raw);
      const label = labels[i] || null;
      return path ? { path, label, clinic: clinics ? clinics[i] as GmbClinicKey : inferGmbClinic(label) } : null;
    })
    .filter((x): x is GmbConfig['locations'][number] => x !== null);

  if (locations.length === 0) return null;
  // The daily table has one row per branch/metric/day, not per location.
  if (new Set(locations.map((l) => l.path)).size !== locations.length ||
      new Set(locations.map((l) => l.clinic)).size !== locations.length) return null;
  return { clientId, clientSecret, refreshToken, locations };
}

export function getGmbConfig(): GmbConfig | null {
  return buildGmbConfig(
    process.env.GMB_CLIENT_ID?.trim(),
    process.env.GMB_CLIENT_SECRET?.trim(),
    process.env.GMB_REFRESH_TOKEN?.trim(),
    process.env.GMB_LOCATION_IDS?.trim(),
    process.env.GMB_LOCATION_LABELS?.trim(),
    process.env.GMB_LOCATION_CLINICS?.trim(),
  );
}

export function isGmbConfigured(): boolean {
  return getGmbConfig() !== null;
}

/** The app_secrets keys the resolver reads (also used by /api/gmb/locations). */
export const GMB_SECRET_KEYS = [
  'gmb_client_id',
  'gmb_client_secret',
  'gmb_refresh_token',
  'gmb_location_ids',
  'gmb_location_labels',
  'gmb_location_clinics',
] as const;

/** Read the credentials from lane_e.app_secrets. Best-effort, never throws. */
export async function readGmbSecrets(supabase: AdminClient | null): Promise<Map<string, string>> {
  if (!supabase) return new Map();
  try {
    const { data } = await supabase.from('app_secrets').select('key, value').in('key', [...GMB_SECRET_KEYS]);
    return new Map((data ?? []).map((r: { key: string; value: string }) => [r.key, String(r.value ?? '').trim()]));
  } catch {
    return new Map();
  }
}

/** Env first, then Supabase-stored secrets. Preferred for the sync pipeline. */
export async function resolveGmbConfig(supabase: AdminClient | null): Promise<GmbConfig | null> {
  const env = getGmbConfig();
  if (env) return env;
  // A complete but invalid env configuration must not silently activate a
  // different set of locations from the database.
  if ([process.env.GMB_CLIENT_ID, process.env.GMB_CLIENT_SECRET, process.env.GMB_REFRESH_TOKEN, process.env.GMB_LOCATION_IDS].every((v) => v?.trim())) return null;
  const s = await readGmbSecrets(supabase);
  return buildGmbConfig(
    s.get('gmb_client_id'),
    s.get('gmb_client_secret'),
    s.get('gmb_refresh_token'),
    s.get('gmb_location_ids'),
    s.get('gmb_location_labels'),
    s.get('gmb_location_clinics'),
  );
}

/** Business Profile Performance daily metrics → our social_insights metric keys. */
export const GMB_METRICS: { api: string; key: string; label: string }[] = [
  { api: 'CALL_CLICKS', key: 'calls', label: 'Phone Calls' },
  { api: 'BUSINESS_DIRECTION_REQUESTS', key: 'directions', label: 'Direction Requests' },
  { api: 'WEBSITE_CLICKS', key: 'website_clicks', label: 'Website Clicks' },
  { api: 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS', key: 'map_views_desktop', label: 'Desktop Map Views' },
  { api: 'BUSINESS_IMPRESSIONS_MOBILE_MAPS', key: 'map_views_mobile', label: 'Mobile Map Views' },
];
