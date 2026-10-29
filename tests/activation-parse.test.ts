import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { sheets_v4 } from 'googleapis';
import { gmbClinicOfBranch, parseGmbFrontOffice, syncGmbFrontOffice } from '../lib/sync/adapters/gmb-frontoffice-adapter';
import { amcReportDate, parseAmcReport, syncAmcDailyReports } from '../lib/sync/adapters/amc-report-adapter';
import { cellDate, cellNumber } from '../lib/sync/adapters/sheet-cells';
import { sheetMapping, GMB_FRONTOFFICE_TAB } from '../config/sheet-mapping';
import { normalizeLeads } from '../lib/sync/normalize';
import type { AdminClient } from '../lib/supabase/server';

// Synthetic data only: no real patient names, file numbers or phones.

/** A row of `width` cells with values placed at column letters. */
const row = (cells: Record<string, unknown>, width = 20): unknown[] => {
  const r: unknown[] = Array(width).fill('');
  for (const [col, v] of Object.entries(cells)) r[col.charCodeAt(0) - 65] = v;
  return r;
};

/* ── GMB tab ── */

const gmbGrid = (): unknown[][] => [
  ['Google My Business - October 2026'], // row 1: merged title (value only in A1)
  row({ A: 'Google Reviews today', H: 'Posts' }, 9), // row 2: merged group headers
  row({ A: 'Branch Name', B: 'FO Name', C: 'Google Reviews today', D: 'Google Reviews (Individual)', E: 'Google Reviews total', H: 'Photos', I: 'Videos' }, 9),
  // Posts block deliberately in a different order from the reviews block.
  row({ A: 'DN Al Wasl', B: 'Asha Example', C: 4, D: '2', E: '1,204', G: 'AMC', H: 3, I: 1 }, 9),
  row({ A: 'Dr Tosun', B: 'Bina', C: 1, D: 1, E: 310, G: 'DN Al Wasl', H: 5, I: '' }, 9),
  row({ A: 'AMC', B: 'Carla', C: '', D: '', E: 88, G: 'Dr Tosun', H: '0', I: 2 }, 9),
  [],
];

test('GMB tab: merged title/group rows skipped, header found by text, posts matched by their own branch', () => {
  const { monthTitle, rows, warnings } = parseGmbFrontOffice(gmbGrid());
  assert.equal(monthTitle, 'Google My Business - October 2026');
  assert.deepEqual(warnings, []);
  const by = Object.fromEntries(rows.map((r) => [r.clinic, r]));
  assert.deepEqual(Object.keys(by).sort(), ['al-maher', 'dental-nation', 'dr-tosun']);
  assert.deepEqual(
    { ...by['dental-nation'] },
    { clinic: 'dental-nation', branch_label: 'DN Al Wasl', fo_name: 'Asha', reviews_today: 4, reviews_individual: 2, reviews_total: 1204,
      photos: 5, videos: null, month_title: 'Google My Business - October 2026', source_row: 4 },
  );
  assert.equal(by['dr-tosun'].photos, 0);
  assert.equal(by['dr-tosun'].videos, 2);
  assert.equal(by['al-maher'].photos, 3);
  // Empty cells stay null, never 0.
  assert.equal(by['al-maher'].reviews_today, null);
  assert.equal(by['al-maher'].reviews_total, 88);
});

test('GMB tab: unknown branch is reported, not guessed; missing header throws', () => {
  const g = gmbGrid();
  g.push(row({ A: 'Somewhere Else', C: 1 }, 9));
  const { rows, warnings } = parseGmbFrontOffice(g);
  assert.equal(rows.length, 3);
  assert.ok(warnings.some((w) => w.includes('Somewhere Else')));
  assert.throws(() => parseGmbFrontOffice([['Google My Business'], ['nothing here']]), /header row/);
  assert.equal(gmbClinicOfBranch('DN Al Wasl'), 'dental-nation');
  assert.equal(gmbClinicOfBranch('Tosun Clinic'), 'dr-tosun');
  assert.equal(gmbClinicOfBranch('Al Maher Medical Centre'), 'al-maher');
  assert.equal(gmbClinicOfBranch('Head office'), null);
});

test('GMB tab is excluded from lead ingestion', () => {
  assert.ok(sheetMapping.leadTracker.excludeTabs?.includes(GMB_FRONTOFFICE_TAB));
  const { rows } = normalizeLeads(sheetMapping.leadTracker, [
    { rowIndex: 4, tabTitle: 'GMB', data: { Date: '20.10.2026', 'Inquiry Platform': 'Google', 'Contact Number': '000' } },
    { rowIndex: 4, tabTitle: 'DN Campaign Leads  ❤', data: { Date: '20.10.2026', 'Inquiry Platform': 'Instagram', 'Contact Number': '000' } },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].raw_row._source_tab, 'DN Campaign Leads  ❤');
});

