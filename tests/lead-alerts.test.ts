import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { LEAD_ALERT_MODE, LEAD_ALERT_RECIPIENT, LEAD_ALERT_BATCH_MINUTES, LEAD_ALERT_WINDOW } from '../config/lead-alerts';
import { deliverLeadAlerts, type LeadAlertConfig, type LeadAlertDependencies } from '../lib/lead-alerts/delivery';
import { hasWhatsAppEvidence } from '../lib/lead-alerts/evidence';
import { LEAD_TRACKER_LINK, type AlertLead } from '../lib/lead-alerts/emails';
import { leadAlertDependencies, runLeadAlertsAfterSync } from '../lib/lead-alerts/alerts';
import type { AdminClient } from '../lib/supabase/server';
import { ALERT_CAP, ALERT_RULES, PREVIEWS } from '../lib/smileclub/alertRules';
import { syntheticLead } from './fixtures/dn017';

const config: LeadAlertConfig = { mode: 'instant', recipient: 'synthetic-recipient@example.invalid', batchMinutes: 120 };
const wa = (id: string) => syntheticLead(id, { channel_source: 'WhatsApp' });

/** In-memory atomic persistence contract. No transport, credentials or network. */
function fixture(initial: AlertLead[] = [wa('synthetic-history'), syntheticLead('synthetic-history-google', { channel_source: 'Google' })]) {
  let current = new Date('2026-10-12T05:00:00Z');
  const leads = [...initial];
  const seen = new Map<string, { firstSeenAt: string; alertedAt: string | null }>();
  const claims = new Map<string, { claimedAt: number; sentAt: number | null }>();
  const sent: Parameters<LeadAlertDependencies['send']>[0][] = [], logs: string[] = [];
  const deps: LeadAlertDependencies = {
    ready: async () => true,
    seed: async () => {
      if (seen.size) return false;
      for (const lead of leads) seen.set(lead.id, { firstSeenAt: current.toISOString(), alertedAt: current.toISOString() });
      return true;
    },
    leads: async () => [...leads],
    remember: async (ids, at) => { for (const id of ids) if (!seen.has(id)) seen.set(id, { firstSeenAt: at, alertedAt: null }); },
    pendingIds: async () => [...seen].filter(([, value]) => !value.alertedAt).map(([id]) => id),
    claim: async (ids, interval) => {
      const last = Math.max(-Infinity, ...[...claims.values()].map((c) => Math.max(c.claimedAt, c.sentAt ?? -Infinity)));
      if (+current - last < interval * 60_000) return [];
      const eligible = ids.filter((id) => !claims.has(id) && seen.has(id) && !seen.get(id)!.alertedAt);
      for (const id of eligible) claims.set(id, { claimedAt: +current, sentAt: null });
      return eligible;
    },
    markAlerted: async (ids) => { for (const id of ids) { seen.get(id)!.alertedAt = current.toISOString(); claims.get(id)!.sentAt = +current; } },
    send: async (mail) => { sent.push(mail); return { ok: true }; },
    log: (message) => logs.push(message),
  };
  const run = (at = '2026-10-12T05:00:00Z', settings = config) => { current = new Date(at); return deliverLeadAlerts(current, settings, deps); };
  return { leads, seen, claims, sent, logs, deps, run };
}

test('WhatsApp evidence is explicit across the four allowed fields, never a fallback or note', () => {
  for (const fields of [
    { whatsapp_ref: 'synthetic-reference' }, { channel_source: ' ZAVIS ' },
    { raw_row: { 'Inquiry Platform': 'whatsAPP chat' } }, { raw_row: { 'Preferred Channel': 'Zavis' } },
  ]) assert.equal(hasWhatsAppEvidence(syntheticLead('synthetic-evidence', fields)), true);
  for (const fields of [{}, { whatsapp_ref: '  ' }, { channel_source: 'Google' },
    { raw_row: { 'Source Type': 'WhatsApp', 'Notes / Remarks': 'WhatsApp' } }, { raw_row: { 'Inquiry Platform': 'Google', 'Preferred Channel': 'Telephone' } }]) {
    assert.equal(hasWhatsAppEvidence(syntheticLead('synthetic-no-evidence', fields)), false);
  }
});

