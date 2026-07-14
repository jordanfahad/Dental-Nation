import 'server-only';
import { formatInTimeZone } from 'date-fns-tz';
import { parseISO } from 'date-fns';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { clinicOfDoctor, type ClinicFilterKey } from '@/config/clinics';

/**
 * Patient + appointment list from the Zavis CRM booking feed (lane_e.crm_appointments).
 * The Practo Insta feed we ingest is finalized BILLS only — it carries a patient
 * MR number but no patient name, no new-patient flag and no appointment bookings.
 * The names / appointment dates the clinic wants live in the CRM, so this reads
 * them from there. Test rows are excluded. Degrades to a well-formed empty state.
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

export interface PatientBooking {
  patientName: string;
  status: string;
  booked: boolean;
  appointmentDate: string | null; // YYYY-MM-DD (for sort)
  appointmentLabel: string | null; // e.g. "Tue 14 Jul 2026 · 15:30"
  bookedOn: string | null; // YYYY-MM-DD (created_at)
  service: string | null;
  doctor: string | null;
}

export interface CrmPatientBookings {
  source: 'live' | 'empty';
  patients: number; // distinct patient_id
  appointments: number; // total non-test appointments
  bookedConfirmed: number; // status booked | confirmed
  rows: PatientBooking[]; // most-recent appointment first, capped at `limit`
  total: number; // full count before the cap
}

const BOOKED = new Set(['booked', 'confirmed']);

export interface PatientBookingsQuery {
  from?: string;
  to?: string;
  clinic?: ClinicFilterKey;
  limit?: number;
}

export async function getCrmPatientBookings(opts: PatientBookingsQuery = {}): Promise<CrmPatientBookings> {
  const limit = opts.limit ?? 250;
  const empty: CrmPatientBookings = {
    source: 'empty',
    patients: 0,
    appointments: 0,
    bookedConfirmed: 0,
    rows: [],
    total: 0,
  };
  const db = getSupabaseAdmin();
  if (!db) return empty;
  try {
    // Scope on created_at (when the appointment was booked) — consistent with the
    // rest of the CRM tab — plus the clinic filter (derived from the doctor).
    let q = db
      .from('crm_appointments')
      .select('patient_id, patient_name, status, timeslot, created_at, services, complaint, professional_name')
      .eq('is_test', false);
    if (opts.from) q = q.gte('created_at', `${opts.from}T00:00:00+04:00`);
    if (opts.to) q = q.lte('created_at', `${opts.to}T23:59:59+04:00`);
    const { data, error } = await q;
    if (error || !Array.isArray(data) || data.length === 0) return empty;

    const all = data as {
      patient_id: string | null;
      patient_name: string | null;
      status: string | null;
      timeslot: string | null;
      created_at: string | null;
      services: string | null;
      complaint: string | null;
      professional_name: string | null;
    }[];

    // Clinic filter (derived from the conducting doctor).
    const raw =
      opts.clinic && opts.clinic !== 'all'
        ? all.filter((r) => clinicOfDoctor(r.professional_name) === opts.clinic)
        : all;

    const patients = new Set<string>();
    let bookedConfirmed = 0;
    for (const r of raw) {
      if (r.patient_id) patients.add(r.patient_id);
      if (BOOKED.has((r.status ?? '').trim().toLowerCase())) bookedConfirmed += 1;
    }

    const rows: PatientBooking[] = raw
      .map((r) => {
        const status = (r.status ?? '').trim() || '—';
        return {
          patientName: (r.patient_name ?? '').trim() || '—',
          status,
          booked: BOOKED.has(status.toLowerCase()),
          appointmentDate: fmt(r.timeslot, 'yyyy-MM-dd'),
          appointmentLabel: fmt(r.timeslot, 'EEE d MMM yyyy · HH:mm'),
          bookedOn: fmt(r.created_at, 'yyyy-MM-dd'),
          service: (r.services ?? '').trim() || (r.complaint ?? '').trim() || null,
          doctor: (r.professional_name ?? '').trim() || null,
        };
      })
      .sort((a, b) => (b.appointmentDate ?? '').localeCompare(a.appointmentDate ?? ''));

    return {
      source: raw.length ? 'live' : 'empty',
      patients: patients.size,
      appointments: raw.length,
      bookedConfirmed,
      total: rows.length,
      rows: rows.slice(0, limit),
    };
  } catch {
    return empty;
  }
}
