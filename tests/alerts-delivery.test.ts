import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { deliverDailyAlerts, dubaiDay, liveWindow, resolveRecipients, type DailyAlertDeps, type Mail } from '../lib/alerts/delivery';
import { CLINIC_ACTIVATION_LIVE_FROM, DAILY_ALERTS, DAILY_ALERT_KINDS, LIVE_FROM, PREVIEW_KEY, nextSendDay, previewNote, recipientsLine, sendsLiveOn, type DailyAlert } from '../lib/alerts/registry';

/** The kinds the cron sends live from LIVE_FROM; Clinic Activation joins them from 31 Oct 2026 (tests/alerts-activation.test.ts). */
const LIVE_KINDS = DAILY_ALERTS.filter((a) => sendsLiveOn(a, LIVE_FROM)).map((a) => a.kind);
/** First day of the Clinic Activation email (owner approval); from then on all five kinds are live. */
const ACTIVATION_FROM = '2026-10-31';
const ACTIVATION_DAY_0900 = '2026-10-31T05:00:00Z';

/** In-memory claims, preview request and log. No transport, database or network. */
function fixture(opts: { preview?: boolean; failKinds?: string[] } = {}) {
  const claims = new Set<string>();
  const logs: { kind: string; day: string; ok: boolean; recipients: string[]; note: string }[] = [];
  const sent: Mail[] = [];
  const rendered: { kind: string; today: string; preview?: string; recipients?: string }[] = [];
  const state = { previewRequest: opts.preview ?? false, paused: false };
  const deps: DailyAlertDeps = {
    alerts: DAILY_ALERTS,
    paused: async () => state.paused,
    configured: true,
    address: (who) => `${who}@example.invalid`,
    render: async (alert, today, o) => {
      rendered.push({ kind: alert.kind, today, ...o });
      if (opts.failKinds?.includes(alert.kind)) throw new Error('synthetic builder failure');
      return { subject: `${alert.label} · ${today}`, html: `<p>${o.preview ?? ''}</p><p>${o.recipients ?? ''}</p>` };
    },
    consumePreview: async () => { const had = state.previewRequest; state.previewRequest = false; return had; },
    claimed: async (kind, day) => claims.has(`${kind}:${day}`),
    claim: async (kind, day) => { const k = `${kind}:${day}`; if (claims.has(k)) return false; claims.add(k); return true; },
    log: async (kind, day, ok, recipients, note) => { logs.push({ kind, day, ok, recipients, note }); },
    send: async (mail) => { sent.push(mail); return { ok: true }; },
  };
  return { deps, claims, logs, sent, rendered, state };
}
const at = (iso: string) => new Date(iso);
const addr = (...who: string[]) => who.map((w) => `${w}@example.invalid`);
// 09:00 Dubai = 05:00 UTC (no daylight saving).
const LIVE_DAY_0900 = '2026-10-25T05:00:00Z';

test('registry: five kinds in order (four live from LIVE_FROM, Clinic Activation from 31 Oct), approved recipients, Fahad copied on each', () => {
  assert.deepEqual(DAILY_ALERT_KINDS, ['am:sc-daily', 'am:ortho-daily', 'am:gbp-daily', 'am:akbar-perf', 'am:clinic-activation']);
  assert.deepEqual(LIVE_KINDS, ['am:sc-daily', 'am:ortho-daily', 'am:gbp-daily', 'am:akbar-perf']);
  assert.equal(CLINIC_ACTIVATION_LIVE_FROM, ACTIVATION_FROM);
  assert.deepEqual(DAILY_ALERTS.map((a) => a.liveFrom), [undefined, undefined, undefined, undefined, ACTIVATION_FROM]);
  assert.deepEqual(DAILY_ALERTS.filter((a) => sendsLiveOn(a, '2026-10-30')).map((a) => a.kind), LIVE_KINDS);
  assert.deepEqual(DAILY_ALERTS.filter((a) => sendsLiveOn(a, ACTIVATION_FROM)).map((a) => a.kind), [...DAILY_ALERT_KINDS]);
  const route = Object.fromEntries(DAILY_ALERTS.map((a) => [a.kind, { to: a.to, cc: a.cc }]));
  assert.deepEqual(route, {
    'am:sc-daily': { to: ['gautam', 'luvi', 'shadi', 'mj'], cc: ['fahad'] },
    'am:ortho-daily': { to: ['luvi', 'mj', 'shadi'], cc: ['fahad'] },
    'am:gbp-daily': { to: ['akbar', 'shadi', 'luvi'], cc: ['fahad'] },
    'am:akbar-perf': { to: ['akbar', 'shadi'], cc: ['fahad'] },
    'am:clinic-activation': { to: ['akbar', 'shadi', 'luvi'], cc: ['fahad'] },
  });
  assert.equal(LIVE_FROM, '2026-10-25');
  assert.equal(PREVIEW_KEY, 'alerts_preview_request');
  assert.deepEqual(DAILY_ALERTS.map(recipientsLine), [
    'To Gautam, Dr Luvi, Ms Shadi and MJ; copied to Fahad.',
    'To Dr Luvi, MJ and Ms Shadi; copied to Fahad.',
    'To Mr Akbar, Ms Shadi and Dr Luvi; copied to Fahad.',
    'To Mr Akbar and Ms Shadi; copied to Fahad.',
    'To Mr Akbar, Ms Shadi and Dr Luvi; copied to Fahad.',
  ]);
  for (const a of DAILY_ALERTS) {
    assert.equal(typeof a.read, 'function'); assert.equal(typeof a.build, 'function');
    assert.doesNotMatch(a.label + recipientsLine(a) + previewNote(a, LIVE_FROM), /[\u2013\u2014]/);
  }
});

