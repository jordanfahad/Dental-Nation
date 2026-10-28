import { strict as assert } from 'node:assert';
import { test, type TestContext } from 'node:test';
import { buildGmbConfig, getGmbConfig, resolveGmbConfig, GMB_SECRET_KEYS, type GmbConfig } from '../config/gmb';
import { discoveredGmbClinic } from '../config/gmb-clinics';
import type { AdminClient } from '../lib/supabase/server';
import { syncGmb } from '../lib/sync/adapters/gmb-adapter';
import { syncGmbSearchKeywords } from '../lib/sync/adapters/gmb-keywords-adapter';
import { buildGmbReport } from '../lib/social/gmb-report';
import { getSocialReport } from '../lib/social/report';
import { getGmbReviewsReport } from '../lib/analytics/gmb-reviews';
import { getGmbKeywordsReport } from '../lib/analytics/gmb-keywords';
import { getOwnActuals } from '../lib/analytics/benchmark';
import { getDeckGmbDays } from '../lib/deck/commandDeck';
import { getChannelPerformance } from '../lib/growth/channelPerformance';
import { discoverGmbLocations, gmbDiscoveryValues } from '../lib/sync/gmb-discovery';
import { validGmbBackfillDate } from '../lib/sync/gmb-backfill';

// Synthetic fixture paths and credentials only; all API requests are intercepted.
const config = buildGmbConfig('unused', 'unused', 'unused', 'synthetic-a,synthetic-b', 'Al Wasl,Dr Tosun')!;
type Row = Record<string, unknown>;
function database(tables: Record<string, Row[]>, failClinic?: string) {
  const pages: { table: string; from: number }[] = [];
  const client = { from(table: string) {
    let rows = [...(tables[table] ?? [])];
    const q = {
      select() { return q; }, order() { return q; }, limit() { return q; },
      eq(key: string, value: unknown) { rows = rows.filter((r) => r[key] === value); return q; },
      is(key: string, value: unknown) { rows = rows.filter((r) => r[key] === value); return q; },
      in(key: string, values: unknown[]) { rows = rows.filter((r) => values.includes(r[key])); return q; },
      gte(key: string, value: string) { rows = rows.filter((r) => String(r[key]) >= value); return q; },
      lte(key: string, value: string) { rows = rows.filter((r) => String(r[key]) <= value); return q; },
      lt(key: string, value: string) { rows = rows.filter((r) => String(r[key]) < value); return q; },
      async range(from: number, to: number) { pages.push({ table, from }); return { data: rows.slice(from, to + 1), error: null }; },
      then(resolve: (value: unknown) => void) { resolve({ data: rows, error: null }); },
      async upsert(incoming: Row[], options: { onConflict: string }) {
        if (failClinic && incoming.some((r) => r.clinic === failClinic)) return { error: { message: 'simulated storage failure' } };
        const target = tables[table] ??= [];
        for (const row of incoming) {
          const prior = target.find((p) => options.onConflict.split(',').every((key) => p[key] === row[key]));
          if (prior) Object.assign(prior, row); else target.push(row);
        }
        return { error: null };
      },
    };
    return q;
  } } as unknown as AdminClient;
  return { client, pages, tables };
}

function clearGmbEnv(t: TestContext) {
  for (const key of GMB_SECRET_KEYS.map((s) => s.toUpperCase())) {
    const old = process.env[key];
    delete process.env[key];
    t.after(() => { if (old == null) delete process.env[key]; else process.env[key] = old; });
  }
}
function secrets(cfg: GmbConfig = config): Row[] {
  return Object.entries({ gmb_client_id: 'unused', gmb_client_secret: 'unused', gmb_refresh_token: 'unused',
    gmb_location_ids: cfg.locations.map((l) => l.path).join(','),
    gmb_location_labels: cfg.locations.map((l) => l.label).join(','),
    gmb_location_clinics: cfg.locations.map((l) => l.clinic).join(','),
  }).map(([key, value]) => ({ key, value }));
}