test('GMB sync snapshots per Dubai day and clinic, upserting on (snapshot_day, clinic)', async () => {
  const calls: { table: string; rows: Record<string, unknown>[]; onConflict: string }[] = [];
  const db = { from: (table: string) => ({ upsert: async (rows: Record<string, unknown>[], o: { onConflict: string }) => { calls.push({ table, rows, onConflict: o.onConflict }); return { error: null }; } }) } as unknown as AdminClient;
  const sheets = { spreadsheets: { values: { get: async (p: { range: string }) => { assert.equal(p.range, "'GMB'"); return { data: { values: gmbGrid() } }; } } } } as unknown as sheets_v4.Sheets;
  // 22:30 UTC on 28 Oct is 02:30 on 29 Oct in Dubai.
  const res = await syncGmbFrontOffice(db, sheets, new Date('2026-10-28T22:30:00Z'));
  assert.equal(res.ok, true);
  assert.equal(res.day, '2026-10-29');
  assert.equal(calls[0].table, 'gmb_frontoffice_daily');
  assert.equal(calls[0].onConflict, 'snapshot_day,clinic');
  assert.ok(calls[0].rows.every((r) => r.snapshot_day === '2026-10-29'));

  const missing = { from: () => ({ upsert: async () => ({ error: { code: 'PGRST205', message: "Could not find the table 'lane_e.gmb_frontoffice_daily'" } }) }) } as unknown as AdminClient;
  const r2 = await syncGmbFrontOffice(missing, sheets);
  assert.equal(r2.ok, false);
  assert.equal(r2.missingTable, true);
  const broken = { spreadsheets: { values: { get: async () => { throw new Error('Unable to parse range: GMB'); } } } } as unknown as sheets_v4.Sheets;
  const r3 = await syncGmbFrontOffice(db, broken);
  assert.equal(r3.ok, false);
  assert.match(r3.error!, /Unable to parse range/);
});

/* ── Revenue AMC ── */

/** The 28-Oct-26 layout: summary block A-D beside the details table G-R. */
const amcGrid = (): unknown[][] => [
  row({ A: 'DAILY REPORT' }),
  row({ A: 'DATE:', C: '28-Oct-26' }),
  row({}),
  row({ G: 'A).  TOTAL CONSULTED' }),
  row({}),
  row({ A: 'APPOINTMENT DETAILS:', G: 'Sl.', H: ' File No', I: 'Patient Name', J: 'Doctor', K: 'Invoice No', L: 'Invoice Amount', M: 'insurance', N: 'co-payment', O: 'By Cash', P: 'By CC / Chq.', Q: 'In advance', R: 'Balance' }),
  row({ A: 'Total appointments', D: ' 3 ', G: 1, H: 900, I: 'PATIENT ONE', J: 'Dr. Alpha', K: 'INV -I000001', L: '1,651.32', M: '1,486.19', N: '165.13', P: 0, R: '165.13' }),
  row({ A: 'A). Total Consulted:', D: 1, G: 2, H: 901, I: 'PATIENT TWO', J: 'Dr. Alpha', K: 'INV -I000002', L: '1,412.80', M: '1,271.52', N: '141.25', P: 39.5, Q: '  102 ' }),
  row({ A: '         B.1)  Invoiced', D: 3, G: 3, H: 902, I: 'PATIENT THREE', J: 'Dr. Beta', K: 'INV -C000003', L: 850, P: 850 }),
  row({ A: '         B.2)  Non-Invoiced', D: 0, G: 4 }),
  row({ A: 'B). Cancelled appointments', D: 0 }),
  row({ A: 'C) Patient Type', K: 'Total' }),
  row({ A: 'Old', B: 3, G: 'B).  CANCELLED APPOINTMENTS' }),
  row({ A: 'New', G: 'Sl.', H: 'File No', I: 'Patient Name', J: 'Doctor' }),
  row({ G: 1 }),
  row({ A: 'Prepared by', G: 2 }),
  row({ A: 'Dalia', G: 3 }),
  row({ G: 4 }),
];

