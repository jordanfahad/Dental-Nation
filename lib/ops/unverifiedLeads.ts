import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { GA4_LANES } from '@/config/ga4';
import { getLeadVerdictsByPhone, type SheetVerdict } from '@/lib/arabyads/leadStatus';

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
 *
 * Reception then works that list, and what they DID is recorded in
 * lane_e.lead_call_log (migration 0012) — the bronze lead table is
 * truncate-and-reloaded, so the outcome cannot live on the lead row itself.
 * A terminal outcome (booked / not interested / wrong number) takes a lead off
 * the worklist; no-answer and call-back keep it on with an attempt count, so the
 * same person stops reappearing as an untouched "Needs a call" forever.
 *
 * Never throws: a missing table (migration not yet run) returns an empty report.
 */

export type LeadState = 'converted' | 'inpracto' | 'open';

/** What reception did about a lead. See migration 0012. */
export type CallOutcome = 'booked' | 'callback' | 'noanswer' | 'notinterested' | 'wrongnumber';

/**
 * Outcomes that close a lead out of the worklist. `noanswer` and `callback`
 * deliberately stay open — they still need working; we just show the attempts.
 */
export const TERMINAL_OUTCOMES: readonly CallOutcome[] = ['booked', 'notinterested', 'wrongnumber'];
const isTerminal = (o: CallOutcome | null | undefined): boolean =>
  !!o && (TERMINAL_OUTCOMES as readonly string[]).includes(o);

export interface LeadCall {
  outcome: CallOutcome;
  note: string | null;
  by: string | null;
  atIso: string | null;
  /** Times this lead has been logged, including the latest. */
  attempts: number;
}

export interface UnverifiedLead {
  key: string;
  /** Stable across syncs — the key the call log is written against. */
  ref: string;
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
  /** The team's hand-set verdict from the feedback sheet: 'Invalid', 'Pending'… */
  reviewStatus: string | null;
  /** Why they marked it that way, e.g. "Wrong Contact". */
  reviewReason: string | null;
  /** Latest logged call, or null if never worked. */
  call: LeadCall | null;
  /** Still on the worklist: no booking anywhere and no terminal disposition. */
  needsCall: boolean;
}

