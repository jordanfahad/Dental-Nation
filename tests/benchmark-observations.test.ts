import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test, type TestContext } from 'node:test';
import ts from 'typescript';
import { listingObservation, storeBenchmarkObservations } from '../lib/analytics/benchmark-observations';
import type { BranchDemandGroup, BranchListing } from '../lib/analytics/benchmark';
import { benchmarks } from '../lib/performance/core';
import type { Signal } from '../lib/performance/core';
import { readPerformanceBrief } from '../lib/performance/reader';
import { buildAkbarPerformance } from '../lib/performance/emails';
import { GMB_SECRET_KEYS } from '../config/gmb';
import { selectAll } from '../lib/supabase/selectAll';
import type { AdminClient } from '../lib/supabase/server';
import { fixtureDb } from './fixtures/dn015-db';
import { gbpFixture, briefFixture } from './fixtures/dn015';

type Row = Record<string, unknown>;
const listing = (reviews: number | null, rating: number | null): BranchListing => ({ title: 'Synthetic branch', address: null, reviews, rating });
const group = (domain: string, listings: BranchListing[]): BranchDemandGroup => ({ domain, listings, pages: [] });
function database(tables: Record<string, Row[]> = {}, failedRead?: string, failedWrite?: string) {
  const read = fixtureDb(tables, failedRead);
  const conflicts: string[] = [];
  const db = { from(table: string) {
    return Object.assign(read.from(table), { async upsert(rows: Row[], options: { onConflict: string }) {
      conflicts.push(options.onConflict);
      if (rows.some((r) => r.clinic === failedWrite)) return { error: {} };
      const target = tables[table] ??= [];
      for (const row of rows) {
        const prior = target.find((p) => options.onConflict.split(',').every((key) => p[key] === row[key]));
        if (prior) Object.assign(prior, row); else target.push(row);
      }
      return { error: null };
    } });
  } } as unknown as AdminClient;
  return { db, tables, conflicts };
}
function clearConfig(t: TestContext) {
  for (const key of [...GMB_SECRET_KEYS.map((s) => s.toUpperCase()), 'DATAFORSEO_LOGIN', 'DATAFORSEO_PASSWORD']) {
    const previous = process.env[key]; delete process.env[key];
    t.after(() => { if (previous == null) delete process.env[key]; else process.env[key] = previous; });
  }
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected network call'); });
}
const gmbSecrets = () => Object.entries({ gmb_client_id: 'unused', gmb_client_secret: 'unused', gmb_refresh_token: 'unused',
  gmb_location_ids: 'synthetic-wasl,synthetic-tosun,synthetic-maher', gmb_location_clinics: 'dental-nation,dr-tosun,al-maher',
}).map(([key, value]) => ({ key, value }));

test('observations sum matched branches, weight ratings, use Dubai dates, and upsert on the complete PK', async (t) => {
  clearConfig(t);
  const store = database();
  const groups = [group('drjoydentalclinic.com', [listing(100, 4), listing(300, 5)]), group('drmichaels.com', [listing(50, 4.3)])];
  assert.deepEqual(await storeBenchmarkObservations(store.db, [...groups, groups[0]], new Date('2026-09-30T21:00:00Z')), { stored: 4, failed: [] });
  let rows = store.tables.social_insights as unknown as Signal[];
  assert.equal(rows.length, 4); assert.ok(rows.every((r) => r.channel === 'benchmark' && r.day === '2026-10-01'));
  assert.equal(benchmarks(rows, '2026-10-01')[1].reviews.value, 400);
  assert.equal(benchmarks(rows, '2026-10-01')[1].rating.value, 4.8);
  groups[0].listings = [listing(600, 4.4)];
  await storeBenchmarkObservations(store.db, groups, new Date('2026-10-01T03:00:00Z'));
  rows = store.tables.social_insights as unknown as Signal[];
  assert.equal(rows.length, 4); assert.equal(benchmarks(rows, '2026-10-01')[1].reviews.value, 600);
  assert.equal(benchmarks(rows, '2026-10-01')[1].rating.value, 4.4);
  assert.ok(store.conflicts.every((key) => key === 'clinic,channel,metric,day'));
  await storeBenchmarkObservations(store.db, [group('drjoydentalclinic.com', [listing(0, null)])], new Date('2026-10-01T05:00:00Z'));
  assert.equal(rows.length, 4); assert.equal(benchmarks(rows, '2026-10-01')[1].rating.value, null);
});

