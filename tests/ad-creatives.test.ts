import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { metaCreative, googleCreative, creativeUrl } from '../lib/sync/adapters/ad-creatives';
import { aggregateDemandToDesk, emptyDemandInput } from '../lib/analytics/demandToDesk';
import { adRow, fixtureRange } from './fixtures/demand-to-desk';

test('Meta story fields and Google RSA assets normalize to preview metadata', () => {
  const meta = metaCreative({ id: 'synthetic-ad', name: 'Creative', creative: { id: 'synthetic-creative', object_story_spec: { link_data: { message: 'Close a tooth gap', name: 'Spacing care', link: 'https://example.invalid/landing', call_to_action: { type: 'LEARN_MORE' } } } } }, '2026-09-20');
  assert.equal(meta.body, 'Close a tooth gap'); assert.equal(meta.cta, 'LEARN_MORE'); assert.equal(meta.link_url, 'https://example.invalid/landing');
  const google = googleCreative({ campaign: { name: 'Synthetic campaign' }, adGroupAd: { ad: { id: 'synthetic-ad', responsiveSearchAd: { headlines: [{ text: 'Braces' }, { text: 'Clear aligners' }], descriptions: [{ text: 'Synthetic description' }] } } } }, 'synthetic-account', '2026-09-20');
  assert.equal(google.ad_id, 'synthetic-account:synthetic-ad'); assert.deepEqual(google.headlines, ['Braces', 'Clear aligners']);
  assert.equal(creativeUrl('javascript:alert(1)'), null); assert.equal(creativeUrl('https://user:password@example.invalid'), null);
});

test('creative text controls theme classification and selected-period costs rank by chats', () => {
  const creative = (ad_id: string, body: string) => ({ platform: 'meta', ad_id, ad_name: 'Synthetic generic ad', body, title: '' });
  const input = { ...emptyDemandInput(), ads: [adRow({ ad_id: 'one', ad_name: '', campaign_name: '', adset_name: '' }), adRow({ key: 'two', ad_id: 'two', spend: 200, date: '2026-08-01' })], creatives: [creative('one', 'Close a tooth gap'), creative('two', 'Close a tooth gap'), { platform: 'google', ad_id: 'three', title: 'Close a tooth gap' }], creativeMetrics: [{ platform: 'google', ad_id: 'three', day: '2026-09-20', spend: 50 }, { platform: 'google', ad_id: 'three', day: '2026-08-20', spend: 200 }] };
  const row = aggregateDemandToDesk(input, fixtureRange).themes.find((r) => r.key === 'gaps')!;
  assert.equal(row.meta.spend, 100); assert.equal(row.creatives[0].adId, 'one'); assert.equal(row.creatives[0].chats, 10);
  const google = row.creatives.find((r) => r.platform === 'google')!;
  assert.equal(google.spend, 50); assert.equal(google.chats, null); assert.equal(google.costChat, null);
});