test('AMC tab: the 28-Oct layout, comma numbers, labels found by text', () => {
  const res = parseAmcReport('Report 28.10.2026', amcGrid());
  assert.ok(res.ok);
  const r = res.row;
  assert.equal(r.report_date, '2026-10-28');
  assert.equal(r.sheet_date, '2026-10-28');
  assert.equal(r.total_appointments, 3);
  assert.equal(r.consulted, 1);
  assert.equal(r.invoiced, 3);
  assert.equal(r.non_invoiced, 0);
  assert.equal(r.cancelled, 0);
  assert.equal(r.patients_old, 3);
  assert.equal(r.patients_new, null); // empty in the sheet: not 0
  assert.equal(r.invoice_count, 3);
  assert.equal(r.invoice_amount_total, 3914.12);
  assert.equal(r.insurance_total, 2757.71);
  assert.equal(r.copay_total, 306.38);
  assert.equal(r.cash_total, 0);
  assert.equal(r.card_total, 889.5);
  assert.equal(r.advance_total, 102);
  assert.equal(r.balance_total, 165.13);
  assert.deepEqual(r.doctors, { 'Dr. Alpha': { invoices: 2, amount: 3064.12 }, 'Dr. Beta': { invoices: 1, amount: 850 } });
  assert.equal(r.prepared_by, 'Dalia');
  assert.equal(r.source_tab, 'Report 28.10.2026');
  assert.deepEqual(res.warnings, []);
  // No patient names or file numbers anywhere in the stored row.
  const json = JSON.stringify(r);
  assert.ok(!/PATIENT|90[012]\b/.test(json), json);
});

test('AMC tab: shifted layout still parses; malformed and empty tabs are gaps, not crashes', () => {
  // Same report moved down two rows and right one column.
  const shifted = [[], [], ...amcGrid().map((r) => ['', ...r])];
  const s = parseAmcReport('Report 28.10.2026', shifted);
  assert.ok(s.ok);
  assert.equal(s.row.invoice_amount_total, 3914.12);
  assert.equal(s.row.total_appointments, 3);

  const malformed = parseAmcReport('Report 29.10.2026', [['Notes'], ['call the lab'], [42]]);
  assert.equal(malformed.ok, false);
  assert.equal(parseAmcReport('Report 30.10.2026', []).ok, false);
  assert.equal(parseAmcReport('Sheet1', amcGrid()).ok, false);

  const stale = amcGrid();
  stale[1] = row({ A: 'DATE:', C: '27-Oct-26' });
  const st = parseAmcReport('Report 28.10.2026', stale);
  assert.ok(st.ok);
  assert.equal(st.row.report_date, '2026-10-28');
  assert.ok(st.warnings.some((w) => /differs from the tab title/.test(w)));
});

test('AMC helpers: tab titles, dates and numbers', () => {
  assert.equal(amcReportDate('Report 28.10.2026'), '2026-10-28');
  assert.equal(amcReportDate(' report 1.11.26 '), '2026-11-01');
  assert.equal(amcReportDate('Report 31.02.2026'), null);
  assert.equal(amcReportDate('Summary'), null);
  assert.equal(cellDate('28-Oct-26'), '2026-10-28');
  assert.equal(cellDate('28/10/2026'), '2026-10-28');
  assert.equal(cellNumber('1,651.32'), 1651.32);
  assert.equal(cellNumber('  102 '), 102);
  assert.equal(cellNumber(''), null);
  assert.equal(cellNumber('-'), null);
  assert.equal(cellNumber('abc'), null);
});

test('AMC sync: every report tab parsed, a bad tab is a gap and never blocks the rest', async () => {
  const grids: Record<string, unknown[][]> = {
    "'Report 28.10.2026'": amcGrid(),
    "'Report 29.10.2026'": [['nothing useful']],
    "'Report 27.10.2026'": [],
  };
  const upserts: Record<string, unknown>[][] = [];
  const db = { from: (t: string) => ({ upsert: async (rows: Record<string, unknown>[], o: { onConflict: string }) => {
    assert.equal(t, 'amc_daily_report'); assert.equal(o.onConflict, 'report_date'); upserts.push(rows); return { error: null };
  } }) } as unknown as AdminClient;
  const sheets = { spreadsheets: {
    get: async () => ({ data: { sheets: ['Report 28.10.2026', 'Report 29.10.2026', 'Report 27.10.2026', 'Report 3x.10', 'Template'].map((title) => ({ properties: { title } })) } }),
    values: { batchGet: async (p: { ranges: string[] }) => ({ data: { valueRanges: p.ranges.map((r) => ({ values: grids[r] })) } }) },
  } } as unknown as sheets_v4.Sheets;
  const res = await syncAmcDailyReports(db, sheets);
  assert.equal(res.ok, true);
  assert.equal(res.tabs, 3);
  assert.equal(res.stored, 1);
  assert.equal(upserts[0][0].report_date, '2026-10-28');
  assert.ok(res.gaps.some((g) => g.includes('Report 29.10.2026')));
  assert.ok(res.gaps.some((g) => g.includes('Report 27.10.2026') && /empty/.test(g)));
  assert.ok(res.gaps.some((g) => g.includes('Report 3x.10')));

  const failing = { spreadsheets: { get: async () => { throw new Error('The caller does not have permission'); } } } as unknown as sheets_v4.Sheets;
  const f = await syncAmcDailyReports(db, failing);
  assert.equal(f.ok, false);
  assert.match(f.error!, /permission/);
});
