import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Target vs Actual — Level 3 of the platform reporting ("are we achieving
 * what we said we would achieve?"), deliberately SEPARATE from the live
 * reporting ("what is happening?") and more sensitive than it.
 *
 * Data lives in lane_e.platform_kpi_targets: management supplies targets and
 * (until a source is automated) actuals; this module computes variance and
 * status. Rows flagged `example` are the stakeholder's illustrative examples
 * and are banner-labelled by the page — never presented as performance data.
 *
 * ACCESS: this module is imported ONLY by the internal, role-gated KPI page
 * (admin + viewer roles). It must never be imported by anything rendered
 * under the share-room token — the investor link has no access to Level 3.
 */

export type KpiUnit = 'pct' | 'pp' | 'aed' | 'count' | 'ratio';

export interface KpiComparison {
  layerSlug: string;
  kpi: string;
  unit: KpiUnit;
  target: number | null;
  actual: number | null;
  /** Signed variance in the KPI's own unit (pp for pct KPIs). */
  variance: number | null;
  /** 'ahead' | 'on-target' | 'behind' | 'no-data' — direction-aware. */
  status: 'ahead' | 'on-target' | 'behind' | 'no-data';
  period: string | null;
  deadline: string | null;
  actualSource: string | null;
  note: string | null;
  example: boolean;
}

interface Row {
  layer_slug: string;
  kpi: string;
  unit: string;
  target_value: number | null;
  actual_value: number | null;
  direction: string;
  period: string | null;
  deadline: string | null;
  actual_source: string | null;
  note: string | null;
  example: boolean;
  sort: number;
}

export function fmtKpiValue(v: number | null, unit: KpiUnit): string {
  if (v == null) return '—';
  switch (unit) {
    case 'pct':
      return `${v}%`;
    case 'pp':
      return `${v}pp`;
    case 'aed':
      return `AED ${Math.round(v).toLocaleString('en-US')}`;
    case 'ratio':
      return `${v}×`;
    default:
      return Math.round(v).toLocaleString('en-US');
  }
}

export function fmtVariance(c: KpiComparison): string {
  if (c.variance == null) return '—';
  const sign = c.variance > 0 ? '+' : '';
  const unit = c.unit === 'pct' ? 'pp' : c.unit === 'aed' ? ' AED' : c.unit === 'ratio' ? '×' : c.unit === 'count' ? '' : c.unit;
  return `${sign}${Math.round(c.variance * 100) / 100}${unit}`;
}

export async function getKpiComparisons(layerSlug?: string): Promise<KpiComparison[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];
  try {
    let q = db.from('platform_kpi_targets').select('*').order('layer_slug').order('sort').order('kpi');
    if (layerSlug) q = q.eq('layer_slug', layerSlug);
    const { data } = await q;
    return ((data as Row[] | null) ?? []).map((r) => {
      const unit = (['pct', 'pp', 'aed', 'count', 'ratio'].includes(r.unit) ? r.unit : 'count') as KpiUnit;
      const hasBoth = r.target_value != null && r.actual_value != null;
      // Signed variance is always actual − target; direction decides whether
      // that is good news ('up': higher is better) or bad ('down').
      const variance = hasBoth ? Number(r.actual_value) - Number(r.target_value) : null;
      const good = variance == null ? null : r.direction === 'down' ? -variance : variance;
      const status: KpiComparison['status'] =
        good == null ? 'no-data' : Math.abs(good) < 1e-9 ? 'on-target' : good > 0 ? 'ahead' : 'behind';
      return {
        layerSlug: r.layer_slug,
        kpi: r.kpi,
        unit,
        target: r.target_value != null ? Number(r.target_value) : null,
        actual: r.actual_value != null ? Number(r.actual_value) : null,
        variance,
        status,
        period: r.period,
        deadline: r.deadline,
        actualSource: r.actual_source,
        note: r.note,
        example: r.example,
      };
    });
  } catch {
    return [];
  }
}
