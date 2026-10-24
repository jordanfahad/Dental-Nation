import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readReception, readPerformanceBrief } from '../lib/performance/reader';
import { buildReceptionSection, GROUPS } from '../lib/performance/core';
import { buildAkbarPerformance } from '../lib/performance/emails';
import { DAILY_ALERTS } from '../lib/alerts/registry';
import { bookedFrom } from '../lib/bookings/status';
import { hasChannelEvidence } from '../lib/lead-tracker/reporting';
import { fixtureDb } from './fixtures/dn015-db';
import { briefFixture, gbpFixture } from './fixtures/dn015';
import { receptionLeads } from './fixtures/dn017';
import { syntheticLead } from './fixtures/dn017';

test('reception reader counts tracker rows in Dubai yesterday and completed MTD, including unknown sources', async () => {
  const data = await readReception('2026-10-12', fixtureDb({ leads: receptionLeads() }));
  assert.equal(data.yesterday.logged, 3); assert.equal(data.mtd.logged, 4);
  assert.deepEqual(data.yesterday.byGroup, { 'Paid digital': 1, 'Organic digital': 0, 'Direct & walk-in': 0, Referral: 0, 'Existing patients': 0, Unclassified: 2 });
  assert.equal(data.mtd.byGroup['Direct & walk-in'], 1);
  assert.equal(data.yesterday.booked, 2); assert.equal(data.mtd.booked, 3);
  assert.equal(data.yesterday.noSource, 1); assert.equal(data.mtd.noSource, 1);
  assert.equal(data.futureDated, 2); assert.equal(data.lastSyncedAt, '2026-10-12T05:30:00Z');
  const rows = buildReceptionSection(data);
  assert.equal(rows.length, 2); assert.equal(rows[0][6], '12 Oct 2026, 09:30 Dubai');
  assert.equal(rows[1][0], 'MTD (2026-10-01 to 2026-10-11)');
  for (const group of GROUPS) assert.ok(String(rows[0][2]).includes(group));
  const brief = await readPerformanceBrief('2026-10-12', fixtureDb({ leads: receptionLeads() }), gbpFixture());
  assert.deepEqual(brief.reception, data);
});

test('first of month reports the completed month; empty reads are zero and failed reads throw', async () => {
  const data = await readReception('2026-10-01', fixtureDb({ leads: receptionLeads() }));
  assert.equal(data.mtd.from, '2026-09-01'); assert.equal(data.mtd.to, '2026-09-30'); assert.equal(data.mtd.logged, 1);
  const empty = await readReception('2026-10-12', fixtureDb({}));
  assert.equal(empty.yesterday.logged, 0); assert.equal(empty.futureDated, 0);
  assert.equal(buildReceptionSection(empty)[0][6], 'Unavailable');
  await assert.rejects(() => readReception('2026-10-12', fixtureDb({}, 'leads')), /Source read failed/);
});

test('reception uses exactly the existing Growth Platforms booking status values', () => {
  for (const status of ['booked', 'CONFIRMED', ' attended ', 'completed']) assert.equal(bookedFrom(status), true);
  for (const status of [null, '', 'cancelled', 'rescheduled', 'no-show', 'yes', 'converted', 'not booked']) assert.equal(bookedFrom(status), false);
});

test('no-source means absent channel evidence, not simply an unclassified group', () => {
  assert.equal(hasChannelEvidence(syntheticLead('synthetic-empty')), false);
  assert.equal(hasChannelEvidence(syntheticLead('synthetic-placeholder', { channel_source: 'N/A' })), false);
  assert.equal(hasChannelEvidence(syntheticLead('synthetic-google', { channel_source: 'Google' })), true);
  assert.equal(hasChannelEvidence(syntheticLead('synthetic-ref', { whatsapp_ref: 'N/A' })), true); // Any nonempty reference is explicit per DN-017.
});

test('Akbar section 7 is last, counts only, with data note and unchanged subject; live routing is the alerts registry', async () => {
  const report = briefFixture(); const before = buildAkbarPerformance(report);
  report.reception = await readReception('2026-10-12', fixtureDb({ leads: receptionLeads() }));
  const mail = buildAkbarPerformance(report);
  assert.equal(mail.subject, before.subject);
  const heading = '7. Reception desk (In-House Lead Tracker)';
  assert.ok(mail.html.indexOf(heading) > mail.html.indexOf('6. GBP'));
  assert.ok(!mail.html.slice(mail.html.indexOf(heading) + heading.length).includes('<h3'));
  assert.match(mail.html, /Data note: The tracker is entered by hand by the desk, so counts can lag the day/);
  assert.match(mail.html, /12 Oct 2026, 09:30 Dubai/);
  assert.doesNotMatch(mail.html + mail.subject, /\u2014/);
  for (const row of receptionLeads()) assert.ok(!mail.html.includes(row.id));
  // The legacy review copy is no longer sent; owner approval of 24 Oct 2026 routes the daily performance email to Mr Akbar.
  const live = DAILY_ALERTS.find((a) => a.kind === 'am:akbar-perf')!;
  assert.deepEqual([live.to, live.cc], [['akbar', 'shadi'], ['fahad']]);
  assert.match(mail.subject, /^\[Template review\] Daily performance - Mon 12 Oct/);
});