test('empty, unknown and incomplete listing sets do not manufacture observations', async (t) => {
  clearConfig(t);
  const store = database();
  const result = await storeBenchmarkObservations(store.db, [group('drjoydentalclinic.com', []),
    group('drmichaels.com', [listing(null, 5)]), group('unrelated.example', [listing(999, 5)])]);
  assert.deepEqual(result, { stored: 0, failed: [] }); assert.equal(store.conflicts.length, 0);
  assert.equal(listingObservation([listing(-1, 4)]), null);
  assert.deepEqual(listingObservation([listing(5, null)]), { count: 5, rating: null });
});

test('our observation counts only active Al Wasl reviews and paginates; failures stay isolated', async (t) => {
  clearConfig(t);
  const reviews = Array.from({ length: 1001 }, () => ({ location_path: 'locations/synthetic-wasl', rating: 4, removed_at: null }));
  const tables = { app_secrets: gmbSecrets(), gmb_reviews: [...reviews,
    { location_path: 'locations/synthetic-tosun', rating: 1, removed_at: null },
    { location_path: 'locations/synthetic-maher', rating: 1, removed_at: null },
    { location_path: 'locations/synthetic-wasl', rating: 1, removed_at: '2026-10-01' },
  ] };
  const store = database(tables);
  await storeBenchmarkObservations(store.db, [], new Date('2026-10-02T00:00:00Z'));
  const ours = benchmarks(store.tables.social_insights as unknown as Signal[], '2026-10-02')[0];
  assert.equal(ours.reviews.value, 1001); assert.equal(ours.rating.value, 4);
  const failure = database({ ...tables, social_insights: [] }, 'gmb_reviews');
  assert.deepEqual(await storeBenchmarkObservations(failure.db, [group('drjoydentalclinic.com', [listing(10, 5)])]), { stored: 2, failed: ['dental-nation'] });
  const writeFailure = database({}, undefined, 'dr-joy');
  assert.deepEqual(await storeBenchmarkObservations(writeFailure.db, [group('drjoydentalclinic.com', [listing(10, 5)]),
    group('drmichaels.com', [listing(20, 4)])]), { stored: 2, failed: ['dr-joy'] });
});

test('benchmark displays stored values and dates, ignores GBP counters, and requires exact same-profile endpoints', () => {
  const row = (day: string, value: number, clinic = 'dr-joy'): Signal => ({ clinic, channel: 'benchmark', metric: 'review_count', day, value });
  const rows = [row('2026-10-15', 500), row('2026-09-14', 100), row('2026-09-16', 200), row('2026-10-16', 999),
    { ...row('2026-10-15', 9999), channel: 'gmb' }];
  assert.deepEqual(benchmarks(rows, '2026-10-15')[1].reviews, { value: 500, date: '2026-10-15', delta30: null });
  rows.push(row('2026-09-15', 350, 'DR-JOY'));
  assert.equal(benchmarks(rows, '2026-10-15')[1].reviews.delta30, 150);
  assert.equal(benchmarks([row('2026-10-15', 500), row('2026-09-15', 350, 'drjoydentalclinic.com')], '2026-10-15')[1].reviews.delta30, null);
  const brief = briefFixture(); brief.benchmark = benchmarks(rows, '2026-10-15');
  const email = buildAkbarPerformance(brief);
  assert.match(email.html, /500.*2026-10-15/);
  assert.match(email.html, /Signals are recorded from the weekly public fetch; changes appear once 30 days of history exist\./);
  assert.equal(brief.benchmark[1].followers.value, null); assert.equal(brief.benchmark[2].followers.value, null);
});

