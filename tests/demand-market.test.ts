import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { DEMAND_THEMES } from '../config/demand-themes';
import { classifyTheme } from '../lib/analytics/demandToDesk';
import { buildMarketSnapshot, DENTAL_MARKET_TTL, marketKeywords, parseMarketSnapshot, refreshMarketCache, keywordResponse, type KeywordFetcher } from '../lib/analytics/demandMarket';

const now = new Date('2026-10-06T00:00:00Z');
const response: KeywordFetcher = async (_language, keywords, kind) => ({ result: { items: kind === 'expand' ? keywords.map((keyword) => ({ keyword })) : keywords.map((keyword) => ({ keyword, search_volume: 100, cpc: 2, competition_index: 70 })) }, error: null, costUsd: 0 });
const expansionCount = () => DEMAND_THEMES.reduce((n, theme) => n + Math.ceil(theme.keywords.en.length / 20) + Math.ceil(theme.keywords.ar.length / 20), 0);

test('every theme has English and Arabic spelling, local and price seeds with matching classification', () => {
  for (const theme of DEMAND_THEMES) {
    assert.ok(theme.keywords.en.length >= 32);
    assert.ok(theme.keywords.ar.length >= 16);
    for (const term of [...theme.keywords.en, ...theme.keywords.ar]) assert.equal(classifyTheme(term), theme.key, term);
  }
});

test('expansion batches every seed by theme and language, filters unrelated suggestions, then reads volumes', async () => {
  const calls: { language: string; kind: string; keywords: string[] }[] = [];
  const snapshot = await buildMarketSnapshot(async (language, keywords, kind) => {
    calls.push({ language, keywords, kind });
    assert.ok(keywords.length <= (kind === 'expand' ? 20 : 1000));
    if (kind === 'expand') return { result: { items: [...keywords, 'gap bonding specialist', 'unrelated helicopter'].map((keyword) => ({ keyword })) }, error: null };
    return response(language, keywords, kind);
  }, now);
  assert.equal(snapshot.location, 2784); assert.deepEqual(snapshot.errors, []);
  assert.equal(snapshot.requestCount, expansionCount() + 2);
  assert.ok(snapshot.keywords.some((k) => k.keyword === 'gap bonding specialist'));
  assert.ok(!snapshot.keywords.some((k) => k.keyword === 'unrelated helicopter'));
  assert.equal(snapshot.keywords[0].competition, 70); assert.equal(snapshot.keywords[0].cpcUsd, 2);
  for (const language of ['en', 'ar'] as const) {
    const expanded = new Set(calls.filter((c) => c.language === language && c.kind === 'expand').flatMap((c) => c.keywords));
    assert.deepEqual(expanded, new Set(marketKeywords(language)));
  }
  assert.deepEqual(parseMarketSnapshot(snapshot), snapshot);
});

test('successful no-volume keywords are zero, failed requests remain unknown without retries', async () => {
  const zero = await buildMarketSnapshot(async () => ({ result: { items: [] }, error: null }), now);
  assert.ok(zero.keywords.every((k) => k.searches === 0)); assert.deepEqual(zero.errors, []);
  const failed = await buildMarketSnapshot(async (language, keywords, kind) => language === 'ar' ? { result: null, error: 'Unavailable' } : response(language, keywords, kind), now);
  assert.ok(failed.keywords.filter((k) => k.language === 'ar').every((k) => k.searches === null));
  assert.ok(failed.errors.includes('ar: keyword volumes unavailable'));
});

test('cost guard stops further requests and records an incomplete snapshot', async () => {
  let calls = 0;
  const snapshot = await buildMarketSnapshot(async () => { calls++; return { result: { items: [] }, error: null, costUsd: 1 }; }, now);
  assert.equal(calls, 5); assert.equal(snapshot.costUsd, 5); assert.equal(snapshot.requestCount, 5);
  assert.ok(snapshot.errors.includes('Keyword request budget reached'));
});

test('cache parsing rejects old, incomplete and malformed complete snapshots', async () => {
  const snapshot = await buildMarketSnapshot(response, now);
  assert.equal(parseMarketSnapshot({ ...snapshot, version: 1 }), null);
  assert.equal(parseMarketSnapshot({ ...snapshot, keywords: [] }), null);
  assert.equal(parseMarketSnapshot({ ...snapshot, keywords: [...snapshot.keywords, snapshot.keywords[0]] }), null);
  assert.equal(parseMarketSnapshot({ ...snapshot, location: 9999 }), null);
  assert.equal(parseMarketSnapshot({ ...snapshot, keywords: snapshot.keywords.map((k) => ({ ...k, searches: '100' })) }), null);
});

test('fresh seven-day cache avoids all requests and writes; expiry refreshes once', async () => {
  const snapshot = await buildMarketSnapshot(response, now);
  const fresh = await refreshMarketCache({ now: new Date(now.getTime() + DENTAL_MARKET_TTL - 1), latest: async () => snapshot, fetchKeywords: async () => { throw new Error('Unexpected request'); }, save: async () => { throw new Error('Unexpected write'); } });
  assert.deepEqual(fresh, { refreshed: false, requestCount: 0, costUsd: 0 });
  let calls = 0, saves = 0;
  const stale = await refreshMarketCache({ now: new Date(now.getTime() + DENTAL_MARKET_TTL), latest: async () => snapshot, fetchKeywords: async (...args) => { calls++; return response(...args); }, save: async () => { saves++; } });
  assert.equal(stale.refreshed, true); assert.equal(calls, expansionCount() + 2); assert.equal(saves, 1);
});

