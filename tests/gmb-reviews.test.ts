import { strict as assert } from 'node:assert';
import { test, type TestContext } from 'node:test';
import type { GmbConfig } from '../config/gmb';
import type { AdminClient } from '../lib/supabase/server';
import { syncGmbReviews } from '../lib/sync/adapters/gmb-reviews-adapter';
import { missingGmbReviewIds, parseGmbReviewsPage } from '../lib/sync/gmb-reviews-reconciliation';

const location = 'locations/test';
const config: GmbConfig = {
  clientId: 'unused', clientSecret: 'unused', refreshToken: 'unused',
  locations: [{ path: location, label: 'Test clinic' }],
};
const review = (reviewId: string) => ({
  reviewId, starRating: 'FIVE', createTime: '2026-09-01T10:00:00.123456789Z',
});

interface StoredReview {
  review_id: string;
  location_path: string;
  removed_at: string | null;
  [key: string]: unknown;
}
const storedReview = (id: string, removedAt: string | null = null, path = location): StoredReview => ({
  review_id: id, location_path: path, removed_at: removedAt,
});

/** All requests are intercepted, including auth; these tests cannot reach Google. */
function mockGoogle(t: TestContext, pages: unknown[]) {
  const pending = [...pages];
  return t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = String(input);
    if (url === 'https://oauth2.googleapis.com/token') return Response.json({ access_token: 'unused' });
    if (url === 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts') {
      return Response.json({ accounts: [{ name: 'accounts/test' }] });
    }
    assert.ok(url.startsWith('https://mybusiness.googleapis.com/v4/accounts/test/locations/'));
    assert.ok(pending.length > 0, 'unexpected request after the last simulated page');
    const page = pending.shift();
    if (page instanceof Error) throw page;
    return page instanceof Response ? page : Response.json(page);
  });
}

/** In-memory query double checks location and active-only predicates on every query. */
function mockDatabase(initial: StoredReview[], fail?: 'lookup' | 'upsert' | 'removal') {
  const rows = structuredClone(initial);
  const reads: number[] = [];
  const writes: string[] = [];
  const removalBatches: string[][] = [];
  const client = {
    from(table: string) {
      assert.equal(table, 'gmb_reviews');
      let path: unknown;
      let activeOnly = false;
      let patch: Partial<StoredReview> = {};
      const matches = (row: StoredReview) => row.location_path === path && row.removed_at === null;
      const checkScope = () => {
        assert.equal(typeof path, 'string');
        assert.equal(activeOnly, true);
      };
      const query = {
        select(columns: string) { assert.equal(columns, 'review_id'); return query; },
        eq(column: string, value: unknown) {
          assert.equal(column, 'location_path'); path = value; return query;
        },
        is(column: string, value: unknown) {
          assert.equal(column, 'removed_at'); assert.equal(value, null); activeOnly = true; return query;
        },
        order(column: string) { assert.equal(column, 'review_id'); return query; },
        async range(start: number, end: number) {
          checkScope();
          reads.push(start);
          if (fail === 'lookup') return { data: null, error: { message: 'simulated lookup failure' } };
          return {
            data: rows.filter(matches).sort((a, b) => a.review_id.localeCompare(b.review_id)).slice(start, end + 1),
            error: null,
          };
        },
        async upsert(incoming: StoredReview[], options: { onConflict: string }) {
          assert.equal(options.onConflict, 'review_id');
          writes.push('upsert');
          if (fail === 'upsert') return { error: { message: 'simulated upsert failure' } };
          for (const row of incoming) {
            const existing = rows.find((r) => r.review_id === row.review_id);
            if (existing) Object.assign(existing, row);
            else rows.push({ ...row });
          }
          return { error: null };
        },
        update(values: Partial<StoredReview>) { patch = values; return query; },
        async in(column: string, ids: string[]) {
          checkScope();
          assert.equal(column, 'review_id');
          assert.equal(typeof patch.removed_at, 'string');
          writes.push('removal');
          removalBatches.push(ids);
          if (fail === 'removal') return { error: { message: 'simulated removal failure' } };
          for (const row of rows) {
            if (matches(row) && ids.includes(row.review_id)) Object.assign(row, patch);
          }
          return { error: null };
        },
      };
      return query;
    },
  };
  return { client: client as unknown as AdminClient, rows, reads, writes, removalBatches };
}

