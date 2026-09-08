import 'server-only';
import { unstable_cache } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Finance revenue — the Mega Board Report's finance section, built from the
 * CFO-side handover (lane_e.finance_revenue_monthly). Rows are Zoho invoice
 * lines aggregated to clinic x month x doctor x department (GROSS BILLED),
 * loaded from Jawad's workbook drops; a fresh drop replaces its `source`
 * batch, so re-loads never double-count. Reconciled on load: the group total
 * matches the workbook to the fils.
 */

export interface FinMonthRow {
  ym: string; // 'YYYY-MM'
  byClinic: Record<string, number>;
  total: number;
}

export interface FinNamed {
  label: string;
  value: number;
  share: number; // 0..1 of group total
}

export interface FinDoctor {
  doctor: string;
  clinic: string;
  gross: number;
}

export interface FinanceRevenueReport {
  available: boolean;
  note?: string;
  clinics: string[];
  months: FinMonthRow[];
  clinicTotals: FinNamed[];
  deptMix: FinNamed[];
  topDoctors: FinDoctor[];
  total: number;
  lineCount: number;
  monthlyAvg: number;
  bestMonth: { ym: string; total: number } | null;
  firstYm: string | null;
  lastYm: string | null;
  loadedAt: string | null;
}

interface Row {
  clinic: string;
  ym: string;
  doctor: string;
  department: string;
  gross: number | string;
  line_count: number;
  loaded_at: string;
}

const num = (v: number | string) => (typeof v === 'number' ? v : Number(v) || 0);

export const getFinanceRevenue = unstable_cache(
  async (): Promise<FinanceRevenueReport> => {
    const empty: FinanceRevenueReport = {
      available: false,
      clinics: [],
      months: [],
      clinicTotals: [],
      deptMix: [],
      topDoctors: [],
      total: 0,
      lineCount: 0,
      monthlyAvg: 0,
      bestMonth: null,
      firstYm: null,
      lastYm: null,
      loadedAt: null,
    };
    const db = getSupabaseAdmin();
    if (!db) return { ...empty, note: 'Supabase is not configured.' };
    const { data, error } = await db
      .from('finance_revenue_monthly')
      .select('clinic, ym, doctor, department, gross, line_count, loaded_at')
      .limit(10000);
    if (error) return { ...empty, note: error.message };
    const rows = (data ?? []) as Row[];
    if (rows.length === 0) {
      return { ...empty, note: 'No finance revenue loaded yet — waiting on the first finance drop.' };
    }

    const clinicSet = new Map<string, number>();
    const byYm = new Map<string, { byClinic: Record<string, number>; total: number }>();
    const dept = new Map<string, number>();
    const docs = new Map<string, { clinic: string; gross: number }>();
    let total = 0;
    let lineCount = 0;
    let loadedAt: string | null = null;

    for (const r of rows) {
      const g = num(r.gross);
      total += g;
      lineCount += r.line_count ?? 0;
      clinicSet.set(r.clinic, (clinicSet.get(r.clinic) ?? 0) + g);
      const m = byYm.get(r.ym) ?? { byClinic: {}, total: 0 };
      m.byClinic[r.clinic] = (m.byClinic[r.clinic] ?? 0) + g;
      m.total += g;
      byYm.set(r.ym, m);
      dept.set(r.department, (dept.get(r.department) ?? 0) + g);
      const dk = `${r.doctor}|${r.clinic}`;
      const d = docs.get(dk) ?? { clinic: r.clinic, gross: 0 };
      d.gross += g;
      docs.set(dk, d);
      if (!loadedAt || r.loaded_at > loadedAt) loadedAt = r.loaded_at;
    }

    const clinics = [...clinicSet.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
    const months: FinMonthRow[] = [...byYm.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([ym, v]) => ({ ym, byClinic: v.byClinic, total: v.total }));
    const bestMonth = months.reduce<{ ym: string; total: number } | null>(
      (best, m) => (best && best.total >= m.total ? best : { ym: m.ym, total: m.total }),
      null,
    );

    return {
      available: true,
      clinics,
      months,
      clinicTotals: [...clinicSet.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([label, value]) => ({ label, value, share: total > 0 ? value / total : 0 })),
      deptMix: [...dept.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([label, value]) => ({ label, value, share: total > 0 ? value / total : 0 })),
      topDoctors: [...docs.entries()]
        .sort((a, b) => b[1].gross - a[1].gross)
        .slice(0, 10)
        .map(([dk, v]) => ({ doctor: dk.split('|')[0], clinic: v.clinic, gross: v.gross })),
      total,
      lineCount,
      monthlyAvg: months.length ? total / months.length : 0,
      bestMonth,
      firstYm: months[0]?.ym ?? null,
      lastYm: months[months.length - 1]?.ym ?? null,
      loadedAt,
    };
  },
  ['finance-revenue-v1'],
  { revalidate: 600 },
);
