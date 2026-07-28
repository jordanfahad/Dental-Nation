/**
 * One-off discovery run against the live booking widget.
 *
 * scripts/widget-check.mjs was written from a STATIC copy of the widget's HTML.
 * That was enough to anchor on the <label> text, but it cannot show:
 *   - what the date picker renders once opened (so the date nudge is a guess),
 *   - what the time dropdown looks like when populated (option markup),
 *   - which network call fetches availability from Practo Insta, and what it
 *     returns when the widget is broken.
 *
 * This captures all three from the real page so the check can be hardened, and
 * so a cheap API-level check becomes possible later.
 *
 * READ-ONLY, like the check: it opens dropdowns and reads markup. It never
 * clicks "Continue Booking", so it cannot create an appointment.
 *
 * Output goes two ways — Supabase via /api/widget-probe (readable directly) and
 * ./probe/ as workflow artifacts (works even before the secrets are set).
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const SITE = process.env.SITE_URL || 'https://www.dentalnation.com/en/';
const ENDPOINT = process.env.DASHBOARD_URL;
const SECRET = process.env.WIDGET_HEALTH_SECRET || process.env.CRON_SECRET;
const OUT = 'probe';

const SLOTISH = /slot|avail|schedul|timing|calendar|appointment|practo|insta|booking/i;
const clip = (s, n = 4000) => (typeof s === 'string' && s.length > n ? `${s.slice(0, n)}…[truncated]` : s);

mkdirSync(OUT, { recursive: true });

const capture = {
  site: SITE,
  startedAt: new Date().toISOString(),
  calls: [], // every XHR/fetch
  slotResponses: [], // bodies of anything availability-shaped
  stages: {}, // widget markup after each interaction
  notes: [],
};

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(20000);

page.on('request', (r) => {
  const t = r.resourceType();
  if (t === 'xhr' || t === 'fetch') capture.calls.push({ method: r.method(), url: r.url(), at: Date.now() });
});
page.on('response', async (res) => {
  const t = res.request().resourceType();
  if ((t !== 'xhr' && t !== 'fetch') || !SLOTISH.test(res.url())) return;
  let body = '<unreadable>';
  try { body = clip(await res.text(), 3000); } catch { /* opaque or streamed */ }
  capture.slotResponses.push({ status: res.status(), method: res.request().method(), url: res.url(), body });
});

/** The widget field whose <label> reads `text`. */
const field = (text) => page.locator('label', { hasText: text }).first().locator('xpath=..');
const widget = () => page.locator('label', { hasText: 'Select Time' }).first().locator('xpath=../../../..');

async function snap(stage) {
  try {
    capture.stages[stage] = {
      widgetHtml: clip(await widget().innerHTML().catch(() => ''), 12000),
      widgetText: clip(await widget().innerText().catch(() => ''), 2000),
      timeFieldText: clip(await field('Select Time').innerText().catch(() => ''), 500),
      // Anything that looks like an open dropdown/listbox at this moment.
      overlays: clip(
        await page
          .locator('[role="listbox"], [role="dialog"], [role="grid"], ul[class*="absolute"], div[class*="absolute"][class*="z-"]')
          .allInnerTexts()
          .then((a) => a.filter(Boolean).slice(0, 6).join('\n---\n'))
          .catch(() => ''),
        3000,
      ),
    };
    await page.screenshot({ path: `${OUT}/${stage}.png` }).catch(() => {});
  } catch (e) {
    capture.notes.push(`snap(${stage}) failed: ${e.message}`);
  }
}

try {
  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('label', { hasText: 'Select Time' }).first().waitFor({ state: 'attached', timeout: 30000 });
  await widget().scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(3000);
  await snap('1-loaded');

  // Open the date picker and record its real structure — the check's date nudge
  // is currently guesswork built on assumed markup.
  const callsBeforeDate = capture.calls.length;
  try {
    await field('Select a Date').click({ timeout: 8000 });
    await page.waitForTimeout(2000);
    await snap('2-date-open');

    // Click a plausible day cell and see which request that triggers.
    const day = page
      .locator('[role="gridcell"], button, td, li')
      .filter({ hasText: /^\s*\d{1,2}\s*$/ });
    const n = await day.count();
    capture.notes.push(`date-open: ${n} day-like cells found`);
    if (n) {
      await day.nth(Math.min(5, n - 1)).click({ timeout: 5000 });
      await page.waitForTimeout(3500);
      await snap('3-date-picked');
    }
  } catch (e) {
    capture.notes.push(`date step failed: ${e.message}`);
  }
  capture.notes.push(`network calls triggered by date step: ${capture.calls.length - callsBeforeDate}`);

  await page.keyboard.press('Escape').catch(() => {});

  // Open the time dropdown — this is the one that renders empty during an outage.
  try {
    await field('Select Time').click({ timeout: 8000 });
    await page.waitForTimeout(3000);
    await snap('4-time-open');
  } catch (e) {
    capture.notes.push(`time step failed: ${e.message}`);
  }
} catch (e) {
  capture.notes.push(`FATAL: ${e.message}`);
} finally {
  capture.finishedAt = new Date().toISOString();
  await browser.close().catch(() => {});
}

writeFileSync(`${OUT}/capture.json`, JSON.stringify(capture, null, 2));
console.log(`calls=${capture.calls.length} slotResponses=${capture.slotResponses.length}`);
console.log('notes:', capture.notes.join(' | '));
console.log('slot-ish URLs:', capture.slotResponses.map((r) => `${r.status} ${r.url}`).join('\n') || '(none)');

if (ENDPOINT && SECRET) {
  const res = await fetch(`${ENDPOINT.replace(/\/$/, '')}/api/widget-probe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${SECRET}` },
    body: JSON.stringify(capture),
  });
  console.log(res.ok ? 'Reported to dashboard.' : `Dashboard rejected: ${res.status} ${await res.text()}`);
} else {
  console.log('DASHBOARD_URL / WIDGET_HEALTH_SECRET not set — see the uploaded artifact instead.');
}
