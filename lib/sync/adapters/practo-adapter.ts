import 'server-only';
import { createHash } from 'crypto';
import type { AdminClient } from '@/lib/supabase/server';
import {
  getPractoConfig,
  PRACTO_RELOGIN_CODE,
  PRACTO_TOKEN_TTL_DAYS,
  type PractoConfig,
} from '@/config/practo';

/**
 * Practo Insta (HMS) live API adapter.
 *
 * Flow (per the vendor docs):
 *   1. POST Customer/Login.do  with `x-insta-auth: user:password`  → request_handler_key
 *   2. POST Customer/Bills.do  with `request_handler_key: <token>` → bills (7-day window, paginated)
 *
 * The token (~21 days) is cached in lane_e.practo_token; we only re-login on
 * expiry or a `1001 / login again` response. Bills are capped at a 7-day window
 * and paginated (page=1,2,…) — both handled here. The exact bill field shape is
 * vendor-specific, so bills land in the bronze table lane_e.practo_bills_raw with
 * the full object preserved + best-effort id/date/amount; normalization is
 * refined once the real shape is confirmed via the probe endpoint.
 */

const PROBE_NOTE =
  'Practo bills stored raw (bronze). Confirm the response shape via /api/practo/probe, then map id/date/amount precisely.';

interface PractoResult<T> {
  ok: boolean;
  data?: T;
  code?: string;
  message?: string;
}

function loginUrl(cfg: PractoConfig): string {
  return `${cfg.baseUrl}/${cfg.hospital}/Customer/Login.do?_method=login&hospital_name=${encodeURIComponent(cfg.hospital)}`;
}
function billsUrl(cfg: PractoConfig, from: string, to: string, page: number): string {
  return `${cfg.baseUrl}/${cfg.hospital}/Customer/Bills.do?_method=getBills&from_date=${from}&to_date=${to}&filter_by_finalized_date=Y&page=${page}`;
}

/** Pull the request_handler_key out of whatever envelope Practo returns. */
function extractToken(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const obj = body as Record<string, unknown>;
  const direct = obj.request_handler_key ?? obj.requestHandlerKey;
  if (typeof direct === 'string' && direct) return direct;
  // sometimes nested under data / response
  for (const k of ['data', 'response', 'result']) {
    const nested = obj[k];
    if (nested && typeof nested === 'object') {
      const t = (nested as Record<string, unknown>).request_handler_key;
      if (typeof t === 'string' && t) return t;
    }
  }
  return null;
}

/** Detect Practo's "login again" / invalid-token signal. Practo wraps responses
 *  in `return_code` / `return_message` (e.g. an expired/cancelled handler key),
 *  so we must read those too — not just code/message — or a stale token silently
 *  yields zero bills. A success envelope won't contain these auth phrases, so
 *  genuinely-empty windows are NOT mistaken for an auth error. */
function isReloginCode(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const obj = body as Record<string, unknown>;
  const code = String(obj.code ?? obj.status ?? obj.error_code ?? obj.return_code ?? '');
  const msg = String(obj.message ?? obj.error ?? obj.return_message ?? '').toLowerCase();
  if (code === PRACTO_RELOGIN_CODE) return true;
  return ['login again', 'login', 'invalid', 'expired', 'unauthor', 'session', 'handler key', 'token'].some(
    (k) => msg.includes(k),
  );
}

async function postJson(url: string, headers: Record<string, string>): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    // No body needed; params are in the query string per the vendor docs.
    cache: 'no-store',
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { _nonJson: true, status: res.status, body: text.slice(0, 2000) };
  }
}

/** Log in and cache the fresh token. Returns the token or throws. */
export async function practoLogin(supabase: AdminClient): Promise<string> {
  const cfg = getPractoConfig();
  if (!cfg) throw new Error('Practo not configured (PRACTO_BASE_URL/HOSPITAL/AUTH)');
  const body = await postJson(loginUrl(cfg), { 'x-insta-auth': cfg.auth });
  const token = extractToken(body);
  if (!token) {
    throw new Error(`Practo login returned no request_handler_key: ${JSON.stringify(body).slice(0, 300)}`);
  }
  const now = new Date();
  const expires = new Date(now.getTime() + PRACTO_TOKEN_TTL_DAYS * 86400_000);
  await supabase.from('practo_token').upsert(
    { id: 1, token, obtained_at: now.toISOString(), expires_at: expires.toISOString() },
    { onConflict: 'id' },
  );
  return token;
}

