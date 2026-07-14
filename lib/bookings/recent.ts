import 'server-only';
import { formatInTimeZone } from 'date-fns-tz';
import { parseISO } from 'date-fns';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { clinicLabel, clinicOfDoctor } from '@/config/clinics';

/**
 * Recent WEBSITE-WIDGET submissions, sourced from the live Zavis widget feed
 * (lane_e.crm_appointments where source='widget'). Unlike the sheet-based
 * `bookings` table (finalized, priced rows), this is the raw on-site widget
 * stream — so it INCLUDES test/seed orders, flagged as such, exactly like the
 * Araby Ads "Recent bookings" detail. Lets the team confirm a test lead landed
 * end-to-end without it polluting the real KPIs above (those stay is_test=false).
 * Degrades to a well-formed empty state.
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

export interface WidgetBookingRow {
  date: string | null; // YYYY-MM-DD sort key (booked-on = created_at)
  dateLabel: string | null; // e.g. "Sat 11 Jul 2026"
  apptLabel: string | null; // appointment slot, e.g. "Thu 16 Jul 2026 · 16:30"
  patientName: string;
  treatment: string | null;
  doctor: string | null;
  clinic: string; // derived clinic label (Dental Nation / Dr Tosun)
  status: string;
  isTest: boolean;
}

export interface RecentWidgetBookings {
  source: 'live' | 'empty';
  rows: WidgetBookingRow[]; // most recent first, capped at `limit`
  total: number; // full count before the cap
  real: number; // non-test count
  test: number; // test/seed count
}

const empty: RecentWidgetBookings = { source: 'empty', rows: [], total: 0, real: 0, test: 0 };

export async function getRecentWidgetBookings(opts: {
  from?: string;
  to?: string;
  limit?: number;
} = {}): Promise<RecentWidgetBookings> {
  const limit = opts.limit ?? 40;
  const db = getSupabaseAdmin();
  if (!db) return empty;
  try {
    // The website booking widget writes into the CRM with source='widget'.
    // Scope on created_at (when it was booked), consistent with the rest of the
    // tab. We KEEP is_test rows here (and flag them) — this view is the honest
    // stream that shows a test order landed.
    let q = db
      .from('crm_appointments')
      .select('patient_name, professional_name, services, complaint, status, is_test, timeslot, created_at')
      .ilike('source', 'widget');
    if (opts.from) q = q.gte('created_at', `${opts.from}T00:00:00+04:00`);
    if (opts.to) q = q.lte('created_at', `${opts.to}T23:59:59+04:00`);
    const { data, error } = await q;
    if (error || !Array.isArray(data) || data.length === 0) return empty;

    const raw = data as {
      patient_name: string | null;
      professional_name: string | null;
      services: string | null;
      complaint: string | null;
      status: string | null;
      is_test: boolean | null;
      timeslot: string | null;
      created_at: string | null;
    }[];

    let real = 0;
    let test = 0;
    const rows: WidgetBookingRow[] = raw
      .map((r) => {
        const isTest = r.is_test === true;
        if (isTest) test += 1;
        else real += 1;
        return {
          date: fmt(r.created_at, 'yyyy-MM-dd'),
          dateLabel: fmt(r.created_at, 'EEE d MMM yyyy'),
          apptLabel: fmt(r.timeslot, 'EEE d MMM yyyy · HH:mm'),
          patientName: (r.patient_name ?? '').trim() || '—',
          treatment: (r.services ?? '').trim() || (r.complaint ?? '').trim() || null,
          doctor: (r.professional_name ?? '').trim() || null,
          clinic: clinicLabel(clinicOfDoctor(r.professional_name)),
          status: (r.status ?? '').trim() || '—',
          isTest,
        };
      })
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

    return { source: 'live', rows: rows.slice(0, limit), total: rows.length, real, test };
  } catch {
    return empty;
  }
}
