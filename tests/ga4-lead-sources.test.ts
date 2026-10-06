import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readLeadSources } from '../lib/sync/adapters/ga4-lead-sources';

test('GA4 source reader preserves campaign, date, event and source through all pages', async () => {
  const offsets: number[] = [];
  const all = Array.from({ length: 10001 }, () => ({ dimensionValues: ['20260920', 'whatsapp_click', 'google / cpc', 'Synthetic campaign'].map((value) => ({ value })), metricValues: [{ value: '7' }] }));
  const rows = await readLeadSources(async (offset, size) => { offsets.push(offset); return { rowCount: all.length, rows: all.slice(offset, offset + size) }; }, '2026-10-06');
  assert.deepEqual(offsets, [0, 10000]); assert.equal(rows.length, 10001);
  assert.deepEqual(rows[0], { day: '2026-09-20', event_name: 'whatsapp_click', source_medium: 'google / cpc', campaign: 'Synthetic campaign', event_count: 7, fetched_at: '2026-10-06' });
});
test('GA4 source reader withholds oversized and invalid reports', async () => {
  await assert.rejects(readLeadSources(async () => ({ rowCount: 100001, rows: [] })), /exceeds/);
  await assert.rejects(readLeadSources(async () => ({ rows: [{ dimensionValues: [{ value: 'invalid' }] }] })), /Invalid/);
});