test('no live send to anyone before LIVE_FROM, at any hour', async () => {
  for (const utc of ['2026-10-24T05:00:00Z', '2026-10-24T06:30:00Z', '2026-10-20T05:15:00Z', '2026-10-25T04:59:59Z']) {
    const x = fixture();
    await deliverDailyAlerts(at(utc), x.deps);
    assert.equal(x.sent.length, 0, utc); assert.equal(x.claims.size, 0, utc); assert.equal(x.rendered.length, 0, utc);
  }
  assert.equal(liveWindow(at('2026-10-24T05:00:00Z')), false);
  assert.equal(liveWindow(at(LIVE_DAY_0900)), true);
});

test('live send only 09:00 to 10:59 Dubai, from LIVE_FROM, to the approved recipients (Mr Akbar allowed)', async () => {
  for (const utc of ['2026-10-26T04:59:59Z', '2026-10-26T07:00:00Z', '2026-10-26T13:00:00Z', '2026-10-26T20:00:00Z']) {
    const x = fixture(); await deliverDailyAlerts(at(utc), x.deps);
    assert.equal(x.sent.length, 0, utc); assert.equal(x.claims.size, 0, utc);
  }
  for (const utc of [LIVE_DAY_0900, '2026-10-25T06:59:59Z', '2026-10-30T05:15:00Z']) {
    const x = fixture(); await deliverDailyAlerts(at(utc), x.deps);
    assert.deepEqual(x.sent.map((m) => m.to), [addr('gautam', 'luvi', 'shadi', 'mj'), addr('luvi', 'mj', 'shadi'), addr('akbar', 'shadi', 'luvi'), addr('akbar', 'shadi')], utc);
    assert.ok(x.sent.every((m) => m.cc.join() === addr('fahad').join()));
    assert.ok(x.sent.every((m) => !m.subject.startsWith('[Preview]')));
    assert.deepEqual(x.logs.map((l) => [l.kind, l.ok, l.note]), LIVE_KINDS.map((k) => [k, true, 'Sent']));
    assert.deepEqual(x.logs[2].recipients, addr('akbar', 'shadi', 'luvi', 'fahad'));
    assert.ok(x.rendered.every((r) => r.today === dubaiDay(at(utc)) && r.preview === undefined));
    assert.equal(x.rendered[3].recipients, 'To Mr Akbar and Ms Shadi; copied to Fahad.');
  }
  // From 31 Oct the Clinic Activation email joins them, in the same window, to Mr Akbar, Ms Shadi and Dr Luvi.
  for (const utc of ['2026-10-31T04:59:59Z', '2026-10-31T07:00:00Z', '2026-10-31T13:00:00Z']) {
    const x = fixture(); await deliverDailyAlerts(at(utc), x.deps);
    assert.equal(x.sent.length, 0, utc); assert.equal(x.claims.size, 0, utc);
  }
  for (const utc of [ACTIVATION_DAY_0900, '2026-10-31T06:59:59Z', '2026-12-01T05:15:00Z']) {
    const x = fixture(); await deliverDailyAlerts(at(utc), x.deps);
    assert.deepEqual(x.sent.map((m) => m.to), [addr('gautam', 'luvi', 'shadi', 'mj'), addr('luvi', 'mj', 'shadi'), addr('akbar', 'shadi', 'luvi'), addr('akbar', 'shadi'), addr('akbar', 'shadi', 'luvi')], utc);
    assert.ok(x.sent.every((m) => m.cc.join() === addr('fahad').join()));
    assert.ok(x.sent.every((m) => !m.subject.startsWith('[Preview]')));
    assert.deepEqual(x.logs.map((l) => [l.kind, l.ok, l.note]), DAILY_ALERT_KINDS.map((k) => [k, true, 'Sent']));
    assert.deepEqual(x.logs[2].recipients, addr('akbar', 'shadi', 'luvi', 'fahad'));
    assert.deepEqual(x.logs[4].recipients, addr('akbar', 'shadi', 'luvi', 'fahad'));
    assert.ok(x.rendered.every((r) => r.today === dubaiDay(at(utc)) && r.preview === undefined));
    assert.equal(x.rendered[3].recipients, 'To Mr Akbar and Ms Shadi; copied to Fahad.');
    assert.equal(x.rendered[4].recipients, 'To Mr Akbar, Ms Shadi and Dr Luvi; copied to Fahad.');
  }
  // One person may receive several of these emails: no cross-kind cap.
  const x = fixture(); await deliverDailyAlerts(at(LIVE_DAY_0900), x.deps);
  assert.equal(x.sent.filter((m) => m.to.includes('shadi@example.invalid')).length, 4);
  const y = fixture(); await deliverDailyAlerts(at(ACTIVATION_DAY_0900), y.deps);
  assert.equal(y.sent.filter((m) => m.to.includes('shadi@example.invalid')).length, 5);
  assert.equal(y.sent.filter((m) => m.to.includes('akbar@example.invalid')).length, 3);
});

