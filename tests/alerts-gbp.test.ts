import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { AdminClient } from '../lib/supabase/server';
import {
  buildGbpDaily, latestReportedDay, readGbpDaily, summariseReviews, type GbpBranchData, type GbpDailyData, type GbpReviewRow,
} from '../lib/alerts/gbpDaily';
import { addDaysIso } from '../lib/alerts/links';
import { fixtureDb } from './fixtures/dn015-db';

// The configuration reader prefers env; these tests use synthetic database rows only.
for (const k of ['GMB_CLIENT_ID', 'GMB_CLIENT_SECRET', 'GMB_REFRESH_TOKEN', 'GMB_LOCATION_IDS', 'GMB_LOCATION_LABELS', 'GMB_LOCATION_CLINICS']) delete process.env[k];

const TODAY = '2026-10-24';
const D = '2026-10-20';
const W = '2026-10-13';
const MTD = { from: '2026-10-01', to: D };
const DAY = { from: D, to: D };
const WEEK = { from: W, to: W };
const REPORTS = 'https://reports.dentalnation.com/';

const branch = (key: GbpBranchData['key'], day: number[], mtd: number[], reviews: number[] | null): GbpBranchData => ({
  key, status: 'ok', latestDay: D,
  day: { calls: day[0], directions: day[1], websiteClicks: day[2], mapViews: day[3] },
  mtd: { calls: mtd[0], directions: mtd[1], websiteClicks: mtd[2], mapViews: mtd[3] },
  reviews: reviews && { newYesterday: reviews[0], total: reviews[1], average: reviews[2], unanswered: reviews[3] },
});

/** Synthetic figures only. */
function sample(): GbpDailyData {
  return {
    latestDay: D,
    all: { day: { calls: 18, directions: 16, websiteClicks: 27, mapViews: 896 }, weekEarlier: { calls: 14, directions: 21, websiteClicks: 30, mapViews: 901 } },
    branches: [
      branch('dental-nation', [9, 7, 14, 412], [144, 105, 238, 7828], [0, 612, 4.83, 0]),
      branch('dr-tosun', [6, 4, 9, 288], [96, 60, 153, 5472], [1, 344, 4.9, 1]),
      branch('al-maher', [3, 5, 4, 196], [48, 75, 68, 3724], [0, 121, 4.6, 0]),
    ],
  };
}

