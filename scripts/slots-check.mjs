/**
 * Availability check via the Practo slots API — MANUAL FALLBACK.
 *
 * The primary monitor now runs inside the dashboard's 15-minute cron
 * (/api/cron/sync → lib/ops/slotsMonitor.ts), where the PRACTO_AUTH credential
 * already lives. This script stays for on-demand runs from the Actions tab.
 *
 * The vendor confirmed (Sagar, 2026-07-31) that `request_handler_key` is NOT a
 * static key: it's a short-lived session token (~8 min) minted by a login call.
 * So every run is two steps:
 *   1. POST Customer/Login.do  with `x-insta-auth: user:password`   → token
 *   2. GET  availableslots.json with `request_handler_key: <token>` (header)
 *
 * Verdict:
 *   - slots returned              → availability healthy
 *   - empty slots list            → genuinely no availability (patients see an
 *                                   empty calendar) — conclusive DOWN
 *   - login/slots 5xx or timeout  → booking system down — conclusive DOWN
 *   - credential refused / 4xx    → OUR problem — inconclusive, never an outage
 *
 * Zero side effects: the GET creates no OTP, no lead and no appointment.
 * Reports through the SAME /api/widget-health ingest as before.
 *
 * Env:
 *   SLOTS_API_AUTH   (secret) "user:password" for x-insta-auth — never committed.
 *   SLOTS_RESOURCES  "center:resource" pairs, e.g. "1:DOC0001,1:DOC0017".
 *   SLOTS_API_BASE   slots endpoint override (defaults to the live Practo URL).
 *   SLOTS_LOGIN_URL  login endpoint override.
 *   SITE_URL / DASHBOARD_URL / WIDGET_HEALTH_SECRET — as before.
 *
 * Exit code is 0 unless the dashboard itself rejected the report.
 */

const AUTH = process.env.SLOTS_API_AUTH;
const API_BASE =
  process.env.SLOTS_API_BASE ||
  'https://api.instahealthsolutions.com/dentalnation/api/scheduler/availableslots.json';
const LOGIN_URL =
  process.env.SLOTS_LOGIN_URL ||
  'https://api.instahealthsolutions.com/dentalnation/Customer/Login.do?_method=login&hospital_name=dentalnation';
const RESOURCES = (process.env.SLOTS_RESOURCES || '1:DOC0001,1:DOC0017')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((pair) => {
    const [center, resource] = pair.split(':');
    return { center: (center || '1').trim(), resource: (resource || '').trim() };
  })
  .filter((r) => r.resource);
const SITE = process.env.SITE_URL || 'https://www.dentalnation.com/en/';
const ENDPOINT = process.env.DASHBOARD_URL;
const SECRET = process.env.WIDGET_HEALTH_SECRET || process.env.CRON_SECRET;

const iso = (d) => d.toISOString().slice(0, 10);
const today = new Date();
const FROM = iso(today);
const TO = iso(new Date(today.getTime() + 7 * 86400_000));

async function report(result) {
  console.log('RESULT', JSON.stringify(result));
  if (!ENDPOINT || !SECRET) {
    console.log('DASHBOARD_URL / WIDGET_HEALTH_SECRET not set — not reporting.');
    return;
  }
  const res = await fetch(`${ENDPOINT.replace(/\/$/, '')}/api/widget-health`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${SECRET}` },
    body: JSON.stringify(result),
  });
  if (!res.ok) throw new Error(`Dashboard rejected the report: ${res.status} ${await res.text()}`);
  console.log('Reported to dashboard.');
}

/**
 * Count bookable slots in a response of unknown shape: prefer arrays living
 * under a key containing "slot" (documented shape is `{ slots: [...] }`); fall
 * back to counting HH:MM-looking values. 0 means nothing bookable.
 */
function countSlots(data) {
  let viaArrays = 0;
  let sawSlotArray = false;
  (function walk(v, key) {
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

/** Step 1: mint a fresh request_handler_key. Classified like the reads:
 *  network/5xx = their outage, refused credential = our monitor error. */
async function login() {
  let res;
  try {
    res = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-insta-auth': AUTH },
      signal: AbortSignal.timeout(20000),
    });
  } catch (e) {
    const msg = String(e?.message ?? e);
    return { kind: 'error', error: /timeout|abort/i.test(msg) ? 'login timeout after 20s' : `login fetch failed: ${msg.slice(0, 120)}` };
  }
  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {}
  const token = body?.request_handler_key;
  if (typeof token === 'string' && token) {
    console.log(`login: return_code ${body?.return_code ?? '?'} — token minted (expires_in ${body?.expires_in ?? '?'}).`);
    return { kind: 'ok', token };
  }
  const head = text.slice(0, 300).replace(/\s+/g, ' ');
  if (res.status >= 500) return { kind: 'error', error: `login HTTP ${res.status} (${head.slice(0, 120)})` };
  return { kind: 'auth', error: `login refused (HTTP ${res.status}): ${head.slice(0, 160)} — check the SLOTS_API_AUTH secret` };
}

/**
 * Step 2, per doctor. Status classification matters more than the fetch:
 *   - 401/403 / app-code 1001 → OUR token problem   → kind 'auth'   (inconclusive)
 *   - other 4xx / app error   → OUR request rejected → kind 'badreq' (inconclusive)
 *   - 5xx / timeout           → THEIR system failed  → kind 'error'  (outage), one retry
 * A 4xx must never be recorded as a clinic outage.
 */
async function getSlots(token, center, resource) {
  const url =
    `${API_BASE}?center_id=${encodeURIComponent(center)}&resource_id=${encodeURIComponent(resource)}` +
    `&from_date=${FROM}&to_date=${TO}&booked_slot=I&visit_mode=I&first_available=N`;
  let lastErr = 'unreachable';
  const tag = `${resource}@center${center}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 4000));
    try {
      const res = await fetch(url, {
        headers: { request_handler_key: token },
        signal: AbortSignal.timeout(20000),
      });
      const text = await res.text();
      const head = text.slice(0, 300).replace(/\s+/g, ' ');
      if (res.status === 401 || res.status === 403) {
        console.log(`${tag}: HTTP ${res.status} —`, head);
        return { kind: 'auth', error: `HTTP ${res.status}` };
      }
      if (res.status >= 400 && res.status < 500) {
        console.log(`${tag}: HTTP ${res.status} —`, head);
        return { kind: 'badreq', error: `HTTP ${res.status} (${head.slice(0, 120)})` };
      }
      if (!res.ok) {
        console.log(`${tag}: HTTP ${res.status} —`, head);
        lastErr = `HTTP ${res.status}`;
        continue; // 5xx: retry once, then call it an outage
      }
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        lastErr = `non-JSON response (${head.slice(0, 80)})`;
        continue;
      }
      // HTTP 200 can still carry an application error (return_code) — never
      // read that as "0 slots = genuinely no availability".
      const rc = data?.return_code ?? data?.returnCode;
      if (rc != null && !['0', '2001'].includes(String(rc))) {
        console.log(`${tag}: application error —`, head);
        const kind = String(rc) === '1001' ? 'auth' : 'badreq';
        return { kind, error: `app error ${rc} (${String(data?.return_message ?? '').slice(0, 120)})` };
      }
      console.log(`slots ${tag} ${FROM}→${TO}:`, text.slice(0, 400).replace(/\s+/g, ' '));
      return { kind: 'ok', slots: countSlots(data) };
    } catch (e) {
      lastErr = /timeout|abort/i.test(String(e?.message)) ? 'timeout after 20s' : String(e?.message ?? e).slice(0, 120);
    }
  }
  return { kind: 'error', error: lastErr };
}

