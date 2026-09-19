import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { isLiveCampaign, maxLastDate } from '../lib/marketing/recency';

test('maxLastDate picks the freshest date and survives nulls', () => {
  assert.equal(maxLastDate([]), null);
  assert.equal(maxLastDate([{ firstDate: null, lastDate: null }]), null);
  assert.equal(
    maxLastDate([
      { firstDate: '2026-09-01', lastDate: '2026-09-10' },
      { firstDate: null, lastDate: null },
      { firstDate: '2025-11-24', lastDate: '2026-09-19' },
    ]),
    '2026-09-19',
  );
});

test('live means rows within 7 days of the anchor — a data fact, not a guess', () => {
  const anchor = '2026-09-19';
  assert.equal(isLiveCampaign({ firstDate: '2026-09-16', lastDate: '2026-09-19' }, anchor), true);
  assert.equal(isLiveCampaign({ firstDate: '2026-09-01', lastDate: '2026-09-13' }, anchor), true); // exactly 6 days
  assert.equal(isLiveCampaign({ firstDate: '2026-08-01', lastDate: '2026-09-12' }, anchor), false); // 7 days
  assert.equal(isLiveCampaign({ firstDate: '2025-11-24', lastDate: '2026-02-01' }, anchor), false);
  assert.equal(isLiveCampaign({ firstDate: null, lastDate: null }, anchor), false);
  assert.equal(isLiveCampaign({ firstDate: '2026-09-18', lastDate: '2026-09-19' }, null), false);
  assert.equal(isLiveCampaign({ firstDate: 'bad', lastDate: 'bad' }, anchor), false);
});
