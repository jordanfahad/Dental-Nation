import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { buildAkbarPerformance, buildGbpDaily, PERFORMANCE_RECIPIENTS } from '../lib/performance/emails';
import { benchmarks, buildPeriod, groupOf, parseGrossRows, patientSplits, performanceWhy } from '../lib/performance/core';
import { buildGbpPlan } from '../lib/gbp/plan';
import { ALERT_CAP } from '../lib/smileclub/alertRules';
import { briefFixture, gbpFixture, growth } from './fixtures/dn015';

test('Akbar email renders Unclassified gross, source-labelled patient counts and reconciliation notes', () => {
  const report = briefFixture();
  const mail = buildAkbarPerformance(report);
  const wasl = report.yesterday.rows.filter((r) => r.clinic === 'Al Wasl');
  assert.equal(wasl.find((r) => r.group === 'Unclassified')?.gross, 65);
  assert.equal(wasl.find((r) => r.group === 'Organic digital')?.gross, 0);
  assert.deepEqual(wasl.find((r) => r.group === 'Total'), {
    clinic: 'Al Wasl', group: 'Total', gross: 65, net: 41, bookings: 12, shows: 9, billed: 8, revenue: 23400,
  });
  for (const field of ['gross', 'net', 'bookings', 'shows', 'billed', 'revenue'] as const) {
    assert.equal(wasl.filter((r) => r.group !== 'Total').reduce((n, r) => n + (r[field] ?? 0), 0), wasl.at(-1)![field]);
  }
  assert.match(mail.html, /<tr><td[^>]*>Al Wasl<\/td><td[^>]*>Unclassified<\/td><td[^>]*>65<\/td>/);
  assert.match(mail.html, /Billed patients \(Growth\)/);
  assert.match(mail.html, /Patients by billing file/);
  assert.match(mail.html, /Group-level gross and net are not directly comparable because classification sources differ\./);
  assert.match(mail.html, /Billing-file count differs from Growth billed count by 8; the funnel shows the Growth count\./);
  assert.match(mail.html, /<tr><td[^>]*>Al Maher<\/td>(<td[^>]*>Unavailable<\/td>){4}<td[^>]*>Al Maher: no patient feed<\/td><\/tr>/);
  assert.equal(/\u2014/.test(mail.subject + mail.html), false);
});

test('Akbar reconciliation compares each clinic and window including unattributed Growth billing; matching counts have no note', () => {
  const bill = (mr: string, day = '2026-10-11', center = 'Dental Nation') => ({ bill_date: day, amount: 100, data: { mr_no: mr, center_name: center } });
  const bills = [bill('DN-SYN-A'), bill('DN-SYN-A'), bill('DN-SYN-B'), bill('DN-SYN-OLD', '2026-10-10'), bill('DNJ-SYN-T', '2026-10-11', 'Dr Tosun')];
  const wasl = growth(), tosun = growth();
  wasl.channels[0].treated = 1; wasl.unattributedPatients = 1;
  tosun.channels[0].treated = 1;
  const makePeriod = (from = '2026-10-11') => buildPeriod(from, '2026-10-11', { all: growth(), wasl, tosun }, parseGrossRows([]), bills);
  const brief = briefFixture();
  brief.yesterday = makePeriod(); brief.mtd = makePeriod();
  assert.deepEqual(brief.yesterday.patients.map((p) => p.total), [2, 1, null]);
  assert.equal(brief.yesterday.rows.find((r) => r.clinic === 'Al Wasl' && r.group === 'Total')?.billed, 2);
  assert.doesNotMatch(buildAkbarPerformance(brief).html, /Billing-file count differs/);

  brief.mtd = makePeriod('2026-10-01');
  assert.match(brief.mtd.patients[0].note, /differs from Growth billed count by 1;/);
  assert.doesNotMatch(brief.yesterday.patients[0].note, /Billing-file count differs/);
  assert.equal((buildAkbarPerformance(brief).html.match(/Billing-file count differs/g) ?? []).length, 1);

  wasl.unattributedPatients = 4; tosun.channels[0].treated = 0;
  brief.yesterday = makePeriod();
  assert.match(brief.yesterday.patients[0].note, /differs from Growth billed count by 3;/);
  assert.match(brief.yesterday.patients[1].note, /differs from Growth billed count by 1;/);
  assert.doesNotMatch(brief.yesterday.patients[2].note, /Billing-file count differs/);
  const mail = buildAkbarPerformance(brief);
  assert.match(mail.html, /<tr><td[^>]*>Al Wasl<\/td><td[^>]*>2<\/td>.*?differs from Growth billed count by 3;/);
  assert.match(mail.html, /<tr><td[^>]*>Dr Tosun<\/td><td[^>]*>1<\/td>.*?differs from Growth billed count by 1;/);
  assert.equal(/\u2014/.test(mail.subject + mail.html), false);
});