test('cache-read and cache-write failures surface without triggering read-failure spend', async () => {
  let calls = 0;
  await assert.rejects(refreshMarketCache({ now, latest: async () => { throw new Error('lookup failed'); }, fetchKeywords: async (...args) => { calls++; return response(...args); }, save: async () => {} }), /lookup failed/);
  assert.equal(calls, 0);
  await assert.rejects(refreshMarketCache({ now, latest: async () => null, fetchKeywords: response, save: async () => { throw new Error('save failed'); } }), /save failed/);
});

test('Google Ads keyword responses preserve every result row and provider cost', () => {
  const rows = [{ keyword: 'one' }, { keyword: 'two' }];
  assert.deepEqual(keywordResponse({ status_code: 20000, cost: .075, tasks: [{ status_code: 20000, result: rows }] }), { result: { items: rows }, error: null, costUsd: .075 });
  assert.ok(keywordResponse({ status_code: 50000, tasks: [] }).error);
});
test('oversized expansion keeps every seed plus the highest-volume related terms, capped, without discarding paid data', async () => {
  const calls: { kind: string; keywords: string[] }[] = [];
  const snapshot = await buildMarketSnapshot(async (language, keywords, kind) => {
    calls.push({ kind, keywords });
    if (kind === 'volume') return response(language, keywords, kind);
    // 400 related terms per request, each carrying its own volume, far beyond the caps.
    return { result: { items: keywords.flatMap((seed) => Array.from({ length: 20 }, (_, n) => ({ keyword: `${seed} option ${n}`, search_volume: n * 10, cpc: 1, competition_index: 50 }))) }, error: null };
  }, now);
  assert.deepEqual(snapshot.errors, []);
  assert.ok(snapshot.notes?.some((n) => /^en: related terms capped at 150 per theme and 3000 per language/.test(n)));
  for (const language of ['en', 'ar'] as const) {
    const stored = snapshot.keywords.filter((k) => k.language === language);
    const seeds = new Set(marketKeywords(language));
    for (const seed of seeds) assert.ok(stored.some((k) => k.keyword === seed), `seed kept: ${seed}`);
    const extra = stored.filter((k) => !seeds.has(k.keyword));
    assert.ok(extra.length > 0 && extra.length <= 3000);
    for (const theme of DEMAND_THEMES) assert.ok(extra.filter((k) => classifyTheme(k.keyword) === theme.key).length <= 150);
    // Highest volumes win within the cap: a stored related term is never below a dropped one of the same theme.
    assert.ok(extra.every((k) => k.searches! >= 0 && k.cpcUsd === 1 && k.competition === 50));
  }
  // Related terms arrived with volumes, so only seeds needed a volume request.
  const volumeTerms = calls.filter((c) => c.kind === 'volume').flatMap((c) => c.keywords);
  assert.equal(volumeTerms.length, marketKeywords('en').length + marketKeywords('ar').length);
  assert.deepEqual(parseMarketSnapshot(snapshot), snapshot);
});

test('related-term ranking keeps higher volume first with a deterministic tie order', async () => {
  const theme = DEMAND_THEMES[0], seed = marketKeywords('en').find((k) => classifyTheme(k) === theme.key)!;
  const items = [...Array.from({ length: 160 }, (_, n) => ({ keyword: `${seed} low ${String(n).padStart(3, '0')}`, search_volume: 1 })),
    { keyword: `${seed} high b`, search_volume: 900 }, { keyword: `${seed} high a`, search_volume: 900 }];
  const snapshot = await buildMarketSnapshot(async (language, keywords, kind) => kind === 'volume' ? response(language, keywords, kind)
    : { result: { items: language === 'en' && keywords.includes(seed) ? items : [] }, error: null }, now);
  const stored = new Set(snapshot.keywords.map((k) => k.keyword));
  assert.ok(stored.has(`${seed} high a`) && stored.has(`${seed} high b`));
  assert.ok(stored.has(`${seed} low 147`) && !stored.has(`${seed} low 148`));
  assert.ok(snapshot.notes?.some((n) => n.includes('(12 lower-volume terms not stored)')));
});

test('a capped snapshot stays usable for the demand report and its note is shown as a data gap', async () => {
  const { aggregateDemandToDesk } = await import('../lib/analytics/demandToDesk');
  const { fixtureInput, fixtureRange } = await import('./fixtures/demand-to-desk');
  const input = fixtureInput();
  assert.ok(input.market);
  const capped = { ...input.market!, notes: ['en: related terms capped at 150 per theme and 3000 per language, highest volume first (5 lower-volume terms not stored)'] };
  const plain = aggregateDemandToDesk(input, fixtureRange), report = aggregateDemandToDesk({ ...input, market: capped }, fixtureRange);
  assert.ok(report.gaps.some((g) => g.startsWith('Market snapshot: en: related terms capped')));
  assert.deepEqual(report.themes.map((t) => t.marketShare), plain.themes.map((t) => t.marketShare));
  assert.ok(report.themes.some((t) => t.marketShare != null));
});
