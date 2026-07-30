/**
 * Availability check via the Practo slots API — replaces driving the live
 * widget with a browser (scripts/widget-check.mjs, kept for manual fallback).
 *
 * Per the vendor's recommendation the monitor now asks the SOURCE system the
 * one question that matters, with none of the DOM fragility:
 *   - slots returned            → availability healthy
 *   - empty slots list          → genuinely no availability (a real state — the
 *                                 widget will show patients an empty calendar)
 *   - HTTP error / timeout      → booking system down or unreadable ← outage
 *   - 401/403 (bad key)         → monitor misconfiguration, NOT a clinic verdict
 *
 * Zero side effects: a GET on availableslots.json creates no OTP, no lead and
 * no appointment.
 *
 * It reports through the SAME /api/widget-health ingest as the old robot, so
 * the uptime history, incidents and the Clinical Ops panel continue unbroken.
 *
 * Env:
 *   SLOTS_API_KEY    (secret) the request_handler_key — never committed.
 *   SLOTS_RESOURCES  "center:resource" pairs, e.g. "1:DOC0001,1:DOC0017".
 *   SLOTS_API_BASE   endpoint override (defaults to the live Practo URL).
 *   SITE_URL / DASHBOARD_URL / WIDGET_HEALTH_SECRET — as before.
 *
 * Exit code is 0 unless the dashboard itself rejected the report.
 */

const API_BASE =
  process.env.SLOTS_API_BASE ||
  'https://api.instahealthsolutions.com/dentalnation/api/scheduler/availableslots.json';
const KEY = process.env.SLOTS_API_KEY;
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
 * under a key containing "slot"; fall back to counting HH:MM-looking values in
 * the whole payload. Either way, 0 means the API offered nothing bookable.
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

/** GET with a timeout; one retry on network error / 5xx (transient blips). */
async function getSlots(center, resource) {
  const url =
    `${API_BASE}?center_id=${encodeURIComponent(center)}&resource_id=${encodeURIComponent(resource)}` +
    `&from_date=${FROM}&to_date=${TO}&booked_slot=I&visit_mode=I&first_available=N`;
  let lastErr = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 4000));
    try {
      const res = await fetch(url, {
        headers: { request_handler_key: KEY },
        signal: AbortSignal.timeout(20000),
      });
      const text = await res.text();
      if (res.status === 401 || res.status === 403) {
        return { kind: 'auth', status: res.status };
      }
      if (!res.ok) {
        lastErr = `HTTP ${res.status}`;
        continue; // 5xx and friends: retry once, then call it an outage
      }
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        lastErr = `non-JSON response (${text.slice(0, 80).replace(/\s+/g, ' ')})`;
        continue;
      }
      // Log the head of the first payload so the Action run shows the real shape.
      console.log(`slots ${resource}@center${center}:`, text.slice(0, 400).replace(/\s+/g, ' '));
      return { kind: 'ok', slots: countSlots(data) };
    } catch (e) {
      lastErr = /timeout|abort/i.test(String(e?.message)) ? 'timeout after 20s' : String(e?.message ?? e).slice(0, 120);
    }
  }
  return { kind: 'error', error: lastErr ?? 'request failed' };
}

const started = Date.now();

if (!KEY) {
  console.error('SLOTS_API_KEY is not set — cannot query the availability API.');
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

// ── Availability verdict — one read per doctor, verdict across all reads ──
const reads = [];
for (const r of RESOURCES) {
  reads.push({ ...r, ...(await getSlots(r.center, r.resource)) });
}

const okReads = reads.filter((r) => r.kind === 'ok');
const authReads = reads.filter((r) => r.kind === 'auth');
const errReads = reads.filter((r) => r.kind === 'error');
const totalSlots = okReads.reduce((a, r) => a + r.slots, 0);
const perDoc = okReads.map((r) => `${r.resource}: ${r.slots}`).join(', ');
const window = `${FROM} → ${TO}`;

let result;
if (okReads.length > 0) {
  // At least one clean read → the API answered; the verdict is the slot count.
  const errNote = errReads.length
    ? ` (${errReads.map((r) => `${r.resource} read failed: ${r.error}`).join('; ')})`
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
} else if (authReads.length === reads.length) {
  // The key was rejected — that's OUR configuration, not the clinic's system.
  result = {
    ok: false,
    conclusive: false,
    stage: 'api',
    slotsFound: null,
    detail: `Monitor error (not a clinic verdict): availability API rejected the key (HTTP ${authReads[0].status}) — check the SLOTS_API_KEY secret.`,
  };
} else {
  // Every read failed with an error/timeout → the booking system is down or unreadable.
  result = {
    ok: false,
    conclusive: true,
    stage: 'api',
    slotsFound: null,
    detail: `Availability API unreachable for every checked doctor — booking system down or read failed (${reads.map((r) => `${r.resource}: ${r.error ?? `HTTP ${r.status}`}`).join('; ')}).`,
  };
}

result.durationMs = Date.now() - started;
await report({ ...result, siteOk: site.ok, siteStatus: site.status, siteMs: site.ms });
