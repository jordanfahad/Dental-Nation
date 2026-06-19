import 'server-only';
import { unstable_cache } from 'next/cache';
import { siteSpeedConfig } from '@/config/site-speed';
import { fetchSiteSpeed, type SiteSpeed } from '@/lib/sync/adapters/pagespeed-adapter';

/**
 * Cached Site Speed report. PageSpeed Insights is slow (~10–20s/strategy) and
 * speed barely moves minute-to-minute, so we cache for 6h via the Vercel Data
 * Cache (persists across deploys) — a handful of PSI calls per day, no quota
 * pressure, and fast page renders after the first warm-up.
 */
export const getSiteSpeedReport = unstable_cache(
  async (): Promise<SiteSpeed> => {
    const { url, apiKey } = siteSpeedConfig();
    try {
      return await fetchSiteSpeed(url, apiKey);
    } catch (err) {
      return { url, fetchedAt: new Date().toISOString(), mobile: null, desktop: null, error: (err as Error).message };
    }
  },
  ['site-speed-v1'],
  { revalidate: 21600 },
);
