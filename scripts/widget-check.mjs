/**
 * "Robot patient" check for the Dental Nation booking widget.
 *
 * Opens the live widget the way a patient does and answers one question: are
 * there bookable time slots? During the outages we're chasing, the site still
 * returns 200 and the widget still renders — only the SELECT TIME dropdown comes
 * back empty ("No slots available"). An HTTP ping reports 100% uptime straight
 * through that, which is why this drives a real browser.
 *
 * IT NEVER BOOKS. It opens dropdowns and reads text; it never clicks
 * "Continue Booking", so it cannot create an appointment or pollute the feeds.
 *
 * It walks the REAL patient journey, because the widget reveals itself
 * progressively: on a fresh visit only "Select Condition" and "Select Treatment"
 * exist — Visit Type, Select a Date and Select Time are not rendered until those
 * two are answered. Earlier versions waited on page load for a field that could
 * not yet exist, and reported the resulting timeout as a clinic outage.
 *
 * The dropdowns are custom divs with no id/name/data-* — only Tailwind classes,
 * which change whenever anyone restyles it. So we anchor on <label> TEXT and
 * assert on RENDERED TEXT (a slot always looks like "10:30 AM"), never on class
 * names or DOM shape.
 *
 * Exit code is always 0: a failed check is a recorded data point, not a broken
 * workflow. Only an unreachable dashboard makes this exit non-zero.
 */
import { chromium } from 'playwright';
import { findWidget, dismissOverlays, pickOption, optionsBelow, valueOf } from './widget-lib.mjs';

const SITE = process.env.SITE_URL || 'https://www.dentalnation.com/en/';
const ENDPOINT = process.env.DASHBOARD_URL; // e.g. https://dental-nation-one.vercel.app
const SECRET = process.env.WIDGET_HEALTH_SECRET || process.env.CRON_SECRET;

/**
 * A rendered time slot, e.g. "9:00 AM" / "14:30".
 *
 * Guarded with digit lookaround rather than \b on purpose. textContent
 * concatenates adjacent nodes without separators, so the first slot arrives glued
 * to its label ("Select Time9:00 AM") — and \b fails between "e" and "9", which
 * silently dropped the first slot. On a day offering a single slot that would
 * have counted 0 and raised a false outage.
 */
const SLOT_RE = /(?<!\d)\d{1,2}:\d{2}(?!\d)\s*(?:am|pm)?/gi;
const NO_SLOTS_RE = /no\s*slots?\s*available|no\s*(?:time|timing)s?\s*available/i;

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

const started = Date.now();
let browser;
let result = { ok: false, stage: 'loaded', slotsFound: null, detail: 'check did not complete' };
// Kept OUTSIDE `result` because the branches below reassign result wholesale;
// the website verdict must survive whatever the widget verdict turns out to be.
const site = { ok: null, status: null, ms: null };