const started = Date.now();

if (!AUTH) {
  console.error('SLOTS_API_AUTH is not set — cannot log in to the availability API.');
  process.exit(1);
}

// ── Website verdict — independent of availability, same as the old robot ──
const site = { ok: null, status: null, ms: null };
try {
  const t0 = Date.now();
  const res = await fetch(SITE, { redirect: 'follow', signal: AbortSignal.timeout(30000) });
  site.ms = Date.now() - t0;
  site.status = res.status;
  site.ok = res.status < 400;
} catch {
  site.ok = false;
}

// ── Step 1: fresh token; Step 2: one read per doctor ──
let result;
const auth = await login();
if (auth.kind !== 'ok') {
  result =
    auth.kind === 'error'
      ? {
          ok: false,
          conclusive: true,
          stage: 'api',
          slotsFound: null,
          detail: `Availability API unreachable — Practo login failed (${auth.error}). Booking system down.`,
        }
      : {
          ok: false,
          conclusive: false,
          stage: 'api',
          slotsFound: null,
          detail: `Monitor error (not a clinic verdict): ${auth.error}.`,
        };
} else {
  const reads = [];
  for (const r of RESOURCES) {
    reads.push({ ...r, ...(await getSlots(auth.token, r.center, r.resource)) });
  }

  const okReads = reads.filter((r) => r.kind === 'ok');
  const errReads = reads.filter((r) => r.kind === 'error');
  const rejected = reads.filter((r) => r.kind === 'auth' || r.kind === 'badreq');
  const totalSlots = okReads.reduce((a, r) => a + r.slots, 0);
  const perDoc = okReads.map((r) => `${r.resource}: ${r.slots}`).join(', ');
  const window = `${FROM} → ${TO}`;

  if (okReads.length > 0) {
    // At least one clean read → the API answered; the verdict is the count.
    const failed = [...errReads, ...rejected];
    const errNote = failed.length
      ? ` (${failed.map((r) => `${r.resource} read failed: ${r.error}`).join('; ')})`
      : '';
    result =
      totalSlots > 0
        ? {
            ok: true,
            conclusive: true,
            stage: 'api',
            slotsFound: totalSlots,
            detail: `Availability API: ${totalSlots} bookable slot${totalSlots === 1 ? '' : 's'} over ${window} (${perDoc})${errNote}`,
          }
        : {
            ok: false,
            conclusive: true,
            stage: 'api',
            slotsFound: 0,
            detail: `Availability API healthy but returned NO bookable slots over ${window} for any checked doctor (${okReads.map((r) => r.resource).join(', ')}) — patients see an empty calendar. Genuine no-availability, not a system error${errNote}.`,
          };
  } else if (errReads.length > 0) {
    // 5xx/timeout and no clean read → the booking system failed us.
    result = {
      ok: false,
      conclusive: true,
      stage: 'api',
      slotsFound: null,
      detail: `Availability API unreachable — booking system down or read failed (${reads.map((r) => `${r.resource}: ${r.error}`).join('; ')}).`,
    };
  } else {
    // Only rejections despite a FRESH token → our side is wrong. Never an outage.
    result = {
      ok: false,
      conclusive: false,
      stage: 'api',
      slotsFound: null,
      detail: `Monitor error (not a clinic verdict): availability API rejected the check despite a fresh login — ${rejected.map((r) => `${r.resource}: ${r.error}`).join('; ')}. See the Action log for the API's response body.`,
    };
  }
}

result.durationMs = Date.now() - started;
await report({ ...result, siteOk: site.ok, siteStatus: site.status, siteMs: site.ms });