test('GMB config preserves legacy single location and infers all branch labels', () => {
  assert.equal(buildGmbConfig('x', 'x', 'x', 'synthetic')?.locations[0].clinic, 'dental-nation');
  assert.deepEqual(buildGmbConfig('x', 'x', 'x', 'a,b,c', 'Al Wasl,DR TOSUN,AMC')?.locations.map((l) => l.clinic), ['dental-nation', 'dr-tosun', 'al-maher']);
  assert.equal(buildGmbConfig('x', 'x', 'x', 'synthetic', 'Al Maher')?.locations[0].clinic, 'al-maher');
  assert.equal(buildGmbConfig('x', 'x', 'x', 'accounts/synthetic/locations/synthetic', 'Unknown', 'dr-tosun')?.locations[0].path, 'locations/synthetic');
});

test('GMB config rejects misalignment, unknown keys, duplicate branches and paths; blank slots retain alignment', () => {
  assert.equal(buildGmbConfig('x', 'x', 'x', 'a,b', 'One,Two', 'dental-nation'), null);
  assert.equal(buildGmbConfig('x', 'x', 'x', 'a,b', 'One,Two', 'dental-nation,amc'), null);
  assert.equal(buildGmbConfig('x', 'x', 'x', 'a,b', 'One', 'dental-nation,dr-tosun'), null);
  assert.equal(buildGmbConfig('x', 'x', 'x', 'a,b', 'One,Two'), null);
  assert.equal(buildGmbConfig('x', 'x', 'x', 'a,a', 'Al Wasl,Dr Tosun'), null);
  assert.equal(buildGmbConfig('x', 'x', 'x', ',b', ',Dr Tosun')?.locations[0].clinic, 'dr-tosun');
});

test('env and app_secrets resolve the aligned clinic list; invalid complete env fails closed', async (t) => {
  clearGmbEnv(t);
  const db = database({ app_secrets: secrets() });
  assert.deepEqual(await resolveGmbConfig(db.client), config);
  for (const row of secrets()) process.env[String(row.key).toUpperCase()] = String(row.value);
  assert.deepEqual(getGmbConfig(), config);
  process.env.GMB_LOCATION_CLINICS = 'not-a-clinic';
  assert.equal(await resolveGmbConfig(db.client), null);
});

function mockPerformance(t: TestContext, failure?: 'http' | 'network' | 'json') {
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = String(input);
    if (url === 'https://oauth2.googleapis.com/token') return Response.json({ access_token: 'unused' });
    assert.ok(url.startsWith('https://businessprofileperformance.googleapis.com/v1/locations/synthetic-'));
    if (url.includes('synthetic-a') && failure) {
      if (failure === 'network') throw new Error('synthetic network failure');
      return new Response(failure === 'json' ? 'invalid' : '{}', { status: failure === 'http' ? 503 : 200 });
    }
    return Response.json({ multiDailyMetricTimeSeries: [{ dailyMetricTimeSeries: [{ dailyMetric: 'CALL_CLICKS', timeSeries: { datedValues: [
      { date: { year: 2026, month: 1, day: 1 }, value: url.includes('synthetic-a') ? '3' : '7' },
    ] } }] }] });
  });
}

test('daily sync stores two branches on the same day without collisions and reruns idempotently', async (t) => {
  mockPerformance(t);
  const db = database({});
  for (let i = 0; i < 2; i++) {
    const result = await syncGmb(db.client, { config, from: '2026-01-01' });
    assert.equal(result.ok, true);
    assert.equal(result.stored, 2);
  }
  assert.deepEqual(db.tables.social_insights.map((r) => [r.clinic, r.value]), [['dental-nation', 3], ['dr-tosun', 7]]);
});
for (const failure of ['http', 'network', 'json', 'storage'] as const) {
  test(`a ${failure} failure at the first location does not block the second`, async (t) => {
    mockPerformance(t, failure === 'storage' ? undefined : failure);
    const db = database({}, failure === 'storage' ? 'dental-nation' : undefined);
    const result = await syncGmb(db.client, { config });
    assert.equal(result.ok, false);
    assert.equal(result.stored, 1);
    assert.match(result.error ?? '', /dental-nation/);
    assert.equal(db.tables.social_insights[0].clinic, 'dr-tosun');
  });
}

