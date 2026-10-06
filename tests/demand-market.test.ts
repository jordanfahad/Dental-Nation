import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { buildMarketSnapshot, DENTAL_MARKET_TTL, marketKeywords, parseMarketSnapshot, refreshMarketCache, type KeywordFetcher } from '../lib/analytics/demandMarket';

const now = new Date('2026-10-06T00:00:00Z');
const response: KeywordFetcher = async (_language, keywords) => ({ result: { items: keywords.map((keyword) => ({ keyword, keyword_info: { search_volume: 100, cpc: 2, competition: 0.7 } })) }, error: null });
test('UAE market snapshot makes exactly two language calls and normalizes provider units', async () => {
  const calls: string[] = [];
  const snapshot = await buildMarketSnapshot(async (language, keywords) => {
    calls.push(language); assert.deepEqual(keywords, marketKeywords(language));
    return response(language, keywords);
  }, now);
  assert.deepEqual(calls, ['en', 'ar']); assert.equal(snapshot.location, 2784);
  assert.equal(snapshot.keywords[0].competition, 70); assert.equal(snapshot.keywords[0].cpcUsd, 2);
  assert.deepEqual(snapshot.errors, []); assert.deepEqual(parseMarketSnapshot(snapshot), snapshot);
});
test('unsupported language does not fall back, retry, or fabricate zeros', async () => {
  const calls: string[] = [];
  const snapshot = await buildMarketSnapshot(async (language, keywords) => {
    calls.push(language);
    return language === 'ar' ? { result: null, error: 'Language unavailable' } : response(language, keywords);
  }, now);
  assert.deepEqual(calls, ['en', 'ar']);
  assert.ok(snapshot.keywords.filter((k) => k.language === 'ar').every((k) => k.searches === null));
  assert.deepEqual(snapshot.errors, ['ar: keyword request unavailable']);
});
test('missing keywords and invalid metrics remain explicit gaps', async () => {
  const snapshot = await buildMarketSnapshot(async () => ({ result: { items: [] }, error: null }), now);
  assert.equal(snapshot.errors.length, 2); assert.ok(snapshot.keywords.every((k) => k.searches === null));
  assert.equal(parseMarketSnapshot({ ...snapshot, keywords: [] }), null);
  assert.equal(parseMarketSnapshot({ ...snapshot, keywords: [...snapshot.keywords, snapshot.keywords[0]] }), null);
  assert.equal(parseMarketSnapshot({ ...snapshot, location: 9999 }), null);
  assert.equal(parseMarketSnapshot({ ...snapshot, keywords: snapshot.keywords.map((k) => ({ ...k, searches: '100' })) }), null);
});
test('fresh market cache avoids all requests and writes', async () => {
  const snapshot = await buildMarketSnapshot(response, now);
  const result = await refreshMarketCache({ now: new Date(now.getTime() + DENTAL_MARKET_TTL - 1), latest: async () => snapshot, fetchKeywords: async () => { throw new Error('Unexpected paid call'); }, save: async () => { throw new Error('Unexpected cache write'); } });
  assert.deepEqual(result, { refreshed: false });
});
test('weekly expiry refreshes both languages and saves one snapshot', async () => {
  const snapshot = await buildMarketSnapshot(response, now);
  let calls = 0, saves = 0;
  const result = await refreshMarketCache({ now: new Date(now.getTime() + DENTAL_MARKET_TTL), latest: async () => snapshot, fetchKeywords: async (...args) => { calls++; return response(...args); }, save: async (value) => { saves++; assert.equal(value.location, 2784); } });
  assert.deepEqual(result, { refreshed: true }); assert.equal(calls, 2); assert.equal(saves, 1);
});
test('cache-read failure prevents paid calls and cache-write failure is surfaced', async () => {
  let calls = 0;
  await assert.rejects(refreshMarketCache({ now, latest: async () => { throw new Error('lookup failed'); }, fetchKeywords: async (...args) => { calls++; return response(...args); }, save: async () => {} }), /lookup failed/);
  assert.equal(calls, 0);
  await assert.rejects(refreshMarketCache({ now, latest: async () => null, fetchKeywords: response, save: async () => { throw new Error('save failed'); } }), /save failed/);
});
