import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Appointment Analytics model for the Practo Insta sub-tab. Reproduces the
 * clinic's Practo "Appointment Analytics" screen from our own data:
 *  - Appointment half (totals, status, peak hour, trend, provider load) comes
 *    from the ZAVIS CRM appointment feed (lane_e.crm_appointments).
 *  - Revenue half (billed / collected / outstanding, payment mode, collections
 *    by staff, insurance vs patient, provider revenue) comes from the live
 *    Practo Insta bills (lane_e.practo_bills_raw — receipts[] + charges[]).
 *
 * Honest by design: absolute revenue reflects FINALIZED bills synced so far, so
 * it trails the Practo screen until open bills finalize (coverageNote surfaces
 * this). Never throws — any source failure degrades to an empty section.
 *
 * All dates bucket in Asia/Dubai (UTC+4, no DST).
 */

const iso = (d: Date) => d.toISOString().slice(0, 10);
const DUBAI_MS = 4 * 3600 * 1000;

/** ISO/UTC timestamp → Dubai calendar parts. */
function dubaiParts(tsUtc: string | null | undefined): { date: string; hour: number; dow: number } | null {
  if (!tsUtc) return null;
  const t = Date.parse(tsUtc);
  if (Number.isNaN(t)) return null;
  const s = new Date(t + DUBAI_MS);
  return { date: s.toISOString().slice(0, 10), hour: s.getUTCHours(), dow: s.getUTCDay() };
}
/** A bare 'YYYY-MM-DD' (bill finalized/open date) or ISO → 'YYYY-MM-DD'. */
function toDay(v: string | null | undefined): string | null {
  const s = String(v ?? '').trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const p = dubaiParts(s);
  return p?.date ?? null;
}
const numOf = (v: unknown): number => {
  const n = Number(String(v ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const inRange = (day: string | null, from: string, to: string) => !!day && day >= from && day <= to;

export interface StatusSlice { label: string; value: number }
export interface DayCount { date: string; count: number }
export interface NamedAmount { label: string; amount: number; count?: number }
export interface ProviderDay {
  provider: string;
  department: string | null;
  date: string; // Dubai YYYY-MM-DD
  dow: number; // 0=Sun … 6=Sat
  revenue: number; // Practo charges conducted by this provider, posted that day
  collected: number; // receipts allocated to this provider by charge share
  appts: number; // CRM appointments for this provider that day
  bookedMinutes: number;
}

export interface AppointmentAnalytics {
  source: 'live' | 'empty';
  from: string;
  to: string;
  // Appointment KPIs
  total: number;
  completed: number; // Arrived + Completed
  cancelled: number;
  patientsSeen: number;
  peakHour: number | null; // 0–23 (Dubai)
  completionRate: number | null;
  cancellationRate: number | null;
  trend: DayCount[];
  status: StatusSlice[];
  // Revenue
  revenue: {
    billCount: number;
    billed: number;
    collected: number;
    outstanding: number;
    collectedRate: number | null;
    byMode: NamedAmount[];
    byStaff: NamedAmount[];
    insurance: number;
    patient: number;
    coverageNote: string | null;
  };
  // Provider performance (daily; the client buckets into weeks)
  providerDaily: ProviderDay[];
}

// Map a raw CRM status to a display label matching the Practo screen taxonomy.
const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmed',
  completed: 'Completed',
  arrived: 'Arrived',
  booked: 'Booked',
  requested: 'Requested',
  cancel: 'Cancelled',
  cancelled: 'Cancelled',
  canceled: 'Cancelled',
  noshow: 'No-show',
  no_show: 'No-show',
};
const STATUS_ORDER = ['Confirmed', 'Arrived', 'Completed', 'Booked', 'Requested', 'No-show', 'Cancelled'];

const empty = (from: string, to: string): AppointmentAnalytics => ({
  source: 'empty',
  from,
  to,
  total: 0,
  completed: 0,
  cancelled: 0,
  patientsSeen: 0,
  peakHour: null,
  completionRate: null,
  cancellationRate: null,
  trend: [],
  status: [],
  revenue: {
    billCount: 0,
    billed: 0,
    collected: 0,
    outstanding: 0,
    collectedRate: null,
    byMode: [],
    byStaff: [],
    insurance: 0,
    patient: 0,
    coverageNote: null,
  },
  providerDaily: [],
});

interface BillData {
  net_amount?: unknown;
  patient_amount?: unknown;
  finalized_date?: unknown;
  open_date?: unknown;
  receipts?: { round?: unknown; collected_by?: unknown; payment_mode?: unknown; payment_type?: unknown; receipt_type?: unknown; receipt_date?: unknown }[];
  charges?: { amount?: unknown; conducting_doctor?: unknown; posted_date?: unknown }[];
}

export async function getAppointmentAnalytics(range: { from?: string; to?: string } = {}): Promise<AppointmentAnalytics> {
  const to = range.to || iso(new Date());
  const from = range.from || iso(new Date(Date.now() - 29 * 86400_000));
  const db = getSupabaseAdmin();
  if (!db) return empty(from, to);

  // Pull both sources in parallel.
  let appts: Record<string, unknown>[] = [];
  let bills: { data: BillData }[] = [];
  try {
    const [a, b] = await Promise.all([
      db
        .from('crm_appointments')
        .select('status, timeslot, duration_minutes, patient_id, professional_name, professional_department, is_test'),
      db.from('practo_bills_raw').select('data'),
    ]);
    appts = (a.data as Record<string, unknown>[] | null) ?? [];
    bills = (b.data as { data: BillData }[] | null) ?? [];
  } catch {
    return empty(from, to);
  }

  // ---- Appointment half (CRM feed) ------------------------------------------
  const trendMap = new Map<string, number>();
  const statusMap = new Map<string, number>();
  const hourCount = new Array<number>(24).fill(0);
  const patients = new Set<string>();
  const provDay = new Map<string, ProviderDay>(); // key provider|date
  const keyOf = (p: string, d: string) => `${p}|||${d}`;
  let total = 0;
  let completed = 0;
  let cancelled = 0;

  for (const r of appts) {
    if (r.is_test === true) continue;
    const parts = dubaiParts(r.timeslot as string | null);
    if (!parts || !inRange(parts.date, from, to)) continue;
    total++;
    trendMap.set(parts.date, (trendMap.get(parts.date) ?? 0) + 1);
    hourCount[parts.hour]++;
    const pid = String(r.patient_id ?? '').trim();
    if (pid) patients.add(pid);

    const raw = String(r.status ?? '').trim().toLowerCase().replace(/\s+/g, '');
    const label = STATUS_LABEL[raw] ?? (raw ? raw[0].toUpperCase() + raw.slice(1) : 'Unknown');
    statusMap.set(label, (statusMap.get(label) ?? 0) + 1);
    if (label === 'Completed' || label === 'Arrived') completed++;
    if (label === 'Cancelled') cancelled++;

    const provider = String(r.professional_name ?? '').trim() || 'Unassigned';
    const dept = String(r.professional_department ?? '').trim() || null;
    const k = keyOf(provider, parts.date);
    const pd =
      provDay.get(k) ??
      { provider, department: dept, date: parts.date, dow: parts.dow, revenue: 0, collected: 0, appts: 0, bookedMinutes: 0 };
    if (!pd.department && dept) pd.department = dept;
    pd.appts++;
    pd.bookedMinutes += numOf(r.duration_minutes) || 30; // 30-min default slot
    provDay.set(k, pd);
  }

  // Peak hour = the busiest Dubai hour across the window.
  let peakHour: number | null = null;
  let peakN = -1;
  for (let h = 0; h < 24; h++) if (hourCount[h] > peakN) ((peakN = hourCount[h]), (peakHour = h));
  if (total === 0) peakHour = null;

  // ---- Revenue half (Practo bills) ------------------------------------------
  let billCount = 0;
  let billed = 0;
  let patientShare = 0;
  let collected = 0;
  const modeMap = new Map<string, number>();
  const staffAmt = new Map<string, number>();
  const staffCnt = new Map<string, number>();

  for (const row of bills) {
    const d = row.data ?? {};
    const bDay = toDay((d.finalized_date as string) ?? '') ?? toDay(d.open_date as string);
    const charges = Array.isArray(d.charges) ? d.charges : [];
    const receipts = Array.isArray(d.receipts) ? d.receipts : [];

    // Billed / insurance-vs-patient: count the bill in-window by its finalized date.
    if (inRange(bDay, from, to)) {
      const net = numOf(d.net_amount);
      billCount++;
      billed += net;
      patientShare += numOf(d.patient_amount);
    }

    // Provider revenue: each charge → its conducting doctor on the charge's posted day.
    const chargeTotal = charges.reduce((s, c) => s + numOf(c.amount), 0);
    for (const c of charges) {
      const cDay = toDay((c.posted_date as string) ?? '') ?? bDay;
      if (!inRange(cDay, from, to)) continue;
      const provider = String(c.conducting_doctor ?? '').trim();
      if (!provider) continue;
      const k = keyOf(provider, cDay!);
      const parts = dubaiParts(`${cDay}T00:00:00Z`);
      const pd =
        provDay.get(k) ??
        { provider, department: null, date: cDay!, dow: parts?.dow ?? 0, revenue: 0, collected: 0, appts: 0, bookedMinutes: 0 };
      pd.revenue += numOf(c.amount);
      provDay.set(k, pd);
    }

    // Collected / mode / staff: each receipt on its receipt day; allocate to the
    // bill's providers by charge share for the provider grid's "collected".
    for (const rc of receipts) {
      const rDay = toDay(rc.receipt_date as string);
      if (!inRange(rDay, from, to)) continue;
      const type = String(rc.payment_type ?? rc.receipt_type ?? '').toUpperCase();
      const amt = numOf(rc.round) * (type === 'REFUND' ? -1 : 1);
      collected += amt;
      const mode = String(rc.payment_mode ?? '').trim() || 'Other';
      modeMap.set(mode, (modeMap.get(mode) ?? 0) + amt);
      const staff = String(rc.collected_by ?? '').trim() || 'Unknown';
      staffAmt.set(staff, (staffAmt.get(staff) ?? 0) + amt);
      staffCnt.set(staff, (staffCnt.get(staff) ?? 0) + 1);
      // allocate to providers by charge share
      if (chargeTotal > 0) {
        for (const c of charges) {
          const provider = String(c.conducting_doctor ?? '').trim();
          if (!provider) continue;
          const share = numOf(c.amount) / chargeTotal;
          const k = keyOf(provider, rDay!);
          const parts = dubaiParts(`${rDay}T00:00:00Z`);
          const pd =
            provDay.get(k) ??
            { provider, department: null, date: rDay!, dow: parts?.dow ?? 0, revenue: 0, collected: 0, appts: 0, bookedMinutes: 0 };
          pd.collected += amt * share;
          provDay.set(k, pd);
        }
      }
    }
  }

  const insurance = Math.max(0, billed - patientShare);
  const outstanding = Math.max(0, billed - collected);

  const status: StatusSlice[] = [...statusMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => {
      const ia = STATUS_ORDER.indexOf(a.label);
      const ib = STATUS_ORDER.indexOf(b.label);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });

  const trend: DayCount[] = [...trendMap.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const toNamed = (m: Map<string, number>, cnt?: Map<string, number>): NamedAmount[] =>
    [...m.entries()]
      .map(([label, amount]) => ({ label, amount, count: cnt?.get(label) }))
      .filter((x) => x.amount !== 0)
      .sort((a, b) => b.amount - a.amount);

  const providerDaily = [...provDay.values()].filter((p) => p.revenue > 0 || p.collected > 0 || p.appts > 0);

  const hasData = total > 0 || billCount > 0 || collected > 0;

  return {
    source: hasData ? 'live' : 'empty',
    from,
    to,
    total,
    completed,
    cancelled,
    patientsSeen: patients.size,
    peakHour,
    completionRate: total > 0 ? completed / total : null,
    cancellationRate: total > 0 ? cancelled / total : null,
    trend,
    status,
    revenue: {
      billCount,
      billed,
      collected,
      outstanding,
      collectedRate: billed > 0 ? collected / billed : null,
      byMode: toNamed(modeMap),
      byStaff: toNamed(staffAmt, staffCnt),
      insurance,
      patient: patientShare,
      coverageNote:
        billCount > 0
          ? 'Revenue reflects finalized Practo bills synced so far; open/unfinalized bills fill in as they finalize.'
          : null,
    },
    providerDaily,
  };
}
