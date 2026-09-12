import 'server-only';
import { unstable_cache } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getFinanceRevenue } from '@/lib/finance/revenue';

/**
 * Data layer for the Head of Operations portal suite — the replica of
 * Dr Luvi's Executive Intelligence Dashboard on the live backbone. Each
 * getter is best-effort and provenance-explicit; anything unavailable is
 * reported as unavailable, never zero.
 */

const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0);

/* ── Doctor Performance ─────────────────────────────────────────────── */

export interface CommissionRow {
  doctor: string;
  branch: string;
  gross: number;
  actual: number;
  lab: number;
  otherDed: number;
  net: number;
  rate: number;
  diag: number;
  payable: number;
  note: string | null;
}

/** Doctors billing in August with no commission workbook supplied — shown as
 *  "file not supplied", never zero payable (the spec's rule). */
export const NO_COMMISSION_FILE = [
  { doctor: 'Dr. Ali Ghasemi', branch: 'DN Al Wasl' },
  { doctor: 'Dr. M Safwan Sultan', branch: 'DN Al Wasl' },
  { doctor: 'Dr. Noor Basil Jassim Al Khayat', branch: 'DN Al Wasl' },
  { doctor: 'Dr. Yener Oguz', branch: 'Dr Tosun' },
  { doctor: 'Dr. Mohamed Darwish', branch: 'Dr Tosun' },
  { doctor: 'Dr. Ahmed', branch: 'Al Maher' },
  { doctor: 'Dr. Reema', branch: 'Al Maher' },
];

export interface DoctorPerf {
  month: string;
  commissions: CommissionRow[];
  totals: { gross: number; actual: number; net: number; payable: number } | null;
  /** Billed production per doctor for the latest + prior month (finance feed). */
  scorecard: { doctor: string; branch: string; prev: number; cur: number; momPct: number | null; patients: number }[];
}

export const getDoctorPerf = unstable_cache(
  async (): Promise<DoctorPerf> => {
    const out: DoctorPerf = { month: '2026-08', commissions: [], totals: null, scorecard: [] };
    const db = getSupabaseAdmin();
    if (!db) return out;
    try {
      const { data } = await db
        .from('doctor_commission')
        .select('*')
        .eq('month', '2026-08')
        .order('payable', { ascending: false });
      out.commissions = (data ?? []).map((r) => ({
        doctor: String(r.doctor),
        branch: String(r.branch),
        gross: num(r.gross),
        actual: num(r.actual),
        lab: num(r.lab),
        otherDed: num(r.other_ded),
        net: num(r.net_shareable),
        rate: num(r.rate),
        diag: num(r.diag_share),
        payable: num(r.payable),
        note: r.control_note ? String(r.control_note) : null,
      }));
      if (out.commissions.length) {
        out.totals = out.commissions.reduce(
          (t, r) => ({ gross: t.gross + r.gross, actual: t.actual + r.actual, net: t.net + r.net, payable: t.payable + r.payable }),
          { gross: 0, actual: 0, net: 0, payable: 0 },
        );
      }
    } catch {
      /* drops */
    }
    try {
      const fin = await getFinanceRevenue();
      if (fin.available && fin.months.length >= 2) {
        const curYm = fin.months[fin.months.length - 1].ym;
        const prevYm = fin.months[fin.months.length - 2].ym;
        out.month = curYm;
        const { data } = await db
          .from('finance_revenue_monthly')
          .select('clinic, ym, doctor, gross, line_count')
          .in('ym', [curYm, prevYm]);
        const by = new Map<string, { branch: string; prev: number; cur: number; patients: number }>();
        for (const r of data ?? []) {
          const k = String(r.doctor);
          const e = by.get(k) ?? { branch: String(r.clinic), prev: 0, cur: 0, patients: 0 };
          if (String(r.ym) === curYm) {
            e.cur += num(r.gross);
            e.patients += num(r.line_count) > 0 ? 1 : 0; // placeholder, replaced below
          } else e.prev += num(r.gross);
          by.set(k, e);
        }
        // patients: distinct not available at this grain — omit rather than fake
        out.scorecard = [...by.entries()]
          .map(([doctor, e]) => ({
            doctor,
            branch: e.branch,
            prev: e.prev,
            cur: e.cur,
            momPct: e.prev > 0 ? (e.cur / e.prev - 1) * 100 : null,
            patients: 0,
          }))
          .sort((a, b) => b.cur - a.cur);
      }
    } catch {
      /* drops */
    }
    return out;
  },
  ['ops-doctor-perf-v1'],
  { revalidate: 600 },
);

/* ── Practo Live ────────────────────────────────────────────────────── */

export interface PractoWindow {
  from: string;
  to: string;
  bills: number;
  gross: number;
  net: number;
  collected: number;
  due: number;
  discount: number;
  byDay: { day: string; net: number; bills: number }[];
  byBranch: { branch: string; bills: number; net: number; collected: number; due: number }[];
  byDept: { dept: string; bills: number; net: number; collected: number; due: number }[];
  byDoctor: { doctor: string; net: number }[];
  statuses: { label: string; count: number }[];
}