test('pure diff returns only missing IDs, deduplicates, and leaves inputs unchanged', () => {
  const stored = Object.freeze(['present', 'gone', 'gone', 'also-gone']);
  const payload = Object.freeze(['present', 'new', 'present']);
  assert.deepEqual(missingGmbReviewIds(stored, payload), ['gone', 'also-gone']);
  assert.deepEqual(stored, ['present', 'gone', 'gone', 'also-gone']);
  assert.deepEqual(payload, ['present', 'new', 'present']);
});

test('pure diff never removes anything for an empty snapshot or empty table', () => {
  assert.deepEqual(missingGmbReviewIds(['keep'], []), []);
  assert.deepEqual(missingGmbReviewIds([], ['new']), []);
  assert.deepEqual(missingGmbReviewIds(['keep'], ['keep']), []);
});

test('parser accepts rating-only reviews, optional replies, and RFC3339 timestamps', () => {
  const row = {
    ...review('one'), reviewer: { displayName: 'Example' }, comment: 'Example review',
    updateTime: '2026-09-01T14:00:00+04:00',
    reviewReply: { comment: 'Example reply', updateTime: '2026-09-02T10:00:00Z' },
  };
  assert.deepEqual(parseGmbReviewsPage({ reviews: [row, review('two')] }).reviews, [row, review('two')]);
});

test('parser fails closed on malformed pages, metadata, or individual reviews', () => {
  for (const payload of [
    null, [], { reviews: {} }, { reviews: [null] },
    { reviews: [{ ...review(''), reviewId: '' }] },
    { reviews: [{ ...review('one'), createTime: 'not-a-date' }] },
    { reviews: [{ ...review('one'), starRating: 'UNKNOWN' }] },
    { reviews: [{ ...review('one'), reviewer: 'not-an-object' }] },
    { reviews: [review('one')], totalReviewCount: '1' },
    { reviews: [review('one')], nextPageToken: 123 },
    { reviews: [review('one')], error: { message: 'source failed' } },
  ]) assert.throws(() => parseGmbReviewsPage(payload), /malformed/);
});

test('complete paginated snapshots remove missing reviews once and restore returning reviews', async (t) => {
  const previousRemoval = '2026-08-01T00:00:00Z';
  const db = mockDatabase([
    storedReview('first'), storedReview('second'), storedReview('gone'),
    storedReview('returning', previousRemoval), storedReview('still-gone', previousRemoval),
    storedReview('other-location', null, 'locations/other'),
  ]);
  const pages = [
    { reviews: [review('first')], totalReviewCount: 3, nextPageToken: 'page-2' },
    { reviews: [review('second'), review('returning')], totalReviewCount: 3, averageRating: 5 },
  ];
  const fetchMock = mockGoogle(t, [...pages, ...pages]);
  const result = await syncGmbReviews(db.client, { config });
  assert.deepEqual(result, { ok: true, fetched: 3, stored: 3, averageRating: 5, totalOnGoogle: 3 });
  const byId = (id: string) => db.rows.find((r) => r.review_id === id)!;
  const removedAt = byId('gone').removed_at;
  assert.ok(removedAt && Number.isFinite(Date.parse(removedAt)));
  assert.equal(byId('returning').removed_at, null);
  assert.equal(byId('second').removed_at, null);
  assert.equal(byId('still-gone').removed_at, previousRemoval);
  assert.equal(byId('other-location').removed_at, null);
  assert.equal(byId('first').rating, 5);
  assert.equal(new URL(String(fetchMock.mock.calls[3].arguments[0])).searchParams.get('pageToken'), 'page-2');
  assert.equal((await syncGmbReviews(db.client, { config })).ok, true);
  assert.equal(byId('gone').removed_at, removedAt);
  assert.deepEqual(db.removalBatches, [['gone']]);
});

test('an empty location remains untouched even when another location has a non-empty snapshot', async (t) => {
  const other = 'locations/other';
  const db = mockDatabase([storedReview('keep-empty'), storedReview('gone-other', null, other)]);
  mockGoogle(t, [{ reviews: [], totalReviewCount: 0 }, { reviews: [review('new-other')], totalReviewCount: 1 }]);
  const result = await syncGmbReviews(db.client, {
    config: { ...config, locations: [...config.locations, { path: other, label: null }] },
  });
  assert.equal(result.ok, true);
  assert.equal(db.rows.find((r) => r.review_id === 'keep-empty')!.removed_at, null);
  assert.ok(db.rows.find((r) => r.review_id === 'gone-other')!.removed_at);
  assert.deepEqual(db.removalBatches, [['gone-other']]);
});

