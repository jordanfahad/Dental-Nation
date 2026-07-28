/**
 * One-off discovery run against the live booking widget.
 *
 * Rewritten after the first live run returned nothing useful: it died on
 * "waiting for label 'Select Time'" BEFORE taking a single snapshot, so we got
 * no screenshot and no markup — exactly when we needed them most.
 *
 * The rule now: capture evidence unconditionally, first, and only then try to
 * interact. A run that fails to find the widget must still show what the page
 * looked like, which frames existed, and whether the widget text is present
 * anywhere in the DOM.
 *
 * READ-ONLY: it opens dropdowns and reads markup. It never clicks
 * "Continue Booking", so it cannot create an appointment.
 *
 * Output goes two ways — Supabase via /api/widget-probe and ./probe/ artifacts.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { findWidget, dismissOverlays, pickOption } from './widget-lib.mjs';

const SITE = process.env.SITE_URL || 'https://www.dentalnation.com/en/';
const ENDPOINT = process.env.DASHBOARD_URL;
const SECRET = process.env.WIDGET_HEALTH_SECRET || process.env.CRON_SECRET;
const OUT = 'probe';

const SLOTISH = /slot|avail|schedul|timing|calendar|appointment|practo|insta|zavis/i;
const clip = (s, n = 4000) => (typeof s === 'string' && s.length > n ? `${s.slice(0, n)}…[truncated]` : s);

mkdirSync(OUT, { recursive: true });

const capture = {
  site: SITE,
  startedAt: new Date().toISOString(),
  calls: [],
  slotResponses: [],
  frames: [],
  pageProbe: {},
  stages: {},
  notes: [],
};

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(20000);

page.on('request', (r) => {
  const t = r.resourceType();
  if (t === 'xhr' || t === 'fetch') capture.calls.push({ method: r.method(), url: r.url() });
});
page.on('response', async (res) => {
  const t = res.request().resourceType();
  if ((t !== 'xhr' && t !== 'fetch') || !SLOTISH.test(res.url())) return;
  let body = '<unreadable>';
  try { body = clip(await res.text(), 2500); } catch { /* opaque or streamed */ }
  capture.slotResponses.push({ status: res.status(), method: res.request().method(), url: res.url(), body });
});

async function snap(stage, frame) {
  try {
    const scope = frame ?? page;
    capture.stages[stage] = {
      bodyText: clip(await scope.locator('body').innerText().catch(() => ''), 2500),
      widgetHtml: clip(
        await scope.locator('label', { hasText: 'Select Time' }).first().locator('xpath=../../../..')
          .innerHTML().catch(() => ''),
        12000,
      ),
    };
    await page.screenshot({ path: `${OUT}/${stage}.png`, fullPage: stage === '1-loaded' }).catch(() => {});
  } catch (e) {
    capture.notes.push(`snap(${stage}) failed: ${e.message}`);
  }
}

