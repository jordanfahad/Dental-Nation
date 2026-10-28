import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { AdminClient } from '../lib/supabase/server';
import type { GrowthReport } from '../lib/growth/channelPerformance';
import type { CompetitorSnapshot } from '../lib/analytics/competitor';
import { CHANNELS } from '../config/growth-channels';
import {
  BRANDED_QUERY, CHANNEL_ROWS, biggestMovers, brandedClickShare, buildPerformanceDaily, growthWindow, ownBrandSearches,
  readPerformanceDaily, spanLabel, type GrowthWindow, type PerfChannel, type PerformanceDailyData,
} from '../lib/alerts/performanceDaily';

// Synthetic data only, and no network: the readers that use the dashboard's own
// Supabase or Google clients find no credentials and report "not available".
for (const k of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY',
  'GMB_CLIENT_ID', 'GMB_CLIENT_SECRET', 'GMB_REFRESH_TOKEN', 'GMB_LOCATION_IDS', 'SEARCH_CONSOLE_SITE']) delete process.env[k];

const TODAY = '2026-10-24';
const Y = { from: '2026-10-23', to: '2026-10-23' };
const MTD = { from: '2026-10-01', to: '2026-10-23' };
const L7 = { from: '2026-10-17', to: '2026-10-23' };
const P7 = { from: '2026-10-10', to: '2026-10-16' };
const BASE = 'https://reports.dentalnation.com/';

const channel = (key: string, over: Partial<PerfChannel> = {}): PerfChannel =>
  ({ key, enquiries: 0, booked: 0, showed: 0, spend: null, costPerEnquiry: null, costIsEstimate: false, ...over });
/** A window with every Growth channel; `over` sets some of them. */
function win(totals: { enquiries: number; booked: number; showed: number }, over: Record<string, Partial<PerfChannel>> = {}): GrowthWindow {
  return { ...totals, channels: CHANNELS.map((c) => channel(c.key, over[c.key])) };
}