test('first run seeds ALL history without sending; next new WhatsApp lead produces one private count-only email', async () => {
  const x = fixture(); await x.run();
  assert.equal(x.seen.size, 2); assert.ok([...x.seen.values()].every((value) => value.alertedAt)); assert.equal(x.sent.length, 0);
  const phoneLike = String(10 ** 11 + 17017); // generated synthetic value, not a contact
  x.leads.push(syntheticLead('synthetic-new-private', { channel_source: 'WhatsApp', clinic: phoneLike,
    raw_row: { 'Contact Number': phoneLike, 'Source Type': 'Facebook', 'Inquiry Platform': 'WhatsApp' } }));
  x.leads.push(syntheticLead('synthetic-new-google', { channel_source: 'Google' }));
  await x.run('2026-10-12T05:15:00Z');
  assert.equal(x.sent.length, 1); assert.deepEqual(x.sent[0].to, [config.recipient]);
  assert.match(x.sent[0].subject, /1 new leads/); assert.match(x.sent[0].html, /Paid digital<\/td><td>1/);
  assert.match(x.sent[0].html, /Unassigned<\/td><td>1/); assert.ok(x.sent[0].html.includes(LEAD_TRACKER_LINK));
  assert.match(x.sent[0].html, /about 15 minutes/); assert.match(x.sent[0].html, /delay in the desk logging it/);
  const rendered = JSON.stringify(x.sent) + x.logs.join('\n');
  for (const forbidden of [...x.leads.map((lead) => lead.id), phoneLike]) assert.ok(!rendered.includes(forbidden));
  assert.ok(x.seen.get('synthetic-new-private')?.alertedAt); assert.ok(!x.seen.has('synthetic-new-google'));
  await x.run('2026-10-12T05:30:00Z'); assert.equal(x.sent.length, 1);
});

test('off or null recipient logs one line and never reads, seeds, claims or sends', async () => {
  assert.equal(LEAD_ALERT_MODE, 'off'); assert.equal(LEAD_ALERT_RECIPIENT, null); assert.equal(LEAD_ALERT_BATCH_MINUTES, 120);
  assert.deepEqual(LEAD_ALERT_WINDOW, { start: '09:00', end: '21:00', timeZone: 'Asia/Dubai' });
  for (const settings of [{ ...config, mode: 'off' as const }, { ...config, recipient: null }]) {
    const x = fixture([wa('synthetic-new')]); x.deps.ready = async () => { assert.fail('Disabled job touched dependencies'); };
    await x.run(undefined, settings); assert.deepEqual(x.logs, ['lead:whatsapp: not configured']); assert.equal(x.sent.length, 0); assert.equal(x.seen.size, 0);
  }
});

test('batch interval is rolling across clock boundaries, retains pending leads, and ignores zero new leads', async () => {
  const x = fixture(), batched = { ...config, mode: 'batched' as const };
  await x.run(undefined, batched); x.leads.push(wa('synthetic-first'));
  await x.run('2026-10-12T05:55:00Z', batched); assert.equal(x.sent.length, 1);
  x.leads.push(wa('synthetic-second'));
  await x.run('2026-10-12T06:05:00Z', batched); assert.equal(x.sent.length, 1);
  assert.equal(x.seen.get('synthetic-second')?.alertedAt, null);
  assert.equal(x.seen.get('synthetic-second')?.firstSeenAt, '2026-10-12T06:05:00.000Z');
  await x.run('2026-10-12T07:54:00Z', batched); assert.equal(x.sent.length, 1);
  await x.run('2026-10-12T07:55:00Z', batched); assert.equal(x.sent.length, 2);
  await x.run('2026-10-12T10:00:00Z', batched); assert.equal(x.sent.length, 2);
});

