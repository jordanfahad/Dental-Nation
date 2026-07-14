import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { isPractoConfigured } from '@/config/practo';
import { CLINICS, clinicOfCenter, type ClinicFilterKey } from '@/config/clinics';
import type { MixRow } from '@/lib/types';

/**
 * Read layer for Practo Insta bills (bronze: lane_e.practo_bills_raw). Honest by
 * construction: amount/date are parsed from the real bill payload (confirmed
 * fields: net_amount / finalized_date / treating_department / charges[]). We also
 * roll revenue up by department, treatment and doctor from the line-item charges.
 */
export interface PractoDayPoint {
  date: string;
  bills: number;
  revenue: number;
}
export interface PractoSummary {
  configured: boolean;
  source: 'live' | 'empty';
  billCount: number;
  amountKnown: number;
  revenue: number;
  /** Average bill value (AED). null when no priced bills. */
  avgBill: number | null;
  periodStart: string | null;
  periodEnd: string | null;
  byDay: PractoDayPoint[];
  /** Revenue (AED) by treating department, desc. */
  byDepartment: MixRow[];
  /** Revenue (AED) by treatment / service (charge description), desc, top 8. */
  byTreatment: MixRow[];
  /** Revenue (AED) by conducting doctor, desc, top 8. */
  byDoctor: MixRow[];
  /**
   * Revenue (AED) on positive charge lines with NO conducting doctor recorded on
   * the bill. byDoctor sum + doctorUnattributed reconciles to total charge revenue,
   * so the doctor split reads honestly instead of appearing to lose money.
   */
  doctorUnattributed: number;
  /** Finalized revenue + bill count per clinic (both clinics, before any clinic
   *  filter) — for the Dental Nation vs Dr Tosun comparison. */
  byClinic: PractoClinicSplit[];
}

export interface PractoClinicSplit {
  clinic: string;
  label: string;
  revenue: number;
  bills: number;
}

const empty = (configured: boolean): PractoSummary => ({
  configured,
  source: 'empty',
  billCount: 0,
  amountKnown: 0,
  revenue: 0,
  avgBill: null,
  periodStart: null,
  periodEnd: null,
  byDay: [],
  byDepartment: [],
  byTreatment: [],
  byDoctor: [],
  doctorUnattributed: 0,
  byClinic: [],
});

function topMix(map: Map<string, number>, limit = 8): MixRow[] {
  const rows = [...map.entries()]
    .map(([label, value]) => ({ label, value: Math.round(value) }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
  if (rows.length <= limit) return rows;
  const head = rows.slice(0, limit - 1);
  const tail = rows.slice(limit - 1).reduce((a, r) => a + r.value, 0);
  return [...head, { label: 'Other', value: tail }];
}

const SERVICE_GROUPS = new Set(['Services & Procedures', 'services & procedures']);

export async function getPractoSummary(range?: {
  from?: string;
  to?: string;
  clinic?: ClinicFilterKey;
}): Promise<PractoSummary> {
  const configured = isPractoConfigured();
  const supabase = getSupabaseAdmin();
  if (!supabase) return empty(configured);
  try {
    let q = supabase.from('practo_bills_raw').select('bill_date, amount, data');
    if (range?.from) q = q.gte('bill_date', range.from);
    if (range?.to) q = q.lte('bill_date', range.to);
    const { data, error } = await q;
    if (error) return empty(configured);
    const allRows = (data as { bill_date: string | null; amount: number | null; data: Record<string, unknown> }[]) ?? [];
    if (allRows.length === 0) return empty(configured);

    // Per-clinic revenue split over BOTH clinics in the window (before filtering),
    // so the comparison always shows Dental Nation vs Dr Tosun.
    const clinicAcc = new Map<string, { revenue: number; bills: number }>();
    for (const c of CLINICS) clinicAcc.set(c.key, { revenue: 0, bills: 0 });
    for (const r of allRows) {
      const key = clinicOfCenter((r.data?.center_name as string) ?? '');
      const a = clinicAcc.get(key)!;
      a.bills += 1;
      a.revenue += r.amount != null ? Number(r.amount) || 0 : 0;
    }
    const byClinic: PractoClinicSplit[] = CLINICS.map((c) => ({
      clinic: c.key,
      label: c.label,
      revenue: Math.round(clinicAcc.get(c.key)!.revenue),
      bills: clinicAcc.get(c.key)!.bills,
    }));

    // Scope the headline numbers to the selected clinic (by bill center).
    const clinic = range?.clinic;
    const rows =
      clinic && clinic !== 'all'
        ? allRows.filter((r) => clinicOfCenter((r.data?.center_name as string) ?? '') === clinic)
        : allRows;
    if (rows.length === 0) return { ...empty(configured), source: 'empty', byClinic };

    let revenue = 0;
    let amountKnown = 0;
    const days = new Map<string, PractoDayPoint>();
    const dates: string[] = [];
    const byDept = new Map<string, number>();
    const byTreatment = new Map<string, number>();
    const byDoctor = new Map<string, number>();
    let doctorUnattributed = 0;

    for (const r of rows) {
      const amt = r.amount != null ? Number(r.amount) || 0 : null;
      if (amt != null) {
        revenue += amt;
        amountKnown += 1;
      }
      if (r.bill_date) {
        dates.push(r.bill_date);
        const d = days.get(r.bill_date) ?? { date: r.bill_date, bills: 0, revenue: 0 };
        d.bills += 1;
        d.revenue += amt ?? 0;
        days.set(r.bill_date, d);
      }
      // Department from the bill header.
      const dept = String((r.data?.treating_department as string) ?? '').trim() || 'Unspecified';
      byDept.set(dept, (byDept.get(dept) ?? 0) + (amt ?? 0));
      // Treatment + doctor from the line-item charges (services only).
      const charges = Array.isArray(r.data?.charges) ? (r.data!.charges as Record<string, unknown>[]) : [];
      for (const c of charges) {
        const cAmt = Number(c.amount) || 0;
        if (cAmt <= 0) continue;
        const group = String(c.charge_group ?? '');
        if (SERVICE_GROUPS.has(group) || String(c.charge_head ?? '').toLowerCase() === 'service') {
          const tx = String(c.description ?? '').trim() || 'Other service';
          byTreatment.set(tx, (byTreatment.get(tx) ?? 0) + cAmt);
        }
        const doc = String(c.conducting_doctor ?? '').trim();
        if (doc) byDoctor.set(doc, (byDoctor.get(doc) ?? 0) + cAmt);
        else doctorUnattributed += cAmt;
      }
    }
    dates.sort();

    return {
      configured,
      source: 'live',
      billCount: rows.length,
      amountKnown,
      revenue,
      avgBill: amountKnown > 0 ? revenue / amountKnown : null,
      periodStart: dates.length ? dates[0] : null,
      periodEnd: dates.length ? dates[dates.length - 1] : null,
      byDay: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
      byClinic,
      byDepartment: topMix(byDept),
      byTreatment: topMix(byTreatment),
      byDoctor: topMix(byDoctor),
      doctorUnattributed: Math.round(doctorUnattributed),
    };
  } catch {
    return empty(configured);
  }
}
