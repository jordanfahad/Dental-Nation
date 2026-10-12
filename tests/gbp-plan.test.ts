import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { addDays, buildGbpPlan, GBP_HEADERS, parseDailyLog, parseLogRow, planProgress, rateChange, trackStatus, validDay } from '../lib/gbp/plan';
import { gbpFixture, logRow } from './fixtures/dn015';

test('GBP parser accepts exact branches, leap dates and preserves raw bad rows', () => {
  for (const branch of ['Al Wasl', 'Dr Tosun', 'Al Maher']) assert.equal(parseLogRow(logRow({ Branch: branch, Date: '2028-02-29' })).kind, 'valid');
  for (const date of ['2026-02-29', '2026-02-30', '12/10/2026', '2026-1-02', '2026-10-11T10:00:00Z', '']) assert.equal(validDay(date), false, date);
  for (const bad of [{ Branch: 'DN' }, { Status: 'finished' }, { 'Plan day': 31 }, { 'Plan day': '1.5' }, { Activity: '' }]) assert.equal(parseLogRow(logRow(bad)).kind, 'invalid');
  const raw = logRow({ Date: 'bad', Branch: 'Unknown' });
  const copy = JSON.stringify(raw);
  assert.equal(parseDailyLog([raw]).invalid.length, 1);
  assert.equal(JSON.stringify(raw), copy);
  assert.equal(parseLogRow(logRow({ Activity: 'EXAMPLE - Check hours' })).kind, 'example');
});

test('progress uses one start date, includes missing dates, counts statuses and caps at 30', () => {
  const entries = parseDailyLog([
    logRow({ Date: '2026-10-01' }), logRow({ Date: '2026-10-03', 'Plan day': 3, Status: 'Partial' }, 3),
    logRow({ Date: '2026-10-03', 'Plan day': 3, Status: 'Not done', Branch: 'Dr Tosun' }, 4),
    logRow({ Date: '2026-12-01' }, 5),
  ]).entries;
  const p = planProgress(entries, '2026-10-04', 'dental-nation');
  assert.equal(p.day, 4); assert.equal(p.done, 1); assert.equal(p.partial, 1); assert.equal(p.complete, .5);
  assert.deepEqual(p.missingDays, ['2026-10-02', '2026-10-04']); assert.equal(p.coverage, .5);
  const t = planProgress(entries, '2026-10-04', 'dr-tosun');
  assert.equal(t.start, '2026-10-01'); assert.equal(t.notDone, 1); assert.equal(t.coverage, 0);
  assert.equal(planProgress(entries, '2026-12-02').day, 30);
  assert.equal(planProgress(entries, '2026-09-30').day, 0);
});

test('status boundaries and unequal-window normalisation do not invent missing comparisons', () => {
  assert.equal(trackStatus(.8, -.1), 'On track'); assert.equal(trackStatus(.799, 0), 'Watch');
  assert.equal(trackStatus(.5, -.25), 'Watch'); assert.equal(trackStatus(.49, 0), 'Off track');
  assert.equal(trackStatus(1, -.251), 'Off track'); assert.equal(trackStatus(1, null), 'Watch');
  assert.equal(trackStatus(null, null), 'Watch'); assert.equal(rateChange(28, 7, 112, 28), 0);
  assert.equal(rateChange(0, 7, 112, 28), -1); assert.equal(rateChange(4, 7, 0, 28), null);
});

test('GBP reports separate branches, require full metric coverage and include zeroes', () => {
  const p = gbpFixture();
  assert.equal(p.branches[0].last7.calls, 28); assert.equal(p.branches[0].baseline?.calls, 112);
  assert.equal(p.branches[0].yesterday.reviews, 1); assert.equal(p.branches[0].yesterday.rating, 5);
  assert.equal(p.branches[0].status, 'On track'); assert.equal(p.branches[1].yesterday.calls, null);
  const gap = buildGbpPlan({ rows: [], reviews: [], connected: ['dental-nation'], asOf: '2026-10-11', syncedAt: null,
    metrics: [{ clinic: 'dental-nation', metric: 'calls', day: '2026-10-11', value: 0 }] });
  assert.equal(gap.branches[0].yesterday.calls, 0); assert.equal(gap.branches[0].last7.calls, null);
  assert.equal(gap.branches[0].yesterday.reviews, null); assert.equal(gap.hasNew, false);
});

test('CSV template has the required headers and three excluded example rows', () => {
  const csv = readFileSync('.agent-bus/work/DN-015/out/gbp-daily-log.csv', 'utf8').trim().split(/\r?\n/).map((r) => r.split(','));
  assert.deepEqual(csv[0], [...GBP_HEADERS]); assert.equal(csv.length, 4);
  for (const row of csv.slice(1)) { assert.equal(row.length, 8); assert.equal(parseLogRow({ row_index: 2, data: Object.fromEntries(GBP_HEADERS.map((h, i) => [h, row[i]])) }).kind, 'example'); }
  assert.equal(addDays('2026-10-01', -1), '2026-09-30');
});
