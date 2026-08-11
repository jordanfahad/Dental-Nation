import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';

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

export async function getGmbKeywordsReport(): Promise<GmbKeywordsReport | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const thisMonth = new Date().toISOString().slice(0, 7);
  const { data, error } = await supabase
    .from('gmb_search_keywords')
    .select('month, keyword, impressions, is_threshold')
    .lt('month', thisMonth)
    .order('month', { ascending: false })
    .limit(2000);
  if (error || !data || data.length === 0) return null;
  const rows = data as Row[];

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
