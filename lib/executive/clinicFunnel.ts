import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { clinicOfDoctor, clinicOfCenter, type ClinicFilterKey } from '@/config/clinics';

/**
 * The clinic conversion funnel + per-patient journey we can actually trace end
 * to end, joined on the file number:
 *   crm_appointments.patient_platform_id  ↔  practo_bills_raw.data->>'mr_no'
 *
 *   Booked  →  Showed up  →  Treatment (billed)  →  Paid
 *
 * Per patient we also resolve: NEW vs EXISTING (Practo patient DB match, else
 * first-visit date), the BOOKING CHANNEL (how the appointment was made — website
 * widget / AI agent / front-desk / walk-in; NOT the marketing platform, which
 * the booking record doesn't carry), whether they SHOWED (Zavis completed OR a
 * bill — a bill proves attendance and the manual Zavis feed under-records it),
 * the NEXT appointment (follow-up) date, and revenue.
 *
 * Honest by construction (CLAUDE.md §15): the FIRST hop — Enquired → Booked — is
 * not captured anywhere today (lead phones match Zavis ~1%, the sheet's
 * Conversion column is ~98% blank), so enquiries are top-of-funnel CONTEXT with
 * an explicit flag, never fused into a fabricated conversion. A patient with no
 * file number can be booked/showed but never bill-matched — shown truthfully.
 */

export type PatientClass = 'new' | 'existing' | 'upcoming';

export interface ClinicJourneyPatient {
  key: string;
  name: string | null;
  fileNo: string | null;
  phone: string | null;
  doctor: string | null;
  services: string | null;
  patientClass: PatientClass;
  channel: string; // booking channel label
  firstVisit: string | null; // all-time earliest appointment (ISO date)
  bookedDate: string | null; // earliest appointment in the window
  lastApptDate: string | null;
  status: string | null; // most-advanced status seen
  showed: boolean;
  billed: boolean;
  paid: boolean;
  paidAmount: number;
  nextAppt: string | null; // next future appointment (follow-up), if any
  visits: number; // total appointments (all-time) for this patient
}