/** Each value is unique in the email, so its link can be checked. */
function sample(): PerformanceDailyData {
  return {
    growth: {
      yesterday: win({ enquiries: 28, booked: 25, showed: 21 }, {
        'paid-search': { enquiries: 4 }, 'paid-social': { enquiries: 0 }, gmb: { enquiries: 5 }, website: { enquiries: 3 },
        whatsapp: { enquiries: 6 }, partnership: { enquiries: 2 }, 'direct-walkin': { enquiries: 8 },
      }),
      mtd: win({ enquiries: 416, booked: 245, showed: 203 }, {
        'paid-search': { enquiries: 61, booked: 22, spend: 9840, costPerEnquiry: 98.4, costIsEstimate: true },
        'paid-social': { enquiries: 13, booked: 11, spend: 1200, costPerEnquiry: 1200 / 13 },
        gmb: { enquiries: 92, booked: 51 }, website: { enquiries: 57, booked: 26 }, whatsapp: { enquiries: 96, booked: 58 },
        partnership: { enquiries: 38, booked: 27, showed: 18 }, 'direct-walkin': { enquiries: 72, booked: 67 },
      }),
      last7: win({ enquiries: 120, booked: 70, showed: 60 }, { whatsapp: { enquiries: 34 }, 'paid-search': { enquiries: 12 }, gmb: { enquiries: 20 } }),
      prior7: win({ enquiries: 118, booked: 71, showed: 61 }, { whatsapp: { enquiries: 29 }, 'paid-search': { enquiries: 17 }, gmb: { enquiries: 18 } }),
    },
    clinics: {
      'dental-nation': { yesterday: { booked: 9, showed: 7, billed: 18450 }, mtd: { booked: 148, showed: 121, billed: 402300 } },
      'dr-tosun': { yesterday: { booked: 16, showed: 14, billed: 12900 }, mtd: { booked: 97, showed: 82, billed: 268750 } },
      'al-maher': { yesterday: { booked: 33, showed: 31, billed: 1950 }, mtd: { booked: 43, showed: 39, billed: 6420 } },
      group: { yesterday: { booked: 25, showed: 21, billed: 31350 }, mtd: { booked: 245, showed: 203, billed: 671050 } },
    },
    adSpendMtd: 11040,
    orthoBillingMtd: 107800,
    smileClubMembers: 19,
    reviews: { total: 1077, average: 4.8333 },
    brandSearches: 1900,
    brandedShare: { percent: 38, from: '2026-10-01', to: '2026-10-20' },
    instagram: { followers: 12480, reachMtd: 96300 },
  };
}
const NULL_CLINIC = { yesterday: { booked: null, showed: null, billed: null }, mtd: { booked: null, showed: null, billed: null } };
const empty = (): PerformanceDailyData => ({
  growth: { yesterday: null, mtd: null, last7: null, prior7: null },
  clinics: { 'dental-nation': NULL_CLINIC, 'dr-tosun': NULL_CLINIC, 'al-maher': NULL_CLINIC, group: NULL_CLINIC },
  adSpendMtd: null, orthoBillingMtd: null, smileClubMembers: null, reviews: null, brandSearches: null, brandedShare: null,
  instagram: { followers: null, reachMtd: null },
});

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
function anchors(html: string) {
  return [...html.matchAll(/<a href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({ href: decode(m[1]), text: decode(m[2]) }));
}
/** Every anchor whose text is exactly `value` (at least one) opens `params` on the dashboard. */
function assertLinks(html: string, value: string, params: Record<string, string>, count = 1, hash = '') {
  const hits = anchors(html).filter((a) => a.text === value);
  assert.equal(hits.length, count, `expected ${count} link(s) for ${value}, got ${hits.length}`);
  for (const h of hits) {
    const u = new URL(h.href);
    assert.equal(u.origin + u.pathname, BASE, value);
    assert.deepEqual(Object.fromEntries(u.searchParams), params, value);
    assert.equal(u.hash, hash, value);
  }
}
const growth = (r: { from: string; to: string }) => ({ tab: 'group', gtab: 'growth', gclinic: 'all', preset: 'custom', ...r });
const exec = (r: { from: string; to: string }, clinic?: 'dental-nation' | 'dr-tosun' | 'al-maher') => clinic
  ? { tab: 'executive', gclinic: clinic === 'dental-nation' ? 'dn-alwasl' : clinic === 'al-maher' ? 'amc' : 'dr-tosun', clinic, preset: 'custom', ...r }
  : { tab: 'executive', gclinic: 'all', preset: 'custom', ...r };

test('subject: day, enquiries yesterday and billed yesterday', () => {
  assert.equal(buildPerformanceDaily(sample(), TODAY).subject, 'Daily performance · Sat 24 Oct · 28 enquiries, AED 31,350 billed yesterday');
  const one = sample();
  one.growth.yesterday!.enquiries = 1;
  one.clinics.group.yesterday.billed = 1234567.4;
  assert.equal(buildPerformanceDaily(one, TODAY).subject, 'Daily performance · Sat 24 Oct · 1 enquiry, AED 1,234,567 billed yesterday');
  assert.equal(buildPerformanceDaily(empty(), TODAY).subject, 'Daily performance · Sat 24 Oct · enquiries not yet, billed yesterday not yet');
});

test('every figure links to reports.dentalnation.com with the right tab, dates and clinic', () => {
  const { html } = buildPerformanceDaily(sample(), TODAY);
  // Tiles (the group figures repeat in the Group row with the same link).
  assertLinks(html, '28', growth(Y));
  assertLinks(html, '416', growth(MTD));
  assertLinks(html, '25', exec(Y), 2);
  assertLinks(html, '245', exec(MTD), 2);
  assertLinks(html, '671,050', exec(MTD), 2);
  assertLinks(html, '31,350', exec(Y), 2);
  assertLinks(html, '11,040', { tab: 'marketing', mtab: 'overview', mchan: 'performance', preset: 'custom', ...MTD });
  // By clinic: yesterday and month to date per Executive clinic lens; group without a clinic.
  for (const [v, r] of [['9', Y], ['7', Y], ['18,450', Y], ['148', MTD], ['121', MTD], ['402,300', MTD]] as const) assertLinks(html, v, exec(r, 'dental-nation'));
  for (const [v, r] of [['16', Y], ['14', Y], ['12,900', Y], ['97', MTD], ['82', MTD], ['268,750', MTD]] as const) assertLinks(html, v, exec(r, 'dr-tosun'));
  for (const [v, r] of [['33', Y], ['31', Y], ['1,950', Y], ['43', MTD], ['39', MTD], ['6,420', MTD]] as const) assertLinks(html, v, exec(r, 'al-maher'));
  assertLinks(html, '21', exec(Y));
  assertLinks(html, '203', exec(MTD));
  // Channels: numbers open the Growth table for the same dates.
  for (const v of ['4', '0', '5', '3', '6', '2', '8']) assertLinks(html, v, growth(Y));
  for (const v of ['61', '13', '92', '57', '96', '38', '72', '22', '11', '51', '26', '58', '67', '9,840', '1,200', '≈98', '92']) {
    assertLinks(html, v, growth(MTD), v === '92' ? 2 : 1); // GBP enquiries 92 and Meta cost per enquiry 92
  }
  const patients = anchors(html).filter((a) => a.text.startsWith('Patients'));
  assert.deepEqual(patients.map((a) => Object.fromEntries(new URL(a.href).searchParams)),
    CHANNEL_ROWS.map((c) => ({ tab: 'group', gtab: 'growth', gclinic: 'all', gchan: c.key, preset: 'custom', ...MTD })));
  // Programmes.
  assertLinks(html, '107,800', { tab: 'practo', ptab: 'revenue', clinic: 'dental-nation', preset: 'custom', ...MTD });
  assertLinks(html, '27', growth(MTD), 2); // channel table and Smile Club programme row
  assertLinks(html, '18', growth(MTD));
  assert.deepEqual(anchors(html).filter((a) => a.text === '19').map((a) => a.href), [`${BASE}impact#smileclub`]);
  assert.match(html, />19<\/a> of 24/);
  // Brand signals.
  assertLinks(html, '1,077', { tab: 'social', bpclinic: 'all' });
  assertLinks(html, '4.83', { tab: 'social', bpclinic: 'all' });
  assertLinks(html, '1,900', { tab: 'digital', dtab: 'competitors' });
  assertLinks(html, '38%', { tab: 'digital', preset: 'custom', from: '2026-10-01', to: '2026-10-20' });
  assert.match(html, /Branded share of Google search clicks \(1 to 20 Oct, top 250 queries\)/);
  assertLinks(html, '12,480', { tab: 'social', bpclinic: 'all', preset: 'custom', ...MTD });
  assertLinks(html, '96,300', { tab: 'social', bpclinic: 'all', preset: 'custom', ...MTD });
  // Last 7 days vs the 7 before: both numbers and both date links.
  assertLinks(html, '34', growth(L7));
  assertLinks(html, '29', growth(P7));
  assertLinks(html, '12', growth(L7));
  assertLinks(html, '17', growth(P7));
  const l7 = anchors(html).filter((a) => a.text.startsWith('17 to 23 Oct'));
  const p7 = anchors(html).filter((a) => a.text.startsWith('10 to 16 Oct'));
  assert.equal(l7.length, 2);
  assert.equal(p7.length, 2);
  for (const a of l7) assert.deepEqual(Object.fromEntries(new URL(a.href).searchParams), growth(L7));
  for (const a of p7) assert.deepEqual(Object.fromEntries(new URL(a.href).searchParams), growth(P7));
  assert.match(html, /WhatsApp enquiries <a [^>]*>34<\/a>, up from <a [^>]*>29<\/a>/);
  assert.match(html, /Down:<\/span> Paid search enquiries <a [^>]*>12<\/a>, down from <a [^>]*>17<\/a>/);
  // Landing button, and nothing links anywhere else.
  assert.ok(anchors(html).some((a) => a.text.startsWith('Open the full report (month to date)')
    && JSON.stringify(Object.fromEntries(new URL(a.href).searchParams)) === JSON.stringify(exec(MTD))));
  for (const a of anchors(html)) assert.ok(a.href.startsWith(BASE), a.href);
  // Every right-aligned (numeric) cell is a link, "not yet", "-" or empty.
  const cells = [...html.matchAll(/<td style="[^"]*text-align:right[^"]*">([\s\S]*?)<\/td>/g)].map((m) => m[1]);
  assert.ok(cells.length >= 6 * 4 + 5 * 7);
  for (const c of cells) assert.match(c, /^(<a href="[^"]*"[^>]*>[^<]+<\/a>|<span style="color:#6B7280">not yet<\/span>|-|)$/, c);
  // Outside links, only dates, times and label counts carry digits.
  const outside = decode(html.replace(/<a [^>]*>[\s\S]*?<\/a>/g, ' ').replace(/<[^>]*>/g, ' ')).match(/\d[\d,.]*%?/g) ?? [];
  const allowed = new Set(['9', '23', '1', '3', '20', '250', '24', '7', '15', '2', '09', '00', '22']); // 22: Al Maher's Practo start date
  assert.deepEqual([...new Set(outside)].filter((t) => !allowed.has(t)), []);
  assert.match(html, /Al Maher&#39;s bookings and bills are in Practo from Thu 22 Oct\./);
  assert.match(html, /Paid search enquiries and bookings are measured\./);
});

test('nulls render "not yet" without a link and never as zero', () => {
  const { html } = buildPerformanceDaily(empty(), TODAY);
  // 4 tiles + 3 sub-figures, 4 clinic rows x 6, 7 channels x 5, programmes 4, brand signals 6, last 7 days 1.
  assert.equal((html.match(/>not yet</g) ?? []).length, 7 + 24 + 35 + 4 + 6 + 1);
  const links = anchors(html);
  assert.equal(links.length, 1); // only the landing button
  assert.ok(links[0].text.startsWith('Open the full report'));
  assert.doesNotMatch(html.replace(/<[^>]*>/g, ' '), /(^|\s)0(\s|$)/);
  assert.doesNotMatch(html, /Paid search enquiries and bookings are measured/);
  assert.match(html, /Branded share of Google search clicks \(month to date, top 250 queries\)/);
  // One source missing: only its figures change.
  const partial = sample();
  partial.clinics['dr-tosun'].yesterday.billed = null;
  partial.instagram.reachMtd = null;
  const p = buildPerformanceDaily(partial, TODAY).html;
  assert.equal((p.match(/>not yet</g) ?? []).length, 1 + 1); // Dr Tosun billed yesterday, Instagram reach
  assert.match(p, />12,480<\/a> \/ <span style="color:#6B7280">not yet<\/span>/);
});

test('no em or en dashes, UK copy, no prices in the Smile Club rows', () => {
  const { subject, html } = buildPerformanceDaily(sample(), TODAY, { preview: 'Preview — sample', recipients: 'To Mr Akbar – test.' });
  assert.equal(/[–—]/.test(subject + html), false);
  assert.match(html, /To Mr Akbar - test\./);
  assert.match(html, /Preview - sample/);
  assert.match(buildPerformanceDaily(sample(), TODAY).html, /To Mr Akbar and Ms Shadi; copied to Fahad\./);
  for (const row of html.match(/<tr><td[^>]*>Smile Club:[\s\S]*?<\/tr>/g) ?? []) assert.doesNotMatch(row, /AED|dirham|price/i);
  assert.equal((html.match(/<tr><td[^>]*>Smile Club:/g) ?? []).length, 2);
  // A mover from a channel outside the table keeps a clean name.
  const d = sample();
  d.growth.last7 = win({ enquiries: 9, booked: 0, showed: 0 }, { affiliate: { enquiries: 9 } });
  d.growth.prior7 = win({ enquiries: 0, booked: 0, showed: 0 });
  const h = buildPerformanceDaily(d, TODAY).html;
  assert.match(h, /Affiliates \(ArabyAds\) enquiries <a [^>]*>9<\/a>, up from <a [^>]*>0<\/a>/);
  assert.equal(/[–—]/.test(h), false);
});

test('movers: biggest rise and fall of at least 3, ties keep the channel order', () => {
  const now = win({ enquiries: 0, booked: 0, showed: 0 }, { gmb: { enquiries: 7 }, whatsapp: { enquiries: 7 }, website: { enquiries: 1 } });
  const before = win({ enquiries: 0, booked: 0, showed: 0 }, { gmb: { enquiries: 2 }, whatsapp: { enquiries: 2 }, website: { enquiries: 3 } });
  const { up, down } = biggestMovers(now, before);
  assert.ok(CHANNELS.findIndex((c) => c.key === 'gmb') < CHANNELS.findIndex((c) => c.key === 'whatsapp'));
  assert.equal(up?.key, 'gmb');
  assert.deepEqual({ now: up?.now, before: up?.before, delta: up?.delta }, { now: 7, before: 2, delta: 5 });
  assert.equal(down, null); // website fell by 2 only
  const d = sample();
  d.growth.last7 = now;
  d.growth.prior7 = before;
  const html = buildPerformanceDaily(d, TODAY).html;
  assert.match(html, /no channel fell by 3 or more enquiries/);
  const quiet = sample();
  quiet.growth.prior7 = quiet.growth.last7;
  const q = buildPerformanceDaily(quiet, TODAY).html;
  assert.match(q, /no channel rose by 3 or more enquiries/);
  assert.match(q, /no channel fell by 3 or more enquiries/);
  // Date labels across a month end.
  assert.equal(spanLabel({ from: '2026-10-26', to: '2026-11-01' }), '26 Oct to 1 Nov');
  assert.equal(spanLabel({ from: '2026-10-19', to: '2026-10-25' }), '19 to 25 Oct');
});

test('growth window: the figures the Growth table prints', () => {
  const ch = (key: string, over: Record<string, unknown>) => ({ key, enquiries: 10, booked: 4, showed: 3, spend: null, costPerEnquiry: null, ...over });
  const report = {
    apptFeedRows: 12,
    totals: { enquiries: 30, booked: 12, showed: 9 },
    channels: [
      ch('paid-search', { spend: 500, costPerEnquiry: 50, estCostPerEnquiry: 25 }),
      ch('paid-social', { spend: 300, costPerEnquiry: 30, estCostPerEnquiry: 1 }),
      ch('gmb', { costPerEnquiry: 99 }),
      ch('website', {}),
    ],
  } as unknown as GrowthReport;
  const w = growthWindow(report)!;
  assert.deepEqual({ e: w.enquiries, b: w.booked, s: w.showed }, { e: 30, b: 12, s: 9 });
  assert.deepEqual(w.channels.map((c) => [c.key, c.spend, c.costPerEnquiry, c.costIsEstimate]), [
    ['paid-search', 500, 25, true], ['paid-social', 300, 30, false], ['gmb', null, null, false], ['website', null, null, false],
  ]);
  // Paid search without the modelled phone path prints no cost.
  const noModel = growthWindow({ ...report, channels: [ch('paid-search', { spend: 500, costPerEnquiry: 50 })] } as unknown as GrowthReport)!;
  assert.deepEqual([noModel.channels[0].costPerEnquiry, noModel.channels[0].costIsEstimate], [null, false]);
  // No appointment feed rows = the report could not be read.
  assert.equal(growthWindow({ ...report, apptFeedRows: 0 } as unknown as GrowthReport), null);
});

test('branded share: the Digital page rule over its top queries', () => {
  const src = readFileSync(new URL('../components/sections/digital/DigitalSeo.tsx', import.meta.url), 'utf8');
  assert.ok(src.includes(`const BRANDED = ${BRANDED_QUERY.toString()};`), 'BRANDED_QUERY must match DigitalSeo.tsx');
  assert.equal(brandedClickShare([
    { query: 'dental nation dubai', clicks: 30 }, { query: 'DentalNation', clicks: 8 }, { query: 'braces dubai', clicks: 62 },
  ]), 38);
  assert.equal(brandedClickShare([]), null);
  assert.equal(brandedClickShare([{ query: 'dental nation', clicks: 0 }]), null);
});

test('brand searches: own column beside the default competitor', () => {
  const snap = (domain: string, brand: (number | null)[]): CompetitorSnapshot => ({
    domain, fetchedAt: '2026-10-17T09:47:13Z', markets: brand.map((b, i) => ({ market: `M${i}`, organicVisits: 100, organicKeywords: null, top3: null,
      paidVisits: null, paidKeywords: null, paidCostUsd: null, brandSearches: b, brandVisits: null })),
    brandTrend: [], topKeywords: null, backlinks: null, peers: [], metaAds: null, errors: [],
  });
  const noData = (domain: string): CompetitorSnapshot => ({ ...snap(domain, []), markets: [] });
  assert.equal(ownBrandSearches(new Map([['dentalnation.com', snap('dentalnation.com', [1000, 900])], ['dentakay.com', snap('dentakay.com', [5])]])), 1900);
  assert.equal(ownBrandSearches(new Map([['dentalnation.com', snap('dentalnation.com', [1000])], ['dentakay.com', noData('dentakay.com')]])), null);
  assert.equal(ownBrandSearches(new Map([['dentalnation.com', snap('dentalnation.com', [null])], ['dentakay.com', snap('dentakay.com', [5])]])), null);
  assert.equal(ownBrandSearches(new Map()), null);
});

type Rows = Record<string, Record<string, unknown>[]>;
/** A Supabase-shaped fake with filters; failing tables answer with an error result, as the real client does. */
function fakeDb(tables: Rows, failing: (t: string) => boolean = () => false): AdminClient {
  return { from(table: string) {
    const down = failing(table);
    let rows = [...(tables[table] ?? [])];
    const result = (data: unknown) => (down ? { data: null, error: { message: 'synthetic outage' } } : { data, error: null });
    const has = (v: unknown) => v != null;
    const filters: Record<string, (k: string, v: never) => void> = {
      eq: (k, v) => { rows = rows.filter((r) => r[k] === v); },
      neq: (k, v) => { rows = rows.filter((r) => r[k] !== v); },
      is: (k, v) => { rows = rows.filter((r) => (r[k] ?? null) === v); },
      in: (k, vs: unknown[]) => { rows = rows.filter((r) => vs.includes(r[k])); },
      gte: (k, v: string) => { rows = rows.filter((r) => has(r[k]) && String(r[k]) >= v); },
      lte: (k, v: string) => { rows = rows.filter((r) => has(r[k]) && String(r[k]) <= v); },
    };
    const q: unknown = new Proxy({}, { get(_, prop: string) {
      if (prop === 'then') return (resolve: (v: unknown) => void, reject: (e: unknown) => void) => Promise.resolve(result(rows)).then(resolve, reject);
      if (prop === 'range') return async (from: number, to: number) => result(rows.slice(from, to + 1));
      if (prop === 'maybeSingle' || prop === 'single') return async () => result(rows[0] ?? null);
      if (prop === 'limit') return (n: number) => { rows = rows.slice(0, n); return q; };
      return (k: string, v: never) => { filters[prop]?.(k, v); return q; };
    } });
    return q;
  } } as unknown as AdminClient;
}

test('read never throws: every failed source becomes null', async () => {
  const data = await readPerformanceDaily(fakeDb({}, () => true), TODAY);
  assert.deepEqual(data, empty());
  assert.match(buildPerformanceDaily(data, TODAY).html, /not yet/);
});

test('read: clinic and channel figures from the Growth reader, spend, members and Instagram', async () => {
  const appt = (k: string, day: string, status: string, doctor: string) =>
    ({ appt_key: k, appt_date: day, mr_no: `DN-SYN-${k}`, status, doctor, patient_name: null, patient_phone: null, data: {} });
  const tosun = 'Dr. Dilsad Ozdogan';
  const tables: Rows = {
    practo_appointments_raw: [
      appt('1', '2026-10-23', 'Arrived', ''), appt('2', '2026-10-23', 'Booked', ''), appt('3', '2026-10-23', 'Completed', tosun),
      appt('4', '2026-10-05', 'Completed', ''), appt('5', '2026-10-06', 'Completed', tosun), appt('6', '2026-09-30', 'Completed', ''),
    ],
    practo_bills_raw: [{ bill_key: 'b1', bill_date: '2026-10-05', amount: 1000,
      data: { center_name: 'DENTAL NATION GENERAL DENTAL CLINIC L.L.C S.O.C', charges: [{ amount: 600, conducting_doctor: 'Dr. Hasna Alsaeed' }, { amount: 150, conducting_doctor: 'Dr. Yasmin Youssef' }] } },
    { bill_key: 'b2', bill_date: '2026-10-06', amount: 250,
      data: { center_name: 'DR TOSUN DENTAL CLINIC L.L.C', charges: [{ amount: 250, conducting_doctor: 'Dr.Yahya Serif Tosun' }] } }],
    meta_insights_raw: [
      { key: 'm1', date: '2026-10-05', spend: 100.5, impressions: 1000, clicks: 10, leads: 1, campaign_name: 'Synthetic M' },
      { key: 'm2', date: '2026-09-30', spend: 999, impressions: 1000, clicks: 10, leads: 1, campaign_name: 'Synthetic M' },
    ],
    google_ads_insights_raw: [{ key: 'g1', date: '2026-10-20', spend: 50, impressions: 10, clicks: 1, conversions: 0, campaign_name: 'Synthetic G' }],
    sc_companies: [
      { id: 'a', name: 'Company A', type: 'sme', stage: 'signed', members: 5, updated_at: '2026-10-20T08:00:00Z' },
      { id: 'b', name: 'Company B', type: 'sme', stage: 'launched', members: 4, updated_at: '2026-10-20T08:00:00Z' },
    ],
    sc_calendar_events: [],
    social_insights: [
      { clinic: 'dental-nation', channel: 'instagram', metric: 'followers', day: '2026-10-20', value: 1200 },
      { clinic: 'dental-nation', channel: 'instagram', metric: 'followers', day: '2026-10-22', value: 1210 },
      { clinic: 'dental-nation', channel: 'instagram', metric: 'followers', day: '2026-10-24', value: 1300 },
      { clinic: 'dental-nation', channel: 'instagram', metric: 'reach', day: '2026-10-03', value: 300 },
      { clinic: 'dental-nation', channel: 'instagram', metric: 'reach', day: '2026-10-21', value: 200 },
      { clinic: 'dental-nation', channel: 'instagram', metric: 'reach', day: '2026-09-29', value: 999 },
    ],
  };
  const data = await readPerformanceDaily(fakeDb(tables), TODAY);
  // Executive booked/showed = the Growth report totals for each clinic lens; billed is read through the
  // dashboard's own client (getPractoSummary), which has no credentials in tests.
  assert.deepEqual(data.clinics['dental-nation'], { yesterday: { booked: 2, showed: 1, billed: null }, mtd: { booked: 3, showed: 2, billed: null } });
  assert.deepEqual(data.clinics['dr-tosun'], { yesterday: { booked: 1, showed: 1, billed: null }, mtd: { booked: 2, showed: 2, billed: null } });
  assert.deepEqual(data.clinics.group, { yesterday: { booked: 3, showed: 2, billed: null }, mtd: { booked: 5, showed: 4, billed: null } });
  assert.equal(data.growth.mtd?.booked, 5);
  const ps = data.growth.mtd!.channels.find((c) => c.key === 'paid-search')!;
  const meta = data.growth.mtd!.channels.find((c) => c.key === 'paid-social')!;
  assert.deepEqual([ps.spend, ps.costPerEnquiry, meta.spend, meta.costPerEnquiry], [50, null, 101, null]);
  assert.equal(data.growth.yesterday!.channels.find((c) => c.key === 'paid-social')!.spend, null); // no Meta rows that day
  assert.ok(data.growth.last7 && data.growth.prior7);
  assert.equal(data.adSpendMtd, 150.5);
  assert.equal(data.orthoBillingMtd, 1000);
  assert.equal(data.smileClubMembers, 9);
  assert.deepEqual(data.instagram, { followers: 1210, reachMtd: 500 });
  // Sources behind the dashboard's own clients, or not configured here, stay "not yet".
  assert.equal(data.reviews, null);
  assert.equal(data.brandSearches, null);
  assert.equal(data.brandedShare, null);

  const html = buildPerformanceDaily(data, TODAY).html;
  assert.match(html, />151<\/a>/); // ad spend tile, rounded to the dirham
  assert.match(html, />9<\/a> of 24/);
});

test('Growth: Practo appointments by centre (Al Maher its own clinic); spend complete after the last delivery once the sync has checked', async () => {
  const { getChannelPerformance } = await import('../lib/growth/channelPerformance');
  const appt = (k: string, center: string, doctor: string) => ({ appt_key: k, appt_date: '2026-10-22', mr_no: `DN-SYN-${k}`, status: 'Arrived',
    doctor, center_name: center, patient_name: null, patient_phone: null, data: {} });
  const tables: Rows = {
    practo_appointments_raw: [
      appt('a1', 'Al Maher Centre', 'Dr. Synthetic One'),
      appt('a2', 'DENTAL NATION GENERAL DENTAL CLINIC L.L.C S.O.C', 'Dr. Synthetic Two'),
      // A doctor outside the Dr Tosun list, at the Dr Tosun centre: the centre decides.
      appt('a3', 'DR TOSUN DENTAL CLINIC L.L.C', 'Dr. Synthetic Three'),
    ],
    meta_insights_raw: [{ key: 'm1', date: '2026-10-05', spend: 100, impressions: 10, clicks: 1, leads: 0, campaign_name: 'Synthetic M' }],
    google_ads_insights_raw: [{ key: 'g1', date: '2026-10-23', spend: 5, impressions: 1 }],
    ingestion_log: [{ finished_at: '2026-10-24T03:00:00Z', sheets_ok: ['Meta Ads (insights) — 1 rows', 'Google Ads (insights) — 1 rows'] }],
  };
  const [all, wasl, tosun, amc] = await Promise.all((['all', 'dn-alwasl', 'dr-tosun', 'amc'] as const).map((c) => getChannelPerformance(MTD, c, fakeDb(tables))));
  assert.deepEqual([all, wasl, tosun, amc].map((r) => r.totals.booked), [3, 1, 1, 1]);
  assert.ok(amc.notes.some((n) => n.includes("Al Maher's appointments and bills are in Practo from 2026-10-22")));
  const meta = all.channels.find((c) => c.key === 'paid-social')!;
  assert.deepEqual([meta.spend, meta.lastDelivery, meta.spendThrough], [100, '2026-10-05', null]);
  assert.ok(all.notes.some((n) => n.startsWith('Meta shows no ad delivery after 2026-10-05')));
  assert.ok(!all.notes.some((n) => /paused since/.test(n)));
  // No successful Meta read since the window ended: the feed may be stale, so say so.
  const stale = await getChannelPerformance(MTD, 'all', fakeDb({ ...tables, ingestion_log: [{ finished_at: '2026-10-10T03:00:00Z', sheets_ok: ['Meta Ads (insights) — 1 rows'] }] }));
  const m2 = stale.channels.find((c) => c.key === 'paid-social')!;
  assert.deepEqual([m2.lastDelivery, m2.spendThrough], [null, '2026-10-05']);
});
