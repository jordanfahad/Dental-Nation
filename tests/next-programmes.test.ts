import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { METRICS, metricDef } from '../lib/metrics/registry';
import { buildProgrammes, CONTENT_CALENDAR_LINK, type OrthoCampaign, type ProgrammesData } from '../lib/overview/programmes';
import { ORTHO_GOOGLE_CAMPAIGN } from '../lib/alerts/orthoDaily';
import type { SmileClubDailyData } from '../lib/alerts/smileclubDaily';
import { STAGES, type Stage } from '../lib/smileclub/corporate';
import {
  SMILE_CLUB_COMPANIES, SMILE_CLUB_SCRIPTS, executiveLink, growthLink, marketingLink, periods, practoRevenueLink,
} from '../lib/alerts/links';
import { parseRange, rangeParams, type ViewRange } from '../lib/overview/range';
import { assertDatedUrls } from './fixtures/next-range';

const TODAY = '2026-10-28';
const P = periods(TODAY);

/** Every value distinct, so each figure and its proof URL can be checked. */
function sampleCampaign(): OrthoCampaign {
  return {
    campaign: ORTHO_GOOGLE_CAMPAIGN,
    yesterday: { spend: 300, impressions: 2100, clicks: 40, activeDays: 1 },
    mtd: { spend: 1500, impressions: 9400, clicks: 180, activeDays: 4 },
  };
}

/** The email reader's own shape: a stored row set with no active day yet. */
function notLiveCampaign(): OrthoCampaign {
  return {
    campaign: ORTHO_GOOGLE_CAMPAIGN,
    yesterday: { spend: 0, impressions: 0, clicks: 0, activeDays: 0 },
    mtd: { spend: 0, impressions: 0, clicks: 0, activeDays: 0 },
  };
}

function sampleSmile(): SmileClubDailyData {
  const win = (enquiries: number, booked: number, showed: number) => ({ enquiries, booked, showed });
  const byStage = Object.fromEntries(STAGES.map((s) => [s.id, 0])) as Record<Stage, number>;
  byStage[STAGES[0].id] = 5;
  return {
    growth: {
      all: { yesterday: win(3, 2, 1), mtd: win(40, 18, 14) },
      'dn-alwasl': { yesterday: null, mtd: null },
      'dr-tosun': { yesterday: null, mtd: null },
      amc: { yesterday: null, mtd: null },
    },
    companies: { byStage, members: 24 },
    shootChanges: [],
    scriptsWaiting: { shadi: 2, luvi: 1, gautam: 3 },
    tasksDueToday: null,
  };
}

