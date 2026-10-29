import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  countLeads, countSmileClub, isNonLeadTab, readClinicActivation, summariseAmc, summariseGmb,
  type AmcRow, type GmbRow, type LeadRow,
} from '../lib/activation/read';
import { periods, periodsFor } from '../lib/alerts/links';
import { fixtureDb } from './fixtures/dn015-db';

// Synthetic data only. Send day Thu 29 Oct 2026: yesterday 28 Oct, window 1 to 28 Oct.
const TODAY = '2026-10-29';
const P = periods(TODAY);
const LABEL = 'Inhouse Lead Tracker';

let seq = 0;
const lead = (tab: string, date: string | null, over: Partial<LeadRow> & { raw?: Record<string, unknown> } = {}) => {
  const platform = 'channel_source' in over ? over.channel_source ?? null : 'Instagram';
  return {
  id: `lead-${String(++seq).padStart(3, '0')}`,
  source_sheet: LABEL,
  inquiry_date: date,
  booking_status: over.booking_status ?? null,
  channel_source: platform,
  clinic: over.clinic ?? null,
  whatsapp_ref: null,
  raw_row: { _source_tab: tab, 'Inquiry Platform': platform ?? '', ...(over.raw ?? {}) },
  };
};

const LEADS = [
  lead('DN Campaign Leads  ❤', '2026-10-28', { booking_status: 'booked', channel_source: 'Facebook' }),
  lead('DN Campaign Leads  ❤', '2026-10-05'),
  lead('DN - AL WASL Br ⭐', '2026-10-28', { clinic: 'Tosun Clinic' }),
  lead('AMC Campaign Leads  ❤', '2026-10-20', { clinic: 'AMC Branch', channel_source: null }),
  lead('Smile Club', '2026-10-28', { clinic: 'DN Al Wasl' }),
  lead('GMB', '2026-10-28', { clinic: 'DN Al Wasl' }),
  lead('Website Enquiries (auto)', '2026-10-28'),
  lead('DN Campaign Leads  ❤', '2026-10-27', { raw: { 'Lead ID': 'WEB-0012' } }),
  lead('DN Campaign Leads  ❤', '2026-09-30'),
  lead('DN Campaign Leads  ❤', '2026-10-29'),
];

test('lead counts exclude the Smile Club, GMB and website tabs', () => {
  assert.equal(isNonLeadTab('Smile Club'), true);
  assert.equal(isNonLeadTab(' gmb '), true);
  assert.equal(isNonLeadTab('Website Summary'), true);
  assert.equal(isNonLeadTab('DN Campaign Leads  ❤', 'WEB-7'), true);
  assert.equal(isNonLeadTab('DN Campaign Leads  ❤'), false);

  const s = countLeads(LEADS, P);
  assert.equal(s.total.window.leads, 4);
  assert.equal(s.total.yesterday.leads, 2);
  assert.equal(s.excludedRows, 4);
  assert.equal(s.total.window.converted, 1);
  assert.equal(s.total.yesterday.converted, 1);
  assert.equal(s.byClinic['dental-nation'].window.leads, 2); // DN tab inherits the tab's branch
  assert.equal(s.byClinic['dr-tosun'].yesterday.leads, 1);
  assert.equal(s.byClinic['al-maher'].window.leads, 1);
  assert.equal(s.byClinic.unassigned.window.leads, 0);
  assert.deepEqual(s.total.window.byPlatform, { Facebook: 1, Instagram: 2, 'Not recorded': 1 });
  assert.equal(Object.values(s.total.window.byGroup).reduce((a, b) => a + (b ?? 0), 0), 4);
});

