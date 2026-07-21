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
 * portfolio sum, NOT a like-for-like figure (surfaced honestly in the tab).
 *
 * Al Maher's 2020–2025 rows have no per-treatment service date in the source,
 * so they live in a single '2020–2025' bucket (txn_year null) rather than being
 * fabricated into per-year splits.
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
  topDoctors: NamedValue[];
  /** Department mix (Al Wasl) or payer mix (Tosun / Al Maher). */
  mixLabel: string;
  mix: NamedValue[];
  /** Al Maher only: patient co-pay vs insurer-paid split of the billed total. */
  payerSplit: { patientShare: number; insuranceNet: number } | null;
}

export interface GroupRevenueReport {
  available: boolean;
  clinics: ClinicRevenue[];
  combinedTotal: number;
  /** Years where every clinic has data — for a like-period comparison note. */
  overlapYears: number[];
  /** Combined revenue by year (only years present), for the portfolio trend. */
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

function topN(map: Map<string, number>, n: number): NamedValue[] {
  return [...map.entries()]
    .filter(([, v]) => v > 0)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
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

function buildClinic(meta: GroupClinicMeta, rows: Row[]): ClinicRevenue {
  let total = 0;
  let txnCount = 0;
  let patientShare = 0;
  let insuranceNet = 0;
  const byYear = new Map<string, YearPoint>();
  const doctors = new Map<string, number>();
  const mix = new Map<string, number>();
  const useDept = meta.key === 'dn-alwasl';

  for (const r of rows) {
    const g = num(r.gross);
    total += g;
    txnCount += r.txn_count ?? 0;
    patientShare += num(r.patient_share);
    insuranceNet += num(r.insurance_net);

    const yLabel = r.period_label ?? (r.txn_year != null ? String(r.txn_year) : 'Undated');
    const existing = byYear.get(yLabel);
    if (existing) existing.gross += g;
    else byYear.set(yLabel, { label: yLabel, year: r.txn_year, gross: g });

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
    topDoctors: topN(doctors, 6),
    mixLabel: useDept ? 'Revenue by department' : 'Revenue by payment type',
    mix: topN(mix, 8),
    payerSplit: meta.key === 'al-maher' ? { patientShare, insuranceNet } : null,
  };
}

export async function getGroupRevenue(): Promise<GroupRevenueReport> {
  const rows = await fetchAllRows();
  if (!rows || rows.length === 0) {
    return { available: false, clinics: [], combinedTotal: 0, overlapYears: [], combinedByYear: [] };
  }

  const byClinic = new Map<string, Row[]>();
  for (const r of rows) {
    const list = byClinic.get(r.clinic);
    if (list) list.push(r);
    else byClinic.set(r.clinic, [r]);
  }

  const clinics = GROUP_CLINICS.map((m) => buildClinic(m, byClinic.get(m.key) ?? []));
  const combinedTotal = clinics.reduce((s, c) => s + c.total, 0);

  // Years present per clinic (real years only), overlap = years all three share.
  const yearSets = clinics.map((c) => new Set(rows.filter((r) => r.clinic === c.key && r.txn_year != null).map((r) => r.txn_year as number)));
  const allYears = [...new Set(rows.map((r) => r.txn_year).filter((y): y is number => y != null))].sort((a, b) => a - b);
  const overlapYears = allYears.filter((y) => yearSets.every((s) => s.has(y)));

  // Combined by year (dated rows only; the AMC 2020–2025 bucket is excluded here
  // and reported separately in its own clinic card).
  const combined = new Map<number, number>();
  for (const r of rows) {
    if (r.txn_year == null) continue;
    combined.set(r.txn_year, (combined.get(r.txn_year) ?? 0) + num(r.gross));
  }
  const combinedByYear: YearPoint[] = [...combined.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, gross]) => ({ label: String(year), year, gross }));

  return { available: true, clinics, combinedTotal, overlapYears, combinedByYear };
}
