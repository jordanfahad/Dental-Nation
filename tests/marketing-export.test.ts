import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { computeMarketingPerformance, type PerformanceMetric } from '../lib/opsreport/marketingPerformanceCore';
import { buildMarketingPerformanceExport } from '../lib/opsreport/marketingPerformanceExport';

test('four-table export preserves unavailable reasons, real zeroes, cohort windows and aggregate-only fields', () => {
  const report = computeMarketingPerformance({
    asOf: '2026-10-11', bills: null, channels: null,
    metaSpend: [{ date: '2025-11-24', amount: 100 }], googleSpend: [], manualSpend: [], financeRevenue: [],
  });
  const known = (value: number): PerformanceMetric => ({ value, source: 'Practo non-cancelled bills', reason: null });
  const immature: PerformanceMetric = { value: null, source: 'Practo non-cancelled bills', reason: 'Only 30 days of history; 90 complete days are required.' };
  report.cohorts = [{
    month: '2026-09', patients: 2, historyDays: 30,
    revenue30: { total: known(200), mean: known(100), median: known(100) },
    revenue90: { total: immature, mean: immature, median: immature },
    revenueToDate: { total: known(200), mean: known(100), median: known(100) },
    retainedLater: known(1), blendedCost: known(50),
    retentionMonths: [{ month: 1, patients: immature, share: immature }],
  }];
  const output = buildMarketingPerformanceExport(Object.assign(report, { serverOnlyMetadata: 'DO_NOT_SERIALISE' }));
  assert.equal(output.sheets.length, 4);
  assert.deepEqual(output.sheets.map((sheet) => sheet.name), ['Marketing spend', 'Patients from marketing', 'Early patient value', 'Retention']);
  const spend = output.sheets[0].rows;
  const noSpend = spend.find((row) => row[1] === '2026' && row[4] === 'Dr Tosun' && row[5] === 'Ad accounts')!;
  assert.equal(noSpend[6], 0);
  const missingHistory = output.sheets[1].rows.find((row) => row[1] === '2025' && row[4] === 'Al Wasl' && row[5] === 'All new patients')!;
  assert.equal(missingHistory[6], 'Not available');
  assert.match(String(missingHistory[8]), /No patient-level data for 2025/);
  const valueRows = output.sheets[2].rows.filter((row) => row[0] === 'Cohort');
  assert.equal(valueRows.find((row) => row[5] === 'First 30 days: mean per patient')?.[6], 100);
  const hidden90 = valueRows.find((row) => row[5] === 'First 90 days: total revenue')!;
  assert.equal(hidden90[6], 'Not available');
  assert.match(String(hidden90[8]), /90 complete days/);
  assert.equal(hidden90[3], '2026-10-11');
  assert.equal(output.sheets[3].rows.find((row) => row[0] === 'Cohort' && row[5] === 'Billed again in any later month')?.[6], 1);
  assert.doesNotMatch(JSON.stringify(output), /DO_NOT_SERIALISE|serverOnlyMetadata/);
  for (const sheet of output.sheets) {
    assert.ok(sheet.rows.length > 1);
    assert.ok(sheet.rows.every((row) => row.length === 11));
    assert.ok(sheet.rows.slice(1).every((row) => row[9]));
  }
});
