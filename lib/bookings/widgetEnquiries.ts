import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Website booking-widget ENQUIRY lens. Reads the widget's "Bookings" tab (mirrored
 * to lane_e.raw_widget_enquiries), drops test/seed rows, and marks each non-test
 * enquiry Booked vs Failed-to-book by matching its phone to a real appointment in
 * ZAVIS (crm_appointments) or the Practo patient DB.
 *
 * Why: the widget is meant to push each enquiry into Practo, but that flow is
 * currently broken — so a widget submission that never shows up in ZAVIS/Practo
 * "failed to book". The booking COUNT stays Practo-sourced; this is enquiries only.
 */

export type EnquiryStatus = 'booked' | 'failed';

export interface WidgetEnquiry {
  key: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  treatment: string | null;
  clinic: string | null;
  doctor: string | null;
  apptDate: string | null; // requested appointment date
  enquiredAt: string | null; // widget submission date (YYYY-MM-DD)
  status: EnquiryStatus;
}

export interface WidgetEnquiryReport {
  source: 'live' | 'empty';
  total: number;
  booked: number;
  failed: number;
  bookedRate: number | null; // booked / total
  enquiries: WidgetEnquiry[];
}

const phone9 = (s: string | null | undefined): string => {
  const d = String(s ?? '').replace(/\D/g, '');
  return d.length >= 9 ? d.slice(-9) : '';
};

/** Widget submission timestamp "MM/DD/YYYY, HH:MM:SS" (or ISO) → YYYY-MM-DD. */
function parseSubmitted(v: string): string | null {
  const s = String(v ?? '').trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const parsed = Date.parse(s);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString().slice(0, 10);
}
function parseApptDate(v: string): string | null {
  const s = String(v ?? '').trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const parsed = Date.parse(s);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString().slice(0, 10);
}

/** Same test/seed filter used across the widget sources (zavis / test / sagar). */
function isTest(name: string, email: string, details: string): boolean {
  return /zavis|test/i.test(email) || /test|sagar/i.test(name) || /^test\b/i.test(details);
}

const pick = (data: Record<string, unknown>, ...keys: string[]): string => {
  for (const k of keys) {
    const v = String(data[k] ?? '').trim();
    if (v) return v;
  }
  return '';
};

export async function getWidgetEnquiries(opts: { from?: string; to?: string } = {}): Promise<WidgetEnquiryReport> {
  const empty: WidgetEnquiryReport = { source: 'empty', total: 0, booked: 0, failed: 0, bookedRate: null, enquiries: [] };
  const db = getSupabaseAdmin();
  if (!db) return empty;

  // Rows + the ZAVIS/Practo phone sets, in parallel.
  let rows: { data: Record<string, unknown> }[] = [];
  const known = new Set<string>();
  try {
    const [enq, zavis, practo] = await Promise.all([
      db.from('raw_widget_enquiries').select('data'),
      db.from('crm_appointments').select('patient_phone'),
      db.from('practo_patients').select('phone'),
    ]);
    rows = (enq.data as { data: Record<string, unknown> }[] | null) ?? [];
    for (const r of (zavis.data as { patient_phone: string | null }[] | null) ?? []) {
      const p = phone9(r.patient_phone);
      if (p) known.add(p);
    }
    for (const r of (practo.data as { phone: string | null }[] | null) ?? []) {
      const p = phone9(r.phone);
      if (p) known.add(p);
    }
  } catch {
    return empty;
  }
  if (rows.length === 0) return empty;

  const { from, to } = opts;
  const out: WidgetEnquiry[] = [];
  let idx = 0;
  for (const r of rows) {
    const d = r.data ?? {};
    const name = pick(d, 'Full Name', 'Name');
    const email = pick(d, 'Email');
    const phone = pick(d, 'Phone Number', 'Phone', 'Contact Number');
    const details = pick(d, 'Additional Details');
    if (isTest(name, email, details)) continue;

    const enquiredAt = parseSubmitted(pick(d, 'Timestamp'));
    if (from && enquiredAt && enquiredAt < from) continue;
    if (to && enquiredAt && enquiredAt > to) continue;

    const p9 = phone9(phone);
    const status: EnquiryStatus = p9 && known.has(p9) ? 'booked' : 'failed';
    out.push({
      key: `${idx++}-${p9 || email || name}`,
      name: name || null,
      phone: phone || null,
      email: email || null,
      treatment: pick(d, 'Treatment', 'Type of Treatment', 'Condition') || null,
      clinic: pick(d, 'Clinic Name') || null,
      doctor: pick(d, 'Doctor Name') || null,
      apptDate: parseApptDate(pick(d, 'Date')),
      enquiredAt,
      status,
    });
  }

  // Most recent enquiry first.
  out.sort((a, b) => (b.enquiredAt ?? '').localeCompare(a.enquiredAt ?? ''));
  const total = out.length;
  const booked = out.filter((e) => e.status === 'booked').length;
  const failed = total - booked;
  return {
    source: total > 0 ? 'live' : 'empty',
    total,
    booked,
    failed,
    bookedRate: total > 0 ? booked / total : null,
    enquiries: out,
  };
}