try {
  browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(20000);

  // ── Website verdict — measured before, and independently of, the widget ──
  const t0 = Date.now();
  const resp = await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  site.ms = Date.now() - t0;
  site.status = resp?.status() ?? null;
  // Slow but serving is still UP. Only a non-2xx/3xx (or a throw, handled in
  // catch) means the site itself failed the patient.
  site.ok = Boolean(resp && resp.status() < 400);

  await page.waitForTimeout(3000);
  await dismissOverlays(page);

  // The widget reveals itself progressively: on load ONLY "Select Condition" and
  // "Select Treatment" exist. So we look for the ENTRY field, not the time field.
  const entry = await findWidget(page, { timeoutMs: 45000, labelText: 'Select Condition' });
  if (!entry) {
    const html = (await page.content().catch(() => '')) || '';
    const widgetInDom = /Select\s*Condition/i.test(html) || /Select\s*Treatment/i.test(html);
    result = widgetInDom
      ? {
          ok: false,
          conclusive: false, // the check's problem, not the widget's
          stage: 'loaded',
          slotsFound: null,
          detail: 'Monitor error (not a widget verdict): widget markup is present on the page but the check could not reach it.',
        }
      : {
          ok: false,
          conclusive: true, // genuinely absent — a patient could not start a booking
          stage: 'loaded',
          slotsFound: null,
          detail: 'Booking widget did not render on the page — a patient could not start a booking.',
        };
    await page.screenshot({ path: 'widget-failure.png' }).catch(() => {});
    throw new Error('__reported__');
  }
  const frame = entry.frame;
  result.stage = 'widget';

  // Walk the patient journey: condition → treatment. Only then do Visit Type,
  // Select a Date and Select Time render.
  const gotCondition = await pickOption(page, frame, 'Select Condition');
  const gotTreatment = gotCondition ? await pickOption(page, frame, 'Select Treatment') : false;
  if (!gotCondition || !gotTreatment) {
    result = {
      ok: false,
      conclusive: false, // couldn't drive the form — says nothing about availability
      stage: gotCondition ? 'treatment' : 'condition',
      slotsFound: null,
      detail: `Monitor error (not a widget verdict): could not select a ${gotCondition ? 'treatment' : 'condition'}.`,
    };
    await page.screenshot({ path: 'widget-failure.png' }).catch(() => {});
    throw new Error('__reported__');
  }
  result.stage = 'treatment';

  // Now the date/time fields should exist. If they never appear, the patient is
  // genuinely stuck — that IS an outage.
  const timeFound = await findWidget(page, { timeoutMs: 20000, labelText: 'Select Time' });
  if (!timeFound) {
    result = {
      ok: false,
      conclusive: true,
      stage: 'treatment',
      slotsFound: null,
      detail: 'After choosing a condition and treatment the widget never offered a date/time step — a patient could not book.',
    };
    await page.screenshot({ path: 'widget-failure.png' }).catch(() => {});
    throw new Error('__reported__');
  }
  const found = timeFound;
  await found.label.scrollIntoViewIfNeeded().catch(() => {});

  const field = (text) => frame.locator('label', { hasText: text }).first().locator('xpath=..');
  const timeField = field('Select Time');

  // A date is preselected, so slots normally load on their own. Nudge the date
  // anyway when we can — that forces a fresh availability fetch rather than
  // reading whatever was cached on load. Best-effort.
  try {
    await field('Select a Date').click({ timeout: 5000 });
    await page.waitForTimeout(1500);
    const day = frame.locator('[role="gridcell"]:not([aria-disabled="true"]), button:not([disabled])').filter({ hasText: /^\d{1,2}$/ });
    const n = await day.count();
    if (n) {
      await day.nth(Math.min(3, n - 1)).click({ timeout: 5000 });
      result.stage = 'date';
    }
    await page.waitForTimeout(2500);
  } catch {
    // Date interaction unavailable — fall through and read whatever is loaded.
  }
  await page.keyboard.press('Escape').catch(() => {});

  // ── The decisive test: can a patient actually SELECT a time? ──
  // Listing slots is not enough. The reported fault is that the time appears
  // choosable, the selection silently fails to register, and "Continue Booking"
  // then rejects the form with "please select all fields". A check that only
  // asserts slots are LISTED would pass straight through that and report the
  // widget healthy while nobody could book.
  result.stage = 'slots';

  const read = async (loc) =>
    (await loc.innerText().catch(() => null)) ?? (await loc.textContent().catch(() => '')) ?? '';

  try {
    await timeField.click({ timeout: 8000 });
    await page.waitForTimeout(2500);
  } catch {
    // Not clickable — usually the empty/disabled state; the text read below says so.
  }

  const region = frame.locator('label', { hasText: 'Select Time' }).first().locator('xpath=../../../..');
  const openText = `${await read(region)} ${await read(timeField)}`;

  // Slots found the same way as every other option: by GEOMETRY. This step used
  // to keep its own class-based selector, which matched nothing and reported
  // "0 slots offered" as a real outage while the widget was serving times.
  const timeOptions = await optionsBelow(frame, valueOf(frame, 'Select Time'), /(?<!\d)\d{1,2}:\d{2}(?!\d)/);
  const offered = timeOptions.length;

  if (NO_SLOTS_RE.test(openText) || offered === 0) {
    result = {
      ok: false,
      conclusive: true,
      stage: 'slots',
      slotsFound: 0,
      detail: NO_SLOTS_RE.test(openText)
        ? 'Widget reported "No slots available" — patients cannot book.'
        : 'Time dropdown offered no selectable slots — patients cannot book.',
    };
  } else {
    // Pick one and verify it STICKS.
    await timeOptions[0].el.click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(2000);
    await page.keyboard.press('Escape').catch(() => {}); // close the list before reading back
    await page.waitForTimeout(500);
    // Read ONLY the field's value element — the div immediately after the label.
    // Reading the whole field container let the still-rendered option list ("11:00
    // AM …") satisfy the time test, so a dead dropdown passed as healthy.
    const valueEl = frame
      .locator('label', { hasText: 'Select Time' })
      .first()
      .locator('xpath=following-sibling::div[1]');
    const chosen = (await valueEl.count()) ? await read(valueEl) : await read(timeField);
    const stuck = /(?<!\d)\d{1,2}:\d{2}(?!\d)/.test(chosen.replace(/select\s*time/i, ''));
    result = stuck
      ? {
          ok: true,
          conclusive: true,
          stage: 'selected',
          slotsFound: offered,
          detail: `${offered} slot${offered === 1 ? '' : 's'} offered; selection registered (${chosen.replace(/\s+/g, ' ').trim().slice(0, 40)})`,
        }
      : {
          ok: false,
          conclusive: true,
          stage: 'selected',
          slotsFound: offered,
          detail: `${offered} slot${offered === 1 ? '' : 's'} were listed but the time would not select — "Continue Booking" would reject the form. Patients cannot book.`,
        };
  }

  if (!result.ok) await page.screenshot({ path: 'widget-failure.png' }).catch(() => {});
} catch (e) {
  if (e.message !== '__reported__') {
    // conclusive:false — the run crashed, so it learned NOTHING about whether a
    // patient could book. Recording this as an outage would put a fabricated
    // DOWN on three dashboards, which is exactly what happened the first time.
    // A navigation failure IS a website verdict: the page never served.
    const navFailed = /goto|net::|ERR_|Timeout.*navigat/i.test(e.message);
    if (navFailed) site.ok = false; // the page never served — that IS a site outage
    result = {
      ok: false,
      conclusive: false,
      stage: result.stage,
      slotsFound: null,
      detail: `Monitor error (not a widget verdict): ${e.message}`.slice(0, 400),
    };
  }
} finally {
  await browser?.close().catch(() => {});
}

result.durationMs = Date.now() - started;
await report({ ...result, siteOk: site.ok, siteStatus: site.status, siteMs: site.ms });