export interface UnverifiedLeadsReport {
  /** 'live' = rows present · 'empty' = none in window · 'missing' = table not created yet */
  source: 'live' | 'empty' | 'missing';
  total: number;
  today: number;
  last7d: number;
  converted: number;
  open: number;
  /** Leads with at least one logged call attempt. */
  worked: number;
  /** Rows dropped because the team marked them "Test Lead" in the feedback sheet. */
  testExcluded: number;
  /** False when migration 0012 hasn't run — the UI hides the logging controls. */
  callLogReady: boolean;
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

/**
 * Stable identity for a lead across syncs. raw_dn_leads is truncate-and-reload,
 * so row order and ids churn — the widget's own "Lead ID" is the real key. When
 * a row predates that column, fall back to phone+timestamp, which is stable for
 * a given sheet row even though it is not guaranteed unique.
 */
export function leadRefOf(leadId: string, phone9digits: string, submittedIso: string | null): string {
  return leadId || `${phone9digits}|${submittedIso ?? ''}`;
}

const empty = (
  source: UnverifiedLeadsReport['source'],
  callLogReady = true,
): UnverifiedLeadsReport => ({
  source,
  total: 0,
  today: 0,
  last7d: 0,
  converted: 0,
  open: 0,
  worked: 0,
  testExcluded: 0,
  callLogReady,
  rows: [],
});

/**
 * Record a call attempt against a lead. Append-only — the history is the point.
 * Returns a plain result object; never throws at the caller.
 */
export async function recordLeadCall(input: {
  leadRef: string;
  outcome: CallOutcome;
  note?: string | null;
  by?: string | null;
  uid?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const db = getSupabaseAdmin();
  if (!db) return { ok: false, error: 'Supabase not configured.' };
  const leadRef = input.leadRef.trim();
  if (!leadRef) return { ok: false, error: 'Missing lead reference.' };
  const note = (input.note ?? '').trim();
  try {
    const { error } = await db.from('lead_call_log').insert({
      lead_ref: leadRef,
      outcome: input.outcome,
      note: note || null,
      logged_by: input.by ?? null,
      logged_uid: input.uid ?? null,
    });
    if (error) {
      // Most likely cause by far: migration 0012 hasn't been run yet.
      return { ok: false, error: `Could not save: ${error.message}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'save failed' };
  }
}

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

  // Logged call outcomes, newest first. A missing table (migration 0012 not run)
  // is not an error here: the worklist still works, it just can't be dispositioned.
  const latestCall = new Map<string, LeadCall>();
  let callLogReady = true;
  {
    // id desc is the tiebreaker, not decoration: created_at defaults to now(),
    // which is TRANSACTION time, so two calls logged in one transaction share a
    // timestamp and would otherwise come back in arbitrary order — picking the
    // wrong "latest" outcome. id is monotonic, so it always breaks the tie right.
    const log = await db
      .from('lead_call_log')
      .select('lead_ref, outcome, note, logged_by, created_at, id')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });
    if (log.error) {
      callLogReady = false;
    } else {
      type LogRow = {
        lead_ref: string;
        outcome: string;
        note: string | null;
        logged_by: string | null;
        created_at: string;
        id: number;
      };
      for (const c of (log.data as LogRow[] | null) ?? []) {
        const prev = latestCall.get(c.lead_ref);
        if (prev) {
          prev.attempts += 1; // ordered desc, so the first one seen is the latest
          continue;
        }
        latestCall.set(c.lead_ref, {
          outcome: c.outcome as CallOutcome,
          note: c.note,
          by: c.logged_by,
          atIso: c.created_at,
          attempts: 1,
        });
      }
    }
  }

  // The team hand-marks every enquiry in the ArabyAds feedback sheet ("Test
  // Lead", "Invalid / Wrong Contact", …). That verdict is the authority on
  // whether a person is real — the local isTest() rule below can only catch the
  // owner by EMAIL, and a widget lead often has none. Best-effort: if the sheet
  // can't be read we show everything rather than hide a real patient.
  const verdicts: Map<string, SheetVerdict> = await getLeadVerdictsByPhone().catch(
    () => new Map<string, SheetVerdict>(),
  );

  const rows: UnverifiedLead[] = [];
  let testExcluded = 0;
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

    // Marked "Test Lead" by the team → never a person for reception to call.
    const verdict = p9 ? verdicts.get(p9) : undefined;
    if (verdict?.test) {
      testExcluded += 1;
      continue;
    }

    const state: LeadState = p9 && verified.has(p9) ? 'converted' : p9 && inPracto.has(p9) ? 'inpracto' : 'open';

    const leadId = pick(d, 'Lead ID');
    const ref = leadRefOf(leadId, p9, submittedIso);
    const call = latestCall.get(ref) ?? null;

    rows.push({
      key: `${idx++}-${p9 || name}`,
      ref,
      leadId: leadId || null,
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
      reviewStatus: verdict && verdict.status !== 'Pending' ? verdict.status : null,
      reviewReason: verdict?.reason || null,
      call,
      needsCall: state === 'open' && !isTerminal(call?.outcome),
    });
  }

  if (rows.length === 0) return { ...empty('empty', callLogReady), testExcluded };
  rows.sort((a, b) => (b.submittedMs ?? 0) - (a.submittedMs ?? 0));
  const now = Date.now();
  return {
    source: 'live',
    total: rows.length,
    today: rows.filter((r) => r.submittedMs && now - r.submittedMs < 86400_000).length,
    last7d: rows.filter((r) => r.submittedMs && now - r.submittedMs < 7 * 86400_000).length,
    converted: rows.filter((r) => r.state === 'converted').length,
    open: rows.filter((r) => r.needsCall).length,
    worked: rows.filter((r) => r.call).length,
    testExcluded,
    callLogReady,
    rows,
  };
}
