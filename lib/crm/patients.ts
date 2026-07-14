import 'server-only';
import { formatInTimeZone } from 'date-fns-tz';
import { parseISO } from 'date-fns';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { clinicOfDoctor, type ClinicFilterKey } from '@/config/clinics';

/**
 * Patient + appointment list from the Zavis CRM booking feed (lane_e.crm_appointments).
 * The Practo Insta feed we ingest is finalized BILLS only — it carries a patient
 * MR number but no patient name, no new-patient flag and no appointment bookings.
 * The names / appointment dates / amounts the clinic wants live in the CRM.
 *
 * Identity resolution (see `personKey`): the CRM has NO Emirates ID, so a person
 * is identified by their cleaned NAME (+ their real phone). We deliberately do
 * NOT merge by phone alone — analysis showed shared phones are almost entirely
 * FAMILIES (father books, family treated) and dummy placeholder numbers (one
 * number → 9 unrelated people), so phone-merge would wrongly collapse distinct
 * patients. When Emirates ID lands in the feed, make it the key in ONE place
 * (personKey). Households (a real shared phone with ≥2 distinct people) are
 * detected + labelled instead, so the family scenario is surfaced, not hidden.
 *
 * New-vs-existing: a person is NEW when their FIRST-EVER appointment (all-time,
 * min created_at) falls inside the selected window. "Patient since" is that date.
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

/** Strip a jammed/spaced honorific ("MrAHMAD KHALID" / "Mrs. Sara" → clean). */
function cleanName(raw: string | null | undefined): string {
  let s = (raw ?? '').trim();
  s = s.replace(/^(mr|mrs|ms|miss|dr)(\.?\s+|(?=[A-Z]))/i, '');
  return s.replace(/\s+/g, ' ').trim();
}
/** Digits-only phone; '' when absent. */
const normPhone = (p: string | null | undefined) => (p ?? '').replace(/\D/g, '');
/** Obvious placeholder/dummy number (long zero/repeat run, or too short). */
function isDummyPhone(p: string): boolean {
  if (!p || p.length < 7) return true;
  if (/0{5,}/.test(p)) return true; // 971505000000, …
  if (/(\d)\1{5,}/.test(p)) return true; // 6+ of the same digit
  return false;
}
/** Lowercase alnum key for tolerant name matching. */
const nameKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Stable per-PERSON identity. Name + real phone → one person; a dummy/missing
 * phone falls back to name only (so a shared dummy number never merges people).
 * REPLACE the body with the Emirates ID when the feed carries it.
 */
function personKey(r: { patient_name: string | null; patient_phone?: string | null; patient_id: string | null }): string {
  const nk = nameKey(cleanName(r.patient_name));
  const phone = normPhone(r.patient_phone);
  const realPhone = phone && !isDummyPhone(phone) ? phone : '';
  if (nk) return `n:${nk}|p:${realPhone}`;
  return `id:${r.patient_id ?? ''}`;
}

export interface PatientBooking {
  patientId: string | null;
  patientName: string;
  phone: string | null;
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
  isHousehold: boolean; // shares a real phone with ≥1 other distinct person
}

/** One row of the per-patient "who paid how much" table. */
export interface PatientPaid {
  patientId: string | null;
  patientName: string;
  phone: string | null;
  paid: number | null; // sum of amounts in the window (null when none priced)
  appointments: number; // appointments in the window
  isNew: boolean;
  patientSince: string | null;
  isHousehold: boolean;
  householdSize: number; // distinct people on the same real phone (1 = solo)
}

export interface CrmPatientBookings {
  source: 'live' | 'empty';
  patients: number; // distinct PEOPLE in the window (identity-resolved)
  newPatients: number; // distinct NEW people in the window
  existingPatients: number; // distinct existing people in the window
  households: number; // real phones shared by ≥2 distinct people (in window)
  appointments: number; // total non-test appointments in the window
  bookedConfirmed: number; // status booked | confirmed
  amountKnown: number; // appointments in the window carrying an amount
  rows: PatientBooking[]; // most-recent appointment first, capped at `limit`
  total: number; // full appointment count before the cap
  byDay: { date: string; count: number }[]; // appointments by appointment date
  byDoctor: { label: string; value: number }[]; // appointments by doctor, desc
  peakDay: { date: string; count: number } | null; // date with the most appts
  topDoctor: { label: string; value: number } | null; // doctor with the most appts
  paidRows: PatientPaid[]; // per-person, highest paid first
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
  patient_phone: string | null;
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
    households: 0,
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
    // person's all-time first appointment + household; window filtered in code.
    const { data, error } = await db
      .from('crm_appointments')
      .select(
        'patient_id, patient_name, patient_phone, status, timeslot, created_at, services, complaint, professional_name, amount',
      )
      .eq('is_test', false);
    if (error || !Array.isArray(data) || data.length === 0) return empty;

