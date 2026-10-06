import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { classifyTheme, aggregateDemandToDesk, demandRange, emptyDemandInput, isoDate, largestLeak, lastFullMonth, recommendProduct, stageSteps, trackerFact, type Stage } from '../lib/analytics/demandToDesk';
import { metaPeople } from '../lib/meta/people';
import { adRow, fixtureInput, fixtureRange, trackerRow } from './fixtures/demand-to-desk';

const cases: Record<string, string[]> = {
  gaps: ['Close a tooth gap', 'diastema treatment', 'فراغات الأسنان'],
  gummy: ['Gummy smile treatment', 'gum contouring', 'ابتسامة لثوية'],
  emergency: ['Emergency dentist', 'severe tooth pain', 'طوارئ الاسنان'],
  implants: ['Dental implants', 'missing teeth', 'زراعة الأسنان'],
  ortho: ['crooked teeth', 'clear aligners dubai', 'تقويم الأسنان'],
  veneers: ['Porcelain veneers', 'Hollywood smile', 'ابتسامة هوليود'],
  whitening: ['coffee stains', 'teeth whitening', 'تبييض الأسنان'],
  hygiene: ['bad breath treatment', 'scaling and polishing', 'تنظيف الأسنان'],
  other: ['', 'generic dental question', 'استفسار عام'],
};
for (const [theme, examples] of Object.entries(cases)) test(`theme classifier: ${theme}, three examples`, () => {
  for (const example of examples) assert.equal(classifyTheme(example), theme, example);
});
test('specific conditions win, Arabic diacritics normalize, and words do not match unrelated fragments', () => {
  assert.equal(classifyTheme('braces for gaps'), 'gaps');
  assert.equal(classifyTheme('تَقْوِيم'), 'ortho');
  assert.equal(classifyTheme('campaign planning'), 'other');
});
test('last full month uses the Dubai date boundary and invalid ranges fall back', () => {
  assert.deepEqual(lastFullMonth(new Date('2026-09-30T20:00:00Z')), fixtureRange);
  assert.deepEqual(lastFullMonth(new Date('2024-03-01T00:00:00Z')), { from: '2024-02-01', to: '2024-02-29' });
  assert.deepEqual(demandRange({ from: '2026-02-30', to: '2026-03-01' }, new Date('2026-10-05')), fixtureRange);
  assert.equal(isoDate('31.09.2026'), null);
  assert.equal(isoDate('19/09/2026'), '2026-09-19');
});
const stage = (label: string, count: number | null, population = 'tracker'): Stage => ({ key: label, label, count, population });
test('leak is the largest relative consecutive drop, not the largest count loss', () => {
  const leak = largestLeak([stage('Logged', 100), stage('Reached', 70), stage('Booked', 7)]);
  assert.equal(leak?.from, 'Reached'); assert.equal(leak?.to, 'Booked'); assert.equal(leak?.drop, 0.9);
});
test('leaks exclude missing, zero-denominator, rising, and unlinked stage comparisons', () => {
  assert.equal(largestLeak([stage('A', 0), stage('B', 0)]), null);
  assert.equal(largestLeak([stage('A', 2), stage('B', 3)]), null);
  assert.equal(largestLeak([stage('A', 2), stage('B', NaN)]), null);
  assert.equal(largestLeak([stage('A', 50), stage('B', null), stage('C', 1)]), null);
  const chain = [stage('Meta', 100, 'meta'), stage('Desk', 1)];
  assert.equal(largestLeak(chain), null);
  assert.deepEqual(stageSteps(chain), [{ from: 'Meta', to: 'Desk', rate: 0.01, comparable: false }]);
});
test('latest follow-up wins over historical positive notes and first/second follow-ups', () => {
  const fact = trackerFact(trackerRow({ '1st Follow up': 'interested', '2nd Follow-up': 'booked', '3rd Follow-up': 'expensive / not interested', 'Conversion - Dr Luvi': 'new patient converted' }))!;
  assert.equal(fact.interested, false); assert.equal(fact.booked, false); assert.equal(fact.converted, false);
  assert.equal(fact.reached, true); assert.deepEqual(fact.barriers, ['price', 'notInterested']);
});
test('status rules handle no answer, typos, progression, negation, and placeholders', () => {
  const fact = (status: string) => trackerFact(trackerRow({ '1st Follow up': status }))!;
  assert.equal(fact('called NA / sent WhatsApp').noAnswer, true);
  assert.equal(fact('called NA / sent WhatsApp').reached, false);
  assert.equal(fact('intersted').interested, true);
  assert.equal(fact('rescheduled').booked, true);
  assert.equal(fact('arrived').converted, true);
  assert.equal(fact('not yet converted').converted, false);
  assert.equal(fact('no appointment').booked, false);
  assert.equal(fact('not arrived').converted, false);
  assert.equal(fact('interested, not yet booked').interested, true);
  assert.equal(fact('interested, not yet booked').booked, false);
  assert.equal(fact('booked, not yet converted').booked, true);
  assert.equal(fact('booked, not yet converted').converted, false);
  assert.equal(fact('not reached').reached, false);
  assert.equal(fact('asking about appointment').booked, false);
  assert.equal(trackerFact(trackerRow({ '1st Follow up': '—', 'New Update': 'booked' }))?.booked, true);
});
test('tracker scope excludes other tabs, invalid dates, existing patients and non-patient enquiries', () => {
  assert.equal(trackerFact(trackerRow({ _source_tab: 'Another branch' })), null);
  assert.equal(trackerFact(trackerRow({ Date: 'bad' })), null);
  assert.equal(trackerFact(trackerRow({ 'Notes / Remarks': 'existing patient' })), null);
  assert.equal(trackerFact(trackerRow({ 'Notes / Remarks': 'job applicant' })), null);
});
test('Meta people count overlapping event families once per row', () => {
  assert.deepEqual(metaPeople((adRow().data as { actions: { action_type: string; value: string }[] }).actions), { gross: 10, net: 4, fresh: 0 });
  const input = { ...emptyDemandInput(), ads: [adRow(), adRow()], tracker: [trackerRow()] };
  const row = aggregateDemandToDesk(input, fixtureRange).themes.find((r) => r.key === 'ortho')!;
  assert.equal(row.meta.chats, 10); assert.equal(row.meta.net, 4); assert.equal(row.meta.spend, 100);
  assert.equal(row.meta.costChat, 10); assert.equal(row.meta.costNet, 25);
  assert.equal(row.meta.frequency, 2); assert.equal(row.meta.cpm, 100); assert.equal(row.meta.chatRate, 0.02);
});
test('missing Meta actions/reach remain unknown, and missing tables differ from empty tables', () => {
  const input = { ...emptyDemandInput(), ads: [adRow({ data: {} })], tracker: [] };
  const row = aggregateDemandToDesk(input, fixtureRange).themes.find((r) => r.key === 'ortho')!;
  assert.equal(row.meta.chats, null); assert.equal(row.meta.reach, null); assert.equal(row.meta.frequency, null);
  assert.equal(row.desk.logged, 0); assert.equal(row.clinic.booked, null);
});
test('canonical rows reconcile without being added, and clinic outcomes count distinct DN files', () => {
  const input = { ...emptyDemandInput(), tracker: [trackerRow()], canonical: [{ id: 'fixture', inquiry_date: '2026-09-16', channel_source: 'Meta' }], appointments: [
    { appt_key: 'one', mr_no: 'DN-FIXTURE', appt_date: '2026-09-17', status: 'Completed', data: { complaint: 'braces' } },
    { appt_key: 'two', mr_no: 'DN-FIXTURE', appt_date: '2026-09-18', status: 'Arrived', data: { complaint: 'braces' } },
    { appt_key: 'old', mr_no: 'OTHER-FILE', appt_date: '2026-09-18', status: 'Arrived', data: { complaint: 'braces' } },
  ] };
  const report = aggregateDemandToDesk(input, fixtureRange);
  const row = report.themes.find((r) => r.key === 'ortho')!;
  assert.equal(report.canonicalCount, 1); assert.equal(row.desk.logged, 1);
  assert.equal(row.clinic.booked, 1); assert.equal(row.clinic.attended, 1);
});
test('GBP thresholds and ranked samples stay separate from modelled market demand', () => {
  const input = fixtureInput();
  input.gmb = [{ month: '2026-09', keyword: 'braces', impressions: 15, is_threshold: true }];
  input.ranked = { market: 'UAE', fetchedAt: '2026-09-29', rows: [{ keyword: 'braces', volume: 30 }] };
  const row = aggregateDemandToDesk(input, fixtureRange).themes.find((r) => r.key === 'ortho')!;
  assert.equal(row.gbp, 15); assert.equal(row.gbpThreshold, true); assert.equal(row.rankedSearches, 30);
  assert.equal(row.product.searches, 400);
});
test('cohorts start at launch, use acquisition weeks, and preserve unknown call linkage', () => {
  const report = aggregateDemandToDesk({ ...emptyDemandInput(), tracker: [trackerRow()], calls: [] }, fixtureRange);
  assert.equal(report.cohorts[0].week, '2026-09-16'); assert.equal(report.cohorts[0].partial, true);
  assert.equal(report.cohorts.at(-1)?.end, '2026-09-30');
  assert.equal(report.discipline[0].first, 1); assert.equal(report.discipline[0].callLogged, null);
});
test('only exact explicit tracker call references link; UTC calls use Dubai date', () => {
  const report = aggregateDemandToDesk({ ...emptyDemandInput(), tracker: [trackerRow({ 'Lead ID': 'fixture-ref' })], calls: [
    { lead_ref: 'fixture-ref', created_at: '2026-09-15T21:00:00Z' },
    { lead_ref: 'unrelated-widget-ref', created_at: '2026-09-17T00:00:00Z' },
  ] }, fixtureRange);
  assert.equal(report.discipline[0].callLogged, 1); assert.equal(report.discipline[0].callLinkable, 1);
});
test('weekly metrics clip a custom date range and mark it partial', () => {
  const report = aggregateDemandToDesk({ ...emptyDemandInput(), ads: [adRow({ key: 'earlier', date: '2026-09-21' }), adRow({ key: 'later', date: '2026-09-23', spend: 75 })] }, { from: '2026-09-23', to: '2026-09-27' });
  const row = report.weekly.find((r) => r.theme === 'ortho')!;
  assert.equal(row.week, '2026-09-23'); assert.equal(row.spend, 75); assert.equal(row.partial, true);
});
test('launch history preserves account and ad-set identity and does not claim a verified pause', () => {
  const input = { ...emptyDemandInput(), ads: [adRow(), adRow({ key: 'other', account_id: 'other-account', date: '2026-09-23' })] };
  const report = aggregateDemandToDesk(input, fixtureRange);
  assert.equal(report.launches.length, 2); assert.match(report.launches[0].recency, /inferred/);
  assert.ok(report.gaps.some((g) => g.includes('cannot prove')));
});
test('recommendation uses explicit thresholds and cannot invent a missing break-even', () => {
  const evidence = { searches: 800, competition: 30, costInterested: 20, breakEven: 100, value: 5000, interested: 20 };
  assert.equal(recommendProduct(evidence).recommendation, 'Focus');
  assert.equal(recommendProduct({ ...evidence, breakEven: null }).recommendation, 'Test');
  assert.equal(recommendProduct({ ...evidence, searches: null }).recommendation, 'Test');
  assert.equal(recommendProduct({ ...evidence, searches: 20 }).recommendation, 'Hold');
  assert.equal(recommendProduct({ ...evidence, competition: 90, costInterested: 200 }).recommendation, 'Hold');
});
test('aggregation exposes no raw patient fields, does not mutate input, and emits three findings', () => {
  const input = fixtureInput(), original = JSON.stringify(input);
  const report = aggregateDemandToDesk(input, fixtureRange);
  assert.equal(JSON.stringify(input), original); assert.equal(report.findings.length, 3);
  assert.doesNotMatch(JSON.stringify(report), /PRIVATE_NAME|PRIVATE_PHONE|PRIVATE_CLINIC|DN-FIXTURE/);
  assert.ok(report.themes.every((r) => r.product.breakEven === null));
});
