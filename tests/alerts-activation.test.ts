import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { deliverDailyAlerts, type DailyAlertDeps, type Mail } from '../lib/alerts/delivery';
import {
  CLINIC_ACTIVATION_LIVE_FROM, DAILY_ALERTS, LIVE_FROM, liveFromOf, previewNote, recipientsLine, sendsLiveOn, type DailyAlert,
} from '../lib/alerts/registry';
import { buildActivationDaily } from '../lib/alerts/activationDaily';
import {
  activationLink, executiveLink, marketingLink, periods, practoRevenueLink, socialLink,
} from '../lib/alerts/links';
import { ORTHO_GOOGLE_CAMPAIGN } from '../lib/alerts/orthoDaily';
import type { ClinicActivation } from '../lib/activation/read';
import { PLANTED_NAME, PLANTED_PHONE, TODAY, nullActivation, sampleActivation } from './fixtures/activation';

const P = periods(TODAY);
const KIND = 'am:clinic-activation';
const alert = DAILY_ALERTS.find((a) => a.kind === KIND)!;
const addr = (...who: string[]) => who.map((w) => `${w}@example.invalid`);
// 09:00 Dubai = 05:00 UTC (no daylight saving).
const AT_0900 = new Date('2026-10-29T05:00:00Z');

/** In-memory claims and log; render uses the REAL builders on synthetic data for this kind. */
function fixture(alerts: readonly DailyAlert[], opts: { preview?: boolean } = {}) {
  const claims = new Set<string>();
  const logs: { kind: string; ok: boolean; recipients: string[] }[] = [];
  const sent: Mail[] = [];
  const rendered: string[] = [];
  const read: string[] = [];
  const state = { previewRequest: opts.preview ?? false };
  const deps: DailyAlertDeps = {
    alerts,
    paused: async () => false,
    configured: true,
    address: (who) => `${who}@example.invalid`,
    render: async (a, today, o) => {
      rendered.push(a.kind);
      if (a.kind !== KIND) return { subject: `${a.label} · ${today}`, html: '<p>x</p>' };
      read.push(a.kind);
      return a.build(sampleActivation(), today, o);
    },
    consumePreview: async () => { const had = state.previewRequest; state.previewRequest = false; return had; },
    claimed: async (kind, day) => claims.has(`${kind}:${day}`),
    claim: async (kind, day) => { const k = `${kind}:${day}`; if (claims.has(k)) return false; claims.add(k); return true; },
    log: async (kind, _day, ok, recipients) => { logs.push({ kind, ok, recipients }); },
    send: async (mail) => { sent.push(mail); return { ok: true }; },
  };
  return { deps, claims, logs, sent, rendered, read, state };
}

test('registry: the fifth kind, its recipients, and the gate that keeps it off', () => {
  assert.ok(alert, 'am:clinic-activation missing from DAILY_ALERTS');
  assert.equal(DAILY_ALERTS[DAILY_ALERTS.length - 1].kind, KIND);
  assert.deepEqual([alert.to, alert.cc], [['akbar', 'shadi', 'luvi'], ['fahad']]);
  assert.equal(recipientsLine(alert), 'To Mr Akbar, Ms Shadi and Dr Luvi; copied to Fahad.');
  assert.equal(CLINIC_ACTIVATION_LIVE_FROM, null);
  assert.equal(alert.liveFrom, null);
  assert.equal(liveFromOf(alert), null);
  for (const day of [LIVE_FROM, TODAY, '2026-11-01', '2030-01-01']) assert.equal(sendsLiveOn(alert, day), false, day);
  // The four approved emails are untouched by the gate.
  for (const a of DAILY_ALERTS.filter((x) => x.kind !== KIND)) {
    assert.equal(a.liveFrom, undefined);
    assert.equal(sendsLiveOn(a, LIVE_FROM), true);
    assert.equal(sendsLiveOn(a, '2026-10-24'), false);
  }
  assert.equal(
    previewNote(alert, '2026-10-30'),
    'Preview for Fahad: not switched on yet. Once it is, this goes at 09:00 to Mr Akbar, Ms Shadi and Dr Luvi, copied to Fahad.',
  );
  // Switched on later: the preview names its own first day, never earlier.
  assert.equal(previewNote({ ...alert, liveFrom: '2026-11-01' }, '2026-10-30'), 'Preview for Fahad: on Sun 1 Nov at 09:00 this goes to Mr Akbar, Ms Shadi and Dr Luvi, copied to Fahad.');
});

