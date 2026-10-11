import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { computeNewPatientAcquisition, type BillInput } from '../lib/executive/acquisitionCore';
import { computeMarketingPerformance, type MarketingPerformanceInput } from '../lib/opsreport/marketingPerformanceCore';

// Entirely generated synthetic identifiers, with only the series prefix retained
// to exercise the Executive definition. No source records or patient data.
let sequence = 0;
const syntheticFile = (series = 'DNW') => [series, 'synthetic', ++sequence].join('-');
const bill = (file: string, day: string, value: number, branch = 'Dental Nation Al Wasl', cancelled = false): BillInput => ({
  bill_date: day, amount: value,
  data: { mr_no: file, center_name: branch, bill_status: cancelled ? 'CANCELLED' : 'CLOSED' },
});
const input = (overrides: Partial<MarketingPerformanceInput> = {}): MarketingPerformanceInput => ({
  asOf: '2026-10-11', bills: [], channels: new Map(),
  metaSpend: [{ date: '2025-11-24', amount: 100 }],
  googleSpend: [{ date: '2025-11-29', amount: 50 }],
  manualSpend: [], financeRevenue: [], ...overrides,
});
const month = (report: ReturnType<typeof computeMarketingPerformance>, key: string, branch: 'dn-alwasl' | 'dr-tosun' | 'al-maher' = 'dn-alwasl') => report.months.find((r) => r.key === key)!.branches[branch];

test('spend is summed by month and year, with branch notes and separate manual campaigns', () => {
  const report = computeMarketingPerformance(input({
    metaSpend: [{ date: '2025-11-24', amount: 100 }, { date: '2025-12-01', amount: 200 }, { date: '2026-02-01', amount: 300 }],
    googleSpend: [{ date: '2025-11-29', amount: 50 }, { date: '2025-12-04', amount: 75 }, { date: '2026-02-03', amount: 25 }],
    manualSpend: [{ date: '2026-02-26', amount: 120, branch: 'dr-tosun' }, { date: '2026-03-03', amount: 80, branch: 'dr-tosun' }],
  }));
  assert.equal(report.years[0].branches['dn-alwasl'].spend.adAccounts.value, 425);
  assert.equal(month(report, '2025-11').spend.adAccounts.value, 150);
  assert.equal(month(report, '2025-12').spend.adAccounts.value, 275);
  assert.equal(month(report, '2025-10').spend.adAccounts.value, null);
  assert.match(month(report, '2025-10').spend.adAccounts.reason!, /first recorded feed date is 2025-11-24/);
  assert.match(month(report, '2025-11').spend.adAccounts.note!, /One ad account per platform; ads ran for Dental Nation Al Wasl/);
  assert.equal(month(report, '2026-02', 'dr-tosun').spend.adAccounts.value, 0);
  assert.equal(month(report, '2026-02', 'dr-tosun').spend.manual.value, 120);
  assert.equal(report.years[1].branches['dr-tosun'].spend.manual.value, 200);
  assert.match(month(report, '2026-02', 'dr-tosun').spend.manual.source, /not in the ad account/);
  assert.equal(month(report, '2026-02', 'al-maher').spend.adAccounts.value, null);
  assert.match(month(report, '2026-02', 'al-maher').spend.adAccounts.reason!, /No spend recorded/);
  assert.equal(report.months.length, 22);
  assert.equal(report.months.at(-1)!.to, '2026-10-11');
});

test('all channel groups reconcile to Executive new patients, with missing appointment default and no estimates', () => {
  const channels = ['paid-search', 'paid-social', 'affiliate', 'website', 'social-organic', 'gmb', 'ai-concierge', 'direct-walkin', 'patient-referral', 'partnership', 'whatsapp', 'retention'];
  const generated = channels.map((channel) => ({ file: syntheticFile(), channel }));
  const noAppointment = syntheticFile();
  const bills = [...generated.map(({ file }) => bill(file, '2026-05-10', 100)), bill(noAppointment, '2026-05-10', 100)];
  const report = computeMarketingPerformance(input({ bills, channels: new Map(generated.map(({ file, channel }) => [file, channel])), metaSpend: [{ date: '2026-05-01', amount: 100 }], googleSpend: [{ date: '2026-05-01', amount: 30 }] }));
  const row = month(report, '2026-05').acquisition;
  const executive = computeNewPatientAcquisition({ bills, appts: [], widgetPhones: new Set(), spend: 130, from: '2026-05-01', to: '2026-05-31' });
  assert.equal(row.newPatients.value, executive.billedNewPatients);
  assert.equal(row.paid.value, 3);
  assert.equal(row.digitalUnpaid.value, 4);
  assert.equal(row.notMarketing.value, 6);
  assert.equal(row.paid.value! + row.digitalUnpaid.value! + row.notMarketing.value!, row.newPatients.value);
  assert.equal(Object.values(row.channels!).reduce((a, b) => a + b, 0), row.newPatients.value);
  assert.equal(row.channels!['direct-walkin'], 2);
  assert.equal(row.blendedCost.value, executive.cpaAll);
});

