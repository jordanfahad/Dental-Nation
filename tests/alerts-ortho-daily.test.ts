import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  buildOrthoDaily, campaignTotals, orthodontistBilling, readOrthoDaily, ORTHO_GOOGLE_CAMPAIGN,
  type OrthoDailyData,
} from '../lib/alerts/orthoDaily';
import { REPORTS } from '../lib/alerts/links';
import { NOT_YET } from '../lib/alerts/shell';
import { ORTHO_CHECKLIST } from '../config/ortho-checklist';
import { fixtureDb } from './fixtures/dn015-db';

// Synthetic data only. Send day Sun 25 Oct 2026: yesterday 24 Oct, month to date 1 to 24 Oct.
const TODAY = '2026-10-25';
const DN_CENTRE = 'DENTAL NATION GENERAL DENTAL CLINIC L.L.C S.O.C';
const TOSUN_CENTRE = 'DR TOSUN DENTAL CLINIC L.L.C';

const data = (over: Partial<OrthoDailyData> = {}): OrthoDailyData => ({
  doctors: [
    { key: 'hasna', name: 'Dr Hasna Alsaeed', clinic: 'dental-nation', clinicLabel: 'Dental Nation Al Wasl', billedMtd: 38600 },
    { key: 'yasmin', name: 'Dr Yasmin Youssef', clinic: 'dental-nation', clinicLabel: 'Dental Nation Al Wasl', billedMtd: 21900 },
    { key: 'yahya', name: 'Dr Yahya Tosun', clinic: 'dr-tosun', clinicLabel: 'Dr. Tosun Dental Clinic', billedMtd: 47300 },
  ],
  googleSearch: {
    campaign: ORTHO_GOOGLE_CAMPAIGN,
    yesterday: { spend: 57.85, impressions: 126, clicks: 5, activeDays: 1 },
    mtd: { spend: 80.1, impressions: 230, clicks: 7, activeDays: 2 },
  },
  checklist: ORTHO_CHECKLIST,
  ...over,
});