/** Render PreviewShell + ProgrammesView in a plain-React subprocess (the suite itself runs react-server). */
function render(cases: { data: ProgrammesData; range?: ViewRange; rangeParams?: Record<string, string> }[]): string[] {
  const script = `
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const { ProgrammesView } = require('./components/next/programmes/ProgrammesView.tsx');
    const { PreviewShell } = require('./components/next/PreviewShell.tsx');
    const cases = JSON.parse(process.env.PROGRAMMES_CASES);
    process.stdout.write(JSON.stringify(cases.map((c) => renderToStaticMarkup(
      React.createElement(PreviewShell, { active: 'Programmes', rangeParams: c.rangeParams },
        React.createElement(ProgrammesView, { data: c.data, range: c.range }))
    ))));
  `;
  const result = spawnSync(process.execPath, ['--import', 'tsx', '-e', script], {
    cwd: process.cwd(), encoding: 'utf8',
    env: { ...process.env, TSX_DISABLE_CACHE: '1', PROGRAMMES_CASES: JSON.stringify(cases) },
    maxBuffer: 16_000_000,
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout) as string[];
}

/** How renderToStaticMarkup escapes a data-proof attribute value. */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
/** Assert a figure's drawer payload carries exactly this proof URL. */
const hasProofUrl = (html: string, url: string) => assert.ok(html.includes(esc(`"url":"${url}"`)), `missing proof URL ${url}`);

/** Every figure the Programmes page shows (M33 and M35 stay links, not figures). */
const PAGE_METRIC_IDS = ['M19', 'M20', 'M21', 'M22', 'M23', 'M24', 'M25', 'M31', 'M32', 'M34'] as const;

const [populated, allNull, notLive] = render([
  { data: buildProgrammes(sampleCampaign(), sampleSmile(), TODAY) },
  { data: buildProgrammes(null, null, TODAY) },
  { data: buildProgrammes(notLiveCampaign(), sampleSmile(), TODAY) },
]);

test('every figure renders with its M-id and the registry covers them all', () => {
  for (const id of PAGE_METRIC_IDS) {
    assert.ok(populated.includes(`${id} <span`), `figure chip for ${id} missing`);
    assert.equal(METRICS[id].definitionVersion, 1);
    assert.ok(METRICS[id].definition.length > 40 && METRICS[id].source.length > 10, `registry entry for ${id} too thin`);
  }
  // The page leans on the registry phase's definitions.
  assert.match(metricDef('M31').definition, /23 Oct 2026/);
  assert.match(metricDef('M32').definition, /23 Oct 2026/);
  assert.match(metricDef('M20').definition, /never split by clinic/);
  assert.match(metricDef('M23').definition, /unavailable/);
  assert.match(metricDef('M24').definition, /unavailable/);
  assert.match(metricDef('M34').definition, /assignment/);
  // M33 and M35 are named on the page (as link cards and the registry line), not shown as counts.
  assert.ok(populated.includes(metricDef('M33').name), 'M33 name missing');
  assert.ok(populated.includes(metricDef('M34').name), 'M34 name missing');
  assert.ok(populated.includes(metricDef('M35').name.toLowerCase()), 'M35 name missing');
  // The distinct fixture values all render (null-free figures, formatted).
  for (const s of ['AED 1,500', '180', '24', '40', '18', '14', '6']) {
    assert.ok(populated.includes(`>${s}<`), `value ${s} missing`);
  }
  assert.ok(populated.includes(esc('"value":"6"')), 'M34 drawer value missing');
  assert.match(populated, /review assignments/);
  assert.match(populated, /NEW DESIGN/);
  assert.match(populated, /Is the work turning into results\?/);
  assert.match(populated, /Programme outcomes stay separate from campaign activity/);
  assert.match(populated, /Plans, scripts and follow-up work/);
  assert.match(populated, /Definition version 1 · Click a number for its proof/);
  // The shell nav links the four real pages and marks this one current (desktop and phone).
  for (const href of ['/next', '/next/channels', '/next/clinics', '/next/programmes']) {
    assert.ok(populated.includes(`href="${href}"`), `nav link ${href} missing`);
  }
  assert.equal(populated.split('href="/next/programmes" aria-current="page"').length - 1, 2, 'active nav highlight missing');
  assert.match(populated, /Navigate · Programmes/);
});

test('drawer proof URLs are exactly the morning email links for the same dates and clinics', () => {
  hasProofUrl(populated, marketingLink('google', P.mtd, { gcamp: ORTHO_GOOGLE_CAMPAIGN })); // M31, M32
  hasProofUrl(populated, growthLink(P.mtd));                       // M20-M22 and M23's nearest view
  hasProofUrl(populated, executiveLink(P.mtd));                    // M24 nearest view
  hasProofUrl(populated, practoRevenueLink('dental-nation', P.mtd)); // M25 nearest view
  hasProofUrl(populated, SMILE_CLUB_COMPANIES);                    // M19
  hasProofUrl(populated, SMILE_CLUB_SCRIPTS);                      // M34
  // The delivery strip's anchors open the existing panels and the content calendar.
  for (const url of [SMILE_CLUB_SCRIPTS, SMILE_CLUB_COMPANIES, CONTENT_CALENDAR_LINK]) {
    assert.ok(populated.includes(`href="${esc(url)}"`), `missing delivery anchor ${url}`);
  }
});

test('honesty notes render in plain words', () => {
  assert.match(populated, /1 to 27 Oct 2026/);
  for (const html of [populated, allNull, notLive]) {
    // Programme outcomes never borrow a lookalike number.
    assert.match(html, /Campaign-to-patient linkage/);
    assert.match(html, /not programme\s*revenue/);
    assert.ok(html.includes('99% of priced lines'), 'charge-line gap note missing');
    // The campaign's launch date and the account-headline warning (DN-032 finding).
    assert.match(html, /live since 23 Oct 2026/);
    assert.ok(html.includes('headline figures count the whole Google Ads account'), 'account-headline drawer warning missing');
    assert.ok(html.includes('filtered row in the campaign table'), 'campaign-table drawer warning missing');
    // The Smile Club proxy warning, and shared enquiries never split by clinic.
    assert.match(html, /does not prove that every appointment belongs to a paid\s*member/);
    assert.match(html, /never split by clinic/);
    assert.match(html, /Clicks are not patient enquiries/);
    assert.match(html, /payment status not verified by billing/);
  }
  // A stored campaign with no active day yet shows the email's "not live" state, never AED 0.
  assert.match(notLive, /No campaign activity yet/);
  assert.ok(notLive.includes(esc('"id":"M31","value":"Unavailable"')), 'not-live spend must be Unavailable');
  assert.ok(notLive.includes('no reported activity on these days yet'), 'not-live reason missing');
  assert.match(populated, /Live campaign activity/);
});

test('an all-null read renders Unavailable everywhere and never a bare 0, undefined or NaN', () => {
  assert.ok((allNull.match(/Unavailable/g) ?? []).length >= 8, 'expected Unavailable throughout');
  // M23, M24 and M25 are unavailable even on the populated page: activity never stands in for outcomes.
  for (const id of ['M23', 'M24', 'M25'] as const) {
    assert.ok(populated.includes(esc(`"id":"${id}","value":"Unavailable"`)), `${id} must stay Unavailable`);
  }
  for (const html of [populated, allNull, notLive]) {
    assert.doesNotMatch(html, />0</, 'a null must never render as 0');
    assert.doesNotMatch(html, /undefined|NaN|—/);
  }
  // Still a full page: every chip but M34, whose card degrades to a link without a number.
  for (const id of PAGE_METRIC_IDS.filter((id) => id !== 'M34')) {
    assert.ok(allNull.includes(`${id} <span`), `all-null chip for ${id} missing`);
  }
  assert.ok(!allNull.includes('M34 <span'), 'an unread scripts count must not render a figure');
  assert.ok(allNull.includes('could not be read, so no count is shown'), 'scripts-unread reason missing');
  for (const url of [SMILE_CLUB_SCRIPTS, SMILE_CLUB_COMPANIES, CONTENT_CALENDAR_LINK]) {
    assert.ok(allNull.includes(`href="${esc(url)}"`), `all-null delivery anchor ${url} missing`);
  }
  // Unavailable figures still carry their proof so the drawer explains them.
  hasProofUrl(allNull, marketingLink('google', P.mtd, { gcamp: ORTHO_GOOGLE_CAMPAIGN }));
  hasProofUrl(allNull, practoRevenueLink('dental-nation', P.mtd));
  assert.ok(allNull.includes(esc('"value":"Unavailable"')));
});

/* ── date range ── */

const CUSTOM = parseRange({ from: '2026-09-15', to: '2026-10-10' }, TODAY);
const DEFAULT = parseRange({}, TODAY);
const LASTMONTH = parseRange({ preset: 'lastmonth' }, TODAY);
const [custom, defaultExplicit, lastMonth] = render([
  { data: buildProgrammes(sampleCampaign(), sampleSmile(), TODAY, CUSTOM), range: CUSTOM, rangeParams: rangeParams(CUSTOM) },
  { data: buildProgrammes(sampleCampaign(), sampleSmile(), TODAY, DEFAULT), range: DEFAULT, rangeParams: rangeParams(DEFAULT) },
  { data: buildProgrammes(sampleCampaign(), sampleSmile(), TODAY, LASTMONTH), range: LASTMONTH, rangeParams: rangeParams(LASTMONTH) },
]);

test('the default range renders exactly as the page did before the date control', () => {
  assert.equal(defaultExplicit, populated);
  assert.match(populated, /Month to yesterday · 1 to 27 Oct 2026/);
});

test('a custom range renders its own dates and every proof URL carries them', () => {
  assert.match(custom, /Selected dates · 15 Sept? to 10 Oct 2026/);
  assert.doesNotMatch(custom, /Month to yesterday|1 to 27 Oct 2026/);
  assertDatedUrls(custom, [CUSTOM]);
  hasProofUrl(custom, marketingLink('google', CUSTOM, { gcamp: ORTHO_GOOGLE_CAMPAIGN }));
  hasProofUrl(custom, growthLink(CUSTOM));
  hasProofUrl(custom, executiveLink(CUSTOM));
  hasProofUrl(custom, practoRevenueLink('dental-nation', CUSTOM));
  // Members and scripts waiting stay live and say so, whatever the range.
  hasProofUrl(custom, SMILE_CLUB_COMPANIES);
  hasProofUrl(custom, SMILE_CLUB_SCRIPTS);
  assert.ok(custom.includes(esc('"dates":"Live at the moment the page is opened"')));
  assert.ok(custom.includes('href="/next?from=2026-09-15&amp;to=2026-10-10"'));
  // Last month: whole of September, highlighted and carried.
  assert.match(lastMonth, /Last month · 1 to 30 Sept? 2026/);
  assert.match(lastMonth, /href="\/next\/programmes\?preset=lastmonth" aria-current="true"/);
  assertDatedUrls(lastMonth, [{ from: '2026-09-01', to: '2026-09-30' }]);
  for (const html of [custom, lastMonth]) assert.doesNotMatch(html, />0<|undefined|NaN|—/);
});
