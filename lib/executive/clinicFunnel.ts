import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { clinicOfDoctor, clinicOfCenter, type ClinicFilterKey } from '@/config/clinics';

/**
 * The clinic conversion funnel — the PATIENT journey we can actually trace end
 * to end, per person:
 *
 *   Booked  →  Showed up  →  Treatment (billed)  →  Paid
 *
 * The join that makes it possible is the patient file number:
 *   crm_appointments.patient_platform_id  ↔  practo_bills_raw.data->>'mr_no'
 * (a matched bill = the patient was treated & charged). Show-up is evidence-
 * based: Zavis `status='completed'` OR a matched Practo bill — because a bill is
 * itself proof the patient attended, and the manual Zavis feed under-records
 * 'completed'. Paid + amount come from the bill's payment_status / payments.
 *
 * Honest by construction (CLAUDE.md §15): the FIRST hop — Enquired → Booked — is
 * NOT captured anywhere today (lead-tracker phones match Zavis appointments only
 * ~1%, and the sheet's Conversion column is ~98% blank), so enquiries are carried
 * as top-of-funnel CONTEXT with an explicit "link not captured yet" flag, never
 * fused into a fabricated conversion. A patient with no file number can be
 * booked/showed but never bill-matched — shown truthfully, not force-fitted.
 */

export interface ClinicJourneyPatient {
  key: string;
  name: string | null;
  fileNo: string | null;
  phone: string | null;
  doctor: string | null;
  services: string | null;
  lastApptDate: string | null; // ISO date (max timeslot)
  status: string | null; // most-advanced status seen
  showed: boolean;
  billed: boolean;
  paid: boolean;
  paidAmount: number;
}

export interface ClinicFunnelReport {
  from: string;
  to: string;
  source: 'live' | 'empty';
  /** Top-of-funnel context — enquiries in the window (all-clinic, like the rest
   *  of the acquisition sources). NOT individually linked to the bookings below. */
  enquiries: number;
  enquiryLinkTraceable: boolean; // false today — the hop isn't captured
  booked: number;
  showed: number;
  billed: number;
  paid: number;
  paidAED: number;
  /** Share of booked patients that tie to a Practo bill (data-quality signal). */
  billMatchRate: number;
  patients: ClinicJourneyPatient[];
}

interface ApptRow {
  patient_platform_id: string | null;
  patient_name: string | null;
  patient_phone: string | null;
  status: string | null;
  services: string | null;
  professional_name: string | null;
  timeslot: string | null;
}

interface BillRow {
  amount: number | null;
  data: Record<string, unknown> | null;
}

const digits = (s: string | null | undefined): string => (s ?? '').replace(/\D/g, '');
const phone9 = (s: string | null | undefined): string => {
  const d = digits(s);
  return d.length >= 9 ? d.slice(-9) : '';
};
// Status ranking so a patient's "most advanced" appointment status wins.
const STATUS_RANK: Record<string, number> = {
  requested: 1,
  booked: 2,
  confirmed: 3,
  completed: 4,
  cancel: 0,
  cancelled: 0,
};
const isShowed = (s: string | null): boolean => (s ?? '').trim().toLowerCase() === 'completed';

