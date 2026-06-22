import 'server-only';
import { unstable_cache } from 'next/cache';
import { fetchGa4Audience, type Ga4Audience } from '@/lib/sync/adapters/ga4-adapter';

/**
 * Google Analytics tab model — demographics (gender/age), device, acquisition
 * channel and per-event lead acquisition from GA4. Spans 2026-01-01 → today
 * (the property's history) to match the rest of the dashboard. Never throws;
 * any GA4 failure degrades to an honest data gap.
 *
 * Cached 30 min via the Vercel Data Cache: this tab fires ~10 GA4 reports, and
 * GA4 itself lags hours, so a short cache keeps the page fast without making the
 * numbers meaningfully stale.
 */
export interface GoogleAnalyticsReport {
  available: boolean;
  note: string | null;
  data: Ga4Audience | null;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export const getGoogleAnalyticsReport = unstable_cache(
  async (): Promise<GoogleAnalyticsReport> => {
    try {
      const data = await fetchGa4Audience('2026-01-01', iso(new Date()));
      const available = data.totals.sessions > 0 || data.events.length > 0;
      return { available, note: available ? null : 'no GA4 activity in this window', data: available ? data : null };
    } catch (err) {
      return { available: false, note: (err as Error).message, data: null };
    }
  },
  ['ga4-audience-v1'],
  { revalidate: 1800 },
);