test('one send per kind per day, including concurrent and repeated runs; the next day sends again', async () => {
  const x = fixture();
  await Promise.all([deliverDailyAlerts(at(LIVE_DAY_0900), x.deps), deliverDailyAlerts(at(LIVE_DAY_0900), x.deps)]);
  await deliverDailyAlerts(at('2026-10-25T05:15:00Z'), x.deps);
  const later = await deliverDailyAlerts(at('2026-10-25T06:45:00Z'), x.deps);
  assert.equal(x.sent.length, 4); assert.equal(x.claims.size, 4);
  assert.deepEqual(later, LIVE_KINDS.map((k) => `${k}: already sent today`));
  await deliverDailyAlerts(at('2026-10-26T05:00:00Z'), x.deps);
  assert.equal(x.sent.length, 8); assert.equal(x.claims.size, 8);

  // From 31 Oct: five kinds, still one send each per day.
  const y = fixture();
  await Promise.all([deliverDailyAlerts(at(ACTIVATION_DAY_0900), y.deps), deliverDailyAlerts(at(ACTIVATION_DAY_0900), y.deps)]);
  await deliverDailyAlerts(at('2026-10-31T05:15:00Z'), y.deps);
  const again = await deliverDailyAlerts(at('2026-10-31T06:45:00Z'), y.deps);
  assert.equal(y.sent.length, 5); assert.equal(y.claims.size, 5);
  assert.ok(y.claims.has(`am:clinic-activation:${ACTIVATION_FROM}`));
  assert.deepEqual(again, DAILY_ALERT_KINDS.map((k) => `${k}: already sent today`));
  await deliverDailyAlerts(at('2026-11-01T05:00:00Z'), y.deps);
  assert.equal(y.sent.length, 10); assert.equal(y.claims.size, 10);
});

