import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { AdminClient } from '../lib/supabase/server';
import { getDemandToDesk, readDemandRows } from '../lib/analytics/demandToDesk.server';
import { hasData } from '../lib/analytics/competitor';
import { fixtureRange } from './fixtures/demand-to-desk';
import type { PageQuery } from '../lib/supabase/selectAll';
import type { Row } from '../lib/analytics/demandToDesk';

const paged = (range: PageQuery<Row>['range']) => {
  const query = { range, order() { return query; } };
  return query;
};

test('report pagination reads beyond 1,000 rows with inclusive page boundaries', async () => {
  const ranges: number[][] = [];
  const rows = Array.from({ length: 1001 }, (_, id) => ({ id }));
  const actual = await readDemandRows(() => paged(async (from, to) => { ranges.push([from, to]); return { data: rows.slice(from, to + 1), error: null }; }));
  assert.equal(actual.length, 1001); assert.deepEqual(ranges, [[0, 999], [1000, 1999]]);
});
test('report pagination withholds partial results after source errors or the row cap', async () => {
  await assert.rejects(readDemandRows(() => paged(async (from) => ({ data: from ? null : Array.from({ length: 1000 }, () => ({})), error: from ? { message: 'fixture error' } : null }))), /Source read failed/);
  await assert.rejects(readDemandRows(() => paged(async () => ({ data: Array.from({ length: 1000 }, () => ({})), error: null }))), /50,000-row/);
});
test('server loader handles absent configuration without a live query', async () => {
  const report = await getDemandToDesk(fixtureRange, null);
  assert.equal(report.themes.length, 9); assert.equal(report.themes[0].meta.chats, null);
  assert.ok(report.gaps.some((g) => g.includes('unavailable')));
});
test('server loader uses stored tables only and contains each missing source', async () => {
  const tables: string[] = [];
  const upperBounds: string[][] = [];
  const client = { from(table: string) {
    tables.push(table);
    const query = {
      select(_columns: string) { return query; }, order(_column: string, _options?: unknown) { return query; },
      gte(_column: string, _value: string) { return query; }, lte(_column: string, _value: string) { return query; },
      lt(column: string, value: string) { upperBounds.push([table, column, value]); return query; }, ilike(_column: string, _value: string) { return query; },
      eq(_column: string, _value: string) { return query; }, limit(_count: number) { return query; },
      async range() { return table === 'raw_lead_tracker' ? { data: null, error: { message: 'fixture failure' } } : { data: [], error: null }; },
      async maybeSingle() { throw new Error('Synthetic snapshot transport failure'); },
    };
    return query;
  } } as unknown as AdminClient;
  const report = await getDemandToDesk(fixtureRange, client);
  assert.deepEqual([...new Set(tables)].sort(), ['ad_creatives', 'ad_creative_daily', 'competitor_snapshots', 'gmb_search_keywords', 'lead_call_log', 'leads', 'meta_ad_insights_raw', 'practo_appointments_raw', 'raw_lead_tracker'].sort());
  assert.equal(report.themes[0].desk.logged, null); assert.equal(report.themes[0].meta.chats, 0);
  assert.ok(report.gaps.some((g) => g.includes('Lead tracker: unavailable')));
  assert.ok(report.gaps.some((g) => g.includes('UAE keyword cache is unavailable')));
  assert.deepEqual(upperBounds, [['lead_call_log', 'created_at', '2026-10-01T00:00:00+04:00']]);
});
test('market-cache payload cannot crash the existing competitor snapshot guard', () => {
  assert.equal(hasData({ location: 2784 } as unknown as Parameters<typeof hasData>[0]), false);
});
