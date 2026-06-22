import 'server-only';
import { unstable_cache } from 'next/cache';
import { fetchGa4Attribution, type Ga4Attribution } from '@/lib/sync/adapters/ga4-adapter';

/**
 * Multi-touch attribution report (channel funnel roles) for the GA tab. Spans
 * 2026-01-01 → today to match the rest of the dashboard. Never throws; any GA4
 * failure degrades to an honest data gap. Cached 30 min (Vercel Data Cache) —
 * three more GA4 reports on an already-heavy tab; GA4 lags hours regardless.
 */
export interface Ga4AttributionReport {
  available: boolean;
  note: string | null;
  data: Ga4Attribution | null;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export const getGa4AttributionReport = unstable_cache(
  async (): Promise<Ga4AttributionReport> => {
    try {
      const data = await fetchGa4Attribution('2026-01-01', iso(new Date()));
      const available =
        data.totals.discovery > 0 || data.totals.consideration > 0 || data.totals.conversion > 0;
      return { available, note: available ? null : 'no GA4 channel activity in this window', data: available ? data : null };
    } catch (err) {
      return { available: false, note: (err as Error).message, data: null };
    }
  },
  ['ga4-attribution-v1'],
  { revalidate: 1800 },
);
