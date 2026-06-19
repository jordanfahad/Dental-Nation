/**
 * Microsoft Clarity configuration.
 *
 * - CLARITY_API_TOKEN: a Data Export "API token" generated in Clarity →
 *   Settings → Data export → Generate new API token. Used to pull aggregated
 *   behavioural insights (rage/dead clicks, scroll, JS errors, …). The export
 *   API only covers the last 1–3 days and is rate-limited to 10 calls/day, so
 *   the report is cached 6h.
 * - CLARITY_PROJECT_ID: the project id from the Clarity dashboard URL
 *   (clarity.microsoft.com/projects/view/<THIS_ID>/...). Used only to build
 *   deep links into the heatmaps / recordings — those cannot be embedded.
 */
export interface ClarityConfig {
  token: string | null;
  projectId: string | null;
}

export function clarityConfig(): ClarityConfig {
  return {
    token: process.env.CLARITY_API_TOKEN || null,
    projectId: process.env.CLARITY_PROJECT_ID || null,
  };
}

const BASE = 'https://clarity.microsoft.com/projects/view';

export function clarityLinks(projectId: string | null) {
  if (!projectId) return null;
  return {
    dashboard: `${BASE}/${projectId}/dashboard`,
    heatmaps: `${BASE}/${projectId}/heatmaps`,
    recordings: `${BASE}/${projectId}/impressions`,
    settings: `${BASE}/${projectId}/settings`,
  };
}