const hrefs = (html: string) => [...html.matchAll(/<a href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
/** href of the link whose visible text is exactly `label`. */
const linkOf = (html: string, label: string) => {
  const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = html.match(new RegExp(`<a href="([^"]+)"[^>]*>${esc}</a>`));
  return m ? new URL(m[1].replace(/&amp;/g, '&')) : null;
};
const params = (u: URL | null) => (u ? Object.fromEntries(u.searchParams) : null);

test('subject follows the approved format', () => {
  assert.equal(buildOrthoDaily(data(), TODAY).subject, 'DN Ortho · Sun 25 Oct · AED 107,800 orthodontist billing this month');
  assert.equal(buildOrthoDaily(data({ doctors: data().doctors.map((d) => ({ ...d, billedMtd: null })) }), TODAY).subject,
    'DN Ortho · Sun 25 Oct · orthodontist billing not yet available');
});

test('every figure links to reports.dentalnation.com with the right tab, dates and clinic', () => {
  const { html } = buildOrthoDaily(data(), TODAY);
  const all = hrefs(html);
  assert.ok(all.length > 10);
  for (const h of all) assert.ok(h.startsWith(REPORTS), h);
  const mtd = { preset: 'custom', from: '2026-10-01', to: '2026-10-24' };
  const revenue = (clinic: string) => ({ tab: 'practo', ptab: 'revenue', clinic, ...mtd });
  // Tile total and landing button: Al Wasl billing view, month to date.
  assert.deepEqual(params(linkOf(html, '107,800')), revenue('dental-nation'));
  assert.match(html, /href="[^"]*ptab=revenue&amp;clinic=dental-nation[^"]*"[^>]*>Open the orthodontist billing report/);
  // Per doctor, the clinic whose Revenue view shows that doctor.
  assert.deepEqual(params(linkOf(html, '38,600')), revenue('dental-nation'));
  assert.deepEqual(params(linkOf(html, '21,900')), revenue('dental-nation'));
  assert.deepEqual(params(linkOf(html, '47,300')), revenue('dr-tosun'));
  // Google: exact campaign name, yesterday and month to date.
  assert.deepEqual(params(linkOf(html, 'AED 80')), { tab: 'marketing', mtab: 'google', gcamp: ORTHO_GOOGLE_CAMPAIGN, ...mtd });
  assert.deepEqual(params(linkOf(html, 'AED 80 · 7 clicks')), { tab: 'marketing', mtab: 'google', gcamp: ORTHO_GOOGLE_CAMPAIGN, ...mtd });
  assert.deepEqual(params(linkOf(html, 'AED 58 · 5 clicks')), { tab: 'marketing', mtab: 'google', gcamp: ORTHO_GOOGLE_CAMPAIGN, preset: 'custom', from: '2026-10-24', to: '2026-10-24' });
  assert.ok(all.some((h) => h.includes('mtab=demand') && h.includes('from=2026-10-01') && h.includes('to=2026-10-24')));
  assert.ok(html.includes('Sat 24 Oct (yesterday) and 1 to 24 Oct (month to date)'));
  assert.match(html, /Live · 7 clicks month to date/);
  assert.match(html, />Live<\/td>/);
});

test('a campaign with no spend or impressions reads Not live, linked to the campaign view', () => {
  const zero = { spend: 0, impressions: 0, clicks: 0, activeDays: 0 };
  const { html } = buildOrthoDaily(data({ googleSearch: { campaign: ORTHO_GOOGLE_CAMPAIGN, yesterday: zero, mtd: zero } }), TODAY);
  assert.equal(params(linkOf(html, 'Not live'))?.gcamp, ORTHO_GOOGLE_CAMPAIGN);
  assert.match(html, /Built, paused for review/);
  assert.match(html, /Built, paused<\/td>/);
  assert.match(html, /empty until this campaign runs/);
  assert.match(html, /Once the campaign is live/);
});

test('nulls render "not yet" without links, and the email still builds', () => {
  const { html, subject } = buildOrthoDaily(data({ doctors: data().doctors.map((d) => ({ ...d, billedMtd: null })), googleSearch: null }), TODAY);
  assert.ok(subject.startsWith('DN Ortho · Sun 25 Oct'));
  assert.ok(!hrefs(html).some((h) => h.includes('ptab=revenue') && !h.includes('clinic=dental-nation')), 'no per-doctor Tosun link without a figure');
  assert.ok(!html.includes('AED 58') && !html.includes('AED 80'));
  // 3 tiles + 4 doctors x 2 + Suzanna 2 + Google 3 = at least 12 "not yet".
  assert.ok(html.split(NOT_YET).length - 1 >= 12);
});

test('fixed "not yet" figures: ortho enquiries, appointments, Al Maher', () => {
  const { html } = buildOrthoDaily(data(), TODAY);
  const suzanna = html.slice(html.indexOf('Dr Suzanna Almaali'), html.indexOf('</tr>', html.indexOf('Dr Suzanna Almaali')));
  assert.equal(suzanna.split(NOT_YET).length - 1, 2);
  assert.ok(!suzanna.includes('<a '));
  const enquiries = html.slice(html.indexOf('Ortho enquiries'), html.indexOf('Needs the ortho tagging update'));
  assert.ok(enquiries.includes(NOT_YET) && !enquiries.includes('<a '));
  assert.equal(html.split(NOT_YET).length - 1, 1 + 4 + 1); // tile, appointments x4, Suzanna billed
});

test('checklist comes from the config file with the project-plan note; no em or en dashes', () => {
  const checklist = { updated: '2026-10-24', items: [...ORTHO_CHECKLIST.items, { item: 'Test row', status: 'Done – sent — ok' }] };
  const { html, subject } = buildOrthoDaily(data({ checklist }), TODAY);
  for (const i of ORTHO_CHECKLIST.items) assert.ok(html.includes(i.item.replace(/'/g, '&#39;')), i.item);
  assert.match(html, /Checklist status comes from the project plan; there is no dashboard page for it yet\./);
  assert.match(html, /Last updated Sat 24 Oct\./);
  assert.ok(!/[–—]/.test(html) && !/[–—]/.test(subject));
  assert.match(html, /finalised bills/);
});

test('checklist campaign row never contradicts the Campaigns table', () => {
  const statusOf = (html: string) => html.match(/>Google Search campaign<\/td>\s*<td[^>]*>([^<]*)</)?.[1];
  // Live (Google Ads shows spend or impressions this month): the hand-written "paused" status is superseded.
  const live = buildOrthoDaily(data(), TODAY).html;
  assert.equal(statusOf(live), 'Live (figures under Campaigns above)');
  assert.doesNotMatch(live, /Built and paused/);
  // Not live, or Google Ads unreadable: the project plan's status stands.
  const zero = { spend: 0, impressions: 0, clicks: 0, activeDays: 0 };
  for (const googleSearch of [{ campaign: ORTHO_GOOGLE_CAMPAIGN, yesterday: zero, mtd: zero }, null]) {
    const html = buildOrthoDaily(data({ googleSearch }), TODAY).html;
    assert.equal(statusOf(html), "Built and paused, waiting for Fahad&#39;s review");
  }
});

test('reader: Revenue by conducting doctor rule, clinic by centre, one failed source does not block', async () => {
  const charge = (doctor: string, amount: number) => ({ conducting_doctor: doctor, amount, charge_group: 'Services & Procedures' });
  const bills = [
    { bill_key: 'a', bill_date: '2026-10-03', data: { center_name: DN_CENTRE, charges: [charge('Dr. Hasna Alsaeed', 1000), charge('Dr. Hasna Alsaeed', 0), charge('', 900)] } },
    { bill_key: 'b', bill_date: '2026-10-24', data: { center_name: DN_CENTRE, charges: [charge(' Dr. Yasmin Youssef ', 250.4), charge('Dr. Hasna Alsaeed', -50)] } },
    { bill_key: 'c', bill_date: '2026-10-10', data: { center_name: TOSUN_CENTRE, charges: [charge('Dr.Yahya Serif Tosun', 3000), charge('Dr. Hasna Alsaeed', 400)] } },
    { bill_key: 'd', bill_date: '2026-09-30', data: { center_name: DN_CENTRE, charges: [charge('Dr. Hasna Alsaeed', 7777)] } },
    { bill_key: 'e', bill_date: '2026-10-25', data: { center_name: TOSUN_CENTRE, charges: [charge('Dr.Yahya Serif Tosun', 5555)] } },
  ];
  const ads = [
    { key: '1', campaign_name: ORTHO_GOOGLE_CAMPAIGN, date: '2026-10-23', spend: 0, impressions: 49, clicks: 0 },
    { key: '2', campaign_name: ORTHO_GOOGLE_CAMPAIGN, date: '2026-10-24', spend: 57.85, impressions: 126, clicks: 5 },
    { key: '3', campaign_name: 'Search | Other | Dubai', date: '2026-10-24', spend: 999, impressions: 999, clicks: 99 },
  ];
  const ok = await readOrthoDaily(fixtureDb({ practo_bills_raw: bills, google_ads_insights_raw: ads }), TODAY);
  assert.deepEqual(ok.doctors.map((d) => d.billedMtd), [1000, 250, 3000]);
  assert.deepEqual(ok.googleSearch?.yesterday, { spend: 57.85, impressions: 126, clicks: 5, activeDays: 1 });
  assert.deepEqual(ok.googleSearch?.mtd, { spend: 57.85, impressions: 175, clicks: 5, activeDays: 2 });

  const noPracto = await readOrthoDaily(fixtureDb({ practo_bills_raw: bills, google_ads_insights_raw: ads }, 'practo_bills_raw'), TODAY);
  assert.deepEqual(noPracto.doctors.map((d) => d.billedMtd), [null, null, null]);
  assert.equal(noPracto.googleSearch?.mtd.clicks, 5);
  const noAds = await readOrthoDaily(fixtureDb({ practo_bills_raw: bills }, 'google_ads_insights_raw'), TODAY);
  assert.equal(noAds.googleSearch, null);
  assert.equal(noAds.doctors[2].billedMtd, 3000);
  assert.doesNotThrow(() => buildOrthoDaily(noAds, TODAY));

  // Priced lines without a conducting doctor (the Oct 2026 Practo data): no proof bar, so "not yet", never AED 0.
  const unattributed = [{ bill_key: 'u', bill_date: '2026-10-05', data: { center_name: DN_CENTRE, charges: [charge('', 9000), charge('Dr. Hasna Alsaeed', 0)] } }];
  const none = await readOrthoDaily(fixtureDb({ practo_bills_raw: unattributed, google_ads_insights_raw: ads }), TODAY);
  assert.deepEqual(none.doctors.map((d) => d.billedMtd), [null, null, null]);
  const built = buildOrthoDaily(none, TODAY);
  assert.match(built.subject, /orthodontist billing not yet available$/);
  assert.ok(!/AED 0\b/.test(built.subject + built.html));
});

test('billing figure only when it is a named bar on the linked Revenue view (exact name, top 7 plus Other)', () => {
  const bill = (centre: string, lines: [string, number][]) => ({
    bill_date: '2026-10-10', data: { center_name: centre, charges: lines.map(([conducting_doctor, amount]) => ({ conducting_doctor, amount })) },
  });
  const others = (n: number) => Array.from({ length: n }, (_, i) => [`Dr Synthetic ${i + 1}`, 10000 - i * 100] as [string, number]);
  // 9 doctors at Al Wasl: the view shows 7 bars plus "Other"; Dr Hasna ranked 8th is only inside "Other".
  const nine = orthodontistBilling([bill(DN_CENTRE, [...others(7), ['Dr. Hasna Alsaeed', 500], ['Dr Synthetic 9', 400]])]);
  assert.equal(nine.hasna, null);
  // 8 doctors: all 8 are named bars, so ranked 8th still shows.
  const eight = orthodontistBilling([bill(DN_CENTRE, [...others(7), ['Dr. Hasna Alsaeed', 500]])]);
  assert.equal(eight.hasna, 500);
  // Ranked 7th of 9 is a named bar.
  const seventh = orthodontistBilling([bill(DN_CENTRE, [...others(6), ['Dr. Hasna Alsaeed', 9000], ['Dr Synthetic 8', 300], ['Dr Synthetic 9', 200]])]);
  assert.equal(seventh.hasna, 9000);
  // Spelling variants are separate bars on the view: only the exact Practo name counts, never merged.
  const variants = orthodontistBilling([bill(DN_CENTRE, [['Dr. Hasna Alsaeed', 700], ['Dr Hasna Alsaeed', 300], ['  Dr. Hasna Alsaeed ', 100]])]);
  assert.equal(variants.hasna, 800);
  // Rank is per clinic view: Tosun doctors do not push an Al Wasl doctor out of the top 7.
  const split = orthodontistBilling([bill(TOSUN_CENTRE, others(9)), bill(DN_CENTRE, [['Dr. Yasmin Youssef', 50]])]);
  assert.equal(split.yasmin, 50);
  assert.equal(split.yahya, null);
});

test('pure helpers', () => {
  assert.deepEqual(orthodontistBilling([{ bill_date: '2026-10-01', data: null }]), { hasna: null, yasmin: null, yahya: null });
  assert.deepEqual(campaignTotals([]), { spend: 0, impressions: 0, clicks: 0, activeDays: 0 });
});
