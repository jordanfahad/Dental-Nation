import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { demandLearnings, themeLearning } from '../lib/analytics/demandLearnings';
import { aggregateDemandToDesk } from '../lib/analytics/demandToDesk';
import { fixtureInput, fixtureRange } from './fixtures/demand-to-desk';

test('learnings choose desk action from reached counts and preserve traceable ownership and dates', () => {
  const report = aggregateDemandToDesk(fixtureInput(), fixtureRange), row = report.themes[0];
  const learning = themeLearning({ ...row, desk: { ...row.desk, logged: 20, reached: 3, interested: 1, booked: 0 } }, fixtureRange.to);
  assert.equal(learning.action, 'Fix the desk step'); assert.equal(learning.owner, 'Front desk');
  assert.equal(learning.due, '2026-10-01'); assert.match(learning.learned, /3 of 20/);
  const result = demandLearnings(report.themes, fixtureRange.to);
  assert.equal(result.choices.length, 3); assert.doesNotMatch(JSON.stringify(result), /—|MVM|MTA/);
});

test('successful no-volume keywords are included in checked counts and theme totals', () => {
  const input = fixtureInput();
  input.market!.keywords.forEach((k) => { k.searches = null; });
  const report = aggregateDemandToDesk(input, fixtureRange);
  assert.ok(report.themes.every((r) => r.product.searches === 0 && r.keywords.length >= 48));
});
