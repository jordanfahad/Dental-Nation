import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { CHANNELS } from '../config/growth-channels';
import { METRICS } from '../lib/metrics/registry';
import { buildChannels, type ChannelsData } from '../lib/overview/channels';
import { emptyPerformance } from '../lib/overview/read';
import {
  digitalLink, growthLink, growthPatientsLink, marketingLink, periods, periodsFor, socialLink,
} from '../lib/alerts/links';
import { parseRange, rangeParams, type ViewRange } from '../lib/overview/range';
import { assertDatedUrls } from './fixtures/next-range';
import type { GbpBranchData, GbpDailyData, GbpMetricSet } from '../lib/alerts/gbpDaily';
import type { PerfChannel, PerformanceDailyData } from '../lib/alerts/performanceDaily';

const TODAY = '2026-10-28';
const P = periods(TODAY);
/** The ids this page shows. */
const PAGE_IDS = ['M01', 'M03', 'M07', 'M08', 'M11', 'M28', 'M29', 'M30'] as const;

// Default counts are non-zero so any 0 in the rendered page can only be a null bug
// (a channel's genuine measured zero would render as 0, exactly as the Growth table prints it).
const channel = (key: string, over: Partial<PerfChannel> = {}): PerfChannel =>
  ({ key, enquiries: 6, booked: 4, showed: 3, spend: null, costPerEnquiry: null, costIsEstimate: false, ...over });
const win = (totals: { enquiries: number; booked: number; showed: number }, over: Record<string, Partial<PerfChannel>> = {}) =>
  ({ ...totals, channels: CHANNELS.map((c) => channel(c.key, over[c.key])) });