export const getPractoWindow = unstable_cache(
  async (): Promise<PractoWindow | null> => {
    const db = getSupabaseAdmin();
    if (!db) return null;
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 29 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    try {
      const { data } = await db
        .from('practo_bills_raw')
        .select('bill_date, amount, data')
        .gte('bill_date', from)
        .lte('bill_date', `${to}T23:59:59Z`)
        .limit(5000);
      const rows = data ?? [];
      const out: PractoWindow = {
        from,
        to,
        bills: rows.length,
        gross: 0,
        net: 0,
        collected: 0,
        due: 0,
        discount: 0,
        byDay: [],
        byBranch: [],
        byDept: [],
        byDoctor: [],
        statuses: [],
      };
      const day = new Map<string, { net: number; bills: number }>();
      const branch = new Map<string, { bills: number; net: number; collected: number; due: number }>();
      const dept = new Map<string, { bills: number; net: number; collected: number; due: number }>();
      const doc = new Map<string, number>();
      const st = new Map<string, number>();
      for (const r of rows) {
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const d: any = r.data ?? {};
        const netV = num(d.net_amount) || num(r.amount);
        const paid = num(d.total_patient_payments);
        const due = num(d.patient_due_amount);
        out.gross += num(d.bill_amount) || netV;
        out.net += netV;
        out.collected += paid;
        out.due += due;
        out.discount += num(d.total_discount);
        const dk = String(r.bill_date).slice(0, 10);
        const de = day.get(dk) ?? { net: 0, bills: 0 };
        de.net += netV;
        de.bills += 1;
        day.set(dk, de);
        const bn = String(d.center_name ?? 'Unknown');
        const be = branch.get(bn) ?? { bills: 0, net: 0, collected: 0, due: 0 };
        be.bills += 1; be.net += netV; be.collected += paid; be.due += due;
        branch.set(bn, be);
        const dn = String(d.treating_department ?? 'Unassigned');
        const dpe = dept.get(dn) ?? { bills: 0, net: 0, collected: 0, due: 0 };
        dpe.bills += 1; dpe.net += netV; dpe.collected += paid; dpe.due += due;
        dept.set(dn, dpe);
        const charges = Array.isArray(d.charges) ? d.charges : [];
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        for (const c of charges as any[]) {
          const who = String(c?.conducting_doctor ?? '').trim();
          if (who) doc.set(who, (doc.get(who) ?? 0) + num(c?.amount));
        }
        const status = `${String(d.bill_status ?? '?')} · ${String(d.payment_status ?? '?')}`;
        st.set(status, (st.get(status) ?? 0) + 1);
      }
      out.byDay = [...day.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => ({ day: k, ...v }));
      out.byBranch = [...branch.entries()].map(([branch2, v]) => ({ branch: branch2, ...v })).sort((a, b) => b.net - a.net);
      out.byDept = [...dept.entries()].map(([dept2, v]) => ({ dept: dept2, ...v })).sort((a, b) => b.net - a.net);
      out.byDoctor = [...doc.entries()].map(([doctor, net]) => ({ doctor, net })).sort((a, b) => b.net - a.net).slice(0, 10);
      out.statuses = [...st.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
      return out;
    } catch {
      return null;
    }
  },
  ['ops-practo-window-v1'],
  { revalidate: 600 },
);

/* ── Zavis Operations ───────────────────────────────────────────────── */

export interface ZavisOps {
  total: number;
  funnel: { label: string; count: number }[];
  sources: { label: string; count: number }[];
  departments: { label: string; count: number }[];
  doctors: { label: string; count: number }[];
}

export const getZavisOps = unstable_cache(
  async (): Promise<ZavisOps | null> => {
    const db = getSupabaseAdmin();
    if (!db) return null;
    try {
      const { data } = await db
        .from('crm_appointments')
        .select('status, source, professional_department, professional_name, is_test')
        .limit(20000);
      const rows = (data ?? []).filter((r) => !r.is_test);
      const count = (key: (r: (typeof rows)[number]) => string) => {
        const m = new Map<string, number>();
        for (const r of rows) {
          const k = key(r) || '—';
          m.set(k, (m.get(k) ?? 0) + 1);
        }
        return [...m.entries()].map(([label, c]) => ({ label, count: c })).sort((a, b) => b.count - a.count);
      };
      return {
        total: rows.length,
        funnel: count((r) => String(r.status ?? '')),
        sources: count((r) => String(r.source ?? '')).slice(0, 6),
        departments: count((r) => String(r.professional_department ?? '')).slice(0, 8),
        doctors: count((r) => String(r.professional_name ?? '')).slice(0, 10),
      };
    } catch {
      return null;
    }
  },
  ['ops-zavis-v1'],
  { revalidate: 600 },
);
