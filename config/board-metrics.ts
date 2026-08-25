/**
 * Manual-metric definitions and their shape.
 *
 * Deliberately a PLAIN module with no 'server-only' import: the admin entry
 * form is a client component and needs the metric list, while the report
 * itself reads it on the server. Keeping the shared vocabulary here — rather
 * than in lib/board/metrics.ts, which is server-only because it holds the
 * Supabase reads — lets both sides import one definition instead of drifting
 * apart. (Same lesson as the Marketing OS view list.)
 */

export interface ManualMetric {
  metricKey: string;
  periodStart: string;
  periodEnd: string;
  value: number | null;
  unit: string | null;
  sourceNote: string;
  updatedAt: string;
}

/**
 * The metric keys the report knows how to display.
 *
 * The WhatsApp figures used to live here and no longer do: the Zavis export
 * already lands in lane_e.crm_* on every sync, so they read live from
 * lane_e.board_crm_summary (migration 0022) instead of being retyped. A number
 * only belongs on this list if there is genuinely no feed for it.
 *
 * "Pages in sitemap" is deliberately NOT called "pages indexed" — Search
 * Console reports 128 pages DISCOVERED in the sitemap, which is a different
 * (and larger) number than the pages Google has actually indexed.
 */
export const MANUAL_METRIC_KEYS: { key: string; label: string; unit: string; hint: string }[] = [
  { key: 'gsc_indexed_pages', label: 'Pages in sitemap', unit: 'count', hint: 'Search Console sitemap — discovered pages' },
  { key: 'gsc_impressions', label: 'Search impressions', unit: 'count', hint: 'Search Console — impressions' },
  { key: 'gsc_clicks', label: 'Search clicks', unit: 'count', hint: 'Search Console — clicks' },
  { key: 'referring_domains', label: 'Referring domains', unit: 'count', hint: 'Ahrefs/Moz free checker — distinct linking sites' },
  { key: 'backlinks_total', label: 'Backlinks (total)', unit: 'count', hint: 'Ahrefs/Moz free checker — total links' },
  { key: 'smile_club_members', label: 'Smile Club members', unit: 'count', hint: 'Smile Club — owner: Gautam' },
  { key: 'smile_club_revenue', label: 'Smile Club revenue', unit: 'aed', hint: 'Membership revenue to date' },
  { key: 'creative_monthly_output', label: 'Creative assets / month', unit: 'count', hint: 'Dental Nation Creative Platform output' },
];