for (const [name, page] of [
  ['empty array', { reviews: [] }],
  ['omitted reviews', {}],
  ['empty array with a positive count', { reviews: [], totalReviewCount: 5 }],
] as const) {
  test(`${name} causes no database reads or writes`, async (t) => {
    const db = mockDatabase([storedReview('keep')]);
    mockGoogle(t, [page]);
    const result = await syncGmbReviews(db.client, { config });
    assert.equal(result.ok, true);
    assert.equal(result.stored, 0);
    assert.deepEqual(db.reads, []);
    assert.deepEqual(db.writes, []);
  });
}

const incompleteSnapshots: [string, () => unknown[], RegExp][] = [
  ['malformed review on a later page', () => [
    { reviews: [review('one')], nextPageToken: 'next' },
    { reviews: [review('two'), { reviewId: 'bad' }] },
  ], /malformed/],
  ['HTTP failure on a later page', () => [
    { reviews: [review('one')], nextPageToken: 'next' }, new Response('{}', { status: 503 }),
  ], /503/],
  ['invalid JSON on a later page', () => [
    { reviews: [review('one')], nextPageToken: 'next' }, new Response('not json'),
  ], /JSON/],
  ['network failure on a later page', () => [
    { reviews: [review('one')], nextPageToken: 'next' }, new Error('simulated network failure'),
  ], /network failure/],
  ['empty later page', () => [{ reviews: [review('one')], nextPageToken: 'next' }, {}], /empty page/],
  ['empty page with a continuation token', () => [{ reviews: [], nextPageToken: 'next' }], /empty page/],
  ['truncated count', () => [{ reviews: [review('one')], totalReviewCount: 2 }], /count does not match/],
  ['count changed between pages', () => [
    { reviews: [review('one')], totalReviewCount: 2, nextPageToken: 'next' },
    { reviews: [review('two')], totalReviewCount: 3 },
  ], /count changed/],
  ['repeated page token', () => [
    { reviews: [review('one')], nextPageToken: 'next' },
    { reviews: [review('two')], nextPageToken: 'next' },
  ], /repeated a page token/],
  ['duplicate review across pages', () => [
    { reviews: [review('one')], nextPageToken: 'next' }, { reviews: [review('one')] },
  ], /duplicate review/],
];

for (const [name, pages, error] of incompleteSnapshots) {
  test(`${name} prevents all writes for the location`, async (t) => {
    const db = mockDatabase([storedReview('keep')]);
    mockGoogle(t, pages());
    const result = await syncGmbReviews(db.client, { config });
    assert.equal(result.ok, false);
    assert.match(result.error ?? '', error);
    assert.equal(result.stored, 0);
    assert.deepEqual(db.reads, []);
    assert.deepEqual(db.writes, []);
    assert.equal(db.rows[0].removed_at, null);
  });
}

test('stored review lookup spans multiple pages and removals are batched', async (t) => {
  const initial = Array.from({ length: 1002 }, (_, i) => storedReview(`id-${String(i).padStart(4, '0')}`));
  const db = mockDatabase(initial);
  mockGoogle(t, [{ reviews: [review('id-0000')], totalReviewCount: 1 }]);
  const result = await syncGmbReviews(db.client, { config });
  assert.equal(result.ok, true);
  assert.deepEqual(db.reads, [0, 500, 1000]);
  assert.equal(db.rows.filter((r) => r.removed_at !== null).length, 1001);
  assert.equal(db.removalBatches.length, 11);
  assert.ok(db.removalBatches.every((ids) => ids.length <= 100));
  assert.equal(db.rows[0].removed_at, null);
});

for (const failure of ['lookup', 'upsert', 'removal'] as const) {
  test(`${failure} errors are reported without claiming successful reconciliation`, async (t) => {
    const db = mockDatabase([storedReview('keep')], failure);
    mockGoogle(t, [{ reviews: [review('new')] }]);
    const result = await syncGmbReviews(db.client, { config });
    assert.equal(result.ok, false);
    assert.match(result.error ?? '', new RegExp(`simulated ${failure} failure`));
    assert.equal(result.stored, failure === 'removal' ? 1 : 0);
    assert.equal(db.rows[0].removed_at, null);
    if (failure !== 'removal') assert.deepEqual(db.removalBatches, []);
    if (failure === 'lookup') assert.deepEqual(db.writes, []);
  });
}