test('months beyond both ad feeds are unavailable while observed annual spend is retained', () => {
  const report = computeMarketingPerformance(input({
    metaSpend: [{ date: '2026-05-01', amount: 100 }],
    googleSpend: [{ date: '2026-08-31', amount: 200 }],
  }));
  assert.equal(month(report, '2026-09').spend.adAccounts.value, null);
  assert.equal(month(report, '2026-10').spend.adAccounts.value, null);
  assert.match(month(report, '2026-09').spend.adAccounts.reason!, /not observed/);
  assert.equal(month(report, '2026-06').spend.adAccounts.value, 0);
  assert.equal(report.years[1].branches['dn-alwasl'].spend.adAccounts.value, 300);
});

test('a manual campaign crossing month boundaries is annual spend without an invented monthly split', () => {
  const report = computeMarketingPerformance(input({ manualSpend: [{
    branch: 'dr-tosun', date: '2026-02-26', endDate: '2026-03-03', amount: 200,
  }] }));
  assert.equal(report.years[1].branches['dr-tosun'].spend.manual.value, 200);
  for (const key of ['2026-02', '2026-03']) {
    assert.equal(month(report, key, 'dr-tosun').spend.manual.value, null);
    assert.match(month(report, key, 'dr-tosun').spend.manual.reason!, /no daily split is recorded/);
  }
});

test('repeat DN files are returning not new, DNJ files are never new, and cancellation and clinic ordering match Executive', () => {
  const returning = syntheticFile(), newFile = syntheticFile(), movedFile = syntheticFile('DNJ');
  const tosunFirst = syntheticFile(), alWaslFirst = syntheticFile(), existing = syntheticFile('ORN'), cancelled = syntheticFile();
  const bills = [
    bill(returning, '2026-05-20', 100), bill(returning, '2026-06-01', 200), bill(returning, '2026-06-03', 50),
    bill(newFile, '2026-05-15', 900, undefined, true), bill(newFile, '2026-06-03', 50),
    bill(movedFile, '2026-06-01', 500),
    bill(tosunFirst, '2026-05-01', 500, 'Dr Tosun Dental Clinic'), bill(tosunFirst, '2026-06-01', 100),
    bill(alWaslFirst, '2026-06-02', 200), bill(alWaslFirst, '2026-06-06', 300, 'Dr Tosun Dental Clinic'),
    bill(existing, '2026-06-02', 100), bill(existing, '2026-06-03', 100),
    bill(cancelled, '2026-06-01', 100, undefined, true),
  ];
  const report = computeMarketingPerformance(input({ bills }));
  const row = month(report, '2026-06');
  assert.equal(row.acquisition.newPatients.value, 2);
  assert.equal(row.retention.returningNewFiles.value, 2);
  assert.equal(row.retention.existingFiles.value, 1);
  assert.equal(row.retention.returning.value, 3);
  assert.equal(row.ltv.revenue.value, 250); // Al Wasl bills only, matching Executive branch revenue.
  assert.equal(report.cohorts.find((c) => c.month === '2026-05')!.retainedLater.value, 1);
  assert.equal(month(report, '2026-06', 'dr-tosun').acquisition.newPatients.value, null);
  assert.match(month(report, '2026-06', 'dr-tosun').acquisition.newPatients.reason!, /renumbered/);
});

test('cohort value uses 30 and 90 elapsed-day windows, preserves zero-charge patients, and computes mean and median', () => {
  const a = syntheticFile(), b = syntheticFile(), c = syntheticFile(), d = syntheticFile();
  const report = computeMarketingPerformance(input({ bills: [
    bill(a, '2026-05-01', 100), bill(a, '2026-05-30', 50), bill(a, '2026-05-31', 200),
    bill(a, '2026-07-29', 25), bill(a, '2026-07-30', 75),
    bill(b, '2026-05-01', 200), bill(c, '2026-05-01', 900), bill(d, '2026-05-01', 0),
    bill(a, '2026-05-20', 5000, undefined, true), bill(a, '2026-12-01', 5000),
  ] }));
  const cohort = report.cohorts[0];
  assert.equal(cohort.patients, 4);
  assert.equal(cohort.revenue30.total.value, 1250);
  assert.equal(cohort.revenue30.mean.value, 312.5);
  assert.equal(cohort.revenue30.median.value, 175);
  assert.equal(cohort.revenue90.total.value, 1475);
  assert.equal(cohort.revenueToDate.total.value, 1550);
  assert.equal(cohort.revenueToDate.mean.value, 387.5);
  assert.equal(cohort.revenueToDate.median.value, 325);
  assert.equal(cohort.historyDays, 163);
  assert.equal(report.historyMonths, 6);
});