export interface ClinicFunnelReport {
  from: string;
  to: string;
  source: 'live' | 'empty';
  enquiries: number;
  enquiryLinkTraceable: boolean;
  booked: number;
  showed: number;
  billed: number;
  paid: number;
  paidAED: number;
  billMatchRate: number;
  // New vs existing split of the BOOKED population.
  newCount: number;
  existingCount: number;
  upcomingCount: number;
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
  source: string | null;
  booking_mode: string | null;
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
const STATUS_RANK: Record<string, number> = {
  requested: 1,
  booked: 2,
  confirmed: 3,
  completed: 4,
  cancel: 0,
  cancelled: 0,
};
const isCompleted = (s: string | null): boolean => (s ?? '').trim().toLowerCase() === 'completed';

/** How the appointment was booked → a human channel label. This is the booking
 *  channel, NOT the marketing platform (WhatsApp/Instagram aren't on the record). */
function channelLabel(source: string | null, bookingMode: string | null): string {
  const s = (source ?? '').trim().toLowerCase();
  const m = (bookingMode ?? '').trim().toLowerCase();
  if (s === 'widget') return 'Website widget';
  if (s === 'aiagent') return 'AI agent';
  if (s === 'crm') return 'CRM / manual';
  if (m === 'clinic') return 'Walk-in (clinic)';
  if (s === 'platform') return 'Front desk (Practo)';
  return 'Direct';
}

interface Agg {
  p: ClinicJourneyPatient;
  firstTs: string | null; // all-time earliest timeslot
  inRange: boolean;
  earliestInRange: string | null;
  channelSource: string | null;
  channelMode: string | null;
  channelTs: string | null; // timeslot of the appt we took the channel from
  nextFutureTs: string | null;
  visits: number;
}

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
    newCount: 0,
    existingCount: 0,
    upcomingCount: 0,
    patients: [],
  };

  const db = getSupabaseAdmin();
  if (!db) return base;

  const nowIso = new Date().toISOString();
  const today = nowIso.slice(0, 10);

  // ── 1. ALL non-test appointments (not range-filtered — we need all-time first
  //       visit, follow-ups and the next appointment; the window only decides who
  //       counts as "booked" below). Clinic-scoped by the conducting doctor. ──
  let appts: ApptRow[] = [];
  try {
    const { data } = await db
      .from('crm_appointments')
      .select(
        'patient_platform_id, patient_name, patient_phone, status, services, professional_name, timeslot, source, booking_mode',
      )
      .or('is_test.is.null,is_test.eq.false');
    appts = (data as ApptRow[] | null) ?? [];
  } catch {
    return base;
  }
  if (clinic !== 'all') appts = appts.filter((a) => clinicOfDoctor(a.professional_name) === clinic);

  // ── 2. Practo patient DB (existing-patient authority) — phone-keyed set ──
  const practoSet = new Set<string>();
  try {
    const { data } = await db.from('practo_patients').select('phone');
    for (const r of (data as { phone: string | null }[] | null) ?? []) {
      const p9 = phone9(r.phone);
      if (p9) practoSet.add(p9);
    }
  } catch {
    /* optional */
  }

  // ── 3. Practo bills → per-file-no billed / paid / amount ──
  const bills = new Map<string, { billed: boolean; paid: boolean; amount: number }>();
  try {
    const { data } = await db.from('practo_bills_raw').select('amount, data');
    for (const b of (data as BillRow[] | null) ?? []) {
      const d = b.data ?? {};
      const mr = String(d['mr_no'] ?? '').trim();
      if (!mr) continue;
      if (clinic !== 'all' && clinicOfCenter(String(d['center_name'] ?? '')) !== clinic) continue;
      // A matched bill = treated & charged (not gated on FINALIZED: a bill can be
      // PAID before it's finalized, so FINALIZED-only would show treated < paid).
      const paid = String(d['payment_status'] ?? '').toUpperCase() === 'PAID';
      const amt = Number(d['total_patient_payments'] ?? d['patient_amount'] ?? b.amount ?? 0) || 0;
      const cur = bills.get(mr) ?? { billed: false, paid: false, amount: 0 };
      cur.billed = true;
      cur.paid = cur.paid || paid;
      if (paid) cur.amount += amt;
      bills.set(mr, cur);
    }
  } catch {
    /* bills optional */
  }

  // ── 4. Collapse to distinct PATIENTS (file no → phone → name) ──
  const agg = new Map<string, Agg>();
  const inWindow = (ts: string | null): boolean =>
    !!ts && (!from || ts.slice(0, 10) >= from) && (!to || ts.slice(0, 10) <= to);

  for (const a of appts) {
    const fileNo = (a.patient_platform_id ?? '').trim() || null;
    const ph = phone9(a.patient_phone);
    const key = fileNo ?? (ph ? `ph:${ph}` : `nm:${(a.patient_name ?? '').trim().toLowerCase()}`);
    if (!key || key === 'nm:') continue;
    const ts = a.timeslot ?? null;
    const apptDate = ts ? ts.slice(0, 10) : null;

    let e = agg.get(key);
    if (!e) {
      e = {
        p: {
          key,
          name: a.patient_name?.trim() || null,
          fileNo,
          phone: a.patient_phone?.trim() || null,
          doctor: a.professional_name?.trim() || null,
          services: a.services?.trim() || null,
          patientClass: 'new',
          channel: 'Direct',
          firstVisit: null,
          bookedDate: null,
          lastApptDate: null,
          status: a.status?.trim() || null,
          showed: false,
          billed: false,
          paid: false,
          paidAmount: 0,
          nextAppt: null,
          visits: 0,
        },
        firstTs: null,
        inRange: false,
        earliestInRange: null,
        channelSource: null,
        channelMode: null,
        channelTs: null,
        nextFutureTs: null,
        visits: 0,
      };
      agg.set(key, e);
    }
    const p = e.p;
    e.visits += 1;
    if (!p.fileNo && fileNo) p.fileNo = fileNo;
    if (!p.doctor && a.professional_name) p.doctor = a.professional_name.trim();
    if (!p.services && a.services) p.services = a.services.trim();
    if (a.patient_name && !p.name) p.name = a.patient_name.trim();

    // All-time first visit & last appt.
    if (ts && (!e.firstTs || ts < e.firstTs)) e.firstTs = ts;
    if (apptDate && (!p.lastApptDate || apptDate > p.lastApptDate)) p.lastApptDate = apptDate;

    // Most-advanced status + completed → showed.
    const rank = STATUS_RANK[(a.status ?? '').trim().toLowerCase()] ?? 1;
    const curRank = STATUS_RANK[(p.status ?? '').trim().toLowerCase()] ?? 1;
    if (rank > curRank) p.status = a.status?.trim() || p.status;
    if (isCompleted(a.status)) p.showed = true;

    // In-window booking + the channel from the earliest in-window appointment.
    if (inWindow(ts)) {
      e.inRange = true;
      if (apptDate && (!e.earliestInRange || apptDate < e.earliestInRange)) e.earliestInRange = apptDate;
      if (ts && (!e.channelTs || ts < e.channelTs)) {
        e.channelTs = ts;
        e.channelSource = a.source;
        e.channelMode = a.booking_mode;
      }
    }

    // Next future appointment (follow-up).
    if (ts && ts > nowIso && (!e.nextFutureTs || ts < e.nextFutureTs)) e.nextFutureTs = ts;
  }

  // ── 5. Finalize: bill match, class, channel — keep only patients booked in range ──
  const patients: ClinicJourneyPatient[] = [];
  for (const e of agg.values()) {
    if (!e.inRange) continue; // booked-in-window population only
    const p = e.p;
    p.firstVisit = e.firstTs ? e.firstTs.slice(0, 10) : null;
    p.bookedDate = e.earliestInRange;
    p.nextAppt = e.nextFutureTs ? e.nextFutureTs.slice(0, 10) : null;
    p.visits = e.visits;
    p.channel = channelLabel(e.channelSource, e.channelMode);

    // Bill match (file-no keyed patients only).
    if (p.fileNo) {
      const bill = bills.get(p.fileNo);
      if (bill) {
        p.billed = bill.billed;
        p.paid = bill.paid;
        p.paidAmount = bill.amount;
        if (p.billed) p.showed = true; // a bill proves attendance
      }
    }

    // New vs existing: Practo DB match → existing; else by first-visit date.
    const known = !!(p.phone && practoSet.has(phone9(p.phone)));
    if (known || (p.firstVisit && p.firstVisit < from)) {
      p.patientClass = 'existing';
    } else if (p.firstVisit && p.firstVisit > today) {
      p.patientClass = 'upcoming';
    } else {
      p.patientClass = 'new';
    }

    patients.push(p);
  }

  const booked = patients.length;
  if (booked === 0) return base;

  patients.sort(
    (a, b) => b.paidAmount - a.paidAmount || (b.lastApptDate ?? '').localeCompare(a.lastApptDate ?? ''),
  );

  const showed = patients.filter((p) => p.showed).length;
  const billed = patients.filter((p) => p.billed).length;
  const paid = patients.filter((p) => p.paid).length;
  const paidAED = patients.reduce((s, p) => s + (p.paid ? p.paidAmount : 0), 0);
  const newCount = patients.filter((p) => p.patientClass === 'new').length;
  const existingCount = patients.filter((p) => p.patientClass === 'existing').length;
  const upcomingCount = patients.filter((p) => p.patientClass === 'upcoming').length;

  // ── 6. Enquiries context (all-clinic, like the other acquisition sources) ──
  let enquiries = 0;
  try {
    let q = db.from('leads').select('id', { count: 'exact', head: true });
    if (from) q = q.gte('inquiry_date', from);
    if (to) q = q.lte('inquiry_date', to);
    const { count } = await q;
    enquiries = count ?? 0;
  } catch {
    /* optional */
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
    newCount,
    existingCount,
    upcomingCount,
    patients,
  };
}
