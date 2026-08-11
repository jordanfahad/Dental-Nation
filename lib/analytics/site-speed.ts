import 'server-only';
import { unstable_cache } from 'next/cache';
import { siteSpeedConfig } from '@/config/site-speed';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { fetchSiteSpeed, type SiteSpeed } from '@/lib/sync/adapters/pagespeed-adapter';

/**
 * PSI API key: env (PAGESPEED_API_KEY) first, then lane_e.app_secrets
 * (`pagespeed_api_key`) — same env-or-secrets pattern as GMB/Meta, so the key
 * can be rotated in the database without a redeploy. Best-effort, never throws.
 */
async function resolvePsiKey(envKey: string | null): Promise<string | null> {
  if (envKey) return envKey;
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  try {
    const { data } = await supabase.from('app_secrets').select('value').eq('key', 'pagespeed_api_key').maybeSingle();
    const value = String(data?.value ?? '').trim();
    return value || null;
  } catch {
    return null;
  }
}

/**
 * Cached Site Speed report. PageSpeed Insights is slow (~10–20s/strategy) and
 * speed barely moves minute-to-minute, so we cache for 6h via the Vercel Data
 * Cache (persists across deploys) — a handful of PSI calls per day, no quota
 * pressure, and fast page renders after the first warm-up.
 */
export const getSiteSpeedReport = unstable_cache(
  async (): Promise<SiteSpeed> => {
    const { url, apiKey } = siteSpeedConfig();
    const key = await resolvePsiKey(apiKey);
    try {
      return await fetchSiteSpeed(url, key);
    } catch (err) {
      return { url, fetchedAt: new Date().toISOString(), mobile: null, desktop: null, error: (err as Error).message };
    }
  },
  ['site-speed-v2'],
  { revalidate: 21600 },
);