test('keyword sync keeps locations separate and continues after a location fails', async (t) => {
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = String(input);
    if (url === 'https://oauth2.googleapis.com/token') return Response.json({ access_token: 'unused' });
    if (url.includes('synthetic-a')) return new Response('{}', { status: 403 });
    assert.ok(url.includes('synthetic-b/searchkeywords'));
    return Response.json({ searchKeywordsCounts: [{ searchKeyword: 'synthetic term', insightsValue: { value: '8' } }] });
  });
  const db = database({});
  const result = await syncGmbSearchKeywords(db.client, { config, months: 1 });
  assert.equal(result.ok, false);
  assert.equal(result.stored, 1);
  assert.equal(db.tables.gmb_search_keywords[0].location_path, config.locations[1].path);
});

test('discovery includes only dental title matches, emits aligned values, and rejects ambiguous branches', () => {
  for (const title of ['Other Business', 'AMC Cinema', 'Tosun Motors', 'Dental National Supply']) assert.equal(discoveredGmbClinic(title), null);
  const accounts = [{ account: 'accounts/synthetic', locations: [
    { id: 'locations/synthetic-a', title: 'Dental Nation' }, { id: 'locations/synthetic-b', title: 'Dr. Tosun Dental Clinic' },
    { id: 'locations/synthetic-c', title: 'Al Maher Medical Centre' }, { id: 'locations/unrelated', title: 'Other Business' },
  ] }];
  const values = gmbDiscoveryValues(accounts)!;
  assert.equal(values.gmb_location_clinics, 'dental-nation,dr-tosun,al-maher');
  assert.ok(!values.gmb_location_ids.includes('unrelated'));
  assert.equal(values.gmb_location_ids.split(',').length, 3);
  accounts[0].locations.push({ id: 'locations/duplicate-branch', title: 'Dental Nation' });
  assert.equal(gmbDiscoveryValues(accounts), null);
});

test('discovery walks account and location pages and isolates an inaccessible account', async (t) => {
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const u = new URL(String(input));
    if (u.hostname === 'mybusinessaccountmanagement.googleapis.com') return Response.json(u.searchParams.has('pageToken')
      ? { accounts: [{ name: 'accounts/synthetic-b' }] }
      : { accounts: [{ name: 'accounts/synthetic-a' }], nextPageToken: 'more' });
    if (u.pathname.includes('synthetic-a')) return new Response('{}', { status: 403 });
    return Response.json(u.searchParams.has('pageToken') ? { locations: [{ name: 'locations/synthetic-b', title: 'Dr Tosun' }] }
      : { locations: [{ name: 'locations/unrelated', title: 'Other' }], nextPageToken: 'more' });
  });
  const result = await discoverGmbLocations('unused');
  assert.equal(result.failedAccounts, 1);
  assert.equal(result.accounts[0].locations.length, 2);
});