test('transport failure keeps the claim (no second copy); missing or duplicate addresses and no transport fail closed', async () => {
  const flaky = fixture(); let attempts = 0;
  flaky.deps.send = async () => { attempts++; throw new Error('synthetic timeout'); };
  await deliverDailyAlerts(at(LIVE_DAY_0900), flaky.deps);
  await deliverDailyAlerts(at('2026-10-25T05:15:00Z'), flaky.deps);
  assert.equal(attempts, 4); assert.equal(flaky.claims.size, 4);
  assert.ok(flaky.logs.every((l) => !l.ok && /no automatic retry/.test(l.note)));

  const missing = fixture(); missing.deps.address = (who) => (who === 'mj' ? null : `${who}@example.invalid`);
  await deliverDailyAlerts(at(LIVE_DAY_0900), missing.deps);
  assert.deepEqual(missing.sent.map((m) => m.subject.split(' · ')[0]), ['Google Business Profile daily', 'Daily and month to date performance']);
  assert.ok(!missing.claims.has('am:sc-daily:2026-10-25') && !missing.claims.has('am:ortho-daily:2026-10-25'));

  const dup = fixture(); dup.deps.address = (who) => (who === 'luvi' ? ' SHADI@example.invalid ' : `${who}@example.invalid`);
  await deliverDailyAlerts(at(LIVE_DAY_0900), dup.deps);
  assert.deepEqual(dup.sent.map((m) => m.to), [addr('akbar', 'shadi')]);

  const off = fixture(); off.deps.configured = false;
  await deliverDailyAlerts(at(LIVE_DAY_0900), off.deps);
  assert.equal(off.sent.length, 0); assert.equal(off.claims.size, 0);
  assert.ok(off.logs.every((l) => !l.ok && /transport not configured/.test(l.note)));

  assert.deepEqual(resolveRecipients({ to: ['akbar', 'shadi'], cc: ['fahad'] }, (w) => ` ${w}@example.invalid `), { to: addr('akbar', 'shadi'), cc: addr('fahad') });
  assert.equal(resolveRecipients({ to: ['akbar'], cc: ['fahad'] }, () => 'same@example.invalid'), null);
});

test('one builder failure does not stop the other emails, live or preview', async () => {
  const x = fixture({ failKinds: ['am:ortho-daily'] });
  const out = await deliverDailyAlerts(at(LIVE_DAY_0900), x.deps);
  assert.equal(x.sent.length, 3);
  assert.ok(!x.claims.has('am:ortho-daily:2026-10-25'));
  assert.ok(out.includes('am:ortho-daily: read or build failed'));
  assert.deepEqual(x.logs.find((l) => l.kind === 'am:ortho-daily'), { kind: 'am:ortho-daily', day: '2026-10-25', ok: false, recipients: [], note: 'Read or build failed; tried again on the next run' });
  assert.ok(x.sent.some((m) => m.subject.startsWith('Daily and month to date performance')));

  const p = fixture({ preview: true, failKinds: ['am:sc-daily'] });
  await deliverDailyAlerts(at('2026-10-24T08:00:00Z'), p.deps);
  assert.equal(p.sent.length, 4);
  assert.deepEqual(p.logs.map((l) => [l.kind, l.ok]), [['preview:am:sc-daily', false], ['preview:am:ortho-daily', true], ['preview:am:gbp-daily', true], ['preview:am:akbar-perf', true], ['preview:am:clinic-activation', true]]);

  const claimDown = fixture(); claimDown.deps.claim = async (kind) => { if (kind === 'am:sc-daily') throw new Error('check constraint'); return true; };
  await deliverDailyAlerts(at(LIVE_DAY_0900), claimDown.deps);
  assert.equal(claimDown.sent.length, 3);
  assert.match(claimDown.logs[0].note, /daily claim unavailable/);
});

test('preview goes to Fahad only, any time, before LIVE_FROM, and is consumed once', async () => {
  const x = fixture({ preview: true });
  await Promise.all([deliverDailyAlerts(at('2026-10-24T08:00:00Z'), x.deps), deliverDailyAlerts(at('2026-10-24T08:00:00Z'), x.deps)]);
  await deliverDailyAlerts(at('2026-10-24T08:15:00Z'), x.deps);
  assert.equal(x.sent.length, 5);
  for (const m of x.sent) { assert.deepEqual(m.to, addr('fahad')); assert.deepEqual(m.cc, []); assert.match(m.subject, /^\[Preview\] /); }
  assert.equal(x.claims.size, 0);
  assert.deepEqual(x.logs.map((l) => [l.kind, l.day, l.ok, l.recipients]), DAILY_ALERT_KINDS.map((k) => [`preview:${k}`, '2026-10-24', true, addr('fahad')]));
  assert.deepEqual(x.rendered.map((r) => r.preview), [
    'Preview for Fahad: on Sun 25 Oct at 09:00 this goes to Gautam, Dr Luvi, Ms Shadi and MJ, copied to Fahad.',
    'Preview for Fahad: on Sun 25 Oct at 09:00 this goes to Dr Luvi, MJ and Ms Shadi, copied to Fahad.',
    'Preview for Fahad: on Sun 25 Oct at 09:00 this goes to Mr Akbar, Ms Shadi and Dr Luvi, copied to Fahad.',
    'Preview for Fahad: on Sun 25 Oct at 09:00 this goes to Mr Akbar and Ms Shadi, copied to Fahad.',
    'Preview for Fahad: on Sat 31 Oct at 09:00 this goes to Mr Akbar, Ms Shadi and Dr Luvi, copied to Fahad.',
  ]);
  assert.ok(x.rendered.every((r) => r.today === '2026-10-24'));
  assert.ok(x.sent[0].html.includes('Preview for Fahad'));

  // No request, no preview.
  const none = fixture(); await deliverDailyAlerts(at('2026-10-24T08:00:00Z'), none.deps);
  assert.equal(none.sent.length, 0);
});

