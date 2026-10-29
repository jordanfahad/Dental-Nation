import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { METRICS, metricDef } from '../lib/metrics/registry';
import { buildClinics, emptyMissed, type ClinicsData, type MissedByClinic } from '../lib/overview/clinics';
import { emptyPerformance } from '../lib/overview/read';
import { executiveLink, growthLink, periods, practoRevenueLink } from '../lib/alerts/links';
import type { PerformanceDailyData } from '../lib/alerts/performanceDaily';

const TODAY = '2026-10-28';
const P = periods(TODAY);

/** Every value distinct, so each figure and its proof URL can be checked. */
function sample(): PerformanceDailyData {
  const perf = emptyPerformance();
  perf.clinics = {
    'dental-nation': { yesterday: { booked: 9, showed: 7, billed: 4100 }, mtd: { booked: 170, showed: 140, billed: 78000 } },
    'dr-tosun': { yesterday: { booked: 4, showed: 3, billed: 1700 }, mtd: { booked: 87, showed: 68, billed: 42000 } },
    'al-maher': { yesterday: { booked: 1, showed: 1, billed: 700 }, mtd: { booked: 3, showed: 2, billed: 1500 } },
    group: { yesterday: { booked: 14, showed: 11, billed: 6500 }, mtd: { booked: 260, showed: 210, billed: 121500 } },
  };
  return perf;
}

const MISSED: MissedByClinic = { 'dental-nation': 10, 'dr-tosun': 5, 'al-maher': 4 };

