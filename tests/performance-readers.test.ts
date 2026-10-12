import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { SheetsAdapter } from '../lib/sync/adapters/sheets-adapter';
import { sheetMapping } from '../config/sheet-mapping';
import { mirrorGbpDailyLog } from '../lib/sync/gbpDailyLog';
import { readGbpPlan } from '../lib/gbp/reader';
import { readPerformanceBrief } from '../lib/performance/reader';
import { getChannelPerformance } from '../lib/growth/channelPerformance';
import type { AdminClient } from '../lib/supabase/server';
import type { sheets_v4 } from 'googleapis';
import { GBP_HEADERS } from '../lib/gbp/plan';
import { fixtureDb } from './fixtures/dn015-db';
import { gbpFixture, logRow } from './fixtures/dn015';

test('daily sheet reads only exact Daily log tab, validates headers before permitting replacement', async () => {
  const calls: unknown[] = [];
  let values: unknown[][] = [[...GBP_HEADERS], ['2026-10-11', 'Al Wasl', 1, 'Check hours', 'Done', 'Team', '', '']];
  const client = { spreadsheets: { values: { get: async (args: unknown) => { calls.push(args); return { data: { values } }; } } } } as unknown as sheets_v4.Sheets;
  const adapter = new SheetsAdapter(client, sheetMapping.gbpDailyLog);
  assert.equal((await adapter.fetch()).rows.length, 1);
  assert.match(JSON.stringify(calls[0]), /'Daily log'/);
  values = [[...GBP_HEADERS]]; assert.equal((await adapter.fetch()).rows.length, 0);
  for (const bad of [[], [['Date']], [[...GBP_HEADERS, 'Date']]]) { values = bad; await assert.rejects(() => adapter.fetch(), /header/i); }
});
test('GBP snapshot sync retains invalid raw data and reports a count; failed persistence throws', async () => {
  let payload: Record<string, unknown> = {};
  const db = { rpc: async (_name: string, data: Record<string, unknown>) => { payload = data; return { error: null }; } } as unknown as AdminClient;
  const row = logRow({ Date: 'not a date' });
  const result = await mirrorGbpDailyLog(db, [{ rowIndex: row.row_index, data: row.data as Record<string, string> }]);
  assert.equal(result.invalid, 1); assert.equal(payload.invalid_count, 1); assert.deepEqual(payload.rows, [row]);
  await assert.rejects(() => mirrorGbpDailyLog({ rpc: async () => ({ error: {} }) } as unknown as AdminClient, []), /previous snapshot retained/);
});
test('GBP typed reader distinguishes unsynced from bad rows and fails closed on a failed source', async () => {
  const p = await readGbpPlan('2026-10-11', fixtureDb({ raw_gbp_daily_log: [{ ...logRow() }, { ...logRow({ Branch: 'Unknown' }, 3) }], gbp_daily_sync: [{ id: 1, synced_at: '2026-10-12T04:00:00Z' }] }));
  assert.equal(p.entries.length, 1); assert.equal(p.invalid.length, 1); assert.equal(p.syncedAt, '2026-10-12T04:00:00Z');
  await assert.rejects(() => readGbpPlan('2026-10-11', fixtureDb({}, 'social_insights')), /Source read failed/);
});
test('strict Growth reads throw instead of silently returning zeroes; default behaviour is preserved', async () => {
  const failed = fixtureDb({}, 'practo_bills_raw');
  await assert.rejects(() => getChannelPerformance({}, 'all', failed, { strict: true }), /Source read failed/);
  assert.equal((await getChannelPerformance({}, 'all', failed)).source, 'empty');
});
test('actual Growth reader dedupes synthetic repeated enquiries while the gross tracker retains both rows', async () => {
  const contact = String(10 ** 8 + 17); // generated synthetic identity, never a real contact
  const lead = { inquiry_date: '2026-10-11', raw_row: { 'Contact Number': contact, 'Inquiry Platform': 'Google' } };
  const report = await getChannelPerformance({ from: '2026-10-11', to: '2026-10-11' }, 'all', fixtureDb({ leads: [lead, lead], raw_zavis: [{ data: { 'Full Name': '', 'Phone Number': contact, Timestamp: '2026-10-11' } }] }), { strict: true });
  assert.equal(report.trackerLeadRows, 2); assert.equal(report.totals.enquiries, 1);
});
test('performance billing explicitly excludes cancelled invoices without changing legacy Growth default', async () => {
  const db = fixtureDb({ practo_bills_raw: [
    { bill_date: '2026-10-11', amount: 100, data: { mr_no: 'LEGACY-SYN-A' } },
    { bill_date: '2026-10-11', amount: 999, data: { mr_no: 'LEGACY-SYN-B', bill_status: 'CANCELLED' } },
  ] });
  assert.equal((await getChannelPerformance({}, 'all', db)).totals.revenue, 1099);
  assert.equal((await getChannelPerformance({}, 'all', db, { strict: true, excludeCancelledBills: true })).totals.revenue, 100);
});
test('performance reader reads stored data only and keeps period-limited outcomes and historical snapshots separate', async () => {
  const db = fixtureDb({ performance_notes: [{ key: 'akbar-plan', body: 'Owner text', updated_at: '2026-10-10' }],
    sc_companies: [{ members: 4, updated_at: '2026-10-10' }, { members: 6, updated_at: '2026-10-11' }],
    tasks: [{ source: 'smileclub-team', external_id: 'sc-team:g-crm-test', raw: { verify: { pass: true, confirmed: 2, at: '2026-09-25' } } }],
    practo_appointments_raw: [{ appt_date: '2026-10-11', status: 'Completed', patient_name: null, data: { remarks: 'Smile Club' } }],
  });
  const brief = await readPerformanceBrief('2026-10-12', db, gbpFixture());
  assert.equal(brief.action, 'Owner text'); assert.equal(brief.smile.members, 10); assert.equal(brief.smile.verifiedHistoricalMembers, 2);
  assert.equal(brief.smile.yesterday.bookings, 1); assert.equal(brief.smile.yesterday.messages, null); assert.equal(brief.smile.mtd.enrolments, null);
  assert.equal(brief.yesterday.to, '2026-10-11'); assert.equal(brief.mtd.from, '2026-10-01');
  await assert.rejects(() => readPerformanceBrief('2026-10-12', fixtureDb({}, 'performance_notes'), gbpFixture()), /note read failed/);
});
