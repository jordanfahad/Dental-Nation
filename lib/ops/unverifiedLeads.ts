import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { GA4_LANES } from '@/config/ga4';

/**
 * Unverified website enquiries — the booking sheet's "Leads" tab.
 *
 * The widget writes a row here as soon as it has contact + treatment details and
 * an OTP is requested. Only enquiries that complete WhatsApp/OTP verification
 * move to the Bookings tab (raw_zavis). So this is the drop-off population:
 * real people who started booking and stopped, invisible to reception until now.
 *
 * For each one we answer the question the call centre actually has — did they
 * come back? Matching by phone (last 9 digits):
 *   converted  — the same phone later shows up as a VERIFIED booking
 *   in-practo  — the phone is in the Practo appointment book (booked by any route)
 *   open       — neither; still needs a call
 * Never throws: a missing table (migration not yet run) returns an empty report.
 */

export type LeadState = 'converted' | 'inpracto' | 'open';

export interface UnverifiedLead {
  key: string;
  leadId: string | null;
  submittedIso: string | null;
  submittedMs: number | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  service: string | null;
  treatment: string | null;
  doctor: string | null;
  clinic: string | null;
  requestedDate: string | null;
  status: string | null; // the widget's own status, e.g. "OTP Requested"
  lane: string | null;
  state: LeadState;
}

export interface UnverifiedLeadsReport {
  /** 'live' = rows present · 'empty' = none in window · 'missing' = table not created yet */
  source: 'live' | 'empty' | 'missing';
  total: number;
  today: number;
  last7d: number;
  converted: number;
  open: number;
  rows: UnverifiedLead[];
}

const phone9 = (v: string | null | undefined): string => {
  const d = String(v ?? '').replace(/\D/g, '');
  return d.length >= 9 ? d.slice(-9) : '';
};
const pick = (data: Record<string, unknown>, ...keys: string[]): string => {
  for (const k of keys) {
    const v = String(data[k] ?? '').trim();
    if (v) return v;
  }
  return '';
};
/** Same test/seed rule as the verified + ArabyAds feeds (incl. the owner's own address). */
function isTest(name: string, email: string): boolean {
  const e = email.trim().toLowerCase();
  if (e === 'jordan.fahad@gmail.com') return true;
  return /zavis|test/i.test(e) || /^(test|sagar|user)$/i.test(name.trim()) || /test/i.test(name);
}
function laneOf(source: string): string | null {
  const s = source.toLowerCase();
  for (const l of GA4_LANES) if (l.widgetSource && s.includes(`dental_nation_${l.widgetSource}`)) return l.label.replace(/^Lane [A-Z] · /, '');
  return source ? 'Website widget' : null;
}

const empty = (source: UnverifiedLeadsReport['source']): UnverifiedLeadsReport => ({
  source,
  total: 0,
  today: 0,
  last7d: 0,
  converted: 0,
  open: 0,
  rows: [],
});

export async function getUnverifiedLeads(range: { from?: string; to?: string } = {}): Promise<UnverifiedLeadsReport> {
  const db = getSupabaseAdmin();
  if (!db) return empty('missing');
  const { from, to } = range;

  const leadRows = await db.from('raw_dn_leads').select('data');
  // Table absent (migration not run yet) → say so rather than showing a fake zero.
  if (leadRows.error) return empty('missing');
  const rawLeads = (leadRows.data as { data: Record<string, unknown> }[] | null) ?? [];
  if (rawLeads.length === 0) return empty('empty');

  // Phones that later became a verified booking, and phones known to Practo.
  const verified = new Set<string>();
  const inPracto = new Set<string>();
  try {
    const [book, appts] = await Promise.all([
      db.from('raw_zavis').select('data'),
      db.from('practo_appointments_raw').select('patient_phone'),
    ]);
    for (const r of (book.data as { data: Record<string, unknown> }[] | null) ?? []) {
      const p = phone9(pick(r.data ?? {}, 'Phone Number', 'Phone', 'Contact Number'));
      if (p) verified.add(p);
    }
    for (const a of (appts.data as { patient_phone: string | null }[] | null) ?? []) {
      const p = phone9(a.patient_phone);
      if (p) inPracto.add(p);
    }
  } catch {
    // Cross-checks are best-effort — without them every lead simply reads "open".
  }

  const rows: UnverifiedLead[] = [];
  let idx = 0;
  for (const r of rawLeads) {
    const d = r.data ?? {};
    const name = pick(d, 'Full Name', 'Name');
    const phone = pick(d, 'Phone', 'Phone Number', 'Contact Number');
    if (!name && !phone) continue;
    const email = pick(d, 'Email');
    if (isTest(name, email)) continue;

    const rawTs = pick(d, 'Timestamp');
    const ms = rawTs ? Date.parse(rawTs) : NaN;
    const submittedMs = Number.isNaN(ms) ? null : ms;
    const submittedIso = submittedMs == null ? null : new Date(submittedMs).toISOString();
    const day = submittedIso ? submittedIso.slice(0, 10) : null;
    if (from && day && day < from) continue;
    if (to && day && day > to) continue;

    const p9 = phone9(phone);
    const state: LeadState = p9 && verified.has(p9) ? 'converted' : p9 && inPracto.has(p9) ? 'inpracto' : 'open';

    rows.push({
      key: `${idx++}-${p9 || name}`,
      leadId: pick(d, 'Lead ID') || null,
      submittedIso,
      submittedMs,
      name: name || null,
      phone: phone || null,
      email: email && email.toUpperCase() !== 'NA' ? email : null,
      service: pick(d, 'Service') || null,
      treatment: pick(d, 'Treatment') || null,
      doctor: pick(d, 'Doctor') || null,
      clinic: pick(d, 'Clinic') || null,
      requestedDate: pick(d, 'Date') || null,
      status: pick(d, 'Status') || null,
      lane: laneOf(pick(d, 'Source')),
      state,
    });
  }

  if (rows.length === 0) return empty('empty');
  rows.sort((a, b) => (b.submittedMs ?? 0) - (a.submittedMs ?? 0));
  const now = Date.now();
  return {
    source: 'live',
    total: rows.length,
    today: rows.filter((r) => r.submittedMs && now - r.submittedMs < 86400_000).length,
    last7d: rows.filter((r) => r.submittedMs && now - r.submittedMs < 7 * 86400_000).length,
    converted: rows.filter((r) => r.state === 'converted').length,
    open: rows.filter((r) => r.state === 'open').length,
    rows,
  };
}
