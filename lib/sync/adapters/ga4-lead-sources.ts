import 'server-only';
import { getAnalyticsClient } from '../google-auth';
import { GA4_PROPERTY_ID } from '../../../config/ga4';
import type { AdminClient } from '../../supabase/server';

export const SOURCE_LEAD_EVENTS = ['whatsapp_click', 'phone_click', 'whatsapp_widget_open', 'generate_lead'];
interface GaRow { dimensionValues?: { value?: string | null }[] | null; metricValues?: { value?: string | null }[] | null }
export interface LeadSourceRow { day: string; event_name: string; source_medium: string; campaign: string; event_count: number; fetched_at: string }

/** Injectable reader for a complete, ordered GA4 report; no storage side effects. */
export async function readLeadSources(
  page: (offset: number, limit: number) => Promise<{ rows?: GaRow[] | null; rowCount?: number | null }>,
  now = new Date().toISOString(),
): Promise<LeadSourceRow[]> {
  const out: LeadSourceRow[] = [];
  for (let offset = 0; ; offset += 10_000) {
    const result = await page(offset, 10_000);
    if ((result.rowCount ?? 0) > 100_000) throw new Error('GA4 lead source report exceeds 100,000 rows');
    const rows = result.rows ?? [];
    for (const r of rows) {
      const v = (r.dimensionValues ?? []).map((d) => d.value || '(not set)');
      const n = Number(r.metricValues?.[0]?.value);
      if (!/^\d{8}$/.test(v[0]) || !SOURCE_LEAD_EVENTS.includes(v[1]) || !Number.isSafeInteger(n) || n < 0) throw new Error('Invalid GA4 lead source row');
      out.push({ day: `${v[0].slice(0, 4)}-${v[0].slice(4, 6)}-${v[0].slice(6, 8)}`, event_name: v[1], source_medium: v[2], campaign: v[3] || '(not set)', event_count: n, fetched_at: now });
    }
    if (result.rowCount != null ? out.length >= result.rowCount : rows.length < 10_000) return out;
    if (!rows.length || out.length >= 100_000) throw new Error('Incomplete GA4 lead source report');
  }
}

export async function syncGa4LeadSources(supabase: AdminClient): Promise<number> {
  const { count, error } = await supabase.from('ga4_lead_events_source').select('day', { count: 'exact', head: true });
  if (error) throw new Error('GA4 lead source table unavailable');
  const analytics = getAnalyticsClient();
  const names = ['date', 'eventName', 'sessionSourceMedium', 'sessionGoogleAdsCampaignName'];
  const rows = await readLeadSources(async (offset, limit) => {
    const report = await analytics.properties.runReport({ property: `properties/${GA4_PROPERTY_ID}`, requestBody: {
      dateRanges: [{ startDate: `${count ? 10 : 90}daysAgo`, endDate: 'today' }],
      dimensions: names.map((name) => ({ name })), metrics: [{ name: 'eventCount' }],
      dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: SOURCE_LEAD_EVENTS } } },
      orderBys: names.map((dimensionName) => ({ dimension: { dimensionName } })),
      offset: String(offset), limit: String(limit),
    } });
    return report.data;
  });
  for (let i = 0; i < rows.length; i += 500) {
    const result = await supabase.from('ga4_lead_events_source').upsert(rows.slice(i, i + 500), { onConflict: 'day,event_name,source_medium,campaign' });
    if (result.error) throw new Error('GA4 lead source storage failed');
  }
  return rows.length;
}
