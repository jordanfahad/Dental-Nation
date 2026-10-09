import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { leadTrackerChannel } from '../lib/growth/attribution';

test('Meta ad chats logged with the platform as Source Type count as paid social', () => {
  assert.equal(leadTrackerChannel('Facebook', 'Facebook', 'WhatsApp'), 'paid-social');
  assert.equal(leadTrackerChannel('Facebook', 'WhatsApp', 'WhatsApp'), 'paid-social');
  assert.equal(leadTrackerChannel('Instagram', 'Instagram', 'WhatsApp'), 'paid-social');
});
test('organic DMs and other desk rows keep their channel', () => {
  assert.equal(leadTrackerChannel('Organic leads', 'Facebook', 'WhatsApp'), 'social-organic');
  assert.equal(leadTrackerChannel('Organic leads', 'WhatsApp', 'WhatsApp'), 'whatsapp');
  assert.equal(leadTrackerChannel('Lead Forms', 'WhatsApp', 'WhatsApp'), 'paid-social');
  assert.equal(leadTrackerChannel('Website Inquiry', 'WhatsApp', 'Website'), 'website');
  assert.equal(leadTrackerChannel('ZAVIS', 'WhatsApp', 'WhatsApp'), 'whatsapp');
});