/** Return a valid cached token, logging in if missing/expired or when forced. */
export async function getPractoToken(supabase: AdminClient, force = false): Promise<string> {
  if (!force) {
    const { data } = await supabase
      .from('practo_token')
      .select('token, expires_at')
      .eq('id', 1)
      .maybeSingle();
    const row = data as { token?: string; expires_at?: string } | null;
    if (row?.token && row.expires_at && new Date(row.expires_at).getTime() > Date.now()) {
      return row.token;
    }
  }
  return practoLogin(supabase);
}

/** Split [from,to] (YYYY-MM-DD inclusive) into ≤7-day chunks (vendor cap). */
function sevenDayChunks(from: string, to: string): { from: string; to: string }[] {
  const out: { from: string; to: string }[] = [];
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  let start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  let guard = 0;
  while (start <= end && guard < 200) {
    const chunkEnd = new Date(Math.min(start.getTime() + 6 * 86400_000, end.getTime()));
    out.push({ from: iso(start), to: iso(chunkEnd) });
    start = new Date(chunkEnd.getTime() + 86400_000);
    guard++;
  }
  return out;
}

/** Pull the array of bills out of whatever envelope Practo returns. */
function extractBills(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) return body as Record<string, unknown>[];
  if (!body || typeof body !== 'object') return [];
  const obj = body as Record<string, unknown>;
  for (const k of ['bills', 'data', 'response', 'result', 'records']) {
    const v = obj[k];
    if (Array.isArray(v)) return v as Record<string, unknown>[];
    if (v && typeof v === 'object') {
      const inner = (v as Record<string, unknown>).bills ?? (v as Record<string, unknown>).records;
      if (Array.isArray(inner)) return inner as Record<string, unknown>[];
    }
  }
  return [];
}

/** Fetch one 7-day window, paginating until a page returns nothing. Re-logs in
 *  once on a 1001 / "login again". Returns the raw bill objects. */
async function fetchBillsWindow(
  supabase: AdminClient,
  cfg: PractoConfig,
  tokenRef: { token: string },
  from: string,
  to: string,
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  for (let page = 1, guard = 0; guard < 100; page++, guard++) {
    let body = await postJson(billsUrl(cfg, from, to, page), { request_handler_key: tokenRef.token });
    if (isReloginCode(body)) {
      tokenRef.token = await practoLogin(supabase);
      body = await postJson(billsUrl(cfg, from, to, page), { request_handler_key: tokenRef.token });
    }
    const bills = extractBills(body);
    if (bills.length === 0) break;
    all.push(...bills);
  }
  return all;
}

// Best-effort field extraction from a vendor-shaped bill (refined post-probe).
function pick(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim() !== '') return String(v);
  }
  return null;
}
function billKey(b: Record<string, unknown>): string {
  // Real Practo bills carry a stable `bill_no` (e.g. "DNWBL000112"). Using it as
  // the upsert key means re-syncing a bill whose payload changed (a payment was
  // added, it got finalized) UPDATES the row instead of inserting a duplicate —
  // so revenue never double-counts. Fall back to visit_id, then a payload hash.
  const id = pick(b, ['bill_no', 'billNo', 'bill_id', 'billId', 'bill_number', 'invoice_id', 'visit_id', 'id']);
  if (id) return id;
  return createHash('sha1').update(JSON.stringify(b)).digest('hex').slice(0, 24);
}
function billDate(b: Record<string, unknown>): string | null {
  // Practo: `finalized_date` is the finalized bill date (we request finalized).
  const raw = pick(b, ['finalized_date', 'last_finalized_at', 'bill_date', 'billDate', 'open_date', 'date']);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}
function billAmount(b: Record<string, unknown>): number | null {
  // Practo: `net_amount` / `bill_amount` is the bill total (AED).
  const raw = pick(b, ['net_amount', 'bill_amount', 'grand_total', 'total_amount', 'total', 'amount', 'paid_amount']);
  if (raw == null) return null;
  const n = Number(String(raw).replace(/[^0-9.-]/g, ''));
  return Number.isNaN(n) ? null : n;
}

export interface PractoSyncResult {
  ok: boolean;
  fetched: number;
  stored: number;
  windows: number;
  note: string;
  error?: string;
}