/** Every value distinct, so each figure and its proof URL can be checked. */
function sample(): PerformanceDailyData {
  return {
    growth: {
      yesterday: win({ enquiries: 28, booked: 14, showed: 11 }),
      // Paid search's cost per enquiry is the Growth estimate (costIsEstimate), which must never render as a plain number.
      mtd: win({ enquiries: 620, booked: 260, showed: 210 }, {
        'paid-search': { enquiries: 180, booked: 70, spend: 9000, costPerEnquiry: 50, costIsEstimate: true },
        'paid-social': { enquiries: 120, booked: 35, spend: 3000, costPerEnquiry: 25 },
        gmb: { enquiries: 100, booked: 40 },
        website: { enquiries: 80, booked: 25 },
        whatsapp: { enquiries: 60, booked: 21 },
        partnership: { enquiries: 40, booked: 18 },
      }),
      last7: win({ enquiries: 192, booked: 80, showed: 60 }),
      prior7: win({ enquiries: 160, booked: 70, showed: 50 }),
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
    // The branded share keeps its own available-through window (Search Console reports late).
    brandedShare: { percent: 41, from: P.mtd.from, to: '2026-10-25' },
    instagram: { followers: 5000, reachMtd: 90000 },
  };
}

const metrics = (calls: number): GbpMetricSet => ({ calls, directions: 0, websiteClicks: 0, mapViews: 0 });
const branch = (key: GbpBranchData['key'], mtdCalls: number | null): GbpBranchData => ({
  key,
  status: mtdCalls == null ? 'no-data' : 'ok',
  latestDay: mtdCalls == null ? null : '2026-10-23',
  day: mtdCalls == null ? null : metrics(0),
  mtd: mtdCalls == null ? null : metrics(mtdCalls),
  reviews: null,
});

/** Google has reported every branch through 23 Oct; MTD calls are 30 + 8 + 4 = 42 as the Social all-clinics lens adds them. */
function gbpSample(): GbpDailyData {
  return {
    latestDay: '2026-10-23',
    all: { day: metrics(5), weekEarlier: metrics(4) },
    branches: [branch('dental-nation', 30), branch('dr-tosun', 8), branch('al-maher', 4)],
  };
}

/** Al Maher has no reported Google data: the total covers the other clinics only and says so. */
function gbpPartial(): GbpDailyData {
  return {
    latestDay: '2026-10-23',
    all: { day: metrics(5), weekEarlier: metrics(4) },
    branches: [branch('dental-nation', 30), branch('dr-tosun', 8), branch('al-maher', null)],
  };
}

/** Render PreviewShell + ChannelsView in a plain-React subprocess (the suite itself runs react-server). */
function render(cases: { data: ChannelsData; range?: ViewRange; rangeParams?: Record<string, string> }[]): string[] {
  const script = `
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const { ChannelsView } = require('./components/next/channels/ChannelsView.tsx');
    const { PreviewShell } = require('./components/next/PreviewShell.tsx');
    const cases = JSON.parse(process.env.CHANNELS_CASES);
    process.stdout.write(JSON.stringify(cases.map((c) => renderToStaticMarkup(
      React.createElement(PreviewShell, { active: 'Channels', rangeParams: c.rangeParams },
        React.createElement(ChannelsView, { data: c.data, range: c.range }))
    ))));
  `;
  const result = spawnSync(process.execPath, ['--import', 'tsx', '-e', script], {
    cwd: process.cwd(), encoding: 'utf8',
    env: { ...process.env, TSX_DISABLE_CACHE: '1', CHANNELS_CASES: JSON.stringify(cases) },
    maxBuffer: 16_000_000,
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout) as string[];
}

/** How renderToStaticMarkup escapes a data-proof attribute value. */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
/** Assert a figure's drawer payload carries exactly this proof URL. */
const hasProofUrl = (html: string, url: string) => assert.ok(html.includes(esc(`"url":"${url}"`)), `missing proof URL ${url}`);

const [populated, allNull, partialGbp] = render([
  { data: buildChannels(sample(), gbpSample(), TODAY) },
  { data: buildChannels(emptyPerformance(), null, TODAY) },
  { data: buildChannels(sample(), gbpPartial(), TODAY) },
]);

test('every figure renders with its M-id and the registry covers them all', () => {
  for (const id of PAGE_IDS) {
    assert.ok(populated.includes(`${id} <span`), `figure chip for ${id} missing`);
    assert.equal(METRICS[id].definitionVersion, 1);
    assert.ok(METRICS[id].definition.length > 40 && METRICS[id].source.length > 10, `registry entry for ${id} too thin`);
  }
  // The distinct fixture values all render (null-free figures, formatted).
  for (const s of ['620', '260', 'AED 12,400', 'AED 20.00', '180', '70', 'AED 9,000', '120', '35', 'AED 3,000', 'AED 25.00',
    '100', '40', '80', '25', '60', '21', '18', '42', '41%', '5,000', '90,000']) {
    assert.ok(populated.includes(`>${s}<`), `value ${s} missing`);
  }
  assert.match(populated, /NEW DESIGN/);
  assert.match(populated, /Which channels are bringing people in\?/);
  assert.match(populated, /Marketing workspace/);
  assert.match(populated, /Month to yesterday · 1 to 27 Oct 2026/);
  assert.match(populated, /Shared channels/);
  assert.match(populated, /One counting rule per column\./);
  assert.match(populated, /Definition version 1 · Click a number for its proof/);
  // Channel rows keep the Growth reader's own names.
  for (const name of ['Paid search (Google)', 'Meta', 'Google Business Profile', 'Website', 'WhatsApp',
    'Partnerships (Smile Club)', 'Walk-in', 'Total, all measured channels']) {
    assert.ok(populated.includes(name), `channel row ${name} missing`);
  }
  // Sub-nav: Enquiries and Local & social are this page's sections, the rest come after approval.
  for (const tab of ['Enquiries', 'Paid media', 'Website &amp; SEO', 'Partners']) assert.ok(populated.includes(tab), tab);
  assert.ok(populated.includes('Local &amp; social'));
  assert.match(populated, /coming after approval/);
  // The shell nav links the four real pages and marks this one current (desktop and phone).
  for (const href of ['/next', '/next/channels', '/next/clinics', '/next/programmes']) {
    assert.ok(populated.includes(`href="${href}"`), `nav link ${href} missing`);
  }
  assert.equal(populated.split('href="/next/channels" aria-current="page"').length - 1, 2, 'active nav highlight missing');
  assert.match(populated, /Navigate · Channels/);
  // The total row states its own denominator (deviation 8 from the mockup).
  assert.match(populated, /spend over all measured enquiries/);
  assert.match(populated, /divides all\s*recorded ad spend by all measured enquiries/);
});

test('drawer proof URLs are exactly the morning email links for the same dates', () => {
  hasProofUrl(populated, growthLink(P.mtd));                                            // M01/M03/M08 cells
  hasProofUrl(populated, marketingLink('overview', P.mtd, { mchan: 'performance' }));   // M07 spend cells
  // The drill-down button is a plain link to the patient list behind the channel.
  const patients = growthPatientsLink(P.mtd, 'paid-search');
  assert.ok(populated.includes(`href="${esc(patients)}"`), `missing patients link ${patients}`);
  hasProofUrl(populated, socialLink('all', { from: '2026-10-01', to: '2026-10-23' }));  // M11, month to reported day
  hasProofUrl(populated, digitalLink({ from: P.mtd.from, to: '2026-10-25' }));          // M28 with its own window
  hasProofUrl(populated, socialLink('all', P.mtd));                                     // M29/M30, the email's igLink
  // The drill-down card names the largest channel by enquiries.
  assert.match(populated, /Paid search \(Google\) enquiries/);
  assert.match(populated, /Open the patients behind this channel/);
});

test('the estimated paid-search cost never renders as a plain number', () => {
  assert.doesNotMatch(populated, />AED 50\.00</, 'the Growth estimate must not sit in a headline');
  assert.match(populated, /only an estimate exists \(counts modelled phone enquiries\)/);
  assert.ok(populated.includes(esc('counts modelled phone enquiries')), 'drawer note for the estimate missing');
  assert.match(populated, /Modelled phone enquiries excluded/);
  // A measured channel cost still renders (Meta's AED 25.00 asserted above).
});

test('Google profile calls carry the reported-day label and name missing branches', () => {
  assert.match(populated, /through Fri 23 Oct/);
  assert.ok(populated.includes('>42<'));
  // With Al Maher unreported the total covers the other clinics only, and says so.
  assert.ok(partialGbp.includes('>38<'));
  assert.ok(partialGbp.includes(esc('Google has no reported data for Al Maher Medical Centre')), 'partial-coverage note missing');
  assert.doesNotMatch(partialGbp, />42</);
});

test('an all-null read renders Unavailable everywhere and never a bare 0, undefined or NaN', () => {
  assert.ok((allNull.match(/Unavailable/g) ?? []).length >= 8, 'expected Unavailable throughout');
  for (const html of [populated, allNull, partialGbp]) {
    assert.doesNotMatch(html, />0</, 'a null must never render as 0');
    assert.doesNotMatch(html, /undefined|NaN|—/);
  }
  // Still a full page: the totals row and the local card keep every metric chip.
  for (const id of PAGE_IDS) assert.ok(allNull.includes(`${id} <span`), `all-null chip for ${id} missing`);
  assert.match(allNull, /could not be read/);
  assert.match(allNull, /no reported day yet/);
  assert.match(allNull, /No channel has a measured enquiry/);
  // Unavailable figures still carry their proof so the drawer explains them.
  hasProofUrl(allNull, growthLink(P.mtd));
  hasProofUrl(allNull, socialLink('all'));
  // M28 keeps its own Digital-view proof when no Search Console sample is readable (never the Growth table).
  hasProofUrl(allNull, digitalLink());
  assert.ok(allNull.includes(esc('"id":"M28","value":"Unavailable"')), 'null-share M28 payload missing');
  assert.ok(allNull.includes(esc('"dates":"Awaiting a readable Search Console sample"')), 'neutral M28 dates label missing');
  assert.ok(allNull.includes(esc('"value":"Unavailable"')));
});

/* ── date range ── */

const CUSTOM = parseRange({ from: '2026-09-15', to: '2026-10-10' }, TODAY);
const DEFAULT = parseRange({}, TODAY);
/** The email reader reads the branded share for the range, through Search Console's latest day inside it. */
function customSample(): PerformanceDailyData {
  return { ...sample(), brandedShare: { percent: 41, from: CUSTOM.from, to: '2026-10-08' } };
}
const [custom, defaultExplicit] = render([
  { data: buildChannels(customSample(), gbpSample(), TODAY, CUSTOM), range: CUSTOM, rangeParams: rangeParams(CUSTOM) },
  { data: buildChannels(sample(), gbpSample(), TODAY, DEFAULT), range: DEFAULT, rangeParams: rangeParams(DEFAULT) },
]);

test('the default range renders exactly as the page did before the date control', () => {
  assert.equal(defaultExplicit, populated);
  assert.match(populated, /href="\/next\/channels\?preset=thismonth" aria-current="true"/);
  assert.doesNotMatch(populated, /own reporting month|selected dates/);
});

test('a custom range renders its own dates and every proof URL carries them', () => {
  assert.equal(periodsFor(CUSTOM).mtd.from, '2026-09-15');
  assert.match(custom, /Selected dates · 15 Sept? to 10 Oct 2026/);
  assert.doesNotMatch(custom, /Month to yesterday|1 to 27 Oct 2026/);
  assert.match(custom, /largest channel by enquiries in these dates/);
  // Every dated proof is the range, except Google profile calls (Google's own month to its
  // reported day) and the branded share (its own available-through day inside the range).
  const gbpUrl = socialLink('all', { from: '2026-10-01', to: '2026-10-23' });
  const shareUrl = digitalLink({ from: CUSTOM.from, to: '2026-10-08' });
  assertDatedUrls(custom, [CUSTOM], (u) => u.href === gbpUrl || u.href === shareUrl);
  hasProofUrl(custom, growthLink(CUSTOM));
  hasProofUrl(custom, marketingLink('overview', CUSTOM, { mchan: 'performance' }));
  hasProofUrl(custom, socialLink('all', CUSTOM));                  // Instagram follows the range
  hasProofUrl(custom, gbpUrl);
  hasProofUrl(custom, shareUrl);
  assert.ok(custom.includes(`href="${esc(growthPatientsLink(CUSTOM, 'paid-search'))}"`));
  // Google profile calls keep their own window and say they do not follow the selected dates.
  assert.match(custom, /own reporting month, (<!-- -->)?through Fri 23 Oct/);
  assert.ok(custom.includes('does not follow the selected dates'));
  assert.match(custom, /sampled search clicks · 15 Sept? to 8 Oct 2026/);
  // Nav carries the range; no preset is highlighted.
  assert.ok(custom.includes('href="/next/clinics?from=2026-09-15&amp;to=2026-10-10"'));
  assert.ok(custom.includes('href="/next/channels?from=2026-09-15&amp;to=2026-10-10" aria-current="page"'));
  assert.doesNotMatch(custom, /aria-current="true"/);
  assert.doesNotMatch(custom, />0<|undefined|NaN|—/);
});
