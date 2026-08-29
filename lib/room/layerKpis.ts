import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getGmbReviewsReport } from '@/lib/analytics/gmb-reviews';
import { getSearchConsoleReport } from '@/lib/analytics/search-console';
import { getSiteSizeReport } from '@/lib/analytics/site-size';
import { getAuthorityReport } from '@/lib/analytics/authority';

/**
 * Live numbers for the platform layer pages — Mr Akbar's feedback: the layer
 * pages must be schematic and visual, leading with numbers and charts, not
 * prose. Every figure here is read from the SAME cached read layers that
 * power the full reports (no second copy of any number), assembled per layer
 * and rendered as a KPI band + trend above the capability pages.
 *
 * Every source is best-effort: a tile simply doesn't render when its feed is
 * unavailable, so a provider outage can never blank a layer page.
 */

export interface LayerKpi {
  label: string;
  value: string;
  hint?: string;
}

export interface LayerVisualData {
  kpis: LayerKpi[];
  /** Daily clicks/impressions (Layer 02) for the trend chart. */
  trend?: { date: string; clicks: number; impressions: number }[];
}

const int = (n: number) => Math.round(n).toLocaleString('en-US');
const daysAgoIso = (d: number) => new Date(Date.now() - d * 86400_000).toISOString().slice(0, 10);

export async function getLayerVisuals(slug: string): Promise<LayerVisualData> {
  try {
    switch (slug) {
      case 'clinical-capacity': {
        const kpis: LayerKpi[] = [{ label: 'Operating clinics', value: '3', hint: 'Al Wasl · Dr Tosun · AMC (Dubai)' }];
        try {
          const g = await getGmbReviewsReport();
          if (g) {
            kpis.push({ label: 'Google rating', value: `${g.avg.toFixed(2)}★`, hint: 'Business Profile' });
            kpis.push({ label: 'Patient reviews', value: int(g.total), hint: 'lifetime' });
          }
        } catch {}
        return { kpis };
      }

      case 'demand-brand-growth': {
        const kpis: LayerKpi[] = [];
        let trend: LayerVisualData['trend'];
        try {
          const sc = await getSearchConsoleReport({ from: daysAgoIso(28) });
          if (sc.available) {
            kpis.push({ label: 'Organic clicks', value: int(sc.clicks), hint: 'Google · last 28 days' });
            kpis.push({ label: 'Impressions', value: int(sc.impressions), hint: 'Google · last 28 days' });
            trend = sc.daily;
          }
        } catch {}
        try {
          const size = await getSiteSizeReport();
          const us = size.rows.find((r) => r.domain === 'dentalnation.com');
          if (us?.pages != null) kpis.push({ label: 'Pages published', value: int(us.pages), hint: 'own sitemap' });
          if (us?.indexedPages != null) kpis.push({ label: 'Indexed by Google', value: `~${int(us.indexedPages)}`, hint: 'site: count' });
        } catch {}
        try {
          const a = await getAuthorityReport();
          if (a.site?.referringDomains != null)
            kpis.push({ label: 'Referring domains', value: int(a.site.referringDomains), hint: 'backlink authority' });
        } catch {}
        return { kpis, trend };
      }

      case 'patient-coordination': {
        const kpis: LayerKpi[] = [];
        const db = getSupabaseAdmin();
        if (db) {
          try {
            const since = daysAgoIso(30);
            const [forms, widget, worklist] = await Promise.all([
              db.from('ops_form_entries').select('*', { count: 'exact', head: true }).gte('submitted_at', since),
              db.from('raw_zavis').select('*', { count: 'exact', head: true }),
              db.from('raw_dn_leads').select('*', { count: 'exact', head: true }),
            ]);
            if (forms.count != null) kpis.push({ label: 'Campaign form leads', value: int(forms.count), hint: 'last 30 days' });
            if (widget.count != null) kpis.push({ label: 'Widget bookings', value: int(widget.count), hint: 'booking system · all-time' });
            if (worklist.count != null) kpis.push({ label: 'Enquiries in worklist', value: int(worklist.count), hint: 'incomplete bookings' });
          } catch {}
        }
        kpis.push({ label: 'First response', value: '≤15 min', hint: 'automated, around the clock' });
        return { kpis };
      }

      case 'clinical-delivery': {
        const kpis: LayerKpi[] = [];
        try {
          const g = await getGmbReviewsReport();
          if (g) {
            kpis.push({ label: 'Patient rating', value: `${g.avg.toFixed(2)}★`, hint: `${int(g.total)} lifetime reviews` });
            kpis.push({ label: '5-star share', value: `${Math.round(g.fiveStarShare * 100)}%`, hint: 'of all reviews' });
            kpis.push({ label: 'Review response rate', value: `${Math.round(g.responseRate * 100)}%`, hint: 'replies published' });
          }
        } catch {}
        return { kpis };
      }

      case 'support-technology': {
        const kpis: LayerKpi[] = [{ label: 'Sync cadence', value: '15 min', hint: 'automated, around the clock' }];
        const db = getSupabaseAdmin();
        if (db) {
          try {
            const { data } = await db
              .from('ingestion_log')
              .select('started_at, sheets_ok, sheets_failed')
              .order('started_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            const row = data as { started_at: string; sheets_ok: string[] | null; sheets_failed: string[] | null } | null;
            if (row) {
              kpis.unshift({ label: 'Live data feeds', value: int((row.sheets_ok ?? []).length), hint: 'green on the last sync' });
              const mins = Math.max(0, Math.round((Date.now() - Date.parse(row.started_at)) / 60000));
              kpis.push({ label: 'Last sync', value: mins <= 1 ? 'just now' : `${mins} min ago`, hint: 'ingestion run' });
            }
          } catch {}
        }
        return { kpis };
      }

      case 'expansion-model': {
        return {
          kpis: [
            { label: 'Integrations in flight', value: '1', hint: 'AMC → "AMC by Dental Nation"' },
            { label: 'Operating clinics', value: '3', hint: 'the live validation network' },
            { label: 'Market', value: 'Dubai', hint: 'expansion playbooks in preparation' },
          ],
        };
      }

      default:
        return { kpis: [] };
    }
  } catch {
    return { kpis: [] };
  }
}
