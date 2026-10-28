import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import ts from 'typescript';
import * as clinics from '../config/clinics';
import { buildClinicComparison, comparisonPeriods, coverageLabel } from '../lib/gbp/clinic-comparison';
import { readClinicComparison } from '../lib/gbp/clinic-comparison-reader';
import { comparisonFixture, comparisonInput } from './fixtures/dn019';
import { fixtureDb } from './fixtures/dn015-db';

function load<T>(file: string, deps: Record<string, unknown>): T {
  const code = ts.transpileModule(readFileSync(file, 'utf8'), {
    fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021, esModuleInterop: true },
  }).outputText;
  const localRequire = createRequire(resolve(file));
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((name: string) => name in deps ? deps[name] : localRequire(name), module, module.exports);
  return module.exports as T;
}

test('MTD and prior calendar month retain separate GBP coverage, canonical leads, bookings and billed AED', () => {
  const report = comparisonFixture();
  assert.deepEqual(report.periods, { mtd: { from: '2026-10-01', to: '2026-10-14' }, lastMonth: { from: '2026-09-01', to: '2026-09-30' } });
  const [wasl, tosun, maher] = report.branches;
  assert.deepEqual(wasl.mtd.calls, { value: 14, coveredDays: 14, expectedDays: 14 });
  assert.deepEqual(wasl.lastMonth.calls, { value: 30, coveredDays: 30, expectedDays: 30 });
  assert.equal(coverageLabel(wasl.lastMonth.calls), 'complete period (30/30 days)');
  assert.deepEqual(tosun.lastMonth.calls, { value: 38, coveredDays: 19, expectedDays: 30 });
  assert.equal(coverageLabel(tosun.lastMonth.calls), 'partial month (19/30 days)');
  assert.equal(maher.lastMonth.calls.value, 57);
  assert.equal(tosun.mtd.calls.value, 28); assert.equal(tosun.mtd.directions.value, 280);
  assert.deepEqual(tosun.mtd.websiteClicks, { value: 2600, coveredDays: 13, expectedDays: 14 });
  assert.deepEqual(report.branches.map((b) => [b.mtd.leads, b.lastMonth.leads]), [[3, 1], [1, 1], [1, 1]]);
  assert.deepEqual(report.unassigned, { mtd: 1, lastMonth: 1 });
  assert.equal(report.headerEchoes, 1); assert.equal(report.undated, 1);
  assert.deepEqual(report.branches.map((b) => [b.mtd.bookings, b.lastMonth.bookings]), [[12, 30], [8, 25], [null, null]]);
  assert.deepEqual(report.branches.map((b) => [b.mtd.revenue, b.lastMonth.revenue]), [[250, 100.25], [300.25, 200], [null, null]]);
  assert.equal(wasl.latestBill, '2026-10-14');
});

test('zeroes are covered days; absent/null metrics stay unavailable; other channels cannot contaminate GBP', () => {
  const input = comparisonInput();
  input.metrics = [
    { clinic: 'dental-nation', channel: 'gmb', metric: 'calls', day: '2026-10-01', value: 0 },
    { clinic: 'dental-nation', channel: 'gmb', metric: 'calls', day: '2026-10-01', value: 0 },
    { clinic: 'dental-nation', channel: 'gmb', metric: 'calls', day: '2026-10-02', value: null },
    { clinic: 'dental-nation', channel: 'benchmark', metric: 'calls', day: '2026-10-03', value: 999 },
    { clinic: 'dental-nation', channel: 'gmb', metric: 'review_count', day: '2026-10-03', value: 999 },
  ];
  const wasl = buildClinicComparison(input).branches[0];
  assert.deepEqual(wasl.mtd.calls, { value: 0, coveredDays: 1, expectedDays: 14 });
  assert.deepEqual(wasl.mtd.directions, { value: null, coveredDays: 0, expectedDays: 14 });
  assert.equal(coverageLabel(wasl.mtd.directions), 'partial month (0/14 days)');
});

test('first-day, year-boundary and leap-year windows never relabel the previous month as MTD', () => {
  assert.deepEqual(comparisonPeriods('2026-01-01'), { mtd: { from: '2026-01-01', to: '2025-12-31' }, lastMonth: { from: '2025-12-01', to: '2025-12-31' } });
  assert.equal(comparisonPeriods('2028-03-01').lastMonth.to, '2028-02-29');
  const input = comparisonInput(); input.today = '2026-10-01';
  const wasl = buildClinicComparison(input).branches[0];
  assert.equal(wasl.mtd.calls.expectedDays, 0); assert.equal(coverageLabel(wasl.mtd.calls), 'No completed days yet');
  assert.equal(wasl.mtd.leads, 0); assert.equal(wasl.mtd.revenue, 0);
  assert.equal(wasl.lastMonth.calls.value, 30);
});

