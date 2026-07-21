import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Group Revenue model — the portfolio view across the three commonly-owned
 * clinics whose historical revenue we imported from their own PMS exports:
 *   - Dr Tosun Dental Clinic      (payments statement — cash COLLECTED)
 *   - Al Maher Medical Centre     (treatments report — gross BILLED, ~99.8% insurance)
 *   - Dental Nation Al Wasl       (receipts report — cash COLLECTED)
 *
 * Source: lane_e.clinic_revenue_raw (static, pre-aggregated at
 * clinic x year x month x doctor x department x payer x metric). Because the
 * clinics report different money measures (collected vs billed), each clinic
 * carries its own `metric` and the UI labels it — the combined total is a
 * portfolio sum, NOT a like-for-like figure.
 *
 * Date alignment: the report scopes to the dashboard's date window unless the
 * window is "All". Rows are dated at month grain (Tosun / Al Wasl), year grain
 * (Al Maher single-year files) or are undated (Al Maher's 2020–2025 file, which
 * has no per-treatment service date). We include a row when its period OVERLAPS
 * the window; undated/year rows are all-or-nothing (can't be split) and are
 * flagged in the UI.
 *
 * Never throws — a missing table / empty load degrades to `available:false`.
 */

export type GroupClinicKey = 'dr-tosun' | 'al-maher' | 'dn-alwasl';

export interface GroupClinicMeta {
  key: GroupClinicKey;
  label: string;
  location: string;
  metric: 'collected' | 'billed';
  metricLabel: string;
  note: string;
}

export const GROUP_CLINICS: GroupClinicMeta[] = [
  {
    key: 'dr-tosun',
    label: 'Dr Tosun Dental Clinic',
    location: 'Umm Suqeim 1, Dubai',
    metric: 'collected',
    metricLabel: 'Cash collected',
    note: 'Payments statement from the clinic PMS — money actually received.',
  },
  {
    key: 'al-maher',
    label: 'Al Maher Medical Centre',
    location: 'AMC',
    metric: 'billed',
    metricLabel: 'Gross billed',
    note: 'Treatments report — gross charges billed (≈99.8% insurance). Billed, not collected.',
  },
  {
    key: 'dn-alwasl',
    label: 'Dental Nation Al Wasl',
    location: 'Al Wasl, Dubai',
    metric: 'collected',
    metricLabel: 'Receipts collected',
    note: 'List-of-receipts report by doctor — money actually received.',
  },
];

export interface NamedValue {
  label: string;
  value: number;
}
export interface YearPoint {
  label: string; // '2024' or '2020–2025'
  year: number | null; // null = undated multi-year bucket (sorts last)
  gross: number;
}
export interface MonthPoint {
  month: string; // 'YYYY-MM'
  gross: number;
}

export interface ClinicRevenue {
  key: GroupClinicKey;
  label: string;
  location: string;
  metric: 'collected' | 'billed';
  metricLabel: string;
  note: string;
  total: number;
  txnCount: number;
  yearFrom: number | null;
  yearTo: number | null;
  byYear: YearPoint[];
  monthly: MonthPoint[]; // dated months only, sorted — for the detail trend
  topDoctors: NamedValue[];
  mixLabel: string;
  mix: NamedValue[];
  payerSplit: { patientShare: number; insuranceNet: number } | null;
  /** Latest month/year with data in the source (independent of the window). */
  dataThrough: string | null; // 'YYYY-MM' or 'YYYY'
  dataThroughLabel: string; // e.g. 'Jul 2026'
  hasUndated: boolean; // window includes the AMC 2020–2025 bucket
}

export interface GroupRevenueReport {
  available: boolean;
  isAll: boolean;
  windowLabel: string;
  clinics: ClinicRevenue[];
  combinedTotal: number;
  overlapYears: number[];
  combinedByYear: YearPoint[];
}

interface Row {
  clinic: string;
  metric: string;
  period_label: string | null;
  txn_year: number | null;
  txn_month: string | null;
  doctor: string | null;
  department: string | null;
  payer: string | null;
  gross: number | string | null;
  patient_share: number | string | null;
  insurance_net: number | string | null;
  txn_count: number | null;
}

const num = (v: number | string | null | undefined): number => {
  const n = typeof v === 'number' ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function monthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  const mi = Number(m) - 1;
  return mi >= 0 && mi < 12 ? `${MONTHS[mi]} ${y}` : ym;
}

function topN(map: Map<string, number>, n: number): NamedValue[] {
  return [...map.entries()]
    .filter(([, v]) => v > 0)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}

/** Two 4-digit years out of a period label like '2020–2025' / '2020-2025'. */
function spanOf(label: string | null): [number, number] | null {
  const m = (label ?? '').match(/(\d{4})\D+(\d{4})/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2])];
}

