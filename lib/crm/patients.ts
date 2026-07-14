import 'server-only';
import { formatInTimeZone } from 'date-fns-tz';
import { parseISO } from 'date-fns';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { clinicOfDoctor, type ClinicFilterKey } from '@/config/clinics';

/**
 * Patient + appointment list from the Zavis CRM booking feed (lane_e.crm_appointments).
 * The Practo Insta feed we ingest is finalized BILLS only — it carries a patient
 * MR number but no patient name, no new-patient flag and no appointment bookings.
 * The names / appointment dates / amounts the clinic wants live in the CRM, so
 * this reads them from there. Test rows are excluded.
 *
 * New-vs-existing: a patient is NEW when their FIRST-EVER appointment (all-time,
 * min created_at) falls inside the selected window; EXISTING when they were seen
 * before it. "Patient since" is that first-ever booked date. Degrades to empty.
 */
const TZ = 'Asia/Dubai';
function fmt(ts: string | null | undefined, pattern: string): string | null {
  if (!ts) return null;
  try {
    return formatInTimeZone(parseISO(ts), TZ, pattern);
  } catch {
    return null;
  }
}
/** Dubai-day YYYY-MM-DD of a timestamp (for window compares + patient-since). */
const dayOf = (ts: string | null | undefined) => fmt(ts, 'yyyy-MM-dd');

export interface PatientBooking {
  patientId: string | null;
  patientName: string;
  status: string;
  booked: boolean;
  appointmentDate: string | null; // YYYY-MM-DD (for sort)
  appointmentLabel: string | null; // e.g. "Tue 14 Jul 2026 · 15:30"
  bookedOn: string | null; // YYYY-MM-DD (created_at)
  service: string | null;
  doctor: string | null;
  amount: number | null; // AED recorded on the appointment (often absent)
  isNew: boolean; // first-ever appointment falls in the window
  patientSince: string | null; // YYYY-MM-DD first-ever booked date (null → blank)
}

/** One row of the per-patient "who paid how much" table. */
export interface PatientPaid {
  patientId: string | null;
  patientName: string;
  paid: number | null; // sum of amounts in the window (null when none priced)
  appointments: number; // appointments in the window
  isNew: boolean;
  patientSince: string | null;
}

export interface CrmPatientBookings {
  source: 'live' | 'empty';
  patients: number; // distinct patients in the window
  newPatients: number; // distinct NEW patients in the window
  existingPatients: number; // distinct existing patients in the window
  appointments: number; // total non-test appointments in the window
  bookedConfirmed: number; // status booked | confirmed
  amountKnown: number; // appointments in the window carrying an amount
  rows: PatientBooking[]; // most-recent appointment first, capped at `limit`
  total: number; // full appointment count before the cap
  byDay: { date: string; count: number }[]; // appointments by appointment date
  byDoctor: { label: string; value: number }[]; // appointments by doctor, desc
  peakDay: { date: string; count: number } | null; // date with the most appts
  topDoctor: { label: string; value: number } | null; // doctor with the most appts
  paidRows: PatientPaid[]; // per-patient, highest paid first
}

const BOOKED = new Set(['booked', 'confirmed']);

export interface PatientBookingsQuery {
  from?: string;
  to?: string;
  clinic?: ClinicFilterKey;
  limit?: number;
}

interface Row {
  patient_id: string | null;
  patient_name: string | null;
  status: string | null;
  timeslot: string | null;
  created_at: string | null;
  services: string | null;
  complaint: string | null;
  professional_name: string | null;
  amount: number | string | null;
}

