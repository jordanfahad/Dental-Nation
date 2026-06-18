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

/** Detect Practo's "login again" sentinel anywhere obvious in the body. */
function isReloginCode(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const obj = body as Record<string, unknown>;
  const code = String(obj.code ?? obj.status ?? obj.error_code ?? '');
  const msg = String(obj.message ?? obj.error ?? '').toLowerCase();
  return code === PRACTO_RELOGIN_CODE || msg.includes('login again');
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
  const id = pick(b, ['bill_id', 'billId', 'bill_number', 'billNo', 'invoice_id', 'id']);
  if (id) return id;
  return createHash('sha1').update(JSON.stringify(b)).digest('hex').slice(0, 24);
}
function billDate(b: Record<string, unknown>): string | null {
  const raw = pick(b, ['finalized_date', 'bill_date', 'billDate', 'date', 'created_date', 'invoice_date']);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}
function billAmount(b: Record<string, unknown>): number | null {
  const raw = pick(b, ['net_amount', 'grand_total', 'total_amount', 'total', 'amount', 'bill_amount', 'paid_amount']);
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

/** Sync recent Practo bills (default: trailing `days`) into the bronze table. */
export async function syncPracto(supabase: AdminClient, days = 14): Promise<PractoSyncResult> {
  const cfg = getPractoConfig();
  if (!cfg) return { ok: false, fetched: 0, stored: 0, windows: 0, note: 'Practo not configured', error: 'not_configured' };
  try {
    const to = new Date();
    const from = new Date(to.getTime() - (days - 1) * 86400_000);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const windows = sevenDayChunks(iso(from), iso(to));
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