test('the cron does NOT select the gated kind: no read, no claim, no log, no send, at any live hour', async () => {
  for (const at of [AT_0900, new Date('2026-10-29T06:45:00Z'), new Date('2026-12-01T05:15:00Z')]) {
    const x = fixture(DAILY_ALERTS);
    const out = await deliverDailyAlerts(at, x.deps);
    assert.equal(x.sent.length, 4, at.toISOString());
    assert.ok(!x.rendered.includes(KIND) && x.read.length === 0, 'gated kind must not be read');
    assert.ok(![...x.claims].some((c) => c.startsWith(KIND)), 'gated kind must not be claimed');
    assert.ok(!x.logs.some((l) => l.kind === KIND));
    assert.ok(!out.some((l) => l.startsWith(KIND)));
    assert.ok(!x.sent.some((m) => m.subject.startsWith('Clinic Activation')));
  }
  // On its own, the gated kind does nothing at all.
  const only = fixture([alert]);
  assert.deepEqual(await deliverDailyAlerts(AT_0900, only.deps), []);
  assert.equal(only.sent.length + only.claims.size + only.logs.length + only.rendered.length, 0);
});

test('the preview path renders and sends it, to Fahad only', async () => {
  const x = fixture(DAILY_ALERTS, { preview: true });
  await deliverDailyAlerts(new Date('2026-10-29T08:00:00Z'), x.deps);
  const mail = x.sent.find((m) => m.subject.startsWith('[Preview] Clinic Activation'));
  assert.ok(mail, 'preview of the Clinic Activation email missing');
  assert.deepEqual([mail.to, mail.cc], [addr('fahad'), []]);
  assert.equal(mail.subject, '[Preview] Clinic Activation · Thu 29 Oct · 12 leads, AED 11,579 billed yesterday');
  assert.ok(mail.html.includes('Preview for Fahad: not switched on yet.'));
  assert.deepEqual(x.logs.find((l) => l.kind === `preview:${KIND}`), { kind: `preview:${KIND}`, ok: true, recipients: addr('fahad') });
  assert.equal(x.claims.size, 0);
  // At 09:00 with a preview request, the preview goes to Fahad while the live run still skips the kind.
  const both = fixture(DAILY_ALERTS, { preview: true });
  await deliverDailyAlerts(AT_0900, both.deps);
  const ca = both.sent.filter((m) => m.subject.includes('Clinic Activation'));
  assert.equal(ca.length, 1);
  assert.deepEqual(ca[0].to, addr('fahad'));
  assert.ok(![...both.claims].some((c) => c.startsWith(KIND)));
});

test('switching it on is the one setting: with a live day it is claimed and sent to its recipients once', async () => {
  const on: DailyAlert = { ...alert, liveFrom: '2026-10-29' };
  const x = fixture([on]);
  await deliverDailyAlerts(AT_0900, x.deps);
  await deliverDailyAlerts(new Date('2026-10-29T05:15:00Z'), x.deps);
  assert.equal(x.sent.length, 1);
  assert.deepEqual([x.sent[0].to, x.sent[0].cc], [addr('akbar', 'shadi', 'luvi'), addr('fahad')]);
  assert.ok(x.claims.has(`${KIND}:2026-10-29`));
  // Before its own day it still waits.
  const early = fixture([{ ...alert, liveFrom: '2026-10-30' }]);
  await deliverDailyAlerts(AT_0900, early.deps);
  assert.equal(early.sent.length, 0);
  // The switch is the CLINIC_ACTIVATION_LIVE_FROM constant the registry entry reads.
  const registry = readFileSync('lib/alerts/registry.ts', 'utf8');
  assert.match(registry, /export const CLINIC_ACTIVATION_LIVE_FROM: string \| null = null;/);
  assert.match(registry, /kind: 'am:clinic-activation'.*liveFrom: CLINIC_ACTIVATION_LIVE_FROM/);
});

/* ── the email ── */

const full = buildActivationDaily(sampleActivation(), TODAY, { recipients: recipientsLine(alert) });
const empty = buildActivationDaily(nullActivation(), TODAY);

const hrefs = (html: string) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
/** Figure links: the dotted-underline anchors num() renders. */
const figureLinks = (html: string) => [...html.matchAll(/<a href="([^"]+)" style="color:#2C3233[^"]*">([^<]*)<\/a>/g)]
  .map((m) => ({ href: m[1].replace(/&amp;/g, '&'), value: m[2] }));

test('subject and the five sections in order', () => {
  assert.equal(full.subject, 'Clinic Activation · Thu 29 Oct · 12 leads, AED 11,579 billed yesterday');
  const order = ['1. Leads', '2. Smile Club', '3. Google Business Profile (front office)', '4. Revenue', '5. DN Ortho'].map((s) => full.html.indexOf(s));
  assert.ok(order.every((i) => i > 0));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.ok(full.html.includes('Wed 28 Oct (yesterday) and 1 to 28 Oct (month to date)'));
  assert.ok(full.html.includes('As entered by the front office in the lead tracker GMB tab, snapshotted daily.'));
  assert.ok(full.html.includes('Daily copies start 29 Oct 2026'));
  assert.ok(full.html.includes('AMC comes from the clinic\u2019s daily sheet, not Practo'));
  assert.ok(full.html.includes('2 days reported in 1 to 28 Oct; 26 days missing.'));
  assert.ok(full.html.includes('Practo does not record the treating doctor on almost all billed work'));
  assert.ok(full.html.includes('To Mr Akbar, Ms Shadi and Dr Luvi; copied to Fahad.'));
  for (const v of ['>12<', '>15<', '>618<', '>349<', '>AED 7,240<', '>AED 148,600<', '>11,579<', '>AED 3,914<', '>AED 310<', '>183<', '>AED 38,600<']) {
    assert.ok(full.html.includes(v), v);
  }
});

