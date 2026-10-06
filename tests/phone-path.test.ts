import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { modelPhoneBookings, phonePathSentence, websitePaidInputs } from '../lib/growth/phonePath';

test('September counts fixture adds three inputs to one booking estimate', () => {
  const pp = modelPhoneBookings({ callTaps: 5, websiteWhatsappTaps: 78, websitePhoneTaps: 41 }, 100);
  assert.equal(pp.estBookingsReconciled, 23);
  assert.deepEqual(pp.bookingParts, { adCalls: 1, websiteWhatsapp: 16, websitePhone: 6 });
  assert.match(phonePathSentence(pp), /23 = 1 from ad call taps \+ 16 from website WhatsApp taps \+ 6 from website phone taps/);
});
test('booking components reconcile for every pool cap and invalid inputs', () => {
  for (let pool = 0; pool < 30; pool++) {
    const pp = modelPhoneBookings({ callTaps: 5, websiteWhatsappTaps: 78, websitePhoneTaps: 41 }, pool);
    assert.equal(Object.values(pp.bookingParts).reduce((a, n) => a + n, 0), Math.min(pool, 23));
  }
  assert.equal(modelPhoneBookings({ callTaps: NaN, websiteWhatsappTaps: -1, websitePhoneTaps: Infinity }).estBookings, 0);
});
test('website input counts only Google CPC tap events, excluding opens and leads', () => {
  const row = (event_name: string, source_medium = 'google / cpc') => ({ event_name, source_medium, event_count: 12 });
  assert.deepEqual(websitePaidInputs([row('whatsapp_click'), row('phone_click'), row('generate_lead'), row('whatsapp_widget_open'), row('phone_click', 'google / organic')]), { websiteWhatsappTaps: 12, websitePhoneTaps: 12 });
});