test('comparison reader uses stored feeds and actual Growth periods, paginates, and fails closed', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected network call'); });
  const growth = load<typeof import('../lib/growth/channelPerformance')>('lib/growth/channelPerformance.ts', {
    '@/config/clinics': { ...clinics, clinicOfAppointment: (_center: string, name: string) => name === 'Dr Test Synthetic' ? 'dr-tosun' : 'dental-nation' },
  });
  const reader = load<typeof import('../lib/gbp/clinic-comparison-reader')>('lib/gbp/clinic-comparison-reader.ts', {
    '@/lib/growth/channelPerformance': growth,
  });
  const input = comparisonInput();
  const db = fixtureDb({ social_insights: input.metrics.map((r) => ({ ...r })),
    raw_lead_tracker: [...input.tracker, ...Array.from({ length: 1001 }, () => ({ data: { Date: '2026-10-01', 'Clinic / Branch': 'AMC Branch' } }))],
    practo_bills_raw: input.bills.map((r) => ({ ...r })),
    practo_appointments_raw: [
      { appt_date: '2026-09-30', status: 'Completed', data: {} },
      { appt_date: '2026-10-01', status: 'Completed', data: {} },
      { appt_date: '2026-10-14', status: 'Cancelled', data: {} },
      { appt_date: '2026-10-14', status: 'Completed', doctor: 'Dr Test Synthetic', data: {} },
      { appt_date: '2026-10-15', status: 'Completed', data: {} },
    ],
  });
  const report = await reader.readClinicComparison('2026-10-15', db);
  assert.equal(report.branches[0].lastMonth.calls.value, 30);
  assert.equal(report.branches[2].mtd.leads, 1002);
  assert.equal(report.branches[0].mtd.revenue, 250);
  assert.equal(report.branches[0].lastMonth.bookings, 1);
  assert.equal(report.branches[0].mtd.bookings, 2);
  assert.equal(report.branches[1].mtd.bookings, 1);
  for (const table of ['social_insights', 'raw_lead_tracker', 'practo_bills_raw', 'practo_appointments_raw']) {
    await assert.rejects(() => reader.readClinicComparison('2026-10-15', fixtureDb({}, table)), /Source read failed/);
  }
});

test('empty comparison feeds are unavailable for every branch and identify the missing sources', async () => {
  const report = await readClinicComparison('2026-10-15', fixtureDb({}));
  assert.deepEqual(report.missingSources, ['Tracker leads', 'Growth bookings', 'Billing']);
  assert.deepEqual(report.unassigned, { mtd: null, lastMonth: null });
  for (const branch of report.branches) for (const period of [branch.mtd, branch.lastMonth]) {
    assert.equal(period.leads, null); assert.equal(period.bookings, null); assert.equal(period.revenue, null);
  }
});

test('September-only source rows establish real October zeroes across branches', async () => {
  const report = await readClinicComparison('2026-10-15', fixtureDb({
    raw_lead_tracker: [{ data: { Date: '30/09/2026', 'Clinic / Branch': 'Al Wasl' } }],
    practo_bills_raw: [{ bill_date: '2026-09-30', amount: 125, data: { center_name: 'Al Wasl' } }],
    practo_appointments_raw: [{ appt_date: '2026-09-30', status: 'Completed', data: {} }],
  }));
  assert.deepEqual(report.missingSources, []);
  assert.deepEqual(report.branches.map((b) => [b.mtd.leads, b.mtd.bookings, b.mtd.revenue]), [[0, 0, 0], [0, 0, 0], [0, null, null]]);
  assert.deepEqual(report.branches.map((b) => [b.lastMonth.leads, b.lastMonth.bookings, b.lastMonth.revenue]), [[1, 1, 125], [0, 0, 0], [0, null, null]]);
});

test('out-of-window history cannot establish coverage and each feed is assessed independently', async () => {
  const report = await readClinicComparison('2026-10-15', fixtureDb({
    raw_lead_tracker: [{ data: { Date: '2026-08-31', 'Clinic / Branch': 'Al Wasl' } }],
    practo_bills_raw: [{ bill_date: '2026-10-15', amount: 125, data: { center_name: 'Al Wasl' } }],
    practo_appointments_raw: [{ appt_date: '2026-08-31', status: 'Completed', data: {} }],
  }));
  assert.deepEqual(report.missingSources, ['Tracker leads', 'Growth bookings', 'Billing']);
  const billingOnly = await readClinicComparison('2026-10-15', fixtureDb({
    practo_bills_raw: [{ bill_date: '2026-09-30', amount: 125, data: { center_name: 'Al Wasl', bill_status: ' CANCELLED ' } }],
  }));
  assert.deepEqual(billingOnly.missingSources, ['Tracker leads', 'Growth bookings']);
  assert.equal(billingOnly.branches[0].lastMonth.revenue, 0);
  assert.equal(billingOnly.branches[1].mtd.revenue, 0);
  assert.equal(billingOnly.branches[0].mtd.leads, null);
  assert.equal(billingOnly.branches[0].mtd.bookings, null);
  assert.equal(billingOnly.branches[2].lastMonth.revenue, null);
});
