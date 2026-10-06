import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { selectAll } from '../lib/supabase/selectAll';

test('selectAll reads 2,345 rows in ordered, inclusive pages', async () => {
  const rows = Array.from({ length: 2345 }, (_, id) => ({ id }));
  const ranges: number[][] = [], orders: string[] = [];
  const actual = await selectAll(() => {
    const query = {
      order(key: string) { orders.push(key); return query; },
      async range(from: number, to: number) { ranges.push([from, to]); return { data: rows.slice(from, to + 1), error: null }; },
    };
    return query;
  }, 'id');
  assert.deepEqual(actual.data, rows);
  assert.deepEqual(ranges, [[0, 999], [1000, 1999], [2000, 2999]]);
  assert.deepEqual(orders, ['id', 'id', 'id']);
});

test('selectAll withholds failed pages and overflow, but permits an exact ceiling', async () => {
  const query = (count: number, fail = false) => () => {
    const q = { order() { return q; }, async range(from: number, to: number) {
      return { data: Array.from({ length: Math.max(0, Math.min(to + 1, count) - from) }, () => ({})), error: fail && from > 0 ? { message: 'fixture failure' } : null };
    } };
    return q;
  };
  assert.equal((await selectAll(query(2000), 'id', 2000)).data.length, 2000);
  await assert.rejects(selectAll(query(2001), 'id', 2000), /2,000-row/);
  await assert.rejects(selectAll(query(2345, true), 'id'), /Source read failed/);
});
