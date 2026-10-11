import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { AdminClient } from '../lib/supabase/server';
import { readMarketingPerformance } from '../lib/opsreport/marketingPerformance';
import type { MarketingPerformance } from '../lib/opsreport/marketingPerformanceCore';

type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;
const syntheticFile = (index = 0) => `DN-SYNTHETIC-${index}`;
const channels = async () => new Map([[syntheticFile(), 'paid-search']]);
const asOf = '2026-10-11';

function fakeDb(tables: Tables, failure?: { table: string; from?: number }) {
  const pages: { table: string; from: number; to: number; order: string[] }[] = [];
  const db = { from(table: string) {
    let rows = [...(tables[table] ?? [])];
    const order: string[] = [];
    const query = {
      select() { return query; },
      order(column: string) { order.push(column); return query; },
      lte(column: string, value: string) { rows = rows.filter((row) => String(row[column] ?? '') <= value); return query; },
      async range(from: number, to: number) {
        pages.push({ table, from, to, order });
        if (failure?.table === table && from >= (failure.from ?? 0)) {
          return { data: null, error: { message: 'Synthetic source error' } };
        }
        rows.sort((a, b) => {
          for (const column of order) {
            const result = String(a[column] ?? '').localeCompare(String(b[column] ?? ''));
            if (result) return result;
          }
          return 0;
        });
        return { data: rows.slice(from, to + 1), error: null };
      },
    };
    return query;
  } } as unknown as AdminClient;
  return { db, pages };
}

function baseTables(): Tables {
  return {
    practo_bills_raw: [{ bill_key: 'synthetic', bill_date: '2026-05-20', amount: 100, data: { mr_no: syntheticFile(), center_name: 'Al Wasl', bill_status: 'PAID' } }],
    meta_insights_raw: [{ key: 'synthetic', date: '2026-05-20', spend: 20 }],
    google_ads_insights_raw: [{ key: 'synthetic', date: '2026-05-20', spend: 30 }],
    raw_raw_social: [{ id: 'synthetic', data: { Clinic: 'Dr Tosun', Channel: 'Meta', Date: '3/1/2026', Spend: 'dh 40.50' } }],
    clinic_revenue_raw: [
      { id: 'collected', clinic: 'Dental Nation Al Wasl', metric: 'collected', txn_month: '2026-05', txn_year: 2026, gross: 60 },
      { id: 'billed', clinic: 'Dental Nation Al Wasl', metric: 'billed', txn_month: '2026-05', txn_year: 2026, gross: 70 },
    ],
    finance_revenue_monthly: [{ id: 'synthetic', clinic: 'Dental Nation Al Wasl', ym: '2026-05', gross: 80 }],
  };
}

const year = (report: MarketingPerformance, key = '2026') => report.years.find((period) => period.key === key)!;
const month = (report: MarketingPerformance, key: string) => report.months.find((period) => period.key === key)!;

test('marketing reader paginates every report feed beyond 1,000 rows with stable keys', async () => {
  const repeat = (make: (index: number) => Row) => Array.from({ length: 1001 }, (_, index) => ({ id: index, key: index, bill_key: index, ...make(index) }));
  const { db, pages } = fakeDb({
    practo_bills_raw: repeat(() => ({ bill_date: '2026-05-20', amount: 1, data: { mr_no: syntheticFile(), center_name: 'Al Wasl', bill_status: 'PAID' } })),
    meta_insights_raw: repeat(() => ({ date: '2026-05-20', spend: 7 })),
    google_ads_insights_raw: repeat(() => ({ date: '2026-05-20', spend: 11 })),
    raw_raw_social: repeat(() => ({ data: { Clinic: 'Dr Tosun', Channel: 'Meta', Date: '3/1/2026', Spend: 'dh 2' } })),
    clinic_revenue_raw: repeat(() => ({ clinic: 'Dental Nation', metric: 'collected', txn_month: '2026-05', txn_year: 2026, gross: 3 })),
    finance_revenue_monthly: repeat(() => ({ clinic: 'Dental Nation', ym: '2026-05', gross: 5 })),
  });
  const report = await readMarketingPerformance(asOf, db, channels);
  const dn = year(report).branches['dn-alwasl'];
  assert.equal(dn.acquisition.newPatients.value, 1);
  assert.equal(dn.acquisition.paid.value, 1);
  assert.equal(dn.ltv.revenue.value, 1001);
  assert.equal(dn.revenue.practo.value, 1001);
  assert.equal(dn.spend.adAccounts.value, 18018);
  assert.equal(dn.revenue.collected.value, 3003);
  assert.equal(dn.revenue.billed.value, 5005);
  assert.equal(month(report, '2026-03').branches['dr-tosun'].spend.manual.value, 2002);
  const keys: Record<string, string> = {
    practo_bills_raw: 'bill_key', meta_insights_raw: 'key', google_ads_insights_raw: 'key',
    raw_raw_social: 'id', clinic_revenue_raw: 'id', finance_revenue_monthly: 'id',
  };
  for (const [table, key] of Object.entries(keys)) {
    assert.deepEqual(pages.filter((page) => page.table === table), [
      { table, from: 0, to: 999, order: [key] }, { table, from: 1000, to: 1999, order: [key] },
    ]);
  }
});

