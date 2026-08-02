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

/** The metric keys the report knows how to display. */
export const MANUAL_METRIC_KEYS: { key: string; label: string; unit: string; hint: string }[] = [
  { key: 'gsc_indexed_pages', label: 'Pages indexed', unit: 'count', hint: 'Search Console — indexed pages' },
  { key: 'gsc_impressions', label: 'Search impressions', unit: 'count', hint: 'Search Console — impressions' },
  { key: 'gsc_clicks', label: 'Search clicks', unit: 'count', hint: 'Search Console — clicks' },
  { key: 'whatsapp_messages', label: 'WhatsApp messages sent', unit: 'count', hint: 'Marketing OS — WhatsApp layer' },
  { key: 'whatsapp_response_rate', label: 'WhatsApp response rate', unit: 'pct', hint: '0–100' },
  { key: 'whatsapp_bookings', label: 'Bookings via WhatsApp', unit: 'count', hint: 'Marketing OS — WhatsApp layer' },
  { key: 'smile_club_members', label: 'Smile Club members', unit: 'count', hint: 'Smile Club — owner: Gautam' },
  { key: 'smile_club_revenue', label: 'Smile Club revenue', unit: 'aed', hint: 'Membership revenue to date' },
  { key: 'creative_monthly_output', label: 'Creative output / month', unit: 'count', hint: 'In-house creative assets' },
];
