import 'server-only';
import { getSupabaseAdmin, type AdminClient } from '@/lib/supabase/server';
import { selectAll } from '@/lib/supabase/selectAll';
import { resolveGmbConfig } from '@/config/gmb';
import type { GmbClinicFilter } from '@/config/gmb-clinics';

/**
 * Local search keywords read layer — reads lane_e.gmb_search_keywords (synced
 * hourly). Reports the latest CLOSED month (the current month is partial and
 * Google keeps revising it), with the prior month for comparison.
 */

export interface GmbKeyword {
  keyword: string;
  impressions: number;
  isThreshold: boolean; // true → the count is a ceiling ("<N"), not exact
  prevImpressions: number | null; // same keyword, prior month (null = new)
}

export interface GmbKeywordsReport {
  month: string; // "2026-07"
  totalKeywords: number;
  totalImpressions: number; // threshold rows counted at their ceiling
  top: GmbKeyword[];
}

interface Row {
  month: string;
  keyword: string;
  impressions: number;
  is_threshold: boolean;
}

export async function getGmbKeywordsReport(clinic: GmbClinicFilter = 'dental-nation', supabase: AdminClient | null = getSupabaseAdmin()): Promise<GmbKeywordsReport | null> {
  if (!supabase) return null;

  const thisMonth = new Date().toISOString().slice(0, 7);
  const config = await resolveGmbConfig(supabase);
  const paths = config?.locations.filter((l) => clinic === 'all' || l.clinic === clinic).map((l) => l.path) ?? [];
  if (!paths.length) return null;
  let rows: Row[];
  try {
    const { data } = await selectAll(() => supabase
      .from('gmb_search_keywords')
      .select('month, keyword, impressions, is_threshold')
      .in('location_path', paths)
      .lt('month', thisMonth), ['month', 'keyword', 'location_path']);
    const grouped = new Map<string, Row>();
    for (const row of data as Row[]) {
      const key = JSON.stringify([row.month, row.keyword]);
      const prior = grouped.get(key);
      grouped.set(key, { ...row, impressions: Number(row.impressions) + (prior?.impressions ?? 0),
        is_threshold: row.is_threshold || (prior?.is_threshold ?? false) });
    }
    rows = [...grouped.values()].sort((a, b) => b.month.localeCompare(a.month));
  } catch { return null; }
  if (!rows.length) return null;

  const month = rows[0].month;
  const prevMonth = [...new Set(rows.map((r) => r.month))].sort().reverse()[1] ?? null;
  const cur = rows.filter((r) => r.month === month);
  const prev = new Map(rows.filter((r) => r.month === prevMonth).map((r) => [r.keyword, r.impressions]));

  const top = cur
    .slice()
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 15)
    .map((r) => ({
      keyword: r.keyword,
      impressions: r.impressions,
      isThreshold: r.is_threshold,
      prevImpressions: prev.get(r.keyword) ?? null,
    }));

  return {
    month,
    totalKeywords: cur.length,
    totalImpressions: cur.reduce((s, r) => s + r.impressions, 0),
    top,
  };
}
