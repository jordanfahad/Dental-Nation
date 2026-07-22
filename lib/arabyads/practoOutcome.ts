import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { ARABY_LANES, type ArabyLane } from '@/lib/arabyads/report';

/**
 * ArabyAds bookings → Practo outcome. The "real" (billable) ArabyAds bookings —
 * the ones the vendor charges per confirmed booking — are matched by phone to
 * the live Practo appointment book (practo_appointments_raw) so the ads team can
 * see the FULL picture: a booking they billed for may have No-showed, cancelled,
 * or never reached the clinic.
 *
 * "Real" mirrors the Araby report's rule: an ArabyAds-sourced booking that is
 * NOT a test/seed (Sagar / zavis / test / TESTPID, or a Booking Reference
 * starting "BK"). Factual — the raw Practo status drives the outcome, no guesses.
 *
 * Never throws — no data degrades to source:'empty'.
 */

export type ApptOutcome = 'attended' | 'upcoming' | 'noshow' | 'cancelled' | 'notfound';

export interface ArabyOutcomeRow {
  key: string;
  name: string | null;
  phone: string | null;
  lane: string | null;
  bookedOn: string | null; // widget submission date (YYYY-MM-DD)
  price: number | null;
  outcome: ApptOutcome;
  practoStatus: string | null;
  doctor: string | null;
  apptDate: string | null;
}

export interface ArabyOutcomeReport {
  source: 'live' | 'empty';
  total: number;
  inPracto: number;
  attended: number;
  upcoming: number;
  noshow: number;
  cancelled: number;
  notFound: number;
  rows: ArabyOutcomeRow[];
}

const phone9 = (v: string | null | undefined): string => {
  const d = String(v ?? '').replace(/\D/g, '');
  return d.length >= 9 ? d.slice(-9) : '';
};

const pick = (d: Record<string, unknown>, ...keys: string[]): string => {
  for (const k of keys) {
    const v = String(d[k] ?? '').trim();
    if (v) return v;
  }
  return '';
};

function submittedDate(v: unknown): string | null {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const ms = Date.parse(s);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString().slice(0, 10);
}

const priceOf = (v: string): number | null => {
  const n = Number(v.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** ArabyAds lane from the widget Source token, or null when not an Araby lane. */
function laneOf(source: string): ArabyLane | null {
  const s = source.toLowerCase();
  if (!s.includes('arabyads')) return null;
  return ARABY_LANES.find((l) => s.includes(l.campaign)) ?? null;
}

/** Same test rule as the Araby report: seed name/email, test PID, or BK ref. */
function isTest(email: string, name: string, source: string, bookingRef: string): boolean {
  if (/zavis|test/i.test(email) || /test|sagar/i.test(name)) return true;
  if (/testpid/i.test(source)) return true;
  if (/^BK/i.test(bookingRef.trim())) return true;
  return false;
}

function outcomeOf(status: string): { outcome: ApptOutcome; rank: number } {
  const s = status.trim().toLowerCase().replace(/\s+/g, '');
  if (s === 'completed') return { outcome: 'attended', rank: 5 };
  if (s === 'arrived') return { outcome: 'attended', rank: 4 };
  if (s === 'confirmed' || s === 'booked' || s === 'requested') return { outcome: 'upcoming', rank: 3 };
  if (s === 'noshow') return { outcome: 'noshow', rank: 2 };
  if (s === 'cancel' || s === 'cancelled' || s === 'canceled') return { outcome: 'cancelled', rank: 1 };
  return { outcome: 'upcoming', rank: 0 };
}

interface ApptLite { status: string; apptDate: string | null; doctor: string | null }

const EMPTY: ArabyOutcomeReport = {
  source: 'empty', total: 0, inPracto: 0, attended: 0, upcoming: 0, noshow: 0, cancelled: 0, notFound: 0, rows: [],
};

export async function getArabyPractoOutcome(range: { from?: string; to?: string } = {}): Promise<ArabyOutcomeReport> {
  const db = getSupabaseAdmin();
  if (!db) return EMPTY;
  const { from, to } = range;

  let zavis: { data: Record<string, unknown> }[] = [];
  const byPhone = new Map<string, ApptLite[]>();
  try {
    const [enq, appts] = await Promise.all([
      db.from('raw_zavis').select('data'),
      db.from('practo_appointments_raw').select('status, appt_date, doctor, patient_phone'),
    ]);
    zavis = (enq.data as { data: Record<string, unknown> }[] | null) ?? [];
    for (const a of (appts.data as { status: string | null; appt_date: string | null; doctor: string | null; patient_phone: string | null }[] | null) ?? []) {
      const p = phone9(a.patient_phone);
      if (!p) continue;
      const list = byPhone.get(p) ?? [];
      list.push({ status: String(a.status ?? ''), apptDate: a.appt_date, doctor: a.doctor });
      byPhone.set(p, list);
    }
  } catch {
    return EMPTY;
  }

  const rows: ArabyOutcomeRow[] = [];
  let idx = 0;
  for (const r of zavis) {
    const d = r.data ?? {};
    if (!('Full Name' in d) && !('Phone Number' in d)) continue;
    const source = pick(d, 'Source');
    const lane = laneOf(source);
    if (!lane) continue; // ArabyAds bookings only

    const name = pick(d, 'Full Name', 'Name');
    const email = pick(d, 'Email');
    const bookingRef = pick(d, 'Booking Reference', 'Booking ID');
    if (isTest(email, name, source, bookingRef)) continue; // real bookings only

    const bookedOn = submittedDate(d['Timestamp']);
    if (from && bookedOn && bookedOn < from) continue;
    if (to && bookedOn && bookedOn > to) continue;

    const phone = pick(d, 'Phone Number', 'Phone', 'Contact Number');
    const p9 = phone9(phone);
    const appts = p9 ? byPhone.get(p9) ?? [] : [];
    // Prefer the appointment on/after the booking; else the most advanced status.
    let best: { appt: ApptLite; score: number } | null = null;
    for (const a of appts) {
      const { rank } = outcomeOf(a.status);
      const afterBonus = bookedOn && a.apptDate && a.apptDate >= bookedOn ? 10 : 0;
      const score = rank + afterBonus;
      if (!best || score > best.score || (score === best.score && (a.apptDate ?? '') > (best.appt.apptDate ?? ''))) {
        best = { appt: a, score };
      }
    }
    const outcome: ApptOutcome = best ? outcomeOf(best.appt.status).outcome : 'notfound';
    rows.push({
      key: `${idx++}-${p9 || name}`,
      name: name || null,
      phone: phone || null,
      lane: lane.label,
      bookedOn,
      price: priceOf(pick(d, 'Price')),
      outcome,
      practoStatus: best ? best.appt.status || null : null,
      doctor: best?.appt.doctor ?? null,
      apptDate: best?.appt.apptDate ?? null,
    });
  }

  rows.sort((a, b) => (b.bookedOn ?? '').localeCompare(a.bookedOn ?? ''));
  const count = (o: ApptOutcome) => rows.filter((r) => r.outcome === o).length;
  const notFound = count('notfound');
  return {
    source: rows.length > 0 ? 'live' : 'empty',
    total: rows.length,
    inPracto: rows.length - notFound,
    attended: count('attended'),
    upcoming: count('upcoming'),
    noshow: count('noshow'),
    cancelled: count('cancelled'),
    notFound,
    rows,
  };
}