test('manual campaign parser uses month/day/year, currency prefixes and branch filtering', async () => {
  const tables = baseTables();
  tables.raw_raw_social = [
    { id: 0, data: { Clinic: 'Dr Tosun', Channel: 'Meta', Date: '2/26/2026', Spend: 'dh 100.50' } },
    { id: 1, data: { Clinic: 'Dr Tosun', Channel: 'Meta', Date: '3/1/2026', Spend: 'AED 2,400' } },
    { id: 2, data: { Clinic: 'Dr Tosun', Channel: 'Meta', Date: 'Total', Spend: 'dh 2,500.50' } },
    { id: 3, data: { Clinic: 'Al Wasl', Channel: 'Meta', Date: '3/1/2026', Spend: 'dh 900' } },
    { id: 4, data: { Clinic: 'Dr Tosun', Channel: 'Google', Date: '3/1/2026', Spend: 'dh 900' } },
  ];
  const report = await readMarketingPerformance(asOf, fakeDb(tables).db, channels);
  assert.equal(month(report, '2026-02').branches['dr-tosun'].spend.manual.value, 100.5);
  assert.equal(month(report, '2026-03').branches['dr-tosun'].spend.manual.value, 2400);
  assert.equal(month(report, '2026-01').branches['dr-tosun'].spend.manual.value, null);
  assert.equal(year(report).branches['dr-tosun'].spend.manual.value, 2500.5);
  assert.equal(year(report).branches['dn-alwasl'].spend.manual.value, null);
  assert.match(year(report).branches['dr-tosun'].spend.manual.source, /not in the ad account/i);
});

test('manual dates are never guessed as day/month or rolled into another month', async () => {
  for (const date of ['26/2/2026', '2/30/2026', 'March 1 2026']) {
    const tables = baseTables();
    tables.raw_raw_social[0].data = { Clinic: 'Dr Tosun', Channel: 'Meta', Date: date, Spend: 'dh 40' };
    const report = await readMarketingPerformance(asOf, fakeDb(tables).db, channels);
    assert.equal(year(report).branches['dr-tosun'].spend.manual.value, null, date);
    assert.match(year(report).branches['dr-tosun'].spend.manual.reason!, /could not be read/i);
    assert.equal(year(report).branches['dn-alwasl'].spend.adAccounts.value, 50);
  }
});

test('legacy billed revenue stays separate from Zoho and undated or year-mismatched totals stay outside periods', async () => {
  const tables = baseTables();
  tables.clinic_revenue_raw = [
    { id: 0, clinic: 'Dental Nation', metric: 'collected', txn_month: '2025-05', txn_year: 2025, gross: 10 },
    { id: 1, clinic: 'Dental Nation', metric: 'billed', txn_month: '2025-05', txn_year: 2025, gross: 20 },
    { id: 2, clinic: 'Dental Nation', metric: 'billed', txn_month: '1900-05', txn_year: 2025, gross: 9000 },
    { id: 3, clinic: 'Dental Nation', metric: 'billed', txn_month: '2025-06', txn_year: 2026, gross: 9000 },
    { id: 4, clinic: 'AMC', metric: 'collected', txn_month: null, txn_year: null, gross: 9000 },
  ];
  tables.finance_revenue_monthly = [{ id: 0, clinic: 'Dental Nation', ym: '2025-05', gross: 30 }];
  const report = await readMarketingPerformance(asOf, fakeDb(tables).db, channels);
  const dn = year(report, '2025').branches['dn-alwasl'];
  assert.equal(dn.revenue.collected.value, 10);
  assert.equal(dn.revenue.legacyBilled.value, 20);
  assert.equal(dn.revenue.billed.value, 30);
  assert.match(dn.revenue.legacyBilled.source, /Legacy.*billed/);
  assert.match(dn.revenue.billed.source, /Zoho.*billed/);
  assert.equal(year(report, '2025').branches['al-maher'].revenue.collected.value, null);
  assert.match(year(report, '2025').branches['al-maher'].revenue.collected.reason!, /undated/i);
  assert.equal(dn.revenue.practo.value, null);
  assert.equal(dn.acquisition.newPatients.value, null);
});

