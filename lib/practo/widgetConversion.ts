import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { GA4_LANES } from '@/config/ga4';

/**
 * Widget → Practo conversion. Closes the loop the CEO asked about: does a
 * website booking-widget submission actually become a Practo appointment?
 *
 * Each non-test widget booking (raw_zavis Bookings rows) is matched by phone
 * (last 9 digits) to the LIVE Practo appointment book (practo_appointments_raw),
 * and reported with the real Practo status — Booked / Attended / No-show /
 * Cancelled — or "Not in Practo" when the phone never reached the PMS (the
 * widget→Practo hand-off dropped it). Factual: no sync-grace guessing.
 */

export type ConversionOutcome = 'attended' | 'upcoming' | 'noshow' | 'cancelled' | 'notfound';

export interface WidgetConversionRow {
  key: string;
  name: string | null;
  phone: string | null;
  lane: string | null; // friendly lane/offer label from the widget Source
  submittedAt: string | null; // YYYY-MM-DD
  outcome: ConversionOutcome;
  practoStatus: string | null; // the raw Practo status when matched
  doctor: string | null;
  apptDate: string | null; // matched Practo appointment date
}

export interface WidgetConversionReport {
  source: 'live' | 'empty';
  total: number;
  inPracto: number; // matched to a Practo appointment
  attended: number; // Arrived / Completed
  upcoming: number; // Confirmed / Booked / Requested (not yet seen)
  noshow: number;
  cancelled: number;
  notFound: number; // phone never reached Practo
  rows: WidgetConversionRow[];
}

const phone9 = (s: string | null | undefined): string => {
  const d = String(s ?? '').replace(/\D/g, '');
  return d.length >= 9 ? d.slice(-9) : '';
};

/** Widget submission timestamp "MM/DD/YYYY, HH:MM:SS" (or ISO) → YYYY-MM-DD. */
function submittedDate(v: unknown): string | null {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const ms = Date.parse(s);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString().slice(0, 10);
}

function isTest(name: string, email: string, details: string, bookingRef: string): boolean {
  return /zavis|test/i.test(email) || /test|sagar/i.test(name) || /^test\b/i.test(details) || /^BK/i.test(bookingRef.trim());
}

const pick = (data: Record<string, unknown>, ...keys: string[]): string => {
  for (const k of keys) {
    const v = String(data[k] ?? '').trim();
    if (v) return v;
  }
  return '';
};

/** Friendly lane label from the widget Source token (dental_nation_<x>). */
function laneOf(source: string): string | null {
  const s = source.toLowerCase();
  for (const l of GA4_LANES) if (l.widgetSource && s.includes(`dental_nation_${l.widgetSource}`)) return l.label.replace(/^Lane [A-Z] · /, '');
  return source ? 'Website widget' : null;
}

// Map a raw Practo status to an outcome bucket + how "advanced" it is (so when a
// phone has several appointments we surface the most meaningful one).
function outcomeOf(status: string): { outcome: ConversionOutcome; rank: number } {
  const s = status.trim().toLowerCase().replace(/\s+/g, '');
  if (s === 'completed') return { outcome: 'attended', rank: 5 };
  if (s === 'arrived') return { outcome: 'attended', rank: 4 };
  if (s === 'confirmed' || s === 'booked' || s === 'requested') return { outcome: 'upcoming', rank: 3 };
  if (s === 'noshow') return { outcome: 'noshow', rank: 2 };
  if (s === 'cancel' || s === 'cancelled' || s === 'canceled') return { outcome: 'cancelled', rank: 1 };
  return { outcome: 'upcoming', rank: 0 };
}

interface ApptLite { status: string; apptDate: string | null; doctor: string | null }

const empty: WidgetConversionReport = {
  source: 'empty', total: 0, inPracto: 0, attended: 0, upcoming: 0, noshow: 0, cancelled: 0, notFound: 0, rows: [],
};

export async function getWidgetConversion(range: { from?: string; to?: string } = {}): Promise<WidgetConversionReport> {
  const db = getSupabaseAdmin();
  if (!db) return empty;
  const { from, to } = range;

  let widgetRows: { data: Record<string, unknown> }[] = [];
  const byPhone = new Map<string, ApptLite[]>();
  try {
    const [enq, appts] = await Promise.all([
      db.from('raw_zavis').select('data'),
      db.from('practo_appointments_raw').select('status, appt_date, doctor, patient_phone'),
    ]);
    widgetRows = (enq.data as { data: Record<string, unknown> }[] | null) ?? [];
    for (const a of (appts.data as { status: string | null; appt_date: string | null; doctor: string | null; patient_phone: string | null }[] | null) ?? []) {
      const p = phone9(a.patient_phone);
      if (!p) continue;
      const list = byPhone.get(p) ?? [];
      list.push({ status: String(a.status ?? ''), apptDate: a.appt_date, doctor: a.doctor });
      byPhone.set(p, list);
    }
  } catch {
    return empty;
  }

  const rows: WidgetConversionRow[] = [];
  let idx = 0;
  for (const r of widgetRows) {
    const d = r.data ?? {};
    if (!('Full Name' in d) && !('Phone Number' in d)) continue; // Bookings-shaped only
    const name = pick(d, 'Full Name', 'Name');
    const email = pick(d, 'Email');
    const phone = pick(d, 'Phone Number', 'Phone', 'Contact Number');
    const details = pick(d, 'Additional Details');
    if (isTest(name, email, details, pick(d, 'Booking Reference', 'Booking ID'))) continue;

    const submittedAt = submittedDate(d['Timestamp']);
    if (from && submittedAt && submittedAt < from) continue;
    if (to && submittedAt && submittedAt > to) continue;

    const p9 = phone9(phone);
    const appts = p9 ? byPhone.get(p9) ?? [] : [];
    // Prefer the appointment on/after the submission date (the booking they made);
    // if none, take the most advanced status; break ties by latest date.
    let best: { appt: ApptLite; rank: number } | null = null;
    for (const a of appts) {
      const { outcome, rank } = outcomeOf(a.status);
      void outcome;
      const afterBonus = submittedAt && a.apptDate && a.apptDate >= submittedAt ? 10 : 0;
      const score = rank + afterBonus;
      if (!best || score > best.rank || (score === best.rank && (a.apptDate ?? '') > (best.appt.apptDate ?? ''))) {
        best = { appt: a, rank: score };
      }
    }

    const outcome: ConversionOutcome = best ? outcomeOf(best.appt.status).outcome : 'notfound';
    rows.push({
      key: `${idx++}-${p9 || name}`,
      name: name || null,
      phone: phone || null,
      lane: laneOf(pick(d, 'Source')),
      submittedAt,
      outcome,
      practoStatus: best ? best.appt.status || null : null,
      doctor: best?.appt.doctor ?? null,
      apptDate: best?.appt.apptDate ?? null,
    });
  }

  rows.sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''));
  const count = (o: ConversionOutcome) => rows.filter((r) => r.outcome === o).length;
  const attended = count('attended');
  const upcoming = count('upcoming');
  const noshow = count('noshow');
  const cancelled = count('cancelled');
  const notFound = count('notfound');
  return {
    source: rows.length > 0 ? 'live' : 'empty',
    total: rows.length,
    inPracto: rows.length - notFound,
    attended,
    upcoming,
    noshow,
    cancelled,
    notFound,
    rows,
  };
}