export async function getClinicFunnel(opts: {
  from: string;
  to: string;
  clinic?: ClinicFilterKey;
}): Promise<ClinicFunnelReport> {
  const { from, to } = opts;
  const clinic = opts.clinic ?? 'all';
  const base: ClinicFunnelReport = {
    from,
    to,
    source: 'empty',
    enquiries: 0,
    enquiryLinkTraceable: false,
    booked: 0,
    showed: 0,
    billed: 0,
    paid: 0,
    paidAED: 0,
    billMatchRate: 0,
    patients: [],
  };

  const db = getSupabaseAdmin();
  if (!db) return base;

  // ── 1. Zavis appointments in the window (non-test), optionally clinic-scoped ──
  let appts: ApptRow[] = [];
  try {
    let q = db
      .from('crm_appointments')
      .select('patient_platform_id, patient_name, patient_phone, status, services, professional_name, timeslot')
      .or('is_test.is.null,is_test.eq.false');
    if (from) q = q.gte('timeslot', `${from}T00:00:00Z`);
    if (to) q = q.lte('timeslot', `${to}T23:59:59Z`);
    const { data } = await q;
    appts = (data as ApptRow[] | null) ?? [];
  } catch {
    return base;
  }
  if (clinic !== 'all') {
    appts = appts.filter((a) => clinicOfDoctor(a.professional_name) === clinic);
  }

  // ── 2. Practo bills (small table) → per-file-no billed / paid / amount ──
  const bills = new Map<string, { billed: boolean; paid: boolean; amount: number }>();
  try {
    const { data } = await db.from('practo_bills_raw').select('amount, data');
    for (const b of (data as BillRow[] | null) ?? []) {
      const d = b.data ?? {};
      const mr = String(d['mr_no'] ?? '').trim();
      if (!mr) continue;
      if (clinic !== 'all' && clinicOfCenter(String(d['center_name'] ?? '')) !== clinic) continue;
      // A matched Practo bill = the patient was treated & charged. We do NOT gate
      // "treated" on bill_status=FINALIZED: a bill can be PAID before it's
      // finalized (advance/deposit), so FINALIZED-only would wrongly show fewer
      // treated than paid. Paid is the payment_status; the amount is what landed.
      const paid = String(d['payment_status'] ?? '').toUpperCase() === 'PAID';
      const amt = Number(d['total_patient_payments'] ?? d['patient_amount'] ?? b.amount ?? 0) || 0;
      const cur = bills.get(mr) ?? { billed: false, paid: false, amount: 0 };
      cur.billed = true;
      cur.paid = cur.paid || paid;
      if (paid) cur.amount += amt;
      bills.set(mr, cur);
    }
  } catch {
    /* bills optional — funnel degrades to booked/showed only */
  }

  // ── 3. Collapse appointments to distinct PATIENTS (file no → phone → name) ──
  const byPatient = new Map<string, ClinicJourneyPatient>();
  for (const a of appts) {
    const fileNo = (a.patient_platform_id ?? '').trim() || null;
    const ph = phone9(a.patient_phone);
    const key = fileNo ?? (ph ? `ph:${ph}` : `nm:${(a.patient_name ?? '').trim().toLowerCase()}`);
    if (!key || key === 'nm:') continue;
    const apptDate = a.timeslot ? a.timeslot.slice(0, 10) : null;
    const existing = byPatient.get(key);
    const statusRank = STATUS_RANK[(a.status ?? '').trim().toLowerCase()] ?? 1;
    if (!existing) {
      byPatient.set(key, {
        key,
        name: a.patient_name?.trim() || null,
        fileNo,
        phone: a.patient_phone?.trim() || null,
        doctor: a.professional_name?.trim() || null,
        services: a.services?.trim() || null,
        lastApptDate: apptDate,
        status: a.status?.trim() || null,
        showed: isShowed(a.status),
        billed: false,
        paid: false,
        paidAmount: 0,
      });
    } else {
      if (apptDate && (!existing.lastApptDate || apptDate > existing.lastApptDate)) existing.lastApptDate = apptDate;
      const curRank = STATUS_RANK[(existing.status ?? '').trim().toLowerCase()] ?? 1;
      if (statusRank > curRank) existing.status = a.status?.trim() || existing.status;
      existing.showed = existing.showed || isShowed(a.status);
      if (!existing.fileNo && fileNo) existing.fileNo = fileNo;
      if (!existing.doctor && a.professional_name) existing.doctor = a.professional_name.trim();
      if (!existing.services && a.services) existing.services = a.services.trim();
    }
  }

  // ── 4. Attach bill match per patient (file-no keyed patients only) ──
  for (const p of byPatient.values()) {
    if (!p.fileNo) continue;
    const bill = bills.get(p.fileNo);
    if (!bill) continue;
    p.billed = bill.billed;
    p.paid = bill.paid;
    p.paidAmount = bill.amount;
    // A Practo bill is proof of attendance — Zavis `status` is under-recorded
    // (the manual feed lags), so a billed/paid patient "showed up" regardless.
    if (p.billed) p.showed = true;
  }

  const patients = [...byPatient.values()].sort(
    (a, b) => b.paidAmount - a.paidAmount || (b.lastApptDate ?? '').localeCompare(a.lastApptDate ?? ''),
  );

  const booked = patients.length;
  if (booked === 0) return base;

  const showed = patients.filter((p) => p.showed).length;
  const billed = patients.filter((p) => p.billed).length;
  const paid = patients.filter((p) => p.paid).length;
  const paidAED = patients.reduce((s, p) => s + (p.paid ? p.paidAmount : 0), 0);

  // ── 5. Enquiries context (all-clinic, like the other acquisition sources) ──
  let enquiries = 0;
  try {
    let q = db.from('leads').select('id', { count: 'exact', head: true });
    if (from) q = q.gte('inquiry_date', from);
    if (to) q = q.lte('inquiry_date', to);
    const { count } = await q;
    enquiries = count ?? 0;
  } catch {
    /* enquiries context optional */
  }

  return {
    from,
    to,
    source: 'live',
    enquiries,
    enquiryLinkTraceable: false,
    booked,
    showed,
    billed,
    paid,
    paidAED,
    billMatchRate: booked > 0 ? billed / booked : 0,
    patients,
  };
}