    const all = (data as Row[]).filter((r) =>
      opts.clinic && opts.clinic !== 'all' ? clinicOfDoctor(r.professional_name) === opts.clinic : true,
    );

    // All-time first booked date per PERSON (min created_at, fallback timeslot),
    // and household map: real phone → set of distinct person keys.
    const firstSeen = new Map<string, string>();
    const phonePeople = new Map<string, Set<string>>();
    for (const r of all) {
      const pk = personKey(r);
      const d = dayOf(r.created_at) ?? dayOf(r.timeslot);
      if (d) {
        const cur = firstSeen.get(pk);
        if (!cur || d < cur) firstSeen.set(pk, d);
      }
      const phone = normPhone(r.patient_phone);
      if (phone && !isDummyPhone(phone)) {
        const set = phonePeople.get(phone) ?? new Set<string>();
        set.add(pk);
        phonePeople.set(phone, set);
      }
    }
    const householdSizeOf = (phone: string): number => {
      if (!phone || isDummyPhone(phone)) return 1;
      return phonePeople.get(phone)?.size ?? 1;
    };

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
    const isNewOf = (pk: string): boolean => {
      const since = firstSeen.get(pk);
      if (!since) return false;
      return opts.from ? since >= opts.from : true; // all-time window → all "new"
    };

    const people = new Set<string>();
    const newSet = new Set<string>();
    const householdPhones = new Set<string>();
    let bookedConfirmed = 0;
    let amountKnown = 0;
    const byDay = new Map<string, number>();
    const byDoctor = new Map<string, number>();
    // Per-person rollup for the "who paid how much" table.
    const paidAcc = new Map<
      string,
      { pid: string | null; name: string; phone: string; paid: number; priced: boolean; appts: number }
    >();

    for (const r of scoped) {
      const pk = personKey(r);
      people.add(pk);
      if (isNewOf(pk)) newSet.add(pk);
      const phone = normPhone(r.patient_phone);
      if (phone && !isDummyPhone(phone) && householdSizeOf(phone) >= 2) householdPhones.add(phone);

      if (BOOKED.has((r.status ?? '').trim().toLowerCase())) bookedConfirmed += 1;
      const amt = num(r.amount);
      if (amt != null) amountKnown += 1;
      const ad = dayOf(r.timeslot);
      if (ad) byDay.set(ad, (byDay.get(ad) ?? 0) + 1);
      const doc = (r.professional_name ?? '').trim();
      if (doc) byDoctor.set(doc, (byDoctor.get(doc) ?? 0) + 1);

      const acc =
        paidAcc.get(pk) ??
        { pid: r.patient_id, name: cleanName(r.patient_name) || '—', phone, paid: 0, priced: false, appts: 0 };
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
        const pk = personKey(r);
        const phone = normPhone(r.patient_phone);
        return {
          patientId: r.patient_id,
          patientName: cleanName(r.patient_name) || '—',
          phone: phone || null,
          status,
          booked: BOOKED.has(status.toLowerCase()),
          appointmentDate: dayOf(r.timeslot),
          appointmentLabel: fmt(r.timeslot, 'EEE d MMM yyyy · HH:mm'),
          bookedOn: dayOf(r.created_at),
          service: (r.services ?? '').trim() || (r.complaint ?? '').trim() || null,
          doctor: (r.professional_name ?? '').trim() || null,
          amount: num(r.amount),
          isNew: isNewOf(pk),
          patientSince: firstSeen.get(pk) ?? null,
          isHousehold: householdSizeOf(phone) >= 2,
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
      .map(([pk, a]) => ({
        patientId: a.pid,
        patientName: a.name,
        phone: a.phone || null,
        paid: a.priced ? Math.round(a.paid) : null,
        appointments: a.appts,
        isNew: isNewOf(pk),
        patientSince: firstSeen.get(pk) ?? null,
        isHousehold: householdSizeOf(a.phone) >= 2,
        householdSize: householdSizeOf(a.phone),
      }))
      .sort((a, b) => (b.paid ?? -1) - (a.paid ?? -1) || b.appointments - a.appointments);

    return {
      source: 'live',
      patients: people.size,
      newPatients: newSet.size,
      existingPatients: Math.max(0, people.size - newSet.size),
      households: householdPhones.size,
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
