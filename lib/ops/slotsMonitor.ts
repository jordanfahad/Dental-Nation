import 'server-only';
import { getPractoConfig, type PractoConfig } from '@/config/practo';
import { practoLoginAttempt, cachePractoToken } from '@/lib/sync/adapters/practo-adapter';
import { recordWidgetCheck } from '@/lib/ops/widgetHealth';
import type { AdminClient } from '@/lib/supabase/server';

/**
 * Booking-availability monitor via the Practo slots API — runs INSIDE the
 * 15-minute /api/cron/sync, replacing the scheduled GitHub Action.
 *
 * Why it moved: the vendor confirmed (Sagar, 2026-07-31) that
 * `request_handler_key` is a short-lived session token (~8 min), minted by the
 * same Customer/Login.do call the bills sync already uses — never a static key.
 * The Action's static SLOTS_API_KEY secret could therefore never work; running
 * here reuses the PRACTO_AUTH credential already configured in Vercel, so no
 * new secret is needed and the monitor works on every deploy.
 *
 * Flow per run (fresh login each cycle, per the vendor's guidance):
 *   1. POST Customer/Login.do  (x-insta-auth)          → request_handler_key
 *   2. GET  api/scheduler/availableslots.json per doctor (key in the header)
 *
 * Verdict (same three states the panel has always shown):
 *   - slots returned            → healthy
 *   - empty slots list          → genuinely no availability (patients see an
 *                                 empty calendar) — conclusive DOWN
 *   - login/slots 5xx, timeout  → booking system down — conclusive DOWN
 *   - credential refused / 4xx  → OUR problem — inconclusive, never an outage
 *
 * Results insert into widget_health via the same recordWidgetCheck the ingest
 * route uses, so uptime history, incidents and the Clinical Ops panel continue
 * unbroken. The website verdict rides along, as the Action's did. Zero side
 * effects: a GET on availableslots.json creates no OTP, no lead, no booking.
 *
 * Env (optional): SLOTS_RESOURCES "center:resource" pairs, SITE_URL.
 */

const DEFAULT_RESOURCES = '1:DOC0001,1:DOC0017';

interface SlotResource {
  center: string;
  resource: string;
}

function resources(): SlotResource[] {
  return (process.env.SLOTS_RESOURCES || DEFAULT_RESOURCES)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const [center, resource] = pair.split(':');
      return { center: (center || '1').trim(), resource: (resource || '').trim() };
    })
    .filter((r) => r.resource);
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

function slotsUrl(cfg: PractoConfig, r: SlotResource, from: string, to: string): string {
  return (
    `${cfg.baseUrl}/${cfg.hospital}/api/scheduler/availableslots.json` +
    `?center_id=${encodeURIComponent(r.center)}&resource_id=${encodeURIComponent(r.resource)}` +
    `&from_date=${from}&to_date=${to}&booked_slot=I&visit_mode=I&first_available=N`
  );
}

/**
 * Count bookable slots in a response of unknown shape: prefer arrays living
 * under a key containing "slot" (the documented shape is `{ slots: [...] }`);
 * fall back to counting HH:MM-looking values. 0 = nothing bookable.
 */
function countSlots(data: unknown): number {
  let viaArrays = 0;
  let sawSlotArray = false;
  (function walk(v: unknown, key: string) {
    if (Array.isArray(v)) {
      if (/slot/i.test(key)) {
        sawSlotArray = true;
        viaArrays += v.length;
      }
      for (const item of v) walk(item, key);
    } else if (v && typeof v === 'object') {
      for (const [k, val] of Object.entries(v)) walk(val, k);
    }
  })(data, '');
  if (sawSlotArray) return viaArrays;
  const times = JSON.stringify(data).match(/(?<!\d)\d{1,2}:\d{2}(?!\d)/g);
  return times ? times.length : 0;
}

type SlotsRead =
  | { kind: 'ok'; slots: number }
  | { kind: 'auth'; error: string }
  | { kind: 'badreq'; error: string }
  | { kind: 'error'; error: string };

/**
 * One availability read. Classification is the whole point:
 *   - 401/403 / app-code 1001 → OUR token/credential problem → inconclusive
 *   - other 4xx / app error   → OUR request rejected          → inconclusive
 *   - 5xx / timeout           → THEIR system failed → outage (one retry first)
 * Login success codes: the API wraps success as return_code 2001 ("Success");
 * some endpoints use 0 — both accepted, as is a bare `{ slots: [...] }`.
 */
async function readSlots(cfg: PractoConfig, token: string, r: SlotResource, from: string, to: string): Promise<SlotsRead> {
  const url = slotsUrl(cfg, r, from, to);
  let lastErr = 'unreachable';
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await new Promise((res) => setTimeout(res, 3000));
    try {
      const res = await fetch(url, {
        headers: { request_handler_key: token },
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      });
      const text = await res.text();
      const head = text.slice(0, 200).replace(/\s+/g, ' ');
      if (res.status === 401 || res.status === 403) return { kind: 'auth', error: `HTTP ${res.status} (${head})` };
      if (res.status >= 400 && res.status < 500) return { kind: 'badreq', error: `HTTP ${res.status} (${head})` };
      if (!res.ok) {
        lastErr = `HTTP ${res.status}`;
        continue; // 5xx: retry once, then call it an outage
      }
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        lastErr = `non-JSON response (${head})`;
        continue;
      }
      // HTTP 200 can still carry an application error — that must never be
      // read as "0 slots = genuinely no availability".
      const rc = (data as Record<string, unknown>)?.return_code ?? (data as Record<string, unknown>)?.returnCode;
      if (rc != null && !['0', '2001'].includes(String(rc))) {
        const msg = String((data as Record<string, unknown>)?.return_message ?? '').slice(0, 120);
        return { kind: rc === '1001' || rc === 1001 ? 'auth' : 'badreq', error: `app error ${rc} (${msg})` };
      }
      return { kind: 'ok', slots: countSlots(data) };
    } catch (e) {
      const msg = String((e as Error)?.message ?? e);
      lastErr = /timeout|abort/i.test(msg) ? 'timeout after 15s' : msg.slice(0, 120);
    }
  }
  return { kind: 'error', error: lastErr };
}