test('every figure links to the Clinic Activation page pinned to the same dates, or to the drawer’s detail view', () => {
  const allowed = new Set([
    ...(['leads', 'smile-club', 'gbp', 'revenue', 'ortho'] as const).map((s) => activationLink(P.mtd, s)),
    executiveLink(P.yesterday, 'dental-nation'), executiveLink(P.mtd, 'dental-nation'),
    executiveLink(P.yesterday, 'dr-tosun'), executiveLink(P.mtd, 'dr-tosun'),
    executiveLink(P.yesterday), executiveLink(P.mtd),
    marketingLink('google', P.yesterday, { gcamp: ORTHO_GOOGLE_CAMPAIGN }), marketingLink('google', P.mtd, { gcamp: ORTHO_GOOGLE_CAMPAIGN }),
    practoRevenueLink('dental-nation', P.mtd), practoRevenueLink('dr-tosun', P.mtd),
  ]);
  const figs = figureLinks(full.html);
  assert.ok(figs.length > 60, `expected many linked figures, got ${figs.length}`);
  for (const f of figs) assert.ok(allowed.has(f.href), `${f.value} links ${f.href}`);
  // The page links carry the exact window; Practo links as the morning performance email does.
  assert.equal(activationLink(P.mtd, 'leads'), 'https://reports.dentalnation.com/next/activation?from=2026-10-01&to=2026-10-28#leads');
  assert.ok(figs.some((f) => f.value === 'AED 7,240' && f.href === executiveLink(P.yesterday, 'dental-nation')));
  assert.ok(figs.some((f) => f.value === '12' && f.href === activationLink(P.mtd, 'leads')));
  // Every anchor in the email is a known proof, the page, or Google's own review count.
  for (const h of hrefs(full.html)) {
    assert.ok(allowed.has(h) || h === activationLink(P.mtd) || h === socialLink('all'), h);
  }
  // The landing button.
  assert.ok(full.html.includes(`href="${activationLink(P.mtd).replace(/&/g, '&amp;')}"`));
  assert.ok(full.html.includes('Open the Clinic Activation report'));
});

test('null renders "not yet", never 0; no undefined, NaN or long dashes', () => {
  assert.equal(empty.subject, 'Clinic Activation · Thu 29 Oct · leads not yet, billed yesterday not yet');
  assert.ok((empty.html.match(/not yet/g) ?? []).length >= 40);
  assert.doesNotMatch(empty.html, />0</);
  assert.doesNotMatch(empty.html, />AED 0</);
  assert.ok(empty.html.includes('AMC daily sheet: could not be read.'));
  for (const m of [full, empty]) {
    assert.doesNotMatch(m.subject + m.html, /undefined|NaN|null|[–—]/);
  }
  // A section that reads but has no copy is not 0 either.
  const noGbp: ClinicActivation = { ...sampleActivation(), gmb: { ...sampleActivation().gmb!, latest: { 'dental-nation': null, 'dr-tosun': null, 'al-maher': null }, window: {
    'dental-nation': { days: 0, reviewsToday: null, photos: null, videos: null },
    'dr-tosun': { days: 0, reviewsToday: null, photos: null, videos: null },
    'al-maher': { days: 0, reviewsToday: null, photos: null, videos: null },
  } } };
  const g = buildActivationDaily(noGbp, TODAY).html;
  assert.equal((g.match(/Daily copies start 29 Oct 2026/g) ?? []).length, 6);
});

test('no patient name or phone number is possible in the email', () => {
  for (const m of [full, empty]) {
    assert.ok(!m.html.includes(PLANTED_NAME) && !m.html.includes(PLANTED_PHONE));
  }
  assert.ok(full.html.includes('Other platform'));
  assert.ok(!full.html.includes('Dr. Alpha'), 'AMC doctor lines are not in the email');
});

test('migration 0052 extends the claim CHECK with the new kind and nothing else', () => {
  const sql = readFileSync('supabase/migrations/0052_clinic_activation_alert_kind.sql', 'utf8');
  assert.match(sql, /alter table lane_e\.performance_email_claims drop constraint if exists performance_email_claims_kind_check;/);
  assert.match(sql, /check \(kind in \('am:gbp-daily', 'am:akbar-perf', 'am:sc-daily', 'am:ortho-daily', 'am:clinic-activation'\)\)/);
  assert.doesNotMatch(sql, /drop table|delete from|truncate|update /i);
});
