import 'server-only';
import { unstable_cache } from 'next/cache';
import { clarityConfig, clarityLinks } from '@/config/clarity';
import { fetchClarityInsights, type ClarityInsights } from '@/lib/sync/adapters/clarity-adapter';

/**
 * Heatmaps & Recordings (Microsoft Clarity) report. Heatmaps/recordings cannot
 * be embedded (Clarity blocks framing + requires login), so we surface the
 * Data Export API aggregates and deep-link into Clarity for the visuals.
 *
 * The export API allows only 10 calls/day, so the insights fetch is cached 6h
 * via the Vercel Data Cache (persists across deploys) — well under quota.
 */
export interface ClarityReport {
  connected: boolean; // token present and fetch succeeded
  hasToken: boolean;
  links: ReturnType<typeof clarityLinks>;
  insights: ClarityInsights | null;
  note: string | null;
}

const loadInsights = unstable_cache(
  async (token: string): Promise<{ insights: ClarityInsights | null; note: string | null }> => {
    try {
      return { insights: await fetchClarityInsights(token, 3), note: null };
    } catch (err) {
      return { insights: null, note: (err as Error).message };
    }
  },
  ['clarity-insights-v1'],
  { revalidate: 21600 },
);

export async function getClarityReport(): Promise<ClarityReport> {
  const { token, projectId } = clarityConfig();
  const links = clarityLinks(projectId);
  if (!token) {
    return { connected: false, hasToken: false, links, insights: null, note: 'Clarity API token not set' };
  }
  const { insights, note } = await loadInsights(token);
  return { connected: insights != null, hasToken: true, links, insights, note };
}
