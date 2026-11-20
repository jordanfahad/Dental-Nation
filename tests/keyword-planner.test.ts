import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { rowOf } from '../lib/googleAds/keywordPlanner';

test('keyword planner rows: volumes and bids from the API shape; missing figures stay null, never 0', () => {
  const r = rowOf(' Dental Implants Dubai ', { avgMonthlySearches: '720', competition: 'HIGH', competitionIndex: '88', lowTopOfPageBidMicros: '12500000', highTopOfPageBidMicros: '48300000', monthlySearchVolumes: [{ year: '2026', month: 'OCTOBER', monthlySearches: '880' }] }, 'historical', 'en', null);
  assert.equal(r.keyword, 'dental implants dubai');
  assert.deepEqual([r.avg_monthly_searches, r.competition, r.competition_index, r.low_bid, r.high_bid], [720, 'HIGH', 88, 12.5, 48.3]);
  assert.deepEqual(r.monthly, [{ year: 2026, month: 'OCTOBER', searches: 880 }]);
  const none = rowOf('x', undefined, 'idea', 'en', 'seed');
  assert.deepEqual([none.avg_monthly_searches, none.low_bid, none.high_bid], [null, null, null]);
});