test('90-day value is hidden until every patient in the cohort has complete history', () => {
  const older = syntheticFile(), younger = syntheticFile();
  const report = computeMarketingPerformance(input({ bills: [bill(older, '2026-07-01', 100), bill(younger, '2026-07-31', 300)] }));
  const cohort = report.cohorts[0];
  assert.equal(cohort.historyDays, 72);
  assert.equal(cohort.revenue90.total.value, null);
  assert.equal(cohort.revenue90.mean.value, null);
  assert.match(cohort.revenue90.total.reason!, /90 complete days/);
  assert.equal(cohort.revenue30.total.value, 400);
  assert.equal(cohort.revenueToDate.median.value, 200);
  const stillYoung = computeMarketingPerformance(input({ bills: [bill(syntheticFile(), '2026-10-01', 100)] })).cohorts[0];
  assert.equal(stillYoung.revenue30.total.value, null);
  assert.equal(stillYoung.revenueToDate.total.value, 100);
});

test('retention uses exact later months and hides a month until its last day is observed', () => {
  const a = syntheticFile(), b = syntheticFile(), c = syntheticFile();
  const report = computeMarketingPerformance(input({ bills: [
    bill(a, '2026-07-05', 100), bill(a, '2026-07-15', 100), bill(a, '2026-08-05', 100), bill(a, '2026-10-02', 100),
    bill(b, '2026-07-20', 100), bill(b, '2026-09-05', 100),
    bill(c, '2026-07-31', 100), bill(c, '2026-08-05', 100, undefined, true),
  ] }));
  const cohort = report.cohorts[0];
  assert.equal(cohort.retainedLater.value, 2);
  assert.equal(cohort.retentionMonths[0].patients.value, 1);
  assert.equal(cohort.retentionMonths[0].share.value, 1 / 3);
  assert.equal(cohort.retentionMonths[1].patients.value, 1);
  assert.equal(cohort.retentionMonths[1].share.value, 1 / 3);
  assert.equal(cohort.retentionMonths[2].patients.value, null);
  assert.match(cohort.retentionMonths[2].patients.reason!, /2026-10-31/);
  assert.equal(month(report, '2026-07').retention.returningNewFiles.value, 0);
});

test('stale source coverage cannot mature a cohort or create zeroes in unobserved months', () => {
  const file = syntheticFile();
  const report = computeMarketingPerformance(input({
    bills: [bill(file, '2026-07-01', 100), bill(file, '2026-08-31', 200)],
    patientObservedThrough: { 'dn-alwasl': '2026-08-31' },
  }));
  const cohort = report.cohorts[0];
  assert.equal(cohort.historyDays, 61);
  assert.equal(report.historyMonths, 2);
  assert.equal(cohort.revenue90.total.value, null);
  assert.equal(cohort.revenue30.total.value, 100);
  assert.equal(cohort.retentionMonths[0].patients.value, 1);
  assert.equal(cohort.retentionMonths[1].patients.value, null);
  assert.equal(month(report, '2026-09').acquisition.newPatients.value, null);
  assert.equal(month(report, '2026-09').retention.returning.value, null);
  assert.equal(month(report, '2026-09').revenue.practo.value, null);
  assert.match(month(report, '2026-09').revenue.practo.reason!, /not observed/);
  assert.equal(report.years[1].branches['dn-alwasl'].acquisition.newPatients.value, 1);
  assert.match(report.years[1].branches['dn-alwasl'].acquisition.newPatients.note!, /through 2026-08-31/);
});

test('Dr Tosun distinct billed files and repeat-month files do not imply acquisition or look into future months', () => {
  const a = syntheticFile('DNJ'), b = syntheticFile('DNJ'), c = syntheticFile('DNJ');
  const tosun = 'Dr Tosun Dental Clinic';
  const report = computeMarketingPerformance(input({ bills: [
    bill(a, '2026-07-15', 100, tosun), bill(a, '2026-07-20', 100, tosun), bill(a, '2026-08-01', 100, tosun),
    bill(b, '2026-08-05', 100, tosun), bill(c, '2026-09-01', 100, tosun),
  ] }));
  assert.equal(month(report, '2026-07', 'dr-tosun').retention.tosunBilled.value, 1);
  assert.equal(month(report, '2026-07', 'dr-tosun').retention.tosunRepeat.value, 0);
  assert.equal(month(report, '2026-08', 'dr-tosun').retention.tosunBilled.value, 2);
  assert.equal(month(report, '2026-08', 'dr-tosun').retention.tosunRepeat.value, 1);
  assert.equal(report.years[1].branches['dr-tosun'].retention.tosunBilled.value, 3);
  assert.equal(report.years[1].branches['dr-tosun'].retention.tosunRepeat.value, 1);
  assert.match(month(report, '2026-08', 'dr-tosun').retention.tosunBilled.note!, /New and returning cannot be told apart/);
});

