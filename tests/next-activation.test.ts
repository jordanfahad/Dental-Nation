import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ACTIVATION_METRIC_IDS, METRICS } from '../lib/metrics/registry';
import { AMC_SHEET_URL, buildActivation, safePlatform, topPlatforms, type ActivationData } from '../lib/overview/activation';
import { ORTHO_GOOGLE_CAMPAIGN } from '../lib/alerts/orthoDaily';
import {
  SMILE_CLUB_COMPANIES, executiveLink, growthLink, marketingLink, periods, practoRevenueLink, socialLink,
} from '../lib/alerts/links';
import { parseRange, rangeParams, type ViewRange } from '../lib/overview/range';
import { assertDatedUrls } from './fixtures/next-range';
import { PLANTED_NAME, PLANTED_PHONE, TODAY, nullActivation, sampleActivation } from './fixtures/activation';

const P = periods(TODAY);

/** Render PreviewShell + ActivationView in a plain-React subprocess (the suite itself runs react-server). */
function render(cases: { data: ActivationData; range?: ViewRange; rangeParams?: Record<string, string> }[]): string[] {
  const script = `
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const { ActivationView } = require('./components/next/activation/ActivationView.tsx');
    const { PreviewShell } = require('./components/next/PreviewShell.tsx');
    const cases = JSON.parse(process.env.ACTIVATION_CASES);
    process.stdout.write(JSON.stringify(cases.map((c) => renderToStaticMarkup(
      React.createElement(PreviewShell, { active: 'Clinic Activation', rangeParams: c.rangeParams },
        React.createElement(ActivationView, { data: c.data, range: c.range }))
    ))));
  `;
  const result = spawnSync(process.execPath, ['--import', 'tsx', '-e', script], {
    cwd: process.cwd(), encoding: 'utf8',
    env: { ...process.env, TSX_DISABLE_CACHE: '1', ACTIVATION_CASES: JSON.stringify(cases) },
    maxBuffer: 16_000_000,
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout) as string[];
}

/** How renderToStaticMarkup escapes a data-proof attribute value. */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const hasProofUrl = (html: string, url: string) => assert.ok(html.includes(esc(`"url":"${url}"`)), `missing proof URL ${url}`);
/** The drawer payload of one figure: id and displayed value. */
const hasFigure = (html: string, id: string, value: string) => assert.ok(html.includes(esc(`"id":"${id}","value":"${value}"`)), `missing ${id} = ${value}`);

/** Every figure id the page shows. */
const PAGE_METRIC_IDS = [...ACTIVATION_METRIC_IDS, 'M06', 'M26', 'M31', 'M32'] as const;

const [populated, allNull] = render([
  { data: buildActivation(sampleActivation()) },
  { data: buildActivation(nullActivation()) },
]);

test('every figure renders with its id chip and the registry defines each one in plain English', () => {
  for (const id of PAGE_METRIC_IDS) {
    assert.ok(populated.includes(`${id} <span`), `figure chip for ${id} missing`);
    const def = METRICS[id];
    assert.ok(def, `registry entry for ${id} missing`);
    assert.equal(def.definitionVersion, 1);
    assert.ok(def.definition.length > 60 && def.source.length > 10, `registry entry for ${id} too thin`);
  }
  assert.deepEqual(ACTIVATION_METRIC_IDS, Array.from({ length: 22 }, (_, i) => `A${String(i + 1).padStart(2, '0')}`));
  for (const id of ACTIVATION_METRIC_IDS) {
    const d = METRICS[id];
    assert.equal(d.id, id);
    // One sentence, no dashes the house style does not use, no jargon.
    assert.equal(d.definition.split(/\.\s/).length, 1, `${id} must be one sentence`);
    assert.doesNotMatch(d.name + d.definition + d.source, /[–—]|\b(KPI|MTD|SQL|API|null)\b/);
  }
  // Every value of the synthetic read reaches the page, formatted.
  hasFigure(populated, 'A01', '12');
  hasFigure(populated, 'A01', '15');
  hasFigure(populated, 'A02', '4');
  hasFigure(populated, 'A04', '2');
  hasFigure(populated, 'A07', '3');
  hasFigure(populated, 'A08', '618');
  hasFigure(populated, 'A08', '349');
  hasFigure(populated, 'A11', '2');
  hasFigure(populated, 'M06', 'AED 7,240');
  hasFigure(populated, 'M06', 'AED 148,600');
  hasFigure(populated, 'A12', 'AED 11,579');
  hasFigure(populated, 'A12', 'AED 390,500');
  hasFigure(populated, 'A13', 'AED 3,914');
  hasFigure(populated, 'A13', 'AED 6,124');
  hasFigure(populated, 'A22', '2');
  hasFigure(populated, 'M31', 'AED 310');
  hasFigure(populated, 'M31', 'AED 1,520');
  hasFigure(populated, 'M32', '183');
  hasFigure(populated, 'M26', 'AED 38,600');
  // The front office's first name only.
  assert.ok(populated.includes('>Asha<') && !populated.includes('Asha Example'));
});

test('sections render in order, each with yesterday and the window', () => {
  const order = ['id="leads"', 'id="smile-club"', 'id="gbp"', 'id="revenue"', 'id="ortho"'].map((s) => populated.indexOf(s));
  assert.ok(order.every((i) => i > 0), 'a section is missing');
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.match(populated, /Yesterday, 28 Oct 2026 and 1 to 28 Oct 2026/);
  assert.match(populated, /Leads · Yesterday/);
  assert.match(populated, /Leads · Month to date/);
  for (const clinic of ['Al Wasl', 'Dr Tosun', 'Al Maher', 'Not assigned', 'All clinics']) assert.ok(populated.includes(`>${clinic}<`), clinic);
  assert.match(populated, /Are the clinics turning activity into patients\?/);
  // The shell nav carries the new page after Programmes and marks it current (desktop and phone).
  assert.ok(populated.indexOf('href="/next/programmes"') < populated.indexOf('href="/next/activation"'));
  assert.equal(populated.split('href="/next/activation" aria-current="page"').length - 1, 2, 'active nav highlight missing');
  assert.match(populated, /Navigate · Clinic Activation/);
  assert.match(populated, /Month to yesterday · 1 to 28 Oct 2026/);
});

test('proof URLs: Growth for leads and Smile Club, Executive for Practo, Social for GBP, the AMC sheet, the DN Ortho email views', () => {
  hasProofUrl(populated, growthLink(P.mtd, 'dn-alwasl'));
  hasProofUrl(populated, growthLink(P.yesterday, 'dr-tosun'));
  hasProofUrl(populated, growthLink(P.mtd, 'amc'));
  hasProofUrl(populated, growthLink(P.mtd, 'all'));
  hasProofUrl(populated, executiveLink(P.yesterday, 'dental-nation'));
  hasProofUrl(populated, executiveLink(P.mtd, 'dr-tosun'));
  hasProofUrl(populated, executiveLink(P.mtd));
  hasProofUrl(populated, socialLink('all'));
  hasProofUrl(populated, AMC_SHEET_URL);
  hasProofUrl(populated, marketingLink('google', P.mtd, { gcamp: ORTHO_GOOGLE_CAMPAIGN }));
  hasProofUrl(populated, marketingLink('google', P.yesterday, { gcamp: ORTHO_GOOGLE_CAMPAIGN }));
  hasProofUrl(populated, practoRevenueLink('dental-nation', P.mtd));
  hasProofUrl(populated, practoRevenueLink('dr-tosun', P.mtd));
  assert.ok(populated.includes(`href="${esc(SMILE_CLUB_COMPANIES)}"`), 'company pipeline anchor missing');
  assert.ok(populated.includes(`href="${esc(socialLink('all'))}"`), 'Google review count anchor missing');
  // Every figure on the page has a proof URL.
  const figures = populated.split('data-proof=').length - 1;
  const urls = populated.match(/&quot;url&quot;:&quot;https:\/\//g)?.length ?? 0;
  assert.ok(figures > 100, `expected many figures, got ${figures}`);
  assert.equal(urls, figures);
});

test('labels and notes say where each figure comes from, in plain words', () => {
  assert.ok(populated.includes('As entered by the front office in the lead tracker GMB tab, snapshotted daily.'));
  assert.ok(populated.includes('Daily copies start 29 Oct 2026'));
  assert.ok(populated.includes('AMC comes from the clinic&#x27;s daily sheet, not Practo'));
  assert.match(populated, /Missing days: 1 to 26 Oct 2026/);
  assert.ok(populated.includes('Practo does not record the treating doctor on almost all billed work'));
  assert.ok(populated.includes('lead tracker'));
  assert.ok(populated.includes('Smile Club tab'));
  // A doctor Practo cannot name stays "Not yet", with the reason in the drawer.
  hasFigure(populated, 'M26', 'Not yet');
  assert.ok(populated.includes('Dr Suzanna Almaali'));
  for (const html of [populated, allNull]) assert.doesNotMatch(html, /undefined|NaN|[–—]/);
});

test('an all-null read renders Unavailable or Not yet everywhere, never 0', () => {
  assert.ok((allNull.match(/Unavailable/g) ?? []).length >= 60, 'expected Unavailable throughout');
  assert.doesNotMatch(allNull, />0</, 'a null must never render as 0');
  assert.ok(!allNull.includes(esc('"value":"0"')), 'no drawer may carry 0');
  assert.ok(!allNull.includes(esc('"value":"AED 0"')));
  for (const id of PAGE_METRIC_IDS) assert.ok(allNull.includes(`${id} <span`), `all-null chip for ${id} missing`);
  hasFigure(allNull, 'M26', 'Not yet');
  assert.ok(allNull.includes('could not be read when this page was opened'));
  // Unavailable figures still carry their proof so the drawer explains them.
  hasProofUrl(allNull, executiveLink(P.mtd, 'dental-nation'));
  hasProofUrl(allNull, AMC_SHEET_URL);
});

test('no patient name or phone number can reach the page', () => {
  for (const html of [populated, allNull]) {
    assert.ok(!html.includes(PLANTED_NAME) && !html.includes(PLANTED_PHONE));
  }
  assert.ok(populated.includes('Other platform'));
  assert.equal(safePlatform('whatsapp'), 'WhatsApp');
  assert.equal(safePlatform('Mrs Someone'), 'Other platform');
  assert.deepEqual(topPlatforms({ Instagram: 3, 'A Person': 2, 'Another Person': 2, WhatsApp: 1 }), [
    { label: 'Other platform', count: 4 }, { label: 'Instagram', count: 3 }, { label: 'WhatsApp', count: 1 },
  ]);
  // The view model and the view never touch names, phones or doctor-level AMC lines.
  const model = JSON.stringify(buildActivation(sampleActivation()));
  assert.ok(!model.includes(PLANTED_NAME) && !model.includes(PLANTED_PHONE) && !model.includes('Dr. Alpha'));
  const view = readFileSync('components/next/activation/ActivationView.tsx', 'utf8');
  assert.doesNotMatch(view, /Patient Name|Contact Number|preparedBy|doctors\[/);
});

/* ── date range ── */

const CUSTOM = parseRange({ from: '2026-09-15', to: '2026-10-10' }, TODAY);
const DEFAULT = parseRange({}, TODAY);
const [custom, defaultExplicit] = render([
  { data: buildActivation(sampleActivation(CUSTOM)), range: CUSTOM, rangeParams: rangeParams(CUSTOM) },
  { data: buildActivation(sampleActivation(DEFAULT)), range: DEFAULT, rangeParams: rangeParams(DEFAULT) },
]);

test('the default range is month to yesterday; a custom range pins every dated proof URL to its dates', () => {
  assert.equal(defaultExplicit, populated);
  assert.match(custom, /Selected dates · 15 Sept? to 10 Oct 2026/);
  assert.match(custom, /Last day \(10 Oct 2026\)/);
  assertDatedUrls(custom, [CUSTOM, { from: CUSTOM.to, to: CUSTOM.to }]);
  hasProofUrl(custom, growthLink(CUSTOM, 'dn-alwasl'));
  hasProofUrl(custom, executiveLink(CUSTOM, 'dental-nation'));
  hasProofUrl(custom, executiveLink({ from: CUSTOM.to, to: CUSTOM.to }, 'dr-tosun'));
  assert.ok(custom.includes('href="/next/activation?from=2026-09-15&amp;to=2026-10-10"'));
  // Before the first GMB copy, the page says when copies start rather than 0.
  assert.ok(custom.includes('Daily copies start 29 Oct 2026'));
  assert.doesNotMatch(custom, /undefined|NaN|[–—]/);
});