export async function getCrmPatientBookings(opts: PatientBookingsQuery = {}): Promise<CrmPatientBookings> {
  const limit = opts.limit ?? 250;
  const empty: CrmPatientBookings = {
    source: 'empty',
    patients: 0,
    newPatients: 0,
    existingPatients: 0,
    appointments: 0,
    bookedConfirmed: 0,
    amountKnown: 0,
    rows: [],
    total: 0,
    byDay: [],
    byDoctor: [],
    peakDay: null,
    topDoctor: null,
    paidRows: [],
  };
  const db = getSupabaseAdmin();
  if (!db) return empty;
  try {
    // Fetch ALL non-test appointments (clinic-filterable) so we can compute each
    // patient's all-time first appointment; the window filter is applied in code.
    const { data, error } = await db
      .from('crm_appointments')
      .select(
        'patient_id, patient_name, status, timeslot, created_at, services, complaint, professional_name, amount',
      )
      .eq('is_test', false);
    if (error || !Array.isArray(data) || data.length === 0) return empty;

    const all = (data as Row[]).filter((r) =>
      opts.clinic && opts.clinic !== 'all' ? clinicOfDoctor(r.professional_name) === opts.clinic : true,
    );

    // All-time first booked date per patient (min created_at, fallback timeslot).
    const firstSeen = new Map<string, string>();
    for (const r of all) {
      const pid = r.patient_id;
      if (!pid) continue;
      const d = dayOf(r.created_at) ?? dayOf(r.timeslot);
      if (!d) continue;
      const cur = firstSeen.get(pid);
      if (!cur || d < cur) firstSeen.set(pid, d);
    }

    // Window filter on created_at (when the appointment was booked).
    const inWindow = (r: Row) => {
      const d = dayOf(r.created_at);
      if (!d) return false;
      if (opts.from && d < opts.from) return false;
      if (opts.to && d > opts.to) return false;
      return true;
    };
    const scoped = all.filter(inWindow);
    if (scoped.length === 0) return { ...empty, source: all.length ? 'live' : 'empty' };

    const num = (v: number | string | null): number | null => {
      if (v == null) return null;
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : null;
    };
    const isNewOf = (pid: string | null): boolean => {
      if (!pid) return false;
      const since = firstSeen.get(pid);
      if (!since) return false;
      return opts.from ? since >= opts.from : true; // all-time window → all "new"
    };

    const patients = new Set<string>();
    const newSet = new Set<string>();
    let bookedConfirmed = 0;
    let amountKnown = 0;
    const byDay = new Map<string, number>();
    const byDoctor = new Map<string, number>();
    // Per-patient rollup for the "who paid how much" table.
    const paidAcc = new Map<string, { name: string; paid: number; priced: boolean; appts: number }>();

    for (const r of scoped) {
      if (r.patient_id) {
        patients.add(r.patient_id);
        if (isNewOf(r.patient_id)) newSet.add(r.patient_id);
      }
      if (BOOKED.has((r.status ?? '').trim().toLowerCase())) bookedConfirmed += 1;
      const amt = num(r.amount);
      if (amt != null) amountKnown += 1;
      const ad = dayOf(r.timeslot);
      if (ad) byDay.set(ad, (byDay.get(ad) ?? 0) + 1);
      const doc = (r.professional_name ?? '').trim();
      if (doc) byDoctor.set(doc, (byDoctor.get(doc) ?? 0) + 1);

      const pk = r.patient_id ?? `name:${(r.patient_name ?? '').trim().toLowerCase()}`;
      const acc =
        paidAcc.get(pk) ?? { name: (r.patient_name ?? '').trim() || '—', paid: 0, priced: false, appts: 0 };
      acc.appts += 1;
      if (amt != null) {
        acc.paid += amt;
        acc.priced = true;
      }
      paidAcc.set(pk, acc);
    }

    const rows: PatientBooking[] = scoped
      .map((r) => {
        const status = (r.status ?? '').trim() || '—';
        return {
          patientId: r.patient_id,
          patientName: (r.patient_name ?? '').trim() || '—',
          status,
          booked: BOOKED.has(status.toLowerCase()),
          appointmentDate: dayOf(r.timeslot),
          appointmentLabel: fmt(r.timeslot, 'EEE d MMM yyyy · HH:mm'),
          bookedOn: dayOf(r.created_at),
          service: (r.services ?? '').trim() || (r.complaint ?? '').trim() || null,
          doctor: (r.professional_name ?? '').trim() || null,
          amount: num(r.amount),
          isNew: isNewOf(r.patient_id),
          patientSince: r.patient_id ? firstSeen.get(r.patient_id) ?? null : null,
        };
      })
      .sort((a, b) => (b.appointmentDate ?? '').localeCompare(a.appointmentDate ?? ''));

    const byDayArr = [...byDay.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const byDoctorArr = [...byDoctor.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
    const peakDay = byDayArr.length ? byDayArr.reduce((m, d) => (d.count > m.count ? d : m)) : null;
    const topDoctor = byDoctorArr.length ? byDoctorArr[0] : null;

    const paidRows: PatientPaid[] = [...paidAcc.entries()]
      .map(([pk, a]) => {
        const pid = pk.startsWith('name:') ? null : pk;
        return {
          patientId: pid,
          patientName: a.name,
          paid: a.priced ? Math.round(a.paid) : null,
          appointments: a.appts,
          isNew: isNewOf(pid),
          patientSince: pid ? firstSeen.get(pid) ?? null : null,
        };
      })
      .sort((a, b) => (b.paid ?? -1) - (a.paid ?? -1) || b.appointments - a.appointments);

    return {
      source: 'live',
      patients: patients.size,
      newPatients: newSet.size,
      existingPatients: Math.max(0, patients.size - newSet.size),
      appointments: scoped.length,
      bookedConfirmed,
      amountKnown,
      rows: rows.slice(0, limit),
      total: rows.length,
      byDay: byDayArr,
      byDoctor: byDoctorArr,
      peakDay,
      topDoctor,
      paidRows: paidRows.slice(0, limit),
    };
  } catch {
    return empty;
  }
}