test('2025 patient measures and missing sources return unavailable, never fabricated zeros', () => {
  const report = computeMarketingPerformance(input({ bills: [bill(syntheticFile(), '2026-05-10', 100)] }));
  for (const branch of Object.values(report.years[0].branches)) {
    for (const value of [branch.acquisition.newPatients, branch.acquisition.paid, branch.ltv.patients, branch.ltv.revenue, branch.ltv.mean, branch.ltv.median, branch.retention.returning, branch.revenue.practo]) {
      assert.equal(value.value, null);
      assert.ok(value.reason);
    }
  }
  const failed = computeMarketingPerformance(input({ bills: null, metaSpend: null, channels: null, manualSpend: null, financeRevenue: null }));
  const row = month(failed, '2026-05');
  assert.equal(row.acquisition.newPatients.value, null);
  assert.equal(row.spend.adAccounts.value, null);
  assert.equal(row.spend.manual.value, null);
  assert.equal(row.revenue.collected.value, null);
  assert.equal(row.revenue.billed.value, null);
  const missingChannels = month(computeMarketingPerformance(input({ bills: [bill(syntheticFile(), '2026-05-01', 100)], channels: null })), '2026-05');
  assert.equal(missingChannels.acquisition.newPatients.value, 1);
  assert.equal(missingChannels.acquisition.notMarketing.value, null);
  assert.equal(missingChannels.acquisition.channels, null);
});

test('branch revenue separates measures and refuses to allocate an undated multi-year amount', () => {
  const report = computeMarketingPerformance(input({ financeRevenue: [
    { branch: 'dn-alwasl', month: '2025-03', measure: 'collected', amount: 100, note: 'Partial month.' },
    { branch: 'dn-alwasl', month: '2025-05', measure: 'collected', amount: 200 },
    { branch: 'dn-alwasl', month: '2026-01', measure: 'billed', amount: 400 },
    { branch: 'al-maher', month: null, measure: 'collected', amount: 900 },
  ] }));
  assert.equal(report.years[0].branches['dn-alwasl'].revenue.collected.value, 300);
  assert.match(report.years[0].branches['dn-alwasl'].revenue.collected.note!, /Partial month/);
  assert.equal(month(report, '2025-04').revenue.collected.value, null);
  assert.equal(report.years[1].branches['dn-alwasl'].revenue.billed.value, 400);
  assert.equal(report.years[0].branches['al-maher'].revenue.collected.value, null);
  assert.match(report.years[0].branches['al-maher'].revenue.collected.reason!, /undated multi-year/);
  const failedCollected = computeMarketingPerformance(input({ financeRevenue: [{ branch: 'dn-alwasl', month: '2026-01', measure: 'billed', amount: 400 }], unavailableFinanceMeasures: ['collected'] }));
  assert.equal(failedCollected.years[1].branches['dn-alwasl'].revenue.collected.value, null);
  assert.equal(failedCollected.years[1].branches['dn-alwasl'].revenue.billed.value, 400);
});

test('legacy billed revenue stays separate from Zoho billed and undated legacy amounts', () => {
  const report = computeMarketingPerformance(input({ financeRevenue: [
    { branch: 'al-maher', month: '2026-01', measure: 'legacy-billed', amount: 100 },
    { branch: 'al-maher', month: '2026-02', measure: 'legacy-billed', amount: 50 },
    { branch: 'al-maher', month: null, measure: 'legacy-billed', amount: 900, note: 'Invalid source month; no precise year allocation.' },
    { branch: 'al-maher', month: '2026-01', measure: 'billed', amount: 400 },
  ] }));
  const revenue = report.years[1].branches['al-maher'].revenue;
  assert.equal(revenue.legacyBilled.value, 150);
  assert.equal(revenue.billed.value, 400);
  assert.match(revenue.legacyBilled.source, /Legacy practice-system/);
  assert.match(revenue.billed.source, /Zoho/);
  assert.equal(report.years[0].branches['al-maher'].revenue.legacyBilled.value, null);
});