interface Window {
  fromYM: string;
  toYM: string;
  fromY: number;
  toY: number;
  isAll: boolean;
}

/** Does a row's period overlap the window? Undated/year rows are all-or-nothing. */
function inWindow(r: Row, w: Window): boolean {
  if (w.isAll) return true;
  if (r.txn_month) return r.txn_month >= w.fromYM && r.txn_month <= w.toYM;
  if (r.txn_year != null) return r.txn_year >= w.fromY && r.txn_year <= w.toY;
  const span = spanOf(r.period_label);
  if (span) return !(span[1] < w.fromY || span[0] > w.toY);
  return true; // truly unlabelled — keep rather than silently drop
}

async function fetchAllRows(): Promise<Row[] | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const out: Row[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from('clinic_revenue_raw')
      .select('clinic, metric, period_label, txn_year, txn_month, doctor, department, payer, gross, patient_share, insurance_net, txn_count')
      .range(from, from + PAGE - 1);
    if (error) return null;
    const chunk = (data ?? []) as Row[];
    out.push(...chunk);
    if (chunk.length < PAGE) break;
  }
  return out;
}

/** Latest 'YYYY-MM' (preferred) or 'YYYY' present across a clinic's rows. */
function dataThroughOf(rows: Row[]): string | null {
  let bestMonth: string | null = null;
  let bestYear: number | null = null;
  for (const r of rows) {
    if (r.txn_month && (!bestMonth || r.txn_month > bestMonth)) bestMonth = r.txn_month;
    if (r.txn_year != null && (bestYear == null || r.txn_year > bestYear)) bestYear = r.txn_year;
    const span = spanOf(r.period_label);
    if (span && (bestYear == null || span[1] > bestYear)) bestYear = span[1];
  }
  if (bestMonth) return bestMonth;
  if (bestYear != null) return String(bestYear);
  return null;
}