test('preview on a live day goes to Fahad only while the live emails go to their recipients once', async () => {
  const x = fixture({ preview: true });
  await deliverDailyAlerts(at(LIVE_DAY_0900), x.deps);
  const previews = x.sent.filter((m) => m.subject.startsWith('[Preview] '));
  const live = x.sent.filter((m) => !m.subject.startsWith('[Preview] '));
  assert.equal(previews.length, 5); assert.equal(live.length, 4);
  assert.ok(previews.every((m) => m.to.join() === 'fahad@example.invalid' && m.cc.length === 0));
  assert.match(x.rendered[0].preview!, /^Preview for Fahad: on Mon 26 Oct at 09:00/);
  assert.equal(nextSendDay('2026-10-24', 23), '2026-10-25');
  assert.equal(nextSendDay('2026-10-25', 8), '2026-10-25');
  assert.equal(nextSendDay('2026-10-25', 12), '2026-10-26');
});

test('preview request is kept when it cannot be sent; owner pause stops previews and live emails', async () => {
  const off = fixture({ preview: true }); off.deps.configured = false;
  await deliverDailyAlerts(at('2026-10-24T08:00:00Z'), off.deps);
  assert.equal(off.state.previewRequest, true); assert.equal(off.sent.length, 0);
  const noFahad = fixture({ preview: true }); noFahad.deps.address = (w) => (w === 'fahad' ? null : `${w}@example.invalid`);
  await deliverDailyAlerts(at('2026-10-24T08:00:00Z'), noFahad.deps);
  assert.equal(noFahad.state.previewRequest, true); assert.equal(noFahad.sent.length, 0);

  for (const paused of [async () => true, async () => { throw new Error('pause flag unreadable'); }]) {
    const x = fixture({ preview: true }); x.deps.paused = paused as DailyAlertDeps['paused'];
    assert.deepEqual(await deliverDailyAlerts(at(LIVE_DAY_0900), x.deps), ['paused by owner']);
    assert.equal(x.sent.length, 0); assert.equal(x.claims.size, 0); assert.equal(x.logs.length, 0);
    assert.equal(x.state.previewRequest, true);
  }
});

test('a failed claim check never overwrites the audit row of an email already sent', async () => {
  const x = fixture();
  await deliverDailyAlerts(at(LIVE_DAY_0900), x.deps);
  const before = x.logs.length;
  x.deps.claimed = async () => { throw new Error('read failed'); };
  x.deps.address = () => null;
  const out = await deliverDailyAlerts(at('2026-10-25T05:15:00Z'), x.deps);
  assert.equal(x.logs.length, before); assert.equal(x.sent.length, 4);
  assert.deepEqual(out.filter((l) => !l.startsWith('preview')), LIVE_KINDS.map((k) => `${k}: claim check unavailable`));
});

test('an overlapping run that fails before claiming keeps the other run\'s "Sent" audit row', async () => {
  // Run B passes the claim check, then run A claims, sends and logs "Sent" before B fails.
  const raced = (fail: (x: ReturnType<typeof fixture>) => void) => {
    const x = fixture(); x.deps.alerts = [DAILY_ALERTS[3]];
    const rows = new Map<string, { ok: boolean; note: string }>();
    x.deps.log = async (kind, day, ok, _r, note) => { rows.set(`${kind}:${day}`, { ok, note }); };
    const claimed = x.deps.claimed; let first = true;
    x.deps.claimed = async (kind, day) => {
      if (first) { first = false; x.claims.add(`${kind}:${day}`); rows.set(`${kind}:${day}`, { ok: true, note: 'Sent' }); return false; }
      return claimed(kind, day);
    };
    fail(x);
    return { x, rows };
  };
  const key = 'am:akbar-perf:2026-10-25';
  const build = raced((x) => { x.deps.render = async () => { throw new Error('synthetic read failure'); }; });
  assert.deepEqual(await deliverDailyAlerts(at(LIVE_DAY_0900), build.x.deps), ['am:akbar-perf: read or build failed']);
  assert.deepEqual(build.rows.get(key), { ok: true, note: 'Sent' }); assert.equal(build.x.sent.length, 0);

  const config = raced((x) => { x.deps.address = () => null; });
  await deliverDailyAlerts(at(LIVE_DAY_0900), config.x.deps);
  assert.deepEqual(config.rows.get(key), { ok: true, note: 'Sent' });

  const claimErr = raced((x) => { x.deps.claim = async () => { throw new Error('synthetic claim error'); }; });
  await deliverDailyAlerts(at(LIVE_DAY_0900), claimErr.x.deps);
  assert.deepEqual(claimErr.rows.get(key), { ok: true, note: 'Sent' });

  // With no other claim, the failure is still logged.
  const alone = fixture({ failKinds: ['am:akbar-perf'] }); alone.deps.alerts = [DAILY_ALERTS[3]];
  await deliverDailyAlerts(at(LIVE_DAY_0900), alone.deps);
  assert.deepEqual(alone.logs.map((l) => [l.ok, l.note]), [[false, 'Read or build failed; tried again on the next run']]);
});

