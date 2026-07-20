import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { GA4_LANES } from '@/config/ga4';

/**
 * Clinical Operations lead-forms feed (reception + ops). Every website
 * booking-widget submission (raw_zavis Bookings rows) surfaced with the full
 * contact + requested-appointment details reception needs to follow up, plus
 * whether it has reached Practo yet (matched by phone to the live appointment
 * feed). Test/seed rows are excluded from the actionable list.
 */

export type LeadOutcome = 'attended' | 'booked' | 'noshow' | 'cancelled' | 'notfound';

export interface LeadForm {
  key: string;
  submittedIso: string | null; // full ISO timestamp
  submittedMs: number | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  treatment: string | null;
  clinic: string | null;
  doctor: string | null;
  requestedDate: string | null;
  details: string | null;
  lane: string | null;
  outcome: LeadOutcome;
  practoStatus: string | null;
}

export interface LeadFormsReport {
  source: 'live' | 'empty';
  total: number;
  today: number;
  last7d: number;
  reachedPracto: number;
  notInPracto: number;
  rows: LeadForm[];
}

const phone9 = (s: string | null | undefined): string => {
  const d = String(s ?? '').replace(/\D/g, '');
  return d.length >= 9 ? d.slice(-9) : '';
};
const pick = (data: Record<string, unknown>, ...keys: string[]): string => {
  for (const k of keys) {
    const v = String(data[k] ?? '').trim();
    if (v) return v;
  }
  return '';
};
function isTest(name: string, email: string, details: string, ref: string): boolean {
  return /zavis|test/i.test(email) || /test|sagar/i.test(name) || /^test\b/i.test(details) || /^BK/i.test(ref.trim());
}
function laneOf(source: string): string | null {
  const s = source.toLowerCase();
  for (const l of GA4_LANES) if (l.widgetSource && s.includes(`dental_nation_${l.widgetSource}`)) return l.label.replace(/^Lane [A-Z] · /, '');
  return source ? 'Website widget' : null;
}
function outcomeOf(status: string): { outcome: LeadOutcome; rank: number } {
  const s = status.trim().toLowerCase().replace(/\s+/g, '');
  if (s === 'completed') return { outcome: 'attended', rank: 5 };
  if (s === 'arrived') return { outcome: 'attended', rank: 4 };
  if (s === 'confirmed' || s === 'booked' || s === 'requested') return { outcome: 'booked', rank: 3 };
  if (s === 'noshow') return { outcome: 'noshow', rank: 2 };
  if (s === 'cancel' || s === 'cancelled' || s === 'canceled') return { outcome: 'cancelled', rank: 1 };
  return { outcome: 'booked', rank: 0 };
}

const empty: LeadFormsReport = { source: 'empty', total: 0, today: 0, last7d: 0, reachedPracto: 0, notInPracto: 0, rows: [] };

export async function getLeadForms(range: { from?: string; to?: string } = {}): Promise<LeadFormsReport> {
  const db = getSupabaseAdmin();
  if (!db) return empty;
  const { from, to } = range;

  let widgetRows: { data: Record<string, unknown> }[] = [];
  const byPhone = new Map<string, { status: string; apptDate: string | null }[]>();
  try {
    const [enq, appts] = await Promise.all([
      db.from('raw_zavis').select('data'),
      db.from('practo_appointments_raw').select('status, appt_date, patient_phone'),
    ]);
    widgetRows = (enq.data as { data: Record<string, unknown> }[] | null) ?? [];
    for (const a of (appts.data as { status: string | null; appt_date: string | null; patient_phone: string | null }[] | null) ?? []) {
      const p = phone9(a.patient_phone);
      if (!p) continue;
      const list = byPhone.get(p) ?? [];
      list.push({ status: String(a.status ?? ''), apptDate: a.appt_date });
      byPhone.set(p, list);
    }
  } catch {
    return empty;
  }

  const rows: LeadForm[] = [];
  let idx = 0;
  for (const r of widgetRows) {
    const d = r.data ?? {};
    if (!('Full Name' in d) && !('Phone Number' in d)) continue;
    const name = pick(d, 'Full Name', 'Name');
    const email = pick(d, 'Email');
    const phone = pick(d, 'Phone Number', 'Phone', 'Contact Number');
    const details = pick(d, 'Additional Details');
    if (isTest(name, email, details, pick(d, 'Booking Reference', 'Booking ID'))) continue;

    const rawTs = pick(d, 'Timestamp');
    const ms = rawTs ? Date.parse(rawTs) : NaN;
    const submittedMs = Number.isNaN(ms) ? null : ms;
    const submittedIso = submittedMs == null ? null : new Date(submittedMs).toISOString();
    const day = submittedIso ? submittedIso.slice(0, 10) : null;
    if (from && day && day < from) continue;
    if (to && day && day > to) continue;

    const p9 = phone9(phone);
    const appts = p9 ? byPhone.get(p9) ?? [] : [];
    let best: { status: string; apptDate: string | null; rank: number } | null = null;
    for (const a of appts) {
      const { rank } = outcomeOf(a.status);
      const afterBonus = day && a.apptDate && a.apptDate >= day ? 10 : 0;
      const score = rank + afterBonus;
      if (!best || score > best.rank) best = { status: a.status, apptDate: a.apptDate, rank: score };
    }
    const outcome: LeadOutcome = best ? outcomeOf(best.status).outcome : 'notfound';

    rows.push({
      key: `${idx++}-${p9 || name}`,
      submittedIso,
      submittedMs,
      name: name || null,
      phone: phone || null,
      email: email || null,
      treatment: pick(d, 'Treatment', 'Type of Treatment', 'Condition') || null,
      clinic: pick(d, 'Clinic Name') || null,
      doctor: pick(d, 'Doctor Name') || null,
      requestedDate: pick(d, 'Date') || null,
      details: details || null,
      lane: laneOf(pick(d, 'Source')),
      outcome,
      practoStatus: best ? best.status || null : null,
    });
  }

  rows.sort((a, b) => (b.submittedMs ?? 0) - (a.submittedMs ?? 0));
  const now = Date.now();
  const today = rows.filter((r) => r.submittedMs && now - r.submittedMs < 86400_000).length;
  const last7d = rows.filter((r) => r.submittedMs && now - r.submittedMs < 7 * 86400_000).length;
  const notInPracto = rows.filter((r) => r.outcome === 'notfound').length;
  return {
    source: rows.length > 0 ? 'live' : 'empty',
    total: rows.length,
    today,
    last7d,
    reachedPracto: rows.length - notInPracto,
    notInPracto,
    rows,
  };
}