test('Akbar performance email has synthetic figures, labelled gross/net and honest caveats in section order', () => {
  const report = briefFixture(); const mail = buildAkbarPerformance(report);
  assert.match(mail.subject, /AED 23.4k billed/); assert.match(mail.subject, /41 net enquiries/); assert.match(mail.subject, /2 off-track flags/);
  for (const text of ['65', 'Enquiries gross (raw rows)', 'Enquiries net (people)', 'renumbered at migration - not measurable yet', 'Al Maher: no patient feed', 'Plan of action: to be updated', 'no public signal stored', 'Dr Joy Dental Clinic', 'Dr Michael', '23,400']) assert.ok(mail.html.includes(text), text);
  const sections = ['1. Demand', '2. Why', '3. Plan', '4. Benchmark', '5. Smile', '6. GBP'].map((s) => mail.html.indexOf(s));
  assert.deepEqual([...sections].sort((a, b) => a - b), sections);
  assert.equal(/[\u2014]/.test(mail.subject + mail.html), false);
  assert.ok(!mail.html.includes('Team task calendar')); assert.ok(!mail.html.includes('logged activities'));
  report.action = 'Keep priorities A & B\nReview <next> week.';
  assert.ok(buildAkbarPerformance(report).html.includes('Keep priorities A &amp; B\nReview &lt;next&gt; week.'));
  assert.deepEqual(PERFORMANCE_RECIPIENTS['am:akbar-perf'], { to: 'akbar', cc: 'fahad', max: 1 });
});

test('GBP email caps activities at five per branch, includes metrics and skips genuinely empty report', () => {
  const p = gbpFixture();
  p.branches[0].activities = Array.from({ length: 7 }, (_, i) => ({ ...p.entries[0], activity: `Activity ${i + 1}` }));
  const m = buildGbpDaily(p, '2026-10-12')!;
  assert.match(m.html, /7 logged activities/); assert.match(m.html, /Activity 5/); assert.ok(!m.html.includes('Activity 6'));
  assert.match(m.html, /28/); assert.match(m.html, /Open GBP plan/); assert.equal(/\u2014/.test(m.subject + m.html), false);
  const empty = buildGbpPlan({ rows: [], metrics: [], reviews: [], connected: [], asOf: '2026-10-11', syncedAt: null });
  assert.equal(buildGbpDaily(empty, '2026-10-12'), null);
  empty.branches[0].status = 'Off track'; assert.ok(buildGbpDaily(empty, '2026-10-12'));
  assert.deepEqual(PERFORMANCE_RECIPIENTS['am:gbp-daily'], { to: 'shadi', cc: 'fahad', max: 1 });
});

test('alert caps preserve Luvi shoot-only and give Akbar and Shadi exactly one performance email', () => {
  assert.equal(ALERT_CAP.find((r) => r.who === 'Mr Akbar')?.max, 1);
  assert.equal(ALERT_CAP.find((r) => r.who === 'Ms Shadi')?.max, 1);
  assert.deepEqual(ALERT_CAP.find((r) => r.who === 'Dr Luvi'), { who: 'Dr Luvi', morning: '—', evening: 'Shoot schedule (copied), evenings before a shoot', max: 1 });
  assert.equal(ALERT_CAP.find((r) => r.who === 'Fahad')?.max, 4);
});

test('gross rows retain duplicates and ambiguous branches are not guessed', () => {
  const row = { data: { Date: '11/10/2026', '_source_tab': 'TDC Campaign Leads', 'Inquiry Platform': 'Google' } };
  const raw = parseGrossRows([row, row, { data: { Date: '2026-10-11', 'Clinic / Branch': 'Unknown' } }, { data: { Date: '31/02/2026' } }]);
  assert.equal(raw.rows.length, 3); assert.equal(raw.undated, 1); assert.equal(raw.rows[0].clinic, 'dr-tosun'); assert.equal(raw.rows[2].clinic, null);
  assert.equal(groupOf('affiliate'), 'Paid digital'); assert.equal(groupOf('partnership'), 'Referral'); assert.equal(groupOf('direct-walkin'), 'Direct & walk-in');
});

test('new and existing use first non-cancelled bill, not renumbering or first visit', () => {
  const bill = (mr: string, day: string, center = 'Dental Nation', status = '') => ({ bill_date: day, amount: 100, data: { mr_no: mr, center_name: center, bill_status: status } });
  const patients = patientSplits([bill('DN-SYN-A', '2026-09-01'), bill('DN-SYN-A', '2026-10-11'), bill('DN-SYN-B', '2026-10-11'), bill('DNJ-SYN-C', '2026-10-11'), bill('DN-SYN-D', '2026-10-11', 'Dental Nation', 'CANCELLED')], '2026-10-11', '2026-10-11');
  assert.equal(patients[0].new, 1); assert.equal(patients[0].existing, 1); assert.equal(patients[0].unclassified, 1);
  assert.equal(patients[1].new, null); assert.equal(patients[2].existing, null);
});

test('benchmarks require observed same-profile 30-day endpoints and deterministic why has numbers', () => {
  const signal = (day: string, value: number) => ({ clinic: 'dr-joy', channel: 'instagram', metric: 'followers', day, value });
  const b = benchmarks([signal('2026-10-11', 1200), signal('2026-09-11', 1000), signal('2026-10-12', 9999)], '2026-10-11');
  assert.equal(b[1].followers.value, 1200); assert.equal(b[1].followers.delta30, 200); assert.equal(b[2].followers.value, null);
  const why = performanceWhy(growth(41), growth(30), gbpFixture(), '2026-04-27');
  assert.equal(why.length, 6); why.forEach((s) => assert.match(s, /\d/)); assert.match(why.join(' '), /41.*30/);
});
