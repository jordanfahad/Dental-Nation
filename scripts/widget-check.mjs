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
 * The widget's dropdowns are custom divs with no id/name/data-* — only Tailwind
 * classes, which change whenever anyone restyles it. So we anchor on the <label>
 * TEXT ("Select Time") and assert on RENDERED TEXT (a slot always looks like
 * "10:30 AM"), never on class names or DOM shape.
 *
 * Exit code is always 0: a failed check is a recorded data point, not a broken
 * workflow. Only an unreachable dashboard makes this exit non-zero.
 */
import { chromium } from 'playwright';

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

/** The widget field whose <label> reads `text` — returns the field container. */
function field(page, text) {
  return page.locator('label', { hasText: text }).first().locator('xpath=..');
}

const started = Date.now();
let browser;
let result = { ok: false, stage: 'loaded', slotsFound: null, detail: 'check did not complete' };

try {
  browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(20000);

  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // The widget is client-rendered; wait for the Select Time label to exist.
  const timeLabel = page.locator('label', { hasText: 'Select Time' }).first();
  await timeLabel.waitFor({ state: 'attached', timeout: 30000 });
  await timeLabel.scrollIntoViewIfNeeded().catch(() => {});
  result.stage = 'widget';

  const timeField = field(page, 'Select Time');

  // A date is preselected, so slots normally load on their own. Nudge the date
  // anyway when we can — that forces a fresh availability fetch rather than
  // reading whatever was cached on load. Best-effort: the date picker's markup
  // is unknown, so a failure here is not a widget failure.
  try {
    await field(page, 'Select a Date').click({ timeout: 5000 });
    await page.waitForTimeout(1500);
    // Pick any enabled day cell that isn't the currently selected one.
    const day = page.locator('[role="gridcell"]:not([aria-disabled="true"]), button:not([disabled])').filter({ hasText: /^\d{1,2}$/ });
    if (await day.count()) {
      await day.nth(Math.min(3, (await day.count()) - 1)).click({ timeout: 5000 });
      result.stage = 'date';
    }
    await page.waitForTimeout(2500);
  } catch {
    // Date interaction unavailable — fall through and read whatever is loaded.
  }
  await page.keyboard.press('Escape').catch(() => {});

  // Open the time dropdown and let it populate.
  try {
    await timeField.click({ timeout: 8000 });
    await page.waitForTimeout(2500);
  } catch {
    // Not clickable (often the disabled/empty state) — still read the text below.
  }
  result.stage = 'slots';

  // Read the widget region rather than the whole page: the site has other times
  // on it (opening hours), which would otherwise count as slots.
  const region = page.locator('label', { hasText: 'Select Time' }).first().locator('xpath=../../../..');
  // innerText preserves rendered whitespace between nodes; textContent does not.
  // Kept as a fallback because innerText needs a laid-out element.
  const read = async (loc) =>
    (await loc.innerText().catch(() => null)) ?? (await loc.textContent().catch(() => '')) ?? '';
  const text = `${await read(region)} ${await read(timeField)}`;

  if (NO_SLOTS_RE.test(text)) {
    result = { ok: false, stage: 'slots', slotsFound: 0, detail: 'Widget reported "No slots available" — patients cannot book.' };
  } else {
    // Exclude the date field's own text so "Jul 30, 2026" can't be misread.
    const slots = [...new Set((text.match(SLOT_RE) || []).map((s) => s.trim().toLowerCase()))];
    result = slots.length
      ? { ok: true, stage: 'slots', slotsFound: slots.length, detail: `${slots.length} time slot${slots.length === 1 ? '' : 's'} offered` }
      : { ok: false, stage: 'slots', slotsFound: 0, detail: 'Time dropdown rendered no selectable slots.' };
  }

  if (!result.ok) {
    await page.screenshot({ path: 'widget-failure.png', fullPage: false }).catch(() => {});
  }
} catch (e) {
  result = { ok: false, stage: result.stage, slotsFound: null, detail: `Check errored: ${e.message}`.slice(0, 400) };
} finally {
  await browser?.close().catch(() => {});
}

result.durationMs = Date.now() - started;
await report(result);
