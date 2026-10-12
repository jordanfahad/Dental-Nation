import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { deliverPerformance, type DeliveryDependencies } from '../lib/performance/delivery';
import { buildGbpPlan } from '../lib/gbp/plan';
import { briefFixture, gbpFixture } from './fixtures/dn015';

function dependencies() {
  const claims = new Set<string>();
  const sent: { to: string[]; cc: string[]; subject: string; html: string }[] = [];
  const logs: { kind: string; ok: boolean; note: string }[] = [];
  const deps: DeliveryDependencies = {
    configured: true, address: (who) => `${who}@example.invalid`, alreadySent: async () => false,
    claim: async (kind, day) => { const key = `${kind}:${day}`; if (claims.has(key)) return false; claims.add(key); return true; },
    log: async (kind, _day, ok, _recipients, note) => { logs.push({ kind, ok, note }); },
    gbp: async () => gbpFixture(), brief: async () => briefFixture(), send: async (mail) => { sent.push(mail); return { ok: true }; },
  };
  return { deps, claims, sent, logs };
}
test('Dubai delivery window is 09:00 inclusive to 11:00 exclusive', async () => {
  for (const utc of ['2026-10-12T04:59:59Z', '2026-10-12T07:00:00Z', '2026-10-12T13:00:00Z']) {
    const x = dependencies(); assert.deepEqual(await deliverPerformance(new Date(utc), x.deps), []); assert.equal(x.sent.length, 0);
  }
  for (const utc of ['2026-10-12T05:00:00Z', '2026-10-12T06:59:59Z']) {
    const x = dependencies(); await deliverPerformance(new Date(utc), x.deps); assert.equal(x.sent.length, 2);
    assert.deepEqual(x.sent.map((m) => m.to), [['shadi@example.invalid'], ['akbar@example.invalid']]);
    assert.deepEqual(x.sent.map((m) => m.cc), [['fahad@example.invalid'], ['fahad@example.invalid']]);
  }
});
test('repeated and concurrent cron calls cannot exceed one daily email to each primary', async () => {
  const x = dependencies(); const now = new Date('2026-10-12T05:00:00Z');
  await Promise.all([deliverPerformance(now, x.deps), deliverPerformance(now, x.deps)]);
  await deliverPerformance(now, x.deps);
  assert.equal(x.sent.length, 2); assert.equal(x.claims.size, 2);
});
test('existing recipient cap, missing configuration and read failures do not send', async () => {
  const now = new Date('2026-10-12T05:00:00Z');
  const capped = dependencies(); capped.deps.alreadySent = async () => true;
  await deliverPerformance(now, capped.deps); assert.equal(capped.sent.length, 0);
  const off = dependencies(); off.deps.configured = false;
  await deliverPerformance(now, off.deps); assert.equal(off.claims.size, 0); assert.equal(off.sent.length, 0);
  const fail = dependencies(); fail.deps.gbp = async () => { throw new Error('synthetic failure'); };
  await deliverPerformance(now, fail.deps); assert.equal(fail.sent.length, 0); assert.equal(fail.claims.size, 0); assert.equal(fail.logs.length, 2);
  fail.deps.gbp = async () => gbpFixture(); await deliverPerformance(now, fail.deps); assert.equal(fail.sent.length, 2);
});
test('empty GBP skips Shadi but Akbar still gets his zero/empty-data brief; transport uncertainty keeps claim', async () => {
  const x = dependencies(); x.deps.gbp = async () => buildGbpPlan({ rows: [], metrics: [], reviews: [], connected: [], asOf: '2026-10-11', syncedAt: null });
  await deliverPerformance(new Date('2026-10-12T05:00:00Z'), x.deps);
  assert.equal(x.sent.length, 1); assert.deepEqual(x.sent[0].to, ['akbar@example.invalid']); assert.match(x.logs[0].note, /nothing new/);
  const uncertain = dependencies(); let attempts = 0;
  uncertain.deps.send = async () => { attempts++; throw new Error('synthetic timeout'); };
  await deliverPerformance(new Date('2026-10-12T05:00:00Z'), uncertain.deps);
  await deliverPerformance(new Date('2026-10-12T05:15:00Z'), uncertain.deps);
  assert.equal(attempts, 2);
});
test('legacy Smile Club audiences and shoot-only Luvi remain excluded from new briefs', () => {
  const source = readFileSync('lib/smileclub/alerts.ts', 'utf8');
  assert.match(source, /const MORNING: Who\[\] = \['gautam', 'mohan', 'fahad'\]/);
  assert.match(source, /const EVENING: Who\[\] = \['fahad', 'gautam', 'mohan'\]/);
  assert.match(source, /const SHOOT_CC: Who\[\] = \['luvi', 'gautam', 'fahad', 'mohan'\]/);
  const page = readFileSync('app/(app)/page.tsx', 'utf8');
  assert.match(page, /\['gbp', 'GBP plan'\]/); assert.match(page, /sp\.otab === 'gbp'/);
  const action = readFileSync('app/(app)/performance-actions.ts', 'utf8');
  assert.match(action, /user\?\.role !== 'admin'/); assert.match(action, /body.length > 6000/);
});
