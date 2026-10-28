import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { CHANNELS } from '../config/growth-channels';
import { METRIC_IDS, METRICS } from '../lib/metrics/registry';
import { buildOverview, emptyPerformance, type OverviewData } from '../lib/overview/read';
import {
  SMILE_CLUB_COMPANIES, executiveLink, growthLink, marketingLink, periods, practoRevenueLink, socialLink,
} from '../lib/alerts/links';
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
function render(cases: { data: OverviewData; clinic: string }[]): string[] {
  const script = `
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const { OverviewView } = require('./components/next/OverviewView.tsx');
    const { PreviewShell } = require('./components/next/PreviewShell.tsx');
    const cases = JSON.parse(process.env.OVERVIEW_CASES);
    process.stdout.write(JSON.stringify(cases.map((c) => renderToStaticMarkup(
      React.createElement(PreviewShell, null, React.createElement(OverviewView, { data: c.data, clinic: c.clinic }))
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
  assert.match(populated, /NEW DESIGN PREVIEW/);
  assert.match(populated, /live figures/);
  assert.match(populated, /people without this link still see the current dashboard/);
  assert.match(populated, /coming after approval/);
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