test('reader preserves stored own history and uses the GBP snapshot only for absent metrics', async (t) => {
  clearConfig(t);
  const rows = ['2026-09-11', '2026-10-11'].flatMap((day, i) => [
    { clinic: 'dental-nation', channel: 'benchmark', metric: 'review_count', day, value: 70 + 10 * i },
    { clinic: 'dental-nation', channel: 'benchmark', metric: 'rating', day, value: 4.5 + i / 10 },
  ]);
  const brief = await readPerformanceBrief('2026-10-12', fixtureDb({ social_insights: rows }), gbpFixture());
  assert.deepEqual(brief.benchmark[0].reviews, { value: 80, date: '2026-10-11', delta30: 10 });
  assert.equal(brief.benchmark[0].rating.value, 4.6);
  const fallback = await readPerformanceBrief('2026-10-12', fixtureDb({ social_insights: rows.filter((r) => r.metric === 'review_count') }), gbpFixture());
  assert.equal(fallback.benchmark[0].reviews.value, 80); assert.equal(fallback.benchmark[0].rating.value, 5);
  const empty = await readPerformanceBrief('2026-10-12', fixtureDb({}), gbpFixture());
  assert.equal(empty.benchmark[0].reviews.value, 1); assert.equal(empty.benchmark[0].reviews.delta30, null);
});

/** Run the real weekly callback with a cache double and mocked public responses. */
for (const failure of [undefined, 'http', 'task', 'network', 'empty'] as const) {
  test(`weekly path stores only fresh matched listings (${failure ?? 'success'}) and never rewrites on cache hits`, async (t) => {
    clearConfig(t);
    const store = database({ app_secrets: [
      { key: 'dataforseo_login', value: 'unused' }, { key: 'dataforseo_password', value: 'unused' },
      { key: 'seo_competitor_domains', value: 'drjoydentalclinic.com,drmichaels.com' },
    ] });
    let requests = 0;
    t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
      requests++;
      assert.ok(url.startsWith('https://api.dataforseo.com/'));
      const maps = url.includes('/maps/');
      if (maps && failure === 'network') throw new Error('synthetic');
      if (maps && failure === 'http') return new Response('{}', { status: 503 });
      const keyword = JSON.parse(String(options.body))[0].keyword ?? '';
      const title = keyword.includes('Joy') ? 'Dr Joy Dental Clinic' : keyword.includes('Michael') ? "Dr. Michael's Dental Clinic" : 'Dental Nation';
      return Response.json({ status_code: 20000, tasks: [{ status_code: maps && failure === 'task' ? 40000 : 20000,
        result: [{ items: maps && failure !== 'empty' ? [
          { title: `${title} Branch A`, rating: { value: 4, votes_count: 100 } },
          { title: `${title} Branch B`, rating: { value: 5, votes_count: 300 } },
          { title: 'Unrelated clinic', rating: { value: 1, votes_count: 9000 } },
        ] : [] }] }] });
    });
    const deps: Record<string, unknown> = {
      'server-only': {}, '../supabase/selectAll': { selectAll }, '@/lib/supabase/server': { getSupabaseAdmin: () => store.db },
      './benchmark-observations': { storeBenchmarkObservations },
      'next/cache': { unstable_cache: (fn: (...args: unknown[]) => Promise<unknown>, _keys: string[], options: { revalidate: number }) => {
        assert.equal(options.revalidate, 604800);
        let cached: Promise<unknown> | undefined;
        return (...args: unknown[]) => cached ??= fn(...args);
      } },
    };
    const code = ts.transpileModule(readFileSync('lib/analytics/benchmark.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 } }).outputText;
    const module = { exports: {} as { getBranchDemand: () => Promise<unknown> } };
    new Function('require', 'module', 'exports', code)((name: string) => { assert.ok(name in deps, `Unmocked ${name}`); return deps[name]; }, module, module.exports);
    await module.exports.getBranchDemand();
    assert.equal(requests, 6);
    assert.equal(store.tables.social_insights?.length ?? 0, failure ? 0 : 4);
    if (!failure) {
      const rows = store.tables.social_insights as unknown as Signal[];
      assert.equal(rows.find((r) => r.clinic === 'dr-joy' && r.metric === 'review_count')?.value, 400);
      assert.equal(rows.find((r) => r.clinic === 'dr-michaels' && r.metric === 'rating')?.value, 4.8);
    }
    const writes = store.conflicts.length;
    await module.exports.getBranchDemand();
    assert.equal(requests, 6); assert.equal(store.conflicts.length, writes);
  });
}