export interface PractoSyncOpts {
  /** Trailing window length (days) when from/to are not given. Default 14. */
  days?: number;
  /** Explicit start date (YYYY-MM-DD) for a historical backfill. */
  from?: string;
  /** Explicit end date (YYYY-MM-DD). Defaults to today. */
  to?: string;
}

/** Sync Practo bills into the bronze table. By default the trailing `days`
 *  window (cheap, keeps recent bills fresh); pass {from,to} to backfill history.
 *  Bills upsert by bill_no, so a wide backfill + ongoing trailing sync coexist. */
export async function syncPracto(supabase: AdminClient, opts: PractoSyncOpts = {}): Promise<PractoSyncResult> {
  const cfg = getPractoConfig();
  if (!cfg) return { ok: false, fetched: 0, stored: 0, windows: 0, note: 'Practo not configured', error: 'not_configured' };
  try {
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const days = opts.days ?? 14;
    const to = opts.to ?? iso(new Date());
    const from = opts.from ?? iso(new Date(new Date(to).getTime() - (days - 1) * 86400_000));
    const windows = sevenDayChunks(from, to);
    const tokenRef = { token: await getPractoToken(supabase) };

    const raw: Record<string, unknown>[] = [];
    for (const w of windows) {
      raw.push(...(await fetchBillsWindow(supabase, cfg, tokenRef, w.from, w.to)));
    }

    const rows = raw.map((b) => ({
      bill_key: billKey(b),
      bill_date: billDate(b),
      amount: billAmount(b),
      data: b,
      fetched_at: new Date().toISOString(),
    }));
    // De-dupe by bill_key within this batch (paginated windows can overlap).
    const byKey = new Map(rows.map((r) => [r.bill_key, r]));
    const deduped = [...byKey.values()];
    for (let i = 0; i < deduped.length; i += 500) {
      await supabase.from('practo_bills_raw').upsert(deduped.slice(i, i + 500), { onConflict: 'bill_key' });
    }
    return { ok: true, fetched: raw.length, stored: deduped.length, windows: windows.length, note: PROBE_NOTE };
  } catch (err) {
    return { ok: false, fetched: 0, stored: 0, windows: 0, note: PROBE_NOTE, error: (err as Error).message };
  }
}

// ===========================================================================
// Endpoint DISCOVERY (Option A): does Practo Insta expose an appointments /
// patient endpoint that returns patient NAMES? Bills.do doesn't (mr_no only), so
// name-based Practo↔Zavis reconciliation needs a different endpoint. We can't
// guess blindly-safe write methods, so this only tries read/get-style methods,
// with our live token, and reports which respond + whether a name/phone field
// appears. Read-only; nothing is stored. Trigger: /api/practo/probe?...&discover=1
// ===========================================================================

export interface DiscoverAttempt {
  label: string;
  url: string;
  httpNote: string; // 'json' | 'non-json (status …)'
  relogin: boolean;
  envelopeKeys: string[];
  recordCount: number | null;
  firstRecordKeys: string[];
  hasNameOrPhone: boolean;
  sample: unknown; // trimmed
}

const NAME_PHONE_RE = /(patient[_ ]?name|full[_ ]?name|first[_ ]?name|last[_ ]?name|\bname\b|mobile|phone|contact)/i;

function analyzeBody(body: unknown): Omit<DiscoverAttempt, 'label' | 'url'> {
  const relogin = isReloginCode(body);
  const isObj = body && typeof body === 'object';
  const nonJson = isObj && (body as Record<string, unknown>)._nonJson === true;
  const envelopeKeys = isObj && !nonJson ? Object.keys(body as object) : [];
  // Find the first array of records anywhere shallow in the envelope.
  let records: unknown[] | null = Array.isArray(body) ? (body as unknown[]) : null;
  if (!records && isObj) {
    for (const k of ['appointments', 'patients', 'data', 'records', 'response', 'result', 'visits', 'bills', 'list']) {
      const v = (body as Record<string, unknown>)[k];
      if (Array.isArray(v)) { records = v as unknown[]; break; }
      if (v && typeof v === 'object') {
        for (const kk of ['appointments', 'patients', 'records', 'list']) {
          const inner = (v as Record<string, unknown>)[kk];
          if (Array.isArray(inner)) { records = inner as unknown[]; break; }
        }
      }
      if (records) break;
    }
  }
  const first = records && records[0] && typeof records[0] === 'object' ? (records[0] as Record<string, unknown>) : null;
  const firstRecordKeys = first ? Object.keys(first) : [];
  const flat = JSON.stringify(body).slice(0, 4000);
  return {
    httpNote: nonJson ? `non-json (status ${(body as Record<string, unknown>).status})` : 'json',
    relogin,
    envelopeKeys,
    recordCount: records ? records.length : null,
    firstRecordKeys,
    hasNameOrPhone: NAME_PHONE_RE.test(flat),
    sample: nonJson ? (body as Record<string, unknown>).body : first ?? body,
  };
}