try {
  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);

  // EVIDENCE FIRST — before any waiting that could throw.
  capture.pageProbe.title = await page.title().catch(() => '');
  capture.pageProbe.url = page.url();
  const html = (await page.content().catch(() => '')) || '';
  capture.pageProbe.htmlLength = html.length;
  capture.pageProbe.hasSelectTimeText = /Select Time/i.test(html);
  capture.pageProbe.hasSelectDateText = /Select a Date/i.test(html);
  capture.pageProbe.hasLabelTag = /<label/i.test(html);
  capture.pageProbe.iframeCount = (html.match(/<iframe/gi) || []).length;
  capture.frames = page.frames().map((f) => ({ url: f.url(), name: f.name() }));
  await snap('1-loaded');

  await dismissOverlays(page);

  // Entry field first — Select Time does not exist until condition + treatment
  // are answered (see widget-lib.mjs).
  const entry = await findWidget(page, { timeoutMs: 45000, labelText: 'Select Condition' });
  if (entry) {
    capture.notes.push(`entry found in frame ${entry.frame.url()}`);
    await snap('2-entry', entry.frame);
    // Open the condition dropdown WITHOUT selecting, and dump the option markup.
    // Every wrong guess so far has been about what an option looks like.
    try {
      await entry.frame.locator('label', { hasText: 'Select Condition' }).first().locator('xpath=..').click({ timeout: 8000 });
      await page.waitForTimeout(2000);
      capture.stages['2b-condition-open'] = {
        bodyText: clip(await entry.frame.locator('body').innerText().catch(() => ''), 1500),
        // Everything that looks clickable right now, with its tag + classes.
        clickables: clip(
          JSON.stringify(
            await entry.frame.evaluate(() => {
              // Scope to what is BELOW the condition field: the first attempt
              // spent all 40 slots on the site header and never reached the
              // dropdown, which was the entire point of the capture.
              const label = [...document.querySelectorAll('label')].find((l) =>
                /Select Condition/i.test(l.textContent || ''),
              );
              const anchor = label ? label.getBoundingClientRect().bottom : 0;
              const out = [];
              for (const el of document.querySelectorAll('[role="option"], li, button, div, span, p')) {
                const t = (el.textContent || '').trim();
                if (!t || t.length > 60 || el.children.length > 2) continue;
                const r = el.getBoundingClientRect();
                if (r.width < 40 || r.height < 12 || r.height > 120) continue;
                if (r.top < anchor - 4) continue; // above the field — page chrome
                out.push({
                  tag: el.tagName,
                  cls: (el.className || '').toString().slice(0, 100),
                  text: t.slice(0, 50),
                  y: Math.round(r.top),
                });
                if (out.length > 30) break;
              }
              return out;
            }).catch(() => []),
          ),
          6000,
        ),
      };
      await page.screenshot({ path: `${OUT}/2b-condition-open.png` }).catch(() => {});
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(500);
    } catch (e) {
      capture.notes.push(`condition-open capture failed: ${e.message}`);
    }

    const gotC = await pickOption(page, entry.frame, 'Select Condition');
    capture.notes.push(`pick condition: ${gotC}`);
    await snap('3-condition', entry.frame);
    const gotT = gotC ? await pickOption(page, entry.frame, 'Select Treatment') : false;
    capture.notes.push(`pick treatment: ${gotT}`);
    await snap('4-treatment', entry.frame);
  } else {
    capture.notes.push('entry field "Select Condition" not found either.');
  }

  const found = await findWidget(page, { timeoutMs: 20000, labelText: 'Select Time' });
  if (!found) {
    capture.notes.push('findWidget: label "Select Time" not found in ANY frame after 45s of scrolling.');
    // Re-probe after scrolling — lazy content may have appeared meanwhile.
    const html2 = (await page.content().catch(() => '')) || '';
    capture.pageProbe.afterScroll = {
      htmlLength: html2.length,
      hasSelectTimeText: /Select Time/i.test(html2),
      frames: page.frames().map((f) => f.url()),
    };
    await snap('2-not-found');
  } else {
    const { frame, label } = found;
    capture.notes.push(`findWidget: found in frame ${frame.url()}`);
    await label.scrollIntoViewIfNeeded().catch(() => {});
    await snap('2-widget', frame);

    const field = (t) => frame.locator('label', { hasText: t }).first().locator('xpath=..');
    const before = capture.calls.length;
    try {
      await field('Select a Date').click({ timeout: 8000 });
      await page.waitForTimeout(2000);
      await snap('3-date-open', frame);
      const day = frame.locator('[role="gridcell"], button, td, li').filter({ hasText: /^\s*\d{1,2}\s*$/ });
      const n = await day.count();
      capture.notes.push(`date-open: ${n} day-like cells`);
      if (n) {
        await day.nth(Math.min(5, n - 1)).click({ timeout: 5000 });
        await page.waitForTimeout(3500);
        await snap('4-date-picked', frame);
      }
    } catch (e) {
      capture.notes.push(`date step failed: ${e.message}`);
    }
    capture.notes.push(`calls triggered by date step: ${capture.calls.length - before}`);

    await page.keyboard.press('Escape').catch(() => {});
    try {
      await field('Select Time').click({ timeout: 8000 });
      await page.waitForTimeout(3000);
      await snap('5-time-open', frame);
    } catch (e) {
      capture.notes.push(`time step failed: ${e.message}`);
    }
  }
} catch (e) {
  capture.notes.push(`FATAL: ${e.message}`);
  await snap('9-fatal').catch(() => {});
} finally {
  capture.finishedAt = new Date().toISOString();
  await browser.close().catch(() => {});
}

writeFileSync(`${OUT}/capture.json`, JSON.stringify(capture, null, 2));
console.log(`calls=${capture.calls.length} slotResponses=${capture.slotResponses.length} frames=${capture.frames.length}`);
console.log('pageProbe:', JSON.stringify(capture.pageProbe));
console.log('notes:', capture.notes.join(' | '));

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