test('Business Profile totals and chart respect branch selection and never invent disconnected zeros', () => {
  const rows = [
    { clinic: 'dental-nation', metric: 'map_views_mobile', day: '2026-01-01', value: 10 },
    { clinic: 'dental-nation', metric: 'map_views_desktop', day: '2026-01-01', value: 2 },
    { clinic: 'dr-tosun', metric: 'map_views_mobile', day: '2026-01-01', value: 20 },
    { clinic: 'al-maher', metric: 'calls', day: '2026-01-01', value: 999 },
  ];
  const all = buildGmbReport(rows, ['dental-nation', 'dr-tosun']);
  assert.equal(all.mapViews, 32);
  assert.equal(all.calls, null);
  assert.deepEqual(all.trend, [{ date: '2026-01-01', 'dental-nation': 12, 'dr-tosun': 20 }]);
  const amc = buildGmbReport(rows, ['dental-nation', 'dr-tosun'], 'al-maher');
  assert.equal(amc.branches[0].connected, false);
  assert.equal(amc.calls, null);
  assert.deepEqual(amc.trend, []);
  const tosun = buildGmbReport(rows, ['dental-nation', 'dr-tosun'], 'dr-tosun');
  assert.equal(tosun.mapViews, 20);
  assert.equal(buildGmbReport([{ ...rows[0], value: 0 }], ['dental-nation']).mapViews, 0);
});

test('social reader paginates beyond 1,000 rows, scopes GMB, and preserves organic social', async (t) => {
  clearGmbEnv(t);
  const rows = Array.from({ length: 1001 }, () => ({ clinic: 'dental-nation', channel: 'gmb', metric: 'calls', day: '2026-01-01', value: 1 }));
  rows.push({ clinic: 'dr-tosun', channel: 'gmb', metric: 'calls', day: '2026-01-01', value: 7 },
    { clinic: 'dental-nation', channel: 'instagram', metric: 'reach', day: '2026-01-01', value: 19 });
  const db = database({ app_secrets: secrets(), social_insights: rows });
  const report = await getSocialReport({ from: '2026-01-01', to: '2026-01-31', gmbClinic: 'dr-tosun' }, db.client);
  assert.equal(report.gmb.calls, 7);
  assert.equal(report.channels[0].metrics[0].value, 19);
  assert.deepEqual(db.pages.filter((p) => p.table === 'social_insights').map((p) => p.from), [0, 1000]);
});

test('review and keyword readers use configured location paths and sum all branches without unrelated data', async (t) => {
  clearGmbEnv(t);
  const db = database({ app_secrets: secrets(),
    gmb_reviews: [
      { location_path: config.locations[0].path, rating: 4, create_time: '2026-01-01', removed_at: null },
      { location_path: config.locations[1].path, rating: 2, create_time: '2026-01-02', removed_at: null },
      { location_path: 'locations/unrelated', rating: 1, create_time: '2026-01-02', removed_at: null },
    ],
    gmb_search_keywords: config.locations.map((l, i) => ({ location_path: l.path, month: '2026-01', keyword: 'synthetic', impressions: i ? 20 : 10, is_threshold: !!i })),
  });
  assert.equal((await getGmbReviewsReport(undefined, db.client))?.avg, 4);
  assert.equal((await getGmbReviewsReport('dr-tosun', db.client))?.avg, 2);
  assert.equal((await getGmbReviewsReport('all', db.client))?.total, 2);
  assert.equal(await getGmbReviewsReport('al-maher', db.client), null);
  assert.equal((await getGmbKeywordsReport(undefined, db.client))?.totalImpressions, 10);
  assert.equal((await getGmbKeywordsReport('dr-tosun', db.client))?.totalImpressions, 20);
  const all = await getGmbKeywordsReport('all', db.client);
  assert.equal(all?.totalImpressions, 30);
  assert.equal(all?.totalKeywords, 1);
  assert.equal(all?.top[0].isThreshold, true);
});

test('Command Deck and benchmark read Al Wasl only and keep pagination', async () => {
  const day = new Date().toISOString().slice(0, 10);
  const rows = Array.from({ length: 1001 }, () => ({ clinic: 'dental-nation', channel: 'gmb', metric: 'calls', day, value: 1 }));
  rows.push({ clinic: 'dr-tosun', channel: 'gmb', metric: 'calls', day, value: 999 });
  const db = database({ social_insights: rows });
  assert.equal((await getDeckGmbDays(db.client)).length, 1001);
  assert.equal((await getOwnActuals(db.client)).gmbCallTaps30d, 1001);
  assert.equal(db.pages.filter((p) => p.table === 'social_insights' && p.from === 1000).length, 2);
});