test('both modes discover outside Dubai hours and send at 09:00 but never at 21:00', async () => {
  for (const mode of ['instant', 'batched'] as const) {
    const x = fixture(), settings = { ...config, mode }; await x.run(undefined, settings);
    x.leads.push(wa('synthetic-morning'));
    await x.run('2026-10-13T04:59:00Z', settings); assert.equal(x.sent.length, 0); assert.equal(x.seen.get('synthetic-morning')?.alertedAt, null);
    await x.run('2026-10-13T05:00:00Z', settings); assert.equal(x.sent.length, 1);
    x.leads.push(wa('synthetic-evening'));
    await x.run('2026-10-13T17:00:00Z', settings); assert.equal(x.sent.length, 1);
    await x.run('2026-10-14T05:00:00Z', settings); assert.equal(x.sent.length, 2);
  }
});

test('overlapping first runs seed without alerting; overlapping later runs claim each lead once', async () => {
  const x = fixture(); await Promise.all([x.run(), x.run()]); assert.equal(x.sent.length, 0); assert.equal(x.seen.size, 2);
  x.leads.push(wa('synthetic-parallel-a'), wa('synthetic-parallel-b'));
  await Promise.all([x.run(), x.run()]); assert.equal(x.sent.length, 1); assert.match(x.sent[0].subject, /2 new leads/);
  assert.equal(x.claims.size, 2);
});

test('failed and uncertain transport retains claims, never marks alerted, and never leaks exception text', async () => {
  for (const uncertain of [false, true]) {
    const x = fixture(); await x.run(); x.leads.push(wa('synthetic-uncertain'));
    let attempts = 0;
    x.deps.send = async () => { attempts++; if (uncertain) throw new Error('synthetic-uncertain'); return { ok: false }; };
    await x.run(); await x.run('2026-10-13T06:00:00Z');
    assert.equal(attempts, 1); assert.equal(x.seen.get('synthetic-uncertain')?.alertedAt, null);
    assert.ok(!x.logs.join().includes('synthetic-uncertain'));
  }
});

test('marking failure after send also retains the claim, and read/claim/paused failures send nothing', async () => {
  const x = fixture(); await x.run(); x.leads.push(wa('synthetic-mark-failure'));
  x.deps.markAlerted = async () => { throw new Error('synthetic-private-failure'); };
  await x.run(); await x.run(); assert.equal(x.sent.length, 1); assert.equal(x.seen.get('synthetic-mark-failure')?.alertedAt, null);
  for (const key of ['leads', 'remember', 'pendingIds', 'claim'] as const) {
    const f = fixture(); await f.run(); f.leads.push(wa('synthetic-failure'));
    f.deps[key] = async () => { throw new Error('synthetic-private-failure'); };
    await f.run(); assert.equal(f.sent.length, 0); assert.ok(!f.logs.join().includes('synthetic-private-failure'));
  }
  const paused = fixture(); paused.deps.ready = async () => false; await paused.run(); assert.equal(paused.seen.size, 0);
});

test('empty initial history remains a conservative seed until there are rows', async () => {
  const x = fixture([]); await x.run(); x.leads.push(wa('synthetic-first-history')); await x.run();
  assert.equal(x.sent.length, 0); assert.ok(x.seen.get('synthetic-first-history')?.alertedAt);
  x.leads.push(wa('synthetic-after-history')); await x.run(); assert.equal(x.sent.length, 1);
});

test('database adapter uses atomic seed, claim, and successful-send RPCs and fails closed', async () => {
  const calls: { name: string; args: unknown }[] = [];
  const deps = leadAlertDependencies({ rpc: async (name: string, args: unknown) => {
    calls.push({ name, args }); return { error: null, data: name === 'seed_lead_alert_seen' ? true : name === 'claim_lead_alerts' ? ['synthetic-claim'] : null };
  } } as unknown as AdminClient);
  assert.equal(await deps.seed(), true); assert.deepEqual(await deps.claim(['synthetic-claim'], 120), ['synthetic-claim']); await deps.markAlerted(['synthetic-claim']);
  assert.deepEqual(calls.map((call) => call.name), ['seed_lead_alert_seen', 'claim_lead_alerts', 'mark_lead_alerts_sent']);
  assert.deepEqual(calls[1].args, { lead_ids: ['synthetic-claim'], min_interval_minutes: 120 });
  const failed = leadAlertDependencies({ rpc: async () => ({ error: { message: 'private upstream text' }, data: null }) } as unknown as AdminClient);
  await assert.rejects(() => failed.seed(), /^Error: Lead alert seed unavailable$/);
  await assert.rejects(() => failed.claim([], 120), /^Error: Lead alert claim unavailable$/);
  await assert.rejects(() => failed.markAlerted([]), /^Error: Lead alert send record unavailable$/);
});