const decode = (s: string) => s.replace(/&nbsp;/g, ' ').replace(/&#8599;/g, '↗').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
function anchors(html: string) {
  return [...html.matchAll(/<a href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({ href: decode(m[1]), text: decode(m[2]).trim() }));
}
/** The HTML between a section heading and the next heading. */
function section(html: string, heading: string) {
  const i = html.indexOf(`>${heading}</h2>`);
  assert.ok(i > 0, `missing section ${heading}`);
  const j = html.indexOf('<h2', i);
  return html.slice(i, j < 0 ? html.indexOf('Open the Business Profile report', i) : j);
}
/** The table row for one clinic in a section. */
function row(html: string, heading: string, clinic: string) {
  const s = section(html, heading);
  const i = s.indexOf(`>${clinic}</td>`);
  assert.ok(i > 0, `missing row ${clinic} in ${heading}`);
  return s.slice(s.lastIndexOf('<tr>', i), s.indexOf('</tr>', i));
}
type Want = [text: string, bpclinic: string, range?: { from: string; to: string }];
function assertLinks(html: string, want: Want[]) {
  const got = anchors(html);
  assert.equal(got.length, want.length, `links: ${got.map((a) => a.text).join(' | ')}`);
  want.forEach(([text, bpclinic, range], i) => {
    assert.equal(got[i].text, text);
    const u = new URL(got[i].href);
    assert.equal(u.origin + u.pathname, REPORTS);
    assert.deepEqual(Object.fromEntries(u.searchParams), { tab: 'social', bpclinic, ...(range ? { preset: 'custom', ...range } : {}) }, `${text} -> ${got[i].href}`);
  });
}

test('subject: send day, calls on the latest reported day, reviews to answer', () => {
  assert.equal(buildGbpDaily(sample(), TODAY).subject, 'Google Business Profile · Sat 24 Oct · 18 calls (Tue 20 Oct), 1 review to answer');
  const s = sample();
  s.all.day!.calls = 1;
  s.branches[0].reviews!.unanswered = 2;
  assert.equal(buildGbpDaily(s, TODAY).subject, 'Google Business Profile · Sat 24 Oct · 1 call (Tue 20 Oct), 3 reviews to answer');
  s.branches[1].reviews!.unanswered = 0; s.branches[0].reviews!.unanswered = 0;
  assert.match(buildGbpDaily(s, TODAY).subject, /, 0 reviews to answer$/);
  const none: GbpDailyData = { latestDay: null, all: { day: null, weekEarlier: null }, branches: sample().branches.map((b) => ({ ...b, status: 'unavailable', latestDay: null, day: null, mtd: null, reviews: null })) };
  assert.equal(buildGbpDaily(none, TODAY).subject, 'Google Business Profile · Sat 24 Oct · calls not yet, reviews to answer not yet');
});

test('every figure links to the Social tab with the right clinic and dates', () => {
  const { html } = buildGbpDaily(sample(), TODAY);
  // Tiles: all clinics on D, the same weekday a week earlier, and reviews (live, no dates).
  assertLinks(section(html, 'At a glance (all three clinics)'), [
    ['18', 'all', DAY], ['Tue 13 Oct: 14 ↗', 'all', WEEK], ['Proof ↗', 'all', DAY],
    ['16', 'all', DAY], ['Tue 13 Oct: 21 ↗', 'all', WEEK], ['Proof ↗', 'all', DAY],
    ['1', 'all'], ['Proof ↗', 'all'],
    ['1', 'dr-tosun'], ['Proof ↗', 'dr-tosun'],
  ]);
  assert.match(section(html, 'At a glance (all three clinics)'), /Calls · Tue 20 Oct[\s\S]*Direction requests · Tue 20 Oct[\s\S]*New reviews · yesterday[\s\S]*Written reviews without a reply[\s\S]*Dr\. Tosun Dental Clinic/);
  // Latest reported day and month to date, per clinic.
  const clinics: [string, string, number[], string[]][] = [
    ['Dental Nation Al Wasl', 'dental-nation', [9, 7, 14, 412], ['144', '105', '238', '7,828']],
    ['Dr. Tosun Dental Clinic', 'dr-tosun', [6, 4, 9, 288], ['96', '60', '153', '5,472']],
    ['Al Maher Medical Centre', 'al-maher', [3, 5, 4, 196], ['48', '75', '68', '3,724']],
  ];
  for (const [name, k, day, mtd] of clinics) {
    assertLinks(row(html, 'Latest reported day: Tue 20 Oct', name), [...day.map((v) => [String(v), k, DAY] as Want), ['Proof ↗', k, DAY]]);
    assertLinks(row(html, 'Month to date: 1 to 20 Oct', name), [...mtd.map((v) => [v, k, MTD] as Want), ['Proof ↗', k, MTD]]);
  }
  // Reviews: live page per clinic, "Latest reviews" proof.
  assertLinks(row(html, 'Reviews (as of 09:00 today; the page shows live figures)', 'Dental Nation Al Wasl'),
    [['0', 'dental-nation'], ['612', 'dental-nation'], ['4.8', 'dental-nation'], ['0', 'dental-nation'], ['Latest reviews ↗', 'dental-nation']]);
  assertLinks(row(html, 'Reviews (as of 09:00 today; the page shows live figures)', 'Dr. Tosun Dental Clinic'),
    [['1', 'dr-tosun'], ['344', 'dr-tosun'], ['4.9', 'dr-tosun'], ['1', 'dr-tosun'], ['Latest reviews ↗', 'dr-tosun']]);
  // Needs attention: the unanswered review, linked.
  const att = section(html, 'Needs attention');
  assertLinks(att, [['1', 'dr-tosun'], ['Proof ↗', 'dr-tosun']]);
  assert.match(att.replace(/<[^>]*>/g, ''), /Reply needed: 1 written review at Dr\. Tosun Dental Clinic has no reply yet/);
  assert.doesNotMatch(att, /No data:/);
  // Note, landing button, and every link stays on the dashboard.
  assert.match(html, /Latest day Google has reported: <b>Tue 20 Oct<\/b>\. Reviews are as of 09:00 today\./);
  for (const a of anchors(html)) assert.ok(a.href.startsWith(REPORTS), a.href);
  assert.ok(anchors(html).some((a) => a.href === `${REPORTS}?tab=social&bpclinic=all` && a.text.startsWith('Open the Business Profile report')));
  assert.match(html, /To Mr Akbar, Ms Shadi and Dr Luvi; copied to Fahad\./);
});

test('several clinics waiting for a reply: tile links to all clinics, one attention line each', () => {
  const s = sample();
  s.branches[0].reviews!.unanswered = 2;
  const { html } = buildGbpDaily(s, TODAY);
  const glance = section(html, 'At a glance (all three clinics)');
  const tile = anchors(glance).slice(-2);
  assert.deepEqual(tile.map((a) => a.text), ['3', 'Proof ↗']);
  assert.equal(new URL(tile[0].href).searchParams.get('bpclinic'), 'all');
  assert.match(glance, /Dental Nation Al Wasl 2, Dr\. Tosun Dental Clinic 1/);
  const att = section(html, 'Needs attention').replace(/<[^>]*>/g, '');
  assert.match(att, /2 written reviews at Dental Nation Al Wasl have no reply yet/);
  assert.match(att, /1 written review at Dr\. Tosun Dental Clinic has no reply yet/);
});

test('nothing to answer and every branch reported: no "Needs attention" section', () => {
  const s = sample();
  s.branches[1].reviews!.unanswered = 0;
  const { html } = buildGbpDaily(s, TODAY);
  assert.doesNotMatch(html, /Needs attention/);
});

test('nulls render "not yet" without a link and never as zero', () => {
  const none: GbpDailyData = {
    latestDay: null, all: { day: null, weekEarlier: null },
    branches: sample().branches.map((b) => ({ ...b, status: 'unavailable', latestDay: null, day: null, mtd: null, reviews: null })),
  };
  const { html } = buildGbpDaily(none, TODAY);
  // Note + 4 tiles + 3 x 4 latest + 3 x 4 month to date + 3 x 4 reviews.
  assert.equal((html.match(/>not yet</g) ?? []).length, 41);
  assert.match(html, /Latest day Google has reported: <span[^>]*>not yet<\/span>\./);
  assert.match(html, />Latest reported day: not yet<\/h2>/);
  assert.match(html, />Month to date: not yet<\/h2>/);
  assert.match(html, />At a glance \(all connected clinics\)<\/h2>/);
  assert.match(html, /Latest day reported by Google: not yet/);
  assert.equal(anchors(html).filter((a) => /\d/.test(a.text)).length, 0);
  assert.equal(anchors(html).some((a) => a.text.includes('not yet')), false);
  // Each branch is listed as having no data.
  const att = section(html, 'Needs attention').replace(/<[^>]*>/g, '');
  assert.equal((att.match(/No data:/g) ?? []).length, 3);
  assert.match(att, /the Google figures for Al Maher Medical Centre could not be read this morning/);

  // One branch not connected, one missing figure, one missing week-earlier value.
  const part = sample();
  part.branches[2] = { ...part.branches[2], status: 'not-connected', latestDay: null, day: null, mtd: null, reviews: null };
  part.branches[0].day!.websiteClicks = null;
  part.all.weekEarlier!.directions = null;
  const p = buildGbpDaily(part, TODAY).html;
  assert.match(row(p, 'Latest reported day: Tue 20 Oct', 'Al Maher Medical Centre'), /(<td[^>]*><span style="color:#6B7280">not yet<\/span><\/td>){4}<td[^>]*><\/td>$/);
  assertLinks(row(p, 'Latest reported day: Tue 20 Oct', 'Dental Nation Al Wasl'), [['9', 'dental-nation', DAY], ['7', 'dental-nation', DAY], ['412', 'dental-nation', DAY], ['Proof ↗', 'dental-nation', DAY]]);
  assert.match(section(p, 'At a glance (all connected clinics)'), /Tue 13 Oct: <span[^>]*>not yet<\/span>/);
  assert.match(section(p, 'Needs attention').replace(/<[^>]*>/g, ''), /No data: Al Maher Medical Centre is not connected to Google Business Profile yet/);
});

test('no em or en dashes, UK spelling, no prices', () => {
  const { subject, html } = buildGbpDaily(sample(), TODAY, { preview: 'Preview — sample', recipients: 'To Mr Akbar – test.' });
  assert.equal(/[–—]/.test(subject + html), false);
  const visible = html.replace(/<[^>]*>/g, ' ');
  assert.doesNotMatch(visible, /AED|dirham|Center\b/i);
  assert.match(html, /Preview - sample/);
  assert.match(html, /To Mr Akbar - test\./);
});

test('latest reported day: last day with map views above zero per connected branch, then the earliest', () => {
  const rows = [
    { clinic: 'dental-nation', metric: 'map_views_desktop', day: '2026-10-21', value: 0 },
    { clinic: 'dental-nation', metric: 'map_views_mobile', day: '2026-10-21', value: 5 },
    { clinic: 'dental-nation', metric: 'map_views_mobile', day: '2026-10-22', value: 0 },
    { clinic: 'dental-nation', metric: 'calls', day: '2026-10-23', value: 4 }, // calls alone do not count
    { clinic: 'dr-tosun', metric: 'map_views_desktop', day: '2026-10-20', value: 3 },
    { clinic: 'dr-tosun', metric: 'map_views_mobile', day: '2026-10-21', value: null },
    { clinic: 'dr-tosun', metric: 'map_views_mobile', day: '2026-10-24', value: 9 }, // after the window
    { clinic: 'al-maher', metric: 'map_views_mobile', day: '2026-10-01', value: 7 }, // not connected
  ];
  assert.deepEqual(latestReportedDay(rows, ['dental-nation', 'dr-tosun'], '2026-09-24', '2026-10-23'),
    { perBranch: { 'dental-nation': '2026-10-21', 'dr-tosun': '2026-10-20', 'al-maher': null }, latestDay: '2026-10-20' });
  assert.equal(latestReportedDay(rows, ['al-maher'], '2026-10-02', '2026-10-23').latestDay, null);
  assert.equal(latestReportedDay([], ['dental-nation'], '2026-09-24', '2026-10-23').latestDay, null);
});

test('reviews: Dubai day for "new yesterday", written without a reply, cut at 09:00 Dubai', () => {
  const r = (path: string, create: string, rating: number, comment: string | null, reply: string | null): GbpReviewRow =>
    ({ location_path: path, create_time: create, rating, comment, reply_comment: reply });
  const rows = [
    r('locations/1', '2026-10-22T21:30:00Z', 5, 'Synthetic', null), // 01:30 Dubai on 23 Oct: yesterday, unanswered
    r('locations/1', '2026-10-22T19:30:00Z', 4, null, null), // 23:30 Dubai on 22 Oct; no text, so not unanswered
    r('locations/1', '2026-10-23T20:30:00Z', 3, 'Synthetic', 'Thanks'), // 00:30 Dubai on 24 Oct: not yesterday
    r('locations/1', '2026-10-24T05:30:00Z', 1, 'Synthetic', null), // 09:30 Dubai today: after the cut-off
    r('locations/9', '2026-10-23T08:00:00Z', 5, 'Synthetic', null), // unknown location
  ];
  const got = summariseReviews(rows, [{ path: 'locations/1', clinic: 'dental-nation' }, { path: 'locations/2', clinic: 'dr-tosun' }], TODAY);
  assert.deepEqual(got['dental-nation'], { newYesterday: 1, total: 3, average: 4, unanswered: 1 });
  assert.deepEqual(got['dr-tosun'], { newYesterday: 0, total: 0, average: null, unanswered: 0 });
  assert.equal(got['al-maher'], null);
});

/* ── read, against an in-memory database ── */

const CLINICS = ['dental-nation', 'dr-tosun', 'al-maher'] as const;
const LAST: Record<string, string> = { 'dental-nation': '2026-10-21', 'dr-tosun': D, 'al-maher': '2026-10-21' };
const ON_D: Record<string, number[]> = { 'dental-nation': [9, 7, 14, 412], 'dr-tosun': [6, 4, 9, 288], 'al-maher': [3, 5, 4, 196] };
function tables(clinics: string = 'dental-nation,dr-tosun,al-maher') {
  const insights: Record<string, unknown>[] = [];
  for (let day = '2026-08-25'; day <= TODAY; day = addDaysIso(day, 1)) {
    for (const clinic of CLINICS) {
      const reported = day <= LAST[clinic];
      const [c, d, w, m] = day === D ? ON_D[clinic] : day === W ? [5, 6, 1, 100] : [2, 1, 1, 50];
      const v = (n: number) => (reported ? n : 0); // Google's unreported days are stored as 0
      insights.push(
        { clinic, channel: 'gmb', metric: 'calls', day, value: v(c) },
        { clinic, channel: 'gmb', metric: 'directions', day, value: v(d) },
        { clinic, channel: 'gmb', metric: 'website_clicks', day, value: v(w) },
        { clinic, channel: 'gmb', metric: 'map_views_desktop', day, value: v(m - 40) },
        { clinic, channel: 'gmb', metric: 'map_views_mobile', day, value: v(40) },
        { clinic, channel: 'instagram', metric: 'calls', day, value: 1000 },
      );
    }
  }
  const review = (id: string, path: string, create: string, comment: string | null, reply: string | null, removed: string | null = null) =>
    ({ review_id: id, location_path: path, rating: 5, comment, create_time: create, reply_comment: reply, removed_at: removed });
  return {
    app_secrets: [
      ['gmb_client_id', 'synthetic-client'], ['gmb_client_secret', 'synthetic-value'], ['gmb_refresh_token', 'synthetic-value'],
      ['gmb_location_ids', 'locations/1,locations/2,locations/3'], ['gmb_location_labels', 'Al Wasl,Dr Tosun,Al Maher'],
      ['gmb_location_clinics', clinics],
    ].map(([key, value]) => ({ key, value })),
    social_insights: insights,
    gmb_reviews: [
      review('a', 'locations/1', '2026-10-23T06:00:00Z', 'Synthetic', 'Thanks'),
      review('b', 'locations/2', '2026-10-23T07:00:00Z', 'Synthetic', null),
      review('c', 'locations/2', '2026-10-23T08:00:00Z', 'Synthetic', null, '2026-10-23T09:00:00Z'), // removed
      review('d', 'locations/3', '2026-09-01T08:00:00Z', null, null),
    ],
  };
}

test('read: D, all-clinic totals, per-clinic figures and reviews from synthetic rows', async () => {
  const data = await readGbpDaily(fixtureDb(tables()), TODAY);
  assert.equal(data.latestDay, D);
  // Days 1 to 20 Oct: 18 ordinary days, the week-earlier day and D.
  const mtd = (k: string, i: number, ordinary: number, weekDay: number) => ordinary * 18 + weekDay + ON_D[k][i];
  assert.deepEqual(data.all, {
    day: { calls: 18, directions: 16, websiteClicks: 27, mapViews: 896 },
    weekEarlier: { calls: 15, directions: 18, websiteClicks: 3, mapViews: 300 },
  });
  for (const k of CLINICS) {
    const b = data.branches.find((x) => x.key === k)!;
    assert.equal(b.status, 'ok');
    assert.equal(b.latestDay, LAST[k]);
    assert.deepEqual(b.day, { calls: ON_D[k][0], directions: ON_D[k][1], websiteClicks: ON_D[k][2], mapViews: ON_D[k][3] });
    assert.deepEqual(b.mtd, { calls: mtd(k, 0, 2, 5), directions: mtd(k, 1, 1, 6), websiteClicks: mtd(k, 2, 1, 1), mapViews: mtd(k, 3, 50, 100) });
  }
  assert.deepEqual(data.branches.map((b) => b.reviews), [
    { newYesterday: 1, total: 1, average: 5, unanswered: 0 },
    { newYesterday: 1, total: 1, average: 5, unanswered: 1 },
    { newYesterday: 0, total: 1, average: 5, unanswered: 0 },
  ]);
  const { subject } = buildGbpDaily(data, TODAY);
  assert.equal(subject, 'Google Business Profile · Sat 24 Oct · 18 calls (Tue 20 Oct), 1 review to answer');
});

test('read: a branch that is not connected is left out of D and shown as not connected', async () => {
  const t = tables();
  t.app_secrets = t.app_secrets.map((r) => r.key === 'gmb_location_ids' ? { ...r, value: 'locations/1,locations/3' }
    : r.key === 'gmb_location_labels' ? { ...r, value: 'Al Wasl,Al Maher' }
      : r.key === 'gmb_location_clinics' ? { ...r, value: 'dental-nation,al-maher' } : r);
  const data = await readGbpDaily(fixtureDb(t), TODAY);
  assert.equal(data.latestDay, '2026-10-21');
  assert.equal(data.branches[1].status, 'not-connected');
  assert.equal(data.branches[1].day, null);
  assert.equal(data.branches[1].reviews, null);
  assert.equal(data.all.day?.calls, 4); // 2 + 2 on 21 Oct, Dr Tosun excluded as on the Social tab
});

test('read never throws: each failed source becomes null and the rest still reads', async () => {
  const noMetrics = await readGbpDaily(fixtureDb(tables(), 'social_insights'), TODAY);
  assert.equal(noMetrics.latestDay, null);
  assert.deepEqual(noMetrics.all, { day: null, weekEarlier: null });
  assert.deepEqual(noMetrics.branches.map((b) => [b.status, b.day, b.mtd]), CLINICS.map(() => ['unavailable', null, null]));
  assert.equal(noMetrics.branches[1].reviews?.unanswered, 1);

  const noReviews = await readGbpDaily(fixtureDb(tables(), 'gmb_reviews'), TODAY);
  assert.equal(noReviews.latestDay, D);
  assert.deepEqual(noReviews.branches.map((b) => b.reviews), [null, null, null]);
  assert.match(buildGbpDaily(noReviews, TODAY).subject, /18 calls \(Tue 20 Oct\), reviews to answer not yet$/);

  const noConfig = await readGbpDaily(fixtureDb(tables(), 'app_secrets'), TODAY);
  assert.equal(noConfig.latestDay, null);
  assert.deepEqual(noConfig.branches.map((b) => [b.status, b.reviews]), CLINICS.map(() => ['unavailable', null]));

  const broken = { from() { throw new Error('synthetic outage'); } } as unknown as AdminClient;
  const all = await readGbpDaily(broken, TODAY);
  assert.equal(all.latestDay, null);
  assert.match(buildGbpDaily(all, TODAY).html, /not yet/);
});
