import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { CHANNELS } from '../config/growth-channels';
import { METRIC_IDS, METRICS } from '../lib/metrics/registry';
import { buildOverview, emptyPerformance, type OverviewData } from '../lib/overview/read';
import {
  SMILE_CLUB_COMPANIES, addDaysIso, executiveLink, growthLink, marketingLink, periods, periodsFor, practoRevenueLink, socialLink,
} from '../lib/alerts/links';
import { MAX_SPAN_DAYS, defaultRange, parseRange, presetRange, rangeParams, type ViewRange } from '../lib/overview/range';
import { assertDatedUrls } from './fixtures/next-range';
import type { PerfChannel, PerformanceDailyData } from '../lib/alerts/performanceDaily';

const TODAY = '2026-10-28';
const P = periods(TODAY);

const channel = (key: string, over: Partial<PerfChannel> = {}): PerfChannel =>
  ({ key, enquiries: 0, booked: 0, showed: 0, spend: null, costPerEnquiry: null, costIsEstimate: false, ...over });
const win = (totals: { enquiries: number; booked: number; showed: number }, over: Record<string, Partial<PerfChannel>> = {}) =>
  ({ ...totals, channels: CHANNELS.map((c) => channel(c.key, over[c.key])) });

/** Every value distinct, so each figure and its proof URL can be checked. */
function sample(): PerformanceDailyData {
  return {
    growth: {
      yesterday: win({ enquiries: 28, booked: 14, showed: 11 }),
      mtd: win({ enquiries: 620, booked: 260, showed: 210 }),
      // Paid search rises by 5, WhatsApp falls by 4 (both beyond MOVER_MIN = 3).
      last7: win({ enquiries: 192, booked: 80, showed: 60 }, { 'paid-search': { enquiries: 12 }, whatsapp: { enquiries: 2 } }),
      prior7: win({ enquiries: 160, booked: 70, showed: 50 }, { 'paid-search': { enquiries: 7 }, whatsapp: { enquiries: 6 } }),
    },
    clinics: {
      'dental-nation': { yesterday: { booked: 9, showed: 7, billed: 4100 }, mtd: { booked: 170, showed: 140, billed: 78000 } },
      'dr-tosun': { yesterday: { booked: 4, showed: 3, billed: 1700 }, mtd: { booked: 87, showed: 68, billed: 42000 } },
      'al-maher': { yesterday: { booked: 1, showed: 1, billed: 700 }, mtd: { booked: 3, showed: 2, billed: 1500 } },
      group: { yesterday: { booked: 14, showed: 11, billed: 6500 }, mtd: { booked: 260, showed: 210, billed: 121500 } },
    },
    adSpendMtd: 12400,
    orthoBillingMtd: 9000,
    smileClubMembers: 24,
    reviews: { total: 183, average: 4.8 },
    brandSearches: 880,
    brandedShare: { percent: 41, from: P.mtd.from, to: P.mtd.to },
    instagram: { followers: 5000, reachMtd: 90000 },
  };
}