/** Render PreviewShell + ClinicsView in a plain-React subprocess (the suite itself runs react-server). */
function render(cases: { data: ClinicsData }[]): string[] {
  const script = `
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const { ClinicsView } = require('./components/next/clinics/ClinicsView.tsx');
    const { PreviewShell } = require('./components/next/PreviewShell.tsx');
    const cases = JSON.parse(process.env.CLINICS_CASES);
    process.stdout.write(JSON.stringify(cases.map((c) => renderToStaticMarkup(
      React.createElement(PreviewShell, { active: 'Clinics' }, React.createElement(ClinicsView, { data: c.data }))
    ))));
  `;
  const result = spawnSync(process.execPath, ['--import', 'tsx', '-e', script], {
    cwd: process.cwd(), encoding: 'utf8',
    env: { ...process.env, TSX_DISABLE_CACHE: '1', CLINICS_CASES: JSON.stringify(cases) },
    maxBuffer: 16_000_000,
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout) as string[];
}

/** How renderToStaticMarkup escapes a data-proof attribute value. */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
/** Assert a figure's drawer payload carries exactly this proof URL. */
const hasProofUrl = (html: string, url: string) => assert.ok(html.includes(esc(`"url":"${url}"`)), `missing proof URL ${url}`);

const PAGE_METRIC_IDS = ['M03', 'M04', 'M05', 'M06'] as const;

const [populated, allNull] = render([
  { data: buildClinics(sample(), MISSED, TODAY) },
  { data: buildClinics(emptyPerformance(), emptyMissed(), TODAY) },
]);

test('every figure renders with its M-id and the registry covers them all', () => {
  for (const id of PAGE_METRIC_IDS) {
    assert.ok(populated.includes(`${id} <span`), `figure chip for ${id} missing`);
    assert.equal(METRICS[id].definitionVersion, 1);
    assert.ok(METRICS[id].definition.length > 40 && METRICS[id].source.length > 10, `registry entry for ${id} too thin`);
  }
  // The page leans on M05 and M26 definitions (added by the registry phase).
  assert.match(metricDef('M05').definition, /no-show/);
  assert.match(metricDef('M26').definition, /conducting doctor/);
  assert.ok(populated.includes(`>${metricDef('M05').name}<`), 'M05 name missing');
  assert.ok(populated.includes(metricDef('M26').name), 'M26 name missing');
  // The distinct fixture values all render (null-free figures, formatted).
  for (const s of ['170', '140', 'AED 78,000', '87', '68', 'AED 42,000', '3', '2', 'AED 1,500',
    '260', '210', 'AED 121,500', '10', '5', '4']) {
    assert.ok(populated.includes(`>${s}<`), `value ${s} missing`);
  }
  assert.match(populated, /NEW DESIGN/);
  assert.match(populated, /How are the clinics performing\?/);
  assert.match(populated, /Follow up missed visits/);
  assert.match(populated, /Appointments and operating billing/);
  assert.match(populated, /Definition version 1 · Click a number for its proof/);
  // The shell nav links the four real pages and marks this one current (desktop and phone).
  for (const href of ['/next', '/next/channels', '/next/clinics', '/next/programmes']) {
    assert.ok(populated.includes(`href="${href}"`), `nav link ${href} missing`);
  }
  assert.equal(populated.split('href="/next/clinics" aria-current="page"').length - 1, 2, 'active nav highlight missing');
  assert.match(populated, /Navigate · Clinics/);
});

test('drawer proof URLs are exactly the existing detail views for the same dates and clinics', () => {
  hasProofUrl(populated, executiveLink(P.mtd, 'dental-nation')); // Al Wasl row
  hasProofUrl(populated, executiveLink(P.mtd, 'dr-tosun'));      // Dr Tosun row
  hasProofUrl(populated, executiveLink(P.mtd, 'al-maher'));      // Al Maher row
  hasProofUrl(populated, executiveLink(P.mtd));                  // Connected clinics group row
  hasProofUrl(populated, growthLink(P.mtd, 'dn-alwasl'));        // missed visits, Al Wasl lens
  hasProofUrl(populated, growthLink(P.mtd, 'dr-tosun'));         // missed visits, Dr Tosun lens
  hasProofUrl(populated, growthLink(P.mtd, 'amc'));              // missed visits, Al Maher lens
  // The billing-basis card links Revenue by conducting doctor per clinic.
  for (const clinic of ['dental-nation', 'dr-tosun', 'al-maher'] as const) {
    const url = practoRevenueLink(clinic, P.mtd);
    assert.ok(populated.includes(`href="${esc(url)}"`), `missing billing proof button ${url}`);
  }
});

test('coverage and honesty notes render in plain words', () => {
  assert.match(populated, /1 to 27 Oct 2026/);
  for (const html of [populated, allNull]) {
    // Al Maher's feed-start date, in the banner, its table row and its missed card.
    assert.match(html, /22 Oct 2026/);
    assert.match(html, /never split by clinic/);
    // Billing has one basis: cancelled bills are still included, as stored.
    assert.match(html, /bills later marked cancelled are still\s*included/);
    assert.match(html, /Revenue by conducting doctor/);
    // No missed-visit rate yet: the drawer note says why.
    assert.ok(html.includes(esc('two different denominators')), 'missed-rate drawer note missing');
    // Clinical Operations note.
    assert.match(html, /Reception keeps its existing worklists/);
    assert.match(html, /cancellations are counted separately/);
  }
});

test('an all-null read renders Unavailable everywhere and never a bare 0, undefined or NaN', () => {
  assert.ok((allNull.match(/Unavailable/g) ?? []).length >= 15, 'expected Unavailable throughout');
  for (const html of [populated, allNull]) {
    assert.doesNotMatch(html, />0</, 'a null must never render as 0');
    assert.doesNotMatch(html, /undefined|NaN|—/);
  }
  // Still a full page: every metric chip, every clinic row.
  for (const id of PAGE_METRIC_IDS) assert.ok(allNull.includes(`${id} <span`), `all-null chip for ${id} missing`);
  for (const name of ['Al Wasl', 'Dr Tosun Dental Clinic', 'Al Maher Medical Centre', 'Connected clinics']) {
    assert.ok(allNull.includes(name), `${name} row missing`);
  }
  // Unavailable figures still carry their proof so the drawer explains them.
  hasProofUrl(allNull, executiveLink(P.mtd, 'al-maher'));
  hasProofUrl(allNull, growthLink(P.mtd, 'amc'));
  assert.ok(allNull.includes(esc('"value":"Unavailable"')));
});