test('Smile Club: enquiries, follow-ups and conversions per clinic, no names or phones out', () => {
  const rows = [
    { data: { _source_tab: 'Smile Club', Date: '28.10.2026', 'Clinic / Branch': 'DN Al Wasl', 'Patient Name': 'PERSON A', 'Contact Number': '0500000000', 'Follow up Remarks': 'called', Conversion: 'CONVERTED' } },
    { data: { _source_tab: 'Smile Club', Date: '28.10.2026 at 10:48PM', 'Clinic / Branch': 'Tosun Clinic', 'Follow up Remarks': '', '2nd follow/Remarks': 'no answer', Conversion: 'Thinking' } },
    { data: { _source_tab: 'Smile Club', Date: '10.10.2026', 'Clinic / Branch': 'Tosun Clinic', 'Follow-up Date': '12.10.2026', Conversion: '' } },
    { data: { _source_tab: 'Smile Club', Date: '', 'Clinic / Branch': 'DN Al Wasl' } },
    { data: { _source_tab: 'Smile Club', Date: '30.09.2026', 'Clinic / Branch': 'DN Al Wasl' } },
    { data: { _source_tab: 'DN Campaign Leads  ❤', Date: '28.10.2026', 'Clinic / Branch': 'DN Al Wasl' } },
  ];
  const s = countSmileClub(rows, P);
  assert.deepEqual(s.total.yesterday, { enquiries: 2, followedUp: 2, converted: 1 });
  assert.deepEqual(s.total.window, { enquiries: 3, followedUp: 2, converted: 1 });
  assert.deepEqual(s.byClinic['dr-tosun'].window, { enquiries: 2, followedUp: 1, converted: 0 });
  assert.deepEqual(s.byClinic['dental-nation'].yesterday, { enquiries: 1, followedUp: 1, converted: 1 });
  assert.equal(s.undated, 1);
  const json = JSON.stringify(s);
  assert.ok(!/PERSON|0500000000/.test(json));
});

const gmbRow = (day: string, clinic: string, over: Partial<GmbRow> = {}): GmbRow => ({
  snapshot_day: day, clinic, fo_name: 'Asha Example', reviews_today: 2, reviews_individual: 1, reviews_total: 100,
  photos: 1, videos: null, month_title: 'Google My Business - October 2026', synced_at: `${day}T10:00:00Z`, ...over,
});

test('GMB: latest snapshot per clinic, yesterday snapshot, window sums keep null when nothing reported', () => {
  const rows = [
    gmbRow('2026-10-27', 'dental-nation', { reviews_today: 3, photos: 2 }),
    gmbRow('2026-10-28', 'dental-nation', { reviews_total: 105 }),
    gmbRow('2026-10-29', 'dental-nation', { reviews_total: 999 }), // after the window
    gmbRow('2026-09-30', 'dr-tosun'), // before the window: latest, but no window sums
  ];
  const g = summariseGmb(rows, P);
  assert.equal(g.latest['dental-nation']?.snapshotDay, '2026-10-28');
  assert.equal(g.latest['dental-nation']?.reviewsTotal, 105);
  assert.equal(g.latest['dental-nation']?.foName, 'Asha');
  assert.equal(g.yesterday['dental-nation']?.snapshotDay, '2026-10-28');
  assert.deepEqual(g.window['dental-nation'], { days: 2, reviewsToday: 5, photos: 3, videos: null });
  assert.equal(g.latest['dr-tosun']?.snapshotDay, '2026-09-30');
  assert.equal(g.yesterday['dr-tosun'], null);
  assert.deepEqual(g.window['dr-tosun'], { days: 0, reviewsToday: null, photos: null, videos: null });
  assert.equal(g.latest['al-maher'], null);
  assert.deepEqual(g.total, { days: 2, reviewsToday: 5, photos: 3, videos: null });
});

const amcRow = (date: string, over: Partial<AmcRow> = {}): AmcRow => ({
  report_date: date, total_appointments: 3, consulted: 1, invoiced: 3, non_invoiced: 0, cancelled: 0, patients_old: 3, patients_new: null,
  invoice_amount_total: '3914.12', insurance_total: '2757.71', copay_total: '306.38', cash_total: '0', card_total: '889.50',
  advance_total: '102.00', balance_total: '165.13', invoice_count: 3,
  doctors: { 'Dr. Alpha': { invoices: 2, amount: 3064.12 }, 'Dr. Beta': { invoices: 1, amount: 850 } }, prepared_by: 'Dalia', ...over,
});