/** Render PreviewShell + OverviewView in a plain-React subprocess (the suite itself runs react-server). */
function render(cases: { data: OverviewData; clinic: string; range?: ViewRange; rangeParams?: Record<string, string> }[]): string[] {
  const script = `
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const { OverviewView } = require('./components/next/OverviewView.tsx');
    const { PreviewShell } = require('./components/next/PreviewShell.tsx');
    const cases = JSON.parse(process.env.OVERVIEW_CASES);
    process.stdout.write(JSON.stringify(cases.map((c) => renderToStaticMarkup(
      React.createElement(PreviewShell, c.rangeParams ? { rangeParams: c.rangeParams } : null,
        React.createElement(OverviewView, { data: c.data, clinic: c.clinic, range: c.range }))
    ))));
  `;
  const result = spawnSync(process.execPath, ['--import', 'tsx', '-e', script], {
    cwd: process.cwd(), encoding: 'utf8',
    env: { ...process.env, TSX_DISABLE_CACHE: '1', OVERVIEW_CASES: JSON.stringify(cases) },
    maxBuffer: 16_000_000,
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout) as string[];
}

/** How renderToStaticMarkup escapes a data-proof attribute value. */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
/** Assert a figure's drawer payload carries exactly this proof URL. */
const hasProofUrl = (html: string, url: string) => assert.ok(html.includes(esc(`"url":"${url}"`)), `missing proof URL ${url}`);

const [populated, allNull, tosunLens] = render([
  { data: buildOverview(sample(), 3, TODAY), clinic: 'all' },
  { data: buildOverview(emptyPerformance(), null, TODAY), clinic: 'all' },
  { data: buildOverview(sample(), 3, TODAY), clinic: 'dr-tosun' },
]);

test('every figure renders with its M-id and the registry covers them all', () => {
  for (const id of METRIC_IDS) {
    assert.ok(populated.includes(`${id} <span`), `figure chip for ${id} missing`);
    assert.equal(METRICS[id].definitionVersion, 1);
    assert.ok(METRICS[id].definition.length > 40 && METRICS[id].source.length > 10, `registry entry for ${id} too thin`);
  }
  // The distinct fixture values all render (null-free figures, formatted).
  for (const s of ['620', '28', '260', '210', 'AED 121,500', 'AED 6,500', 'AED 12,400', 'AED 20.00',
    '170', '140', 'AED 78,000', '87', '68', 'AED 42,000', 'AED 1,500', '24', '183', '4.80']) {
    assert.ok(populated.includes(`>${s}<`), `value ${s} missing`);
  }
  assert.match(populated, /NEW DESIGN/);
  assert.match(populated, /live figures/);
  assert.match(populated, /href="\/\?tab=executive"/);
  assert.match(populated, /is still in the detailed dashboard/);
  for (const nav of ['Overview', 'Channels', 'Clinics', 'Programmes', 'Reports', 'Admin']) assert.ok(populated.includes(`>${nav}<`), nav);
  // The shell nav links the four real pages and marks the Overview current (desktop and phone).
  for (const href of ['/next/channels', '/next/clinics', '/next/programmes']) {
    assert.ok(populated.includes(`href="${href}"`), `nav link ${href} missing`);
  }
  assert.equal(populated.split('href="/next" aria-current="page"').length - 1, 2, 'active nav highlight missing');
  assert.match(populated, /Navigate · Overview/);
  assert.match(populated, /How is the group doing\?/);
  assert.match(populated, /Definition version 1 · Click a number for its proof/);
});

test('drawer proof URLs are exactly the morning email links for the same dates and clinics', () => {
  hasProofUrl(populated, growthLink(P.mtd));            // enquiries MTD (and cost per enquiry)
  hasProofUrl(populated, growthLink(P.yesterday));      // enquiries yesterday
  hasProofUrl(populated, growthLink(P.last7));          // trend, movers "now"
  hasProofUrl(populated, growthLink(P.prior7));         // trend, movers "before"
  hasProofUrl(populated, executiveLink(P.mtd));         // group booked/attended/billed MTD
  hasProofUrl(populated, executiveLink(P.yesterday));   // group yesterday
  hasProofUrl(populated, executiveLink(P.mtd, 'dental-nation'));
  hasProofUrl(populated, executiveLink(P.mtd, 'dr-tosun'));
  hasProofUrl(populated, executiveLink(P.mtd, 'al-maher'));
  hasProofUrl(populated, marketingLink('overview', P.mtd, { mchan: 'performance' })); // ad spend
  hasProofUrl(populated, SMILE_CLUB_COMPANIES);         // M19
  hasProofUrl(populated, practoRevenueLink('dental-nation', P.mtd)); // M25 nearest detail
  hasProofUrl(populated, socialLink('all'));            // M15/M16/M18
});

test('movers, windows and clinic lens render in plain words', () => {
  // Paid search rose 7 -> 12; WhatsApp fell 6 -> 2.
  assert.match(populated, /Paid search \(Google\) enquiries rose to/);
  assert.match(populated, /WhatsApp enquiries fell to/);
  assert.ok(populated.includes('>12<') && populated.includes('>7<') && populated.includes('>2<') && populated.includes('>6<'));
  assert.match(populated, /21 to 27 Oct/); assert.match(populated, /14 to 20 Oct/);
  assert.match(populated, /1 to 27 Oct 2026/);
  // The clinic lens scopes the patient-outcome tiles and says so.
  assert.match(tosunLens, /You are viewing Dr Tosun Dental Clinic/);
  assert.match(tosunLens, /stay group-wide/);
  // Al Maher is a real row with its feed-start note; DN Ortho campaign note present.
  for (const html of [populated, allNull, tosunLens]) {
    assert.match(html, /Al Maher Medical Centre/);
    assert.match(html, /22 Oct 2026/);
  }
  assert.match(populated, /Google campaign has been live since 23 Oct 2026/);
  assert.match(populated, /Paid channels · measured enquiries/);
});

test('an all-null read renders Unavailable everywhere and never a bare 0, undefined or NaN', () => {
  assert.ok((allNull.match(/Unavailable/g) ?? []).length >= 20, 'expected Unavailable throughout');
  for (const html of [populated, allNull, tosunLens]) {
    assert.doesNotMatch(html, />0</, 'a null must never render as 0');
    assert.doesNotMatch(html, /undefined|NaN|—/);
  }
  // Still a full page: every metric chip, every clinic row, the comparison explained.
  for (const id of METRIC_IDS) assert.ok(allNull.includes(`${id} <span`), `all-null chip for ${id} missing`);
  assert.match(allNull, /could not be read/);
  assert.match(allNull, /Connected clinics/);
  // Unavailable figures still carry their proof so the drawer explains them.
  hasProofUrl(allNull, executiveLink(P.mtd, 'al-maher'));
  assert.ok(allNull.includes(esc('"value":"Unavailable"')));
});

/* ── date range (lib/overview/range.ts, periodsFor) ── */

/** A custom range across a month end, ending before yesterday. */
const CUSTOM = parseRange({ from: '2026-09-15', to: '2026-10-10' }, TODAY);
const PC = periodsFor(CUSTOM);
const DEFAULT = parseRange({}, TODAY);
const LAST7 = parseRange({ preset: 'last7' }, TODAY);

const [custom, customTosun, defaultExplicit, last7Page] = render([
  { data: buildOverview(sample(), 3, TODAY, CUSTOM), clinic: 'all', range: CUSTOM, rangeParams: rangeParams(CUSTOM) },
  { data: buildOverview(sample(), 3, TODAY, CUSTOM), clinic: 'dr-tosun', range: CUSTOM, rangeParams: rangeParams(CUSTOM) },
  { data: buildOverview(sample(), 3, TODAY, DEFAULT), clinic: 'all', range: DEFAULT, rangeParams: rangeParams(DEFAULT) },
  { data: buildOverview(sample(), 3, TODAY, LAST7), clinic: 'all', range: LAST7, rangeParams: rangeParams(LAST7) },
]);

test('periodsFor: the range, its last day and the two 7-day windows ending there', () => {
  assert.deepEqual(periodsFor({ from: '2026-09-15', to: '2026-10-10' }), {
    yesterday: { from: '2026-10-10', to: '2026-10-10' },
    mtd: { from: '2026-09-15', to: '2026-10-10' },
    last7: { from: '2026-10-04', to: '2026-10-10' },
    prior7: { from: '2026-09-27', to: '2026-10-03' },
  });
  // For the default range it is periods(today) exactly, including month and year starts.
  for (const today of ['2026-10-28', '2026-11-01', '2026-10-02', '2027-01-01', '2028-03-01']) {
    assert.deepEqual(periodsFor(defaultRange(today)), periods(today), today);
  }
});

test('parseRange: default, presets, caps and fallbacks', () => {
  const r = (params: Record<string, string | string[] | undefined>, today = TODAY) => {
    const x = parseRange(params, today);
    return { from: x.from, to: x.to, preset: x.preset, isDefault: x.isDefault };
  };
  const dflt = { from: '2026-10-01', to: '2026-10-27', preset: 'default', isDefault: true };
  assert.deepEqual(r({}), dflt);
  // Presets (Dubai days; "this month" and "last month" follow yesterday's month).
  assert.deepEqual(r({ preset: 'yesterday' }), { from: '2026-10-27', to: '2026-10-27', preset: 'yesterday', isDefault: false });
  assert.deepEqual(r({ preset: 'last7' }), { from: '2026-10-21', to: '2026-10-27', preset: 'last7', isDefault: false });
  assert.deepEqual(r({ preset: 'thismonth' }), { from: '2026-10-01', to: '2026-10-27', preset: 'thismonth', isDefault: true });
  assert.deepEqual(r({ preset: 'lastmonth' }), { from: '2026-09-01', to: '2026-09-30', preset: 'lastmonth', isDefault: false });
  assert.deepEqual(r({ preset: 'last30' }), { from: '2026-09-28', to: '2026-10-27', preset: 'last30', isDefault: false });
  // On the 1st, yesterday is the last day of the previous month.
  assert.deepEqual(r({}, '2026-11-01'), { from: '2026-10-01', to: '2026-10-31', preset: 'default', isDefault: true });
  assert.deepEqual(presetRange('lastmonth', '2026-11-01'), { from: '2026-09-01', to: '2026-09-30' });
  assert.deepEqual(presetRange('lastmonth', '2026-01-15'), { from: '2025-12-01', to: '2025-12-31' });
  // A custom pair wins over a preset; to is capped at yesterday.
  assert.deepEqual(r({ from: '2026-10-05', to: '2026-10-12', preset: 'last7' }), { from: '2026-10-05', to: '2026-10-12', preset: 'custom', isDefault: false });
  assert.deepEqual(r({ from: '2026-10-05', to: '2026-12-01' }), { from: '2026-10-05', to: '2026-10-27', preset: 'custom', isDefault: false });
  // A custom pair equal to the default dates still counts as the default for labels.
  assert.equal(parseRange({ from: '2026-10-01', to: '2026-10-27' }, TODAY).isDefault, true);
  // The span is capped at MAX_SPAN_DAYS, keeping the end.
  const long = r({ from: '2020-01-01', to: '2026-10-20' });
  assert.equal(long.to, '2026-10-20');
  assert.equal(long.from, addDaysIso('2026-10-20', -(MAX_SPAN_DAYS - 1)));
  // Invalid input falls back to the default (or to a valid preset).
  for (const bad of [
    { from: '2026-10-12', to: '2026-10-05' },        // from after to
    { from: '2026-11-02', to: '2026-11-05' },        // entirely after yesterday
    { from: '2026-02-30', to: '2026-03-02' },        // not a real day
    { from: '1 Oct 2026', to: '2026-10-05' },
    { from: '2026-10-01' },                          // half a pair
    { from: ['2026-10-01', '2026-10-02'], to: '2026-10-05' },
    { preset: 'bogus' },
    { preset: ['last7', 'last30'] },
  ]) assert.deepEqual(r(bad), dflt, JSON.stringify(bad));
  assert.equal(r({ from: 'x', to: 'y', preset: 'last30' }).preset, 'last30');
  // The params that carry a range to another page.
  assert.deepEqual(rangeParams(DEFAULT), {});
  assert.deepEqual(rangeParams(LAST7), { preset: 'last7' });
  assert.deepEqual(rangeParams(CUSTOM), { from: '2026-09-15', to: '2026-10-10' });
});

test('the default range renders exactly as the page did before the date control', () => {
  assert.equal(defaultExplicit, populated);
  assert.match(populated, /Month to yesterday · 1 to 27 Oct 2026/);
  assert.equal(populated.split('<span>Yesterday</span>').length - 1, 6, 'default tiles keep the word Yesterday');
  assert.doesNotMatch(populated, /Last day \(/);
  // This month is the highlighted preset; nav and clinic links stay bare.
  assert.match(populated, /href="\/next\?preset=thismonth" aria-current="true"/);
  assert.ok(populated.includes('href="/next/channels"') && populated.includes('href="/next?clinic=dr-tosun"'));
  // The custom-dates form posts back to this page with the default dates filled in.
  assert.match(populated, /<form [^>]*action="\/next" method="get"/);
  assert.match(populated, /name="from" value="2026-10-01"/);
  assert.match(populated, /name="to" value="2026-10-27"/);
  assert.match(populated, />Apply</);
  for (const label of ['Yesterday', 'Last 7 days', 'This month', 'Last month', 'Last 30 days']) assert.ok(populated.includes(`>${label}</a>`), label);
});

test('a custom range renders its own dates and every proof URL carries them', () => {
  // ICU prints September as "Sep" or "Sept" depending on the Node version.
  assert.match(custom, /Selected dates · 15 Sept? to 10 Oct 2026/);
  assert.doesNotMatch(custom, /Month to yesterday/);
  assert.doesNotMatch(custom, /1 to 27 Oct 2026/);
  // The tiles' small figure is the range's last day, named as such.
  assert.equal(custom.split('<span>Last day (10 Oct 2026)</span>').length - 1, 6);
  assert.doesNotMatch(custom, /<span>Yesterday<\/span>/);
  // Comparison windows are periodsFor's: the 7 days to 10 Oct against the 7 before.
  assert.match(custom, /4 to 10 Oct compared with 27 Sept? to 3 Oct/);
  assert.match(custom, /7 days to the last day · 4 to 10 Oct 2026/);
  assert.match(custom, /Clinic activity in the selected dates/);
  // Every dated proof is pinned to the range or one of its windows, and the main ones are present.
  assertDatedUrls(custom, [PC.mtd, PC.yesterday, PC.last7, PC.prior7]);
  hasProofUrl(custom, growthLink(CUSTOM));
  hasProofUrl(custom, growthLink(PC.yesterday));
  hasProofUrl(custom, executiveLink(CUSTOM, 'al-maher'));
  hasProofUrl(custom, marketingLink('overview', CUSTOM, { mchan: 'performance' }));
  hasProofUrl(custom, practoRevenueLink('dental-nation', CUSTOM));
  for (const u of [growthLink(P.mtd), executiveLink(P.mtd), growthLink(P.yesterday)]) {
    assert.ok(!custom.includes(esc(`"url":"${u}"`)), `default-window proof ${u} leaked into a custom range`);
  }
  // Reviews stay live and say so.
  hasProofUrl(custom, socialLink('all'));
  assert.match(custom, /Live when opened/);
  // No preset is highlighted; the form holds the custom dates; nav and clinic chips carry them.
  assert.doesNotMatch(custom, /aria-current="true"[^>]*>(Yesterday|Last 7 days|This month|Last month|Last 30 days)</);
  assert.match(custom, /name="from" value="2026-09-15"/);
  assert.match(custom, /name="to" value="2026-10-10"/);
  assert.ok(custom.includes('href="/next/clinics?from=2026-09-15&amp;to=2026-10-10"'));
  assert.ok(custom.includes('href="/next?from=2026-09-15&amp;to=2026-10-10" aria-current="page"'));
  assert.ok(custom.includes('href="/next?clinic=al-maher&amp;from=2026-09-15&amp;to=2026-10-10"'));
  // A clinic lens survives both the preset links and the form.
  assert.ok(customTosun.includes('href="/next?clinic=dr-tosun&amp;preset=last7"'));
  assert.match(customTosun, /<input type="hidden" name="clinic" value="dr-tosun"\/>/);
  assert.doesNotMatch(custom, /name="clinic"/);
  for (const html of [custom, customTosun, last7Page]) assert.doesNotMatch(html, />0<|undefined|NaN|—/);
});

test('a preset is highlighted, named in the heading and carried by the nav', () => {
  assert.match(last7Page, /Last 7 days · 21 to 27 Oct 2026/);
  assert.match(last7Page, /href="\/next\?preset=last7" aria-current="true"/);
  assert.ok(last7Page.includes('href="/next/programmes?preset=last7"'));
  assert.match(last7Page, /<span>Last day \(27 Oct 2026\)<\/span>/);
  const P7 = periodsFor(LAST7);
  assertDatedUrls(last7Page, [P7.mtd, P7.yesterday, P7.last7, P7.prior7]);
});