/** Website verdict — independent of availability, same as the old robot. */
async function checkSite(): Promise<{ ok: boolean; status: number | null; ms: number | null }> {
  const site = process.env.SITE_URL || 'https://www.dentalnation.com/en/';
  const t0 = Date.now();
  try {
    const res = await fetch(site, { redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(20000) });
    return { ok: res.status < 400, status: res.status, ms: Date.now() - t0 };
  } catch {
    return { ok: false, status: null, ms: Date.now() - t0 };
  }
}

export interface SlotsMonitorOutcome {
  recorded: boolean;
  /** One line for the sync log, e.g. "34 slots (DOC0001: 20, DOC0017: 14)". */
  summary: string;
  error?: string;
}

export async function runSlotsMonitor(supabase: AdminClient): Promise<SlotsMonitorOutcome> {
  const cfg = getPractoConfig();
  if (!cfg) return { recorded: false, summary: 'Practo not configured' };
  const started = Date.now();

  const site = await checkSite();

  type Verdict = {
    ok: boolean;
    conclusive: boolean;
    slotsFound: number | null;
    detail: string;
  };
  let verdict: Verdict;

  // Step 1 — mint a fresh token (the key lives ~8 minutes; our cadence is 15).
  const login = await practoLoginAttempt(cfg);
  if (!login.ok) {
    verdict =
      login.kind === 'network'
        ? {
            ok: false,
            conclusive: true,
            slotsFound: null,
            detail: `Availability API unreachable — Practo login failed (${login.note}). Booking system down.`,
          }
        : {
            ok: false,
            conclusive: false,
            slotsFound: null,
            detail: `Monitor error (not a clinic verdict): Practo refused our login credential — ${login.note}. Check PRACTO_AUTH.`,
          };
  } else {
    await cachePractoToken(supabase, login.token); // bills/appointments reuse it

    // Step 2 — one read per doctor, verdict across all reads.
    const today = new Date();
    const from = iso(today);
    const to = iso(new Date(today.getTime() + 7 * 86400_000));
    const reads: (SlotResource & SlotsRead)[] = [];
    for (const r of resources()) {
      reads.push({ ...r, ...(await readSlots(cfg, login.token, r, from, to)) });
    }

    const okReads = reads.filter((r) => r.kind === 'ok');
    const errReads = reads.filter((r) => r.kind === 'error');
    const rejected = reads.filter((r) => r.kind === 'auth' || r.kind === 'badreq');
    const totalSlots = okReads.reduce((a, r) => a + (r.kind === 'ok' ? r.slots : 0), 0);
    const perDoc = okReads.map((r) => `${r.resource}: ${r.kind === 'ok' ? r.slots : 0}`).join(', ');
    const window = `${from} → ${to}`;

    if (okReads.length > 0) {
      // At least one clean read → the API answered; the verdict is the count.
      const failed = [...errReads, ...rejected];
      const errNote = failed.length
        ? ` (${failed.map((r) => `${r.resource} read failed: ${'error' in r ? r.error : '?'}`).join('; ')})`
        : '';
      verdict =
        totalSlots > 0
          ? {
              ok: true,
              conclusive: true,
              slotsFound: totalSlots,
              detail: `Availability API: ${totalSlots} bookable slot${totalSlots === 1 ? '' : 's'} over ${window} (${perDoc})${errNote}`,
            }
          : {
              ok: false,
              conclusive: true,
              slotsFound: 0,
              detail: `Availability API healthy but returned NO bookable slots over ${window} for any checked doctor (${okReads.map((r) => r.resource).join(', ')}) — patients see an empty calendar. Genuine no-availability, not a system error${errNote}.`,
            };
    } else if (errReads.length > 0) {
      // 5xx/timeout and no clean read → the booking system failed us.
      verdict = {
        ok: false,
        conclusive: true,
        slotsFound: null,
        detail: `Availability API unreachable — booking system down or read failed (${reads.map((r) => `${r.resource}: ${'error' in r ? r.error : '?'}`).join('; ')}).`,
      };
    } else {
      // Only rejections with a FRESH token → our request/credential is wrong,
      // which says nothing about whether patients can book. Never an outage.
      verdict = {
        ok: false,
        conclusive: false,
        slotsFound: null,
        detail: `Monitor error (not a clinic verdict): availability API rejected the check despite a fresh login — ${rejected.map((r) => `${r.resource}: ${'error' in r ? r.error : '?'}`).join('; ') || 'no doctors configured'}.`,
      };
    }
  }

  const res = await recordWidgetCheck({
    ok: verdict.ok,
    slotsFound: verdict.slotsFound,
    stage: 'api',
    detail: verdict.detail.slice(0, 500),
    durationMs: Date.now() - started,
    conclusive: verdict.conclusive,
    siteOk: site.ok,
    siteStatus: site.status,
    siteMs: site.ms,
  });

  const summary = verdict.conclusive
    ? verdict.slotsFound != null
      ? `${verdict.slotsFound} slots next 7d`
      : 'outage recorded'
    : 'monitor error (inconclusive)';
  return res.ok ? { recorded: true, summary } : { recorded: false, summary, error: res.error };
}