test('Growth scopes GMB reach, sums the group, and leaves paid search, phone path and every other number unchanged', async () => {
  const rows = ['dental-nation', 'dr-tosun', 'al-maher', 'unrelated'].map((clinic, i) => ({ clinic, channel: 'gmb', metric: 'map_views_mobile', day: '2026-01-01', value: (i + 1) * 10 }));
  for (const [clinic, expected] of [['dn-alwasl', 10], ['dr-tosun', 20], ['all', 60]] as const) {
    const before = await getChannelPerformance({ from: '2026-01-01', to: '2026-01-31' }, clinic, database({}).client);
    const after = await getChannelPerformance({ from: '2026-01-01', to: '2026-01-31' }, clinic, database({ social_insights: rows }).client);
    assert.equal(after.channels.find((c) => c.key === 'gmb')?.impressions, expected);
    assert.deepEqual(after.channels.filter((c) => c.key !== 'gmb'), before.channels.filter((c) => c.key !== 'gmb'));
    assert.deepEqual(after.totals, before.totals);
    assert.deepEqual(after.phonePath, before.phonePath);
  }
});

test('backfill date validation rejects rollover, malformed and future dates', () => {
  for (const value of ['2026-02-30', 'tomorrow', '2026-1-1', '2027-01-01', null, 1]) assert.equal(validGmbBackfillDate(value, '2026-10-12'), false);
  assert.equal(validGmbBackfillDate('2026-01-01', '2026-10-12'), true);
});

test('reportedThrough and coverage: pending days are left out of totals, not counted as 0', async () => {
  const { buildGmbReport, reportedThrough } = await import('../lib/social/gmb-report');
  const row = (clinic: string, metric: string, day: string, value: number) => ({ clinic, metric, day, value });
  const rows = [
    // Map views reported through the 24th; calls only through the 23rd; the
    // 24th onwards store placeholder zeros for calls (Google's reporting lag).
    row('dental-nation', 'map_views_mobile', '2026-10-23', 10), row('dental-nation', 'map_views_mobile', '2026-10-24', 8),
    row('dental-nation', 'calls', '2026-10-22', 2), row('dental-nation', 'calls', '2026-10-23', 3),
    row('dental-nation', 'calls', '2026-10-24', 0), row('dental-nation', 'calls', '2026-10-25', 0),
    row('dr-tosun', 'calls', '2026-10-23', 1), row('dr-tosun', 'calls', '2026-10-24', 0),
    row('x-not-connected', 'calls', '2026-10-25', 9),
  ];
  const connected = ['dental-nation', 'dr-tosun'] as const;
  const through = reportedThrough(rows, [...connected]);
  assert.deepEqual(through, { calls: '2026-10-23', directions: null, websiteClicks: null, mapViews: '2026-10-24' });
  // Without coverage the placeholder zeros count (the old behaviour).
  assert.equal(buildGmbReport(rows, [...connected], 'all').calls, 6);
  // With coverage, days past each metric's reported-through day are pending.
  const report = buildGmbReport(rows, [...connected], 'all', { through, to: '2026-10-25' });
  assert.equal(report.calls, 6); // 22nd + 23rd; the zero 24th/25th are pending, and would not change the total anyway
  assert.deepEqual(report.pending, { calls: '2026-10-23', directions: null, websiteClicks: null, mapViews: '2026-10-24' });
  // A window that ends on reported days has nothing pending.
  const settled = buildGmbReport(rows.filter((r) => r.day <= '2026-10-23'), [...connected], 'all', { through, to: '2026-10-23' });
  assert.deepEqual(settled.pending, { calls: null, directions: null, websiteClicks: null, mapViews: null });
});