function buildClinic(meta: GroupClinicMeta, all: Row[], w: Window): ClinicRevenue {
  const rows = all.filter((r) => inWindow(r, w));
  let total = 0;
  let txnCount = 0;
  let patientShare = 0;
  let insuranceNet = 0;
  let hasUndated = false;
  const byYear = new Map<string, YearPoint>();
  const byMonth = new Map<string, number>();
  const doctors = new Map<string, number>();
  const mix = new Map<string, number>();
  const useDept = meta.key === 'dn-alwasl';

  for (const r of rows) {
    const g = num(r.gross);
    total += g;
    txnCount += r.txn_count ?? 0;
    patientShare += num(r.patient_share);
    insuranceNet += num(r.insurance_net);
    if (r.txn_year == null && r.txn_month == null) hasUndated = true;

    const yLabel = r.period_label ?? (r.txn_year != null ? String(r.txn_year) : 'Undated');
    const ey = byYear.get(yLabel);
    if (ey) ey.gross += g;
    else byYear.set(yLabel, { label: yLabel, year: r.txn_year, gross: g });

    if (r.txn_month) byMonth.set(r.txn_month, (byMonth.get(r.txn_month) ?? 0) + g);

    const doc = (r.doctor ?? '').trim();
    if (doc) doctors.set(doc, (doctors.get(doc) ?? 0) + g);

    const mkey = useDept ? (r.department ?? '').trim() || 'Other' : (r.payer ?? '').trim() || 'Other';
    mix.set(mkey, (mix.get(mkey) ?? 0) + g);
  }

  const years = rows.map((r) => r.txn_year).filter((y): y is number => y != null);
  const byYearArr = [...byYear.values()].sort((a, b) => {
    if (a.year == null) return 1;
    if (b.year == null) return -1;
    return a.year - b.year;
  });
  const monthly: MonthPoint[] = [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, gross]) => ({ month, gross }));

  const dt = dataThroughOf(all);

  return {
    key: meta.key,
    label: meta.label,
    location: meta.location,
    metric: meta.metric,
    metricLabel: meta.metricLabel,
    note: meta.note,
    total,
    txnCount,
    yearFrom: years.length ? Math.min(...years) : null,
    yearTo: years.length ? Math.max(...years) : null,
    byYear: byYearArr,
    monthly,
    topDoctors: topN(doctors, 8),
    mixLabel: useDept ? 'Revenue by department' : 'Revenue by payment type',
    mix: topN(mix, 8),
    payerSplit: meta.key === 'al-maher' ? { patientShare, insuranceNet } : null,
    dataThrough: dt,
    dataThroughLabel: dt ? (dt.includes('-') ? monthLabel(dt) : dt) : '—',
    hasUndated,
  };
}

export async function getGroupRevenue(range?: {
  from?: string;
  to?: string;
  preset?: string;
  isAll?: boolean;
}): Promise<GroupRevenueReport> {
  const rows = await fetchAllRows();
  if (!rows || rows.length === 0) {
    return { available: false, isAll: true, windowLabel: 'All time', clinics: [], combinedTotal: 0, overlapYears: [], combinedByYear: [] };
  }

  const from = range?.from ?? '2015-01-01';
  const to = range?.to ?? '2100-12-31';
  const isAll = range?.isAll ?? range?.preset === 'all';
  const w: Window = {
    fromYM: from.slice(0, 7),
    toYM: to.slice(0, 7),
    fromY: Number(from.slice(0, 4)),
    toY: Number(to.slice(0, 4)),
    isAll,
  };
  const windowLabel = isAll ? 'All time' : `${monthLabel(w.fromYM)} – ${monthLabel(w.toYM)}`;

  const byClinic = new Map<string, Row[]>();
  for (const r of rows) {
    const list = byClinic.get(r.clinic);
    if (list) list.push(r);
    else byClinic.set(r.clinic, [r]);
  }

  const clinics = GROUP_CLINICS.map((m) => buildClinic(m, byClinic.get(m.key) ?? [], w));
  const combinedTotal = clinics.reduce((s, c) => s + c.total, 0);

  const scoped = rows.filter((r) => inWindow(r, w));
  const yearSets = clinics.map((c) => new Set(scoped.filter((r) => r.clinic === c.key && r.txn_year != null).map((r) => r.txn_year as number)));
  const allYears = [...new Set(scoped.map((r) => r.txn_year).filter((y): y is number => y != null))].sort((a, b) => a - b);
  const overlapYears = allYears.filter((y) => yearSets.every((s) => s.has(y)));

  const combined = new Map<number, number>();
  for (const r of scoped) {
    if (r.txn_year == null) continue;
    combined.set(r.txn_year, (combined.get(r.txn_year) ?? 0) + num(r.gross));
  }
  const combinedByYear: YearPoint[] = [...combined.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, gross]) => ({ label: String(year), year, gross }));

  return { available: true, isAll, windowLabel, clinics, combinedTotal, overlapYears, combinedByYear };
}