test('large instant bursts produce one email with the full count and scalar claim responses are not paged', async () => {
  const x = fixture(); await x.run();
  const ids = Array.from({ length: 1001 }, (_, i) => `synthetic-burst-${i}`);
  x.leads.push(...ids.map(wa)); await x.run();
  assert.equal(x.sent.length, 1); assert.match(x.sent[0].subject, /1001 new leads/); assert.equal(x.claims.size, 1001);
  const deps = leadAlertDependencies({ rpc: async () => ({ error: null, data: ids }) } as unknown as AdminClient);
  assert.deepEqual(await deps.claim(ids, 0), ids);
  assert.match(readFileSync('supabase/migrations/0048_lead_alert_seen.sql', 'utf8'), /returns text\[\]/);
});

test('migration is additive, service-role only, with transactional history seeding and durable claims', () => {
  const sql = readFileSync('supabase/migrations/0048_lead_alert_seen.sql', 'utf8');
  assert.match(sql, /insert into lane_e\.lead_alert_seen \(id, alerted_at\)\s+select id, now\(\) from lane_e\.leads/);
  assert.match(sql, /if exists \(select 1 from lane_e\.lead_alert_seen\) then return false/);
  for (const table of ['lead_alert_seen', 'lead_alert_claims']) assert.ok(sql.includes(`alter table lane_e.${table} enable row level security`));
  assert.match(sql, /from public, anon, authenticated/); assert.match(sql, /to service_role/);
  assert.match(sql, /pg_advisory_xact_lock\(480017\)/); assert.match(sql, /not exists \(select 1 from lane_e\.lead_alert_claims/);
  assert.doesNotMatch(sql, /security definer|drop table|delete from|alter table lane_e\.leads/i);
});

test('lead kind is excluded from Smile Club caps and lists; shoot-only audiences remain unchanged', () => {
  const source = readFileSync('lib/smileclub/alerts.ts', 'utf8');
  assert.match(source, /if \(kind === 'lead:whatsapp'\) continue;/);
  assert.match(source, /const MORNING: Who\[\] = \['gautam', 'mohan', 'fahad'\]/);
  assert.match(source, /const EVENING: Who\[\] = \['fahad', 'gautam', 'mohan'\]/);
  assert.match(source, /const SHOOT_CC: Who\[\] = \['luvi', 'gautam', 'fahad', 'mohan'\]/);
  assert.match(readFileSync('lib/smileclub/tracker.ts', 'utf8'), /\.neq\('kind', 'lead:whatsapp'\)/);
  assert.ok(!JSON.stringify([ALERT_RULES, PREVIEWS]).includes('lead:whatsapp'));
  assert.deepEqual(ALERT_CAP.find((row) => 'kind' in row && row.kind === 'lead:whatsapp'), {
    kind: 'lead:whatsapp', who: 'Dr Luvi: lead alert (off until configured)', morning: 'Off - owner setup pending', evening: '-', max: 0,
  });
});

test('cron calls the disabled lead hook after sync; default hook writes only the required line', async (t) => {
  const source = readFileSync('app/api/cron/sync/route.ts', 'utf8');
  assert.ok(source.indexOf('await runLeadAlertsAfterSync(summary)') > source.indexOf("await runSync('cron')"));
  const log = t.mock.method(console, 'info', () => undefined);
  await runLeadAlertsAfterSync({ status: 'success', sheetsOk: [], sheetsFailed: [], dataGaps: [], message: '', reportDate: '', rowsIngested: 0 });
  assert.deepEqual(log.mock.calls.map((call) => call.arguments), [['lead:whatsapp: not configured']]);
});
