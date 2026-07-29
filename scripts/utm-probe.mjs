/**
 * Google Ads tracking probe — one-off diagnostic, READ-ONLY.
 *
 * Loads the live site exactly the way a Google Ads click lands (auto-tagging
 * gclid + explicit UTMs), walks the booking widget only as far as
 * condition → treatment, and records every place the tag could survive:
 *
 *   - every XHR/fetch whose URL or POST body mentions utm/gclid/source
 *     (this is where we see what the Zavis widget actually transmits)
 *   - localStorage / sessionStorage / cookies after load
 *   - whether the page's own scripts reference utm_source / gclid at all
 *
 * It NEVER clicks "Continue Booking" — it cannot create an appointment, a
 * lead, or an OTP request. The question it answers: does a gclid/UTM-tagged
 * visit leave ANY trace the widget forwards, the way ArabyAds PID/SUB tags
 * provably do? That decides whether attribution needs a widget change (ask
 * Zavis) or only ad-side tagging (tracking template).
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { findWidget, dismissOverlays, pickOption } from './widget-lib.mjs';

const BASE = process.env.SITE_URL || 'https://www.dentalnation.com/en/';
const URL_ = `${BASE}${BASE.includes('?') ? '&' : '?'}utm_source=google&utm_medium=cpc&utm_campaign=dn_probe&gclid=TESTGCLID_PROBE_2026`;
const INTERESTING = /utm_|gclid|source|referr|campaign|(?<![a-z])pid(?![a-z])|sub_/i;
const OUT = 'probe';

mkdirSync(OUT, { recursive: true });
const out = { url: URL_, startedAt: new Date().toISOString(), calls: [], storage: {}, cookies: [], scriptHits: {}, widget: {}, notes: [] };

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(20000);

page.on('request', (r) => {
  const t = r.resourceType();
  if (t !== 'xhr' && t !== 'fetch') return;
  const body = r.postData() ?? '';
  const tagged = INTERESTING.test(r.url()) || INTERESTING.test(body);
  out.calls.push({
    url: r.url().slice(0, 220),
    // Bodies only when they carry something tag-shaped — this is a public log.
    body: tagged && body ? body.slice(0, 600) : body ? '<body present, no tag>' : '',
    tagged,
  });
});

try {
  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);

  // Storage + cookies — where attribution survives between pages if at all.
  out.storage = await page
    .evaluate(() => {
      const grab = (s) => {
        const o = {};
        for (let i = 0; i < s.length; i++) {
          const k = s.key(i);
          const v = String(s.getItem(k) ?? '');
          if (/utm|gclid|source|campaign|attribution|referr/i.test(k + v)) o[k] = v.slice(0, 300);
        }
        return o;
      };
      return { local: grab(localStorage), session: grab(sessionStorage) };
    })
    .catch((e) => ({ error: e.message }));
  out.cookies = (await page.context().cookies())
    .filter((c) => INTERESTING.test(c.name + c.value))
    .map((c) => ({ name: c.name, value: c.value.slice(0, 120) }));

  // Do the site's own scripts ever read these params?
  out.scriptHits = await page
    .evaluate(async () => {
      const srcs = [...document.scripts].map((s) => s.src).filter((s) => s && s.startsWith(location.origin)).slice(0, 15);
      const hits = { utm_source: 0, gclid: 0, urlParams: 0, inlineUtm: false, scriptsChecked: srcs.length };
      const inline = [...document.scripts].filter((s) => !s.src).map((s) => s.textContent || '').join('\n');
      hits.inlineUtm = /utm_source|gclid/.test(inline);
      for (const src of srcs) {
        try {
          const t = await (await fetch(src)).text();
          if (/utm_source/.test(t)) hits.utm_source++;
          if (/gclid/.test(t)) hits.gclid++;
          if (/URLSearchParams|location\.search/.test(t)) hits.urlParams++;
        } catch {
          /* opaque script — skip */
        }
      }
      return hits;
    })
    .catch((e) => ({ error: e.message }));

  // Walk the widget far enough that it mints its token and fires its calls —
  // that traffic is where a forwarded Source would appear. Never Continue.
  await dismissOverlays(page);
  const entry = await findWidget(page, { timeoutMs: 30000, labelText: 'Select Condition' });
  out.widget.found = Boolean(entry);
  if (entry) {
    const gotC = await pickOption(page, entry.frame, 'Select Condition');
    const gotT = gotC ? await pickOption(page, entry.frame, 'Select Treatment') : false;
    out.widget.walked = { condition: gotC, treatment: gotT };
    await page.waitForTimeout(3000);
  }
} catch (e) {
  out.notes.push(`FATAL: ${e.message}`);
} finally {
  await browser.close().catch(() => {});
}

out.finishedAt = new Date().toISOString();
out.taggedCalls = out.calls.filter((c) => c.tagged);
out.totalCalls = out.calls.length;

writeFileSync(`${OUT}/utm-probe.json`, JSON.stringify(out, null, 2));
// Log the verdict-shaped summary; the artifact has the full detail.
console.log(`total XHR/fetch: ${out.totalCalls}, tagged: ${out.taggedCalls.length}`);
console.log('scriptHits:', JSON.stringify(out.scriptHits));
console.log('storage:', JSON.stringify(out.storage));
console.log('cookies:', JSON.stringify(out.cookies));
console.log('widget:', JSON.stringify(out.widget));
for (const c of out.taggedCalls.slice(0, 20)) console.log('TAGGED', c.url, c.body ? `BODY ${c.body.slice(0, 200)}` : '');
if (out.notes.length) console.log('notes:', out.notes.join(' | '));