test('independent source failures withhold affected metrics while retaining available measures', async () => {
  for (const table of ['practo_bills_raw', 'google_ads_insights_raw', 'raw_raw_social', 'clinic_revenue_raw', 'finance_revenue_monthly']) {
    const report = await readMarketingPerformance(asOf, fakeDb(baseTables(), { table }).db, channels);
    const dn = year(report).branches['dn-alwasl'];
    assert.equal(dn.acquisition.newPatients.value, table === 'practo_bills_raw' ? null : 1, table);
    assert.equal(dn.spend.adAccounts.value, table === 'google_ads_insights_raw' ? null : 50, table);
    assert.equal(year(report).branches['dr-tosun'].spend.manual.value, table === 'raw_raw_social' ? null : 40.5, table);
    assert.equal(dn.revenue.collected.value, table === 'clinic_revenue_raw' ? null : 60, table);
    assert.equal(dn.revenue.legacyBilled.value, table === 'clinic_revenue_raw' ? null : 70, table);
    assert.equal(dn.revenue.billed.value, table === 'finance_revenue_monthly' ? null : 80, table);
  }
  const report = await readMarketingPerformance(asOf, fakeDb(baseTables()).db, async () => { throw new Error('Synthetic attribution failure'); });
  const acquisition = year(report).branches['dn-alwasl'].acquisition;
  assert.equal(acquisition.newPatients.value, 1);
  assert.equal(acquisition.paid.value, null);
  assert.equal(acquisition.digitalUnpaid.value, null);
  assert.equal(acquisition.notMarketing.value, null);
  assert.equal(acquisition.channels, null);
});

test('a failed second page discards partial patient totals', async () => {
  const tables = baseTables();
  tables.practo_bills_raw = Array.from({ length: 1001 }, (_, index) => ({ ...tables.practo_bills_raw[0], bill_key: index }));
  const report = await readMarketingPerformance(asOf, fakeDb(tables, { table: 'practo_bills_raw', from: 1000 }).db, channels);
  const dn = year(report).branches['dn-alwasl'];
  assert.equal(dn.acquisition.newPatients.value, null);
  assert.equal(dn.revenue.practo.value, null);
  assert.equal(dn.ltv.revenue.value, null);
  assert.equal(dn.spend.adAccounts.value, 50);
});

test('malformed amounts are unavailable rather than silently converted to zero', async () => {
  for (const table of ['practo_bills_raw', 'meta_insights_raw', 'finance_revenue_monthly', 'clinic_revenue_raw', 'raw_raw_social']) {
    const tables = baseTables();
    if (table === 'raw_raw_social') tables[table][0].data = { Clinic: 'Dr Tosun', Channel: 'Meta', Date: '3/1/2026', Spend: null };
    else tables[table][0][table === 'practo_bills_raw' ? 'amount' : table === 'meta_insights_raw' ? 'spend' : 'gross'] = null;
    const report = await readMarketingPerformance(asOf, fakeDb(tables).db, channels);
    const dn = year(report).branches['dn-alwasl'];
    const result = table === 'practo_bills_raw' ? dn.ltv.revenue
      : table === 'meta_insights_raw' ? dn.spend.adAccounts
      : table === 'finance_revenue_monthly' ? dn.revenue.billed
      : table === 'clinic_revenue_raw' ? dn.revenue.collected
      : year(report).branches['dr-tosun'].spend.manual;
    assert.equal(result.value, null, table);
    assert.ok(result.reason, table);
  }
});

test('absent configuration produces aggregate-only unavailable cells and never calls attribution', async () => {
  const report = await readMarketingPerformance(asOf, null, async () => { assert.fail('Attribution must not be queried without configuration'); });
  const metrics: { value: number | null; reason: string | null }[] = [];
  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    if ('value' in value && 'reason' in value) metrics.push(value as (typeof metrics)[number]);
    else for (const child of Object.values(value)) visit(child);
  };
  visit(report);
  assert.ok(metrics.length > 0);
  assert.ok(metrics.every((metric) => metric.value === null && !!metric.reason));
  assert.deepEqual(report.cohorts, []);
  assert.equal(JSON.stringify(report).includes('mr_no'), false);
  assert.equal(JSON.stringify(report).includes(syntheticFile()), false);
});