export async function practoDiscover(supabase: AdminClient): Promise<PractoResult<{ sampleMrNo: string | null; attempts: DiscoverAttempt[] }>> {
  const cfg = getPractoConfig();
  if (!cfg) return { ok: false, message: 'Practo not configured' };
  try {
    const tokenRef = { token: await getPractoToken(supabase) };
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const now = new Date();
    const from = iso(new Date(now.getTime() - 7 * 86400_000));
    const to = iso(new Date(now.getTime() + 60 * 86400_000)); // include future bookings
    // A real mr_no + visit_id from our bills, to test patient/visit lookups.
    const { data: billRow } = await supabase.from('practo_bills_raw').select('data').limit(1).maybeSingle();
    const bd = (billRow as { data?: Record<string, unknown> } | null)?.data ?? {};
    const mr = bd.mr_no != null ? String(bd.mr_no) : '';
    const visit = bd.visit_id != null ? String(bd.visit_id) : '';

    const base = `${cfg.baseUrl}/${cfg.hospital}/Customer`;
    const q = (mr ? `&mr_no=${encodeURIComponent(mr)}&patient_mr_no=${encodeURIComponent(mr)}` : '');
    const dateQ = `from_date=${from}&to_date=${to}`;
    const candidates: { label: string; url: string }[] = [
      { label: 'Appointments.getAppointments', url: `${base}/Appointments.do?_method=getAppointments&${dateQ}` },
      { label: 'Appointment.getAppointmentList', url: `${base}/Appointment.do?_method=getAppointmentList&${dateQ}` },
      { label: 'Appointments.getAppointmentList', url: `${base}/Appointments.do?_method=getAppointmentList&${dateQ}` },
      { label: 'Visits.getVisits', url: `${base}/Visits.do?_method=getVisits&${dateQ}` },
      { label: 'Patient.getPatientDetails', url: `${base}/Patient.do?_method=getPatientDetails?${q.slice(1)}` },
      { label: 'PatientDetails.getPatientDetails', url: `${base}/PatientDetails.do?_method=getPatientDetails${q}` },
      { label: 'Patients.getPatients', url: `${base}/Patients.do?_method=getPatients&${dateQ}` },
      { label: 'Patient.getPatientBasicDetails', url: `${base}/Patient.do?_method=getPatientBasicDetails${q}` },
      { label: 'Registration.getPatientDetails', url: `${base}/Registration.do?_method=getPatientDetails${q}` },
      { label: 'Visit.getVisitDetails', url: `${base}/Visit.do?_method=getVisitDetails${visit ? `&visit_id=${encodeURIComponent(visit)}` : ''}` },
    ];

    const attempts: DiscoverAttempt[] = [];
    for (const c of candidates) {
      let body = await postJson(c.url, { request_handler_key: tokenRef.token });
      if (isReloginCode(body)) {
        tokenRef.token = await practoLogin(supabase);
        body = await postJson(c.url, { request_handler_key: tokenRef.token });
      }
      attempts.push({ label: c.label, url: c.url, ...analyzeBody(body) });
    }
    return { ok: true, data: { sampleMrNo: mr || null, attempts } };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

/** Shape-discovery probe: log in + fetch one recent 7-day page, return RAW.
 *  Used by /api/practo/probe so we can map fields precisely. */
export async function practoProbe(supabase: AdminClient): Promise<PractoResult<unknown>> {
  const cfg = getPractoConfig();
  if (!cfg) return { ok: false, message: 'Practo not configured' };
  try {
    const tokenRef = { token: await getPractoToken(supabase) };
    const to = new Date();
    const from = new Date(to.getTime() - 6 * 86400_000);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    let body = await postJson(billsUrl(cfg, iso(from), iso(to), 1), { request_handler_key: tokenRef.token });
    if (isReloginCode(body)) {
      tokenRef.token = await practoLogin(supabase);
      body = await postJson(billsUrl(cfg, iso(from), iso(to), 1), { request_handler_key: tokenRef.token });
    }
    const bills = extractBills(body);
    return { ok: true, data: { sampleCount: bills.length, firstBill: bills[0] ?? null, envelopeKeys: body && typeof body === 'object' ? Object.keys(body as object) : [] } };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

// ===========================================================================
// APPOINTMENTS — Practo Insta doctorscheduler.do getPatientAppointments.
// Confirmed by the Practo dev team (2026-07-19): same login → request_handler_key
// auth as bills, GET with search_by_patient=N so ALL appointments come back (no
// per-patient MR needed). Returns appointments[] (status, time, doctor,
// department, mr_no, cancel_reason…). Stored raw (bronze) in
// lane_e.practo_appointments_raw with best-effort normalized columns; the exact
// field names are confirmed via the appointments probe, then refined.
// ===========================================================================

/** GET JSON with the Practo handler-key header (appointments API uses GET). */
async function getJsonReq(url: string, headers: Record<string, string>): Promise<unknown> {
  const res = await fetch(url, { method: 'GET', headers, cache: 'no-store' });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { _nonJson: true, status: res.status, body: text.slice(0, 2000) };
  }
}

function apptUrl(cfg: PractoConfig, from: string, to: string): string {
  return (
    `${cfg.baseUrl}/${cfg.hospital}/Customer/doctorscheduler.do?_method=getPatientAppointments` +
    `&from_date=${from}&to_date=${to}&search_by_patient=N&filter_by_appointment_date=Y`
  );
}

/** Split [from,to] into ≤`size`-day windows (getPatientAppointments has no stated
 *  cap; 30-day windows keep each call small and match the sibling endpoints). */
function dayChunks(from: string, to: string, size: number): { from: string; to: string }[] {
  const out: { from: string; to: string }[] = [];
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  let start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  let guard = 0;
  while (start <= end && guard < 400) {
    const chunkEnd = new Date(Math.min(start.getTime() + (size - 1) * 86400_000, end.getTime()));
    out.push({ from: iso(start), to: iso(chunkEnd) });
    start = new Date(chunkEnd.getTime() + 86400_000);
    guard++;
  }
  return out;
}

/** Pull the appointments array out of whatever envelope Insta returns. */
function extractAppointments(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) return body as Record<string, unknown>[];
  if (!body || typeof body !== 'object') return [];
  const obj = body as Record<string, unknown>;
  for (const k of ['appointments', 'APPOINTMENTS', 'patient_appointments', 'data', 'response', 'result', 'records', 'list']) {
    const v = obj[k];
    if (Array.isArray(v)) return v as Record<string, unknown>[];
    if (v && typeof v === 'object') {
      for (const kk of ['appointments', 'APPOINTMENTS', 'records', 'list']) {
        const inner = (v as Record<string, unknown>)[kk];
        if (Array.isArray(inner)) return inner as Record<string, unknown>[];
      }
    }
  }
  return [];
}

// Confirmed live shape: `appointment_time` is a full ISO datetime (there is no
// separate date field), so it leads the datetime keys.
const APPT_DATE_KEYS = ['appointment_date', 'appt_date', 'date', 'scheduled_date', 'slot_date'];
const APPT_TIME_KEYS = ['appt_time', 'scheduled_time', 'start_time', 'slot_time', 'time'];
const APPT_DATETIME_KEYS = ['appointment_time', 'appointment_datetime', 'appt_datetime', 'scheduled_datetime', 'start_datetime', 'appointment_date_time'];

function apptDate(a: Record<string, unknown>): string | null {
  const raw = pick(a, APPT_DATE_KEYS);
  if (raw) {
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const ts = apptTimestamp(a);
  return ts ? ts.slice(0, 10) : null;
}
function apptTimestamp(a: Record<string, unknown>): string | null {
  const dt = pick(a, APPT_DATETIME_KEYS);
  if (dt) {
    const d = new Date(dt);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  const date = pick(a, APPT_DATE_KEYS);
  const time = pick(a, APPT_TIME_KEYS);
  if (date) {
    const d = new Date(time ? `${date} ${time}` : date);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}
function apptKey(a: Record<string, unknown>): string {
  const id = pick(a, ['appointment_id', 'appointmentId', 'appt_id', 'patient_appointment_id', 'appointment_no', 'id']);
  if (id) return id;
  return createHash('sha1').update(JSON.stringify(a)).digest('hex').slice(0, 24);
}

export interface PractoApptSyncResult {
  ok: boolean;
  fetched: number;
  stored: number;
  windows: number;
  error?: string;
}

/** Fetch one appointment window, re-logging in once on a 1001 / "login again". */
async function fetchApptWindow(
  supabase: AdminClient,
  cfg: PractoConfig,
  tokenRef: { token: string },
  from: string,
  to: string,
): Promise<Record<string, unknown>[]> {
  let body = await getJsonReq(apptUrl(cfg, from, to), { request_handler_key: tokenRef.token });
  if (isReloginCode(body)) {
    tokenRef.token = await practoLogin(supabase);
    body = await getJsonReq(apptUrl(cfg, from, to), { request_handler_key: tokenRef.token });
  }
  return extractAppointments(body);
}

/** Sync Practo Insta appointments into the bronze table. Trailing `days` window
 *  by default (keeps recent bookings fresh); pass {from,to} to backfill. Rows
 *  upsert by appointment id, so a backfill + ongoing trailing sync coexist. */
export async function syncPractoAppointments(
  supabase: AdminClient,
  opts: PractoSyncOpts = {},
): Promise<PractoApptSyncResult> {
  const cfg = getPractoConfig();
  if (!cfg) return { ok: false, fetched: 0, stored: 0, windows: 0, error: 'not_configured' };
  try {
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const days = opts.days ?? 30;
    const to = opts.to ?? iso(new Date());
    const from = opts.from ?? iso(new Date(new Date(to).getTime() - (days - 1) * 86400_000));
    const windows = dayChunks(from, to, 30);
    const tokenRef = { token: await getPractoToken(supabase) };

    const raw: Record<string, unknown>[] = [];
    for (const w of windows) raw.push(...(await fetchApptWindow(supabase, cfg, tokenRef, w.from, w.to)));

    const rows = raw.map((a) => ({
      appt_key: apptKey(a),
      appt_date: apptDate(a),
      appt_time: apptTimestamp(a),
      status: pick(a, ['appointment_status', 'status', 'appt_status', 'current_status']),
      mr_no: pick(a, ['mr_no', 'mrno', 'mr_number', 'patient_mr_no']),
      doctor: pick(a, ['doctor_name', 'doctor', 'provider_name', 'conducting_doctor', 'resource_name']),
      department: pick(a, ['department_name', 'department', 'speciality', 'specialty', 'dept']),
      cancel_reason: pick(a, ['cancel_reason', 'cancellation_reason', 'cancelled_reason', 'reason']),
      patient_name: pick(a, ['patient_name', 'name']),
      patient_phone: pick(a, ['patient_contact', 'patient_phone', 'contact', 'mobile', 'phone']),
      duration_minutes: (() => {
        const d = Number(pick(a, ['duration', 'duration_minutes', 'slot_duration']) ?? '');
        return Number.isFinite(d) && d > 0 ? Math.round(d) : null;
      })(),
      center_name: pick(a, ['center_name', 'centre_name', 'branch_name', 'clinic_name']),
      data: a,
      fetched_at: new Date().toISOString(),
    }));
    const byKey = new Map(rows.map((r) => [r.appt_key, r]));
    const deduped = [...byKey.values()];
    for (let i = 0; i < deduped.length; i += 500) {
      await supabase.from('practo_appointments_raw').upsert(deduped.slice(i, i + 500), { onConflict: 'appt_key' });
    }
    return { ok: true, fetched: raw.length, stored: deduped.length, windows: windows.length };
  } catch (err) {
    return { ok: false, fetched: 0, stored: 0, windows: 0, error: (err as Error).message };
  }
}

/** Shape-discovery probe for appointments: one recent 30-day window, RAW first
 *  record + envelope keys, so we can confirm the field names precisely. */
export async function practoAppointmentsProbe(supabase: AdminClient): Promise<PractoResult<unknown>> {
  const cfg = getPractoConfig();
  if (!cfg) return { ok: false, message: 'Practo not configured' };
  try {
    const tokenRef = { token: await getPractoToken(supabase) };
    const to = new Date();
    const from = new Date(to.getTime() - 29 * 86400_000);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const appts = await fetchApptWindow(supabase, cfg, tokenRef, iso(from), iso(to));
    return {
      ok: true,
      data: {
        sampleCount: appts.length,
        firstAppointment: appts[0] ?? null,
        firstRecordKeys: appts[0] ? Object.keys(appts[0]) : [],
      },
    };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}