test('wiring: cron route, schedule, old path no longer sends, Smile Club cap excludes these kinds, migration', () => {
  const route = readFileSync('app/api/cron/alerts/route.ts', 'utf8');
  assert.match(route, /export const runtime = 'nodejs'/); assert.match(route, /export const maxDuration = 300/);
  assert.match(route, /process\.env\.CRON_SECRET/); assert.match(route, /if \(!secret\) return false/);
  assert.match(route, /`Bearer \$\{secret\}`/); assert.match(route, /status: 401/);
  const crons = JSON.parse(readFileSync('vercel.json', 'utf8')).crons as { path: string; schedule: string }[];
  assert.deepEqual(crons.find((c) => c.path === '/api/cron/alerts'), { path: '/api/cron/alerts', schedule: '*/15 * * * *' });
  const run = readFileSync('lib/alerts/run.ts', 'utf8');
  assert.match(run, /\.delete\(\)\.eq\('key', PREVIEW_KEY\)\.select\('key'\)/);
  assert.match(run, /from\('performance_email_claims'\)\.insert\(\{ kind, day \}\)/);
  assert.match(run, /onConflict: 'kind,day'/);
  assert.match(run, /from: OPS_ALERT_FROM/);

  const sc = readFileSync('lib/smileclub/alerts.ts', 'utf8');
  assert.doesNotMatch(sc, /runPerformanceAlerts|lib\/performance\/alerts/);
  assert.match(sc, /const MORNING: Who\[\] = \['mohan', 'fahad'\]/);
  const capKinds = sc.match(/const DAILY_ALERT_KINDS: readonly string\[\] = \[([^\]]*)\]/)?.[1];
  assert.deepEqual(capKinds?.split(',').map((s) => s.trim().replace(/'/g, '')), [...DAILY_ALERT_KINDS]);
  assert.match(sc, /kind\.startsWith\('preview:'\)/);
  assert.match(sc, /if \(separateFromCap\(kind\)\) continue;/);

  const sql = readFileSync('supabase/migrations/0050_daily_alert_kinds.sql', 'utf8');
  assert.match(sql, /drop constraint if exists performance_email_claims_kind_check;/);
  assert.match(sql, /check \(kind in \('am:gbp-daily', 'am:akbar-perf', 'am:sc-daily', 'am:ortho-daily'\)\)/);
  assert.doesNotMatch(sql, /drop table|delete from|truncate/i);

  const page = readFileSync('app/(app)/page.tsx', 'utf8');
  assert.match(page, /<SmileClubPlan initial=\{sp\.sc === 'team' \|\| sp\.sc === 'scripts' \? sp\.sc : undefined\} \/>/);
  const plan = readFileSync('components/sections/smileclub/SmileClubOptimization.tsx', 'utf8');
  assert.match(plan, /useState<Sub>\(initial \?\? 'segments'\)/);
});

test('synthetic alerts list: the order and failures of any registry are honoured', async () => {
  const one: DailyAlert = { ...DAILY_ALERTS[3], read: async () => ({}), build: () => ({ subject: 's', html: 'h' }) };
  const x = fixture(); x.deps.alerts = [one];
  await deliverDailyAlerts(at(LIVE_DAY_0900), x.deps);
  assert.deepEqual(x.sent.map((m) => [m.to, m.cc]), [[addr('akbar', 'shadi'), addr('fahad')]]);
});