test('AMC revenue: yesterday report, window totals, missing days listed, nulls kept', () => {
  const a = summariseAmc([amcRow('2026-10-28'), amcRow('2026-10-27', { invoice_amount_total: '100', patients_new: 2, doctors: { 'Dr. Alpha': { invoices: 1, amount: 100 } } })], P);
  assert.equal(a.source, 'amc-daily-report');
  assert.equal(a.yesterday?.invoiceAmountTotal, 3914.12);
  assert.equal(a.yesterday?.patientsNew, null);
  assert.equal(a.window?.invoiceAmountTotal, 4014.12);
  assert.equal(a.window?.patientsNew, 2);
  assert.deepEqual(a.window?.doctors['Dr. Alpha'], { invoices: 3, amount: 3164.12 });
  assert.deepEqual(a.window?.days, ['2026-10-27', '2026-10-28']);
  assert.equal(a.window?.missingDays.length, 26);
  const none = summariseAmc([], P);
  assert.equal(none.yesterday, null);
  assert.equal(none.window, null);
});

test('readClinicActivation never throws: failed sources are null, never 0', async () => {
  const failing = fixtureDb({}, 'leads');
  const r = await readClinicActivation(failing, TODAY);
  assert.equal(r.leads, null);
  assert.deepEqual(r.yesterday, { from: '2026-10-28', to: '2026-10-28' });
  assert.deepEqual(r.window, { from: '2026-10-01', to: '2026-10-28' });
  // Practo is not configured in tests: every revenue figure is null, not 0.
  for (const v of Object.values(r.revenue.practo.byClinic)) { assert.equal(v.yesterday, null); assert.equal(v.window, null); }
  assert.equal(r.revenue.practo.source, 'practo');

  const broken = { from() { throw new Error('database down'); } } as unknown as Parameters<typeof readClinicActivation>[0];
  const b = await readClinicActivation(broken, TODAY);
  assert.equal(b.leads, null);
  assert.equal(b.smileClub, null);
  assert.equal(b.gmb, null);
  assert.equal(b.revenue.amc, null);
  // readOrthoDaily keeps its own "not yet" semantics (per-source nulls).
  assert.ok(b.ortho === null || b.ortho.doctors.every((d) => d.billedMtd === null));

  for (const table of ['gmb_frontoffice_daily', 'amc_daily_report', 'raw_lead_tracker']) {
    const one = await readClinicActivation(fixtureDb({ leads: LEADS }, table), TODAY);
    assert.notEqual(one.leads, null, table);
    if (table === 'gmb_frontoffice_daily') assert.equal(one.gmb, null);
    if (table === 'amc_daily_report') assert.equal(one.revenue.amc, null);
    if (table === 'raw_lead_tracker') assert.equal(one.smileClub, null);
  }
});

test('readClinicActivation reads every section from the tables, honouring a chosen range', async () => {
  const db = fixtureDb({
    leads: LEADS,
    raw_lead_tracker: [{ id: 1, data: { _source_tab: 'Smile Club', Date: '15.10.2026', 'Clinic / Branch': 'DN Al Wasl', Conversion: 'CONVERTED' } }],
    gmb_frontoffice_daily: [{ ...gmbRow('2026-10-15', 'al-maher', { photos: 4 }) }],
    amc_daily_report: [{ ...amcRow('2026-10-15') }, { ...amcRow('2026-10-28') }],
  });
  const range = { from: '2026-10-10', to: '2026-10-15' };
  const r = await readClinicActivation(db, TODAY, range);
  assert.deepEqual(r.window, range);
  assert.deepEqual(r.yesterday, { from: '2026-10-15', to: '2026-10-15' });
  assert.equal(r.leads?.total.window.leads, 0);
  assert.deepEqual(r.smileClub?.total.yesterday, { enquiries: 1, followedUp: 0, converted: 1 });
  assert.equal(r.gmb?.latest['al-maher']?.photos, 4);
  assert.equal(r.revenue.amc?.yesterday?.reportDate, '2026-10-15');
  assert.deepEqual(r.revenue.amc?.window?.days, ['2026-10-15']);
  assert.deepEqual(periodsFor(range).mtd, range);

  const d = await readClinicActivation(db, TODAY);
  assert.equal(d.leads?.total.window.leads, 4);
  assert.equal(d.revenue.amc?.yesterday?.reportDate, '2026-10-28');
});
