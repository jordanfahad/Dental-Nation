import test from 'node:test';
import assert from 'node:assert/strict';
import { adSourceOf, buildLeadEmail, decide, eventOf, isIncomingPatientMessage, leadOf } from '../lib/zavis/leadAlert';

// Synthetic payloads shaped like Chatwoot webhooks (Zavis runs on the same API). No real patient data.
const message = (over: Record<string, unknown> = {}) => ({
  event: 'message_created', id: 501, content: 'Hi, how much are clear aligners?', message_type: 'incoming', private: false,
  created_at: '2026-11-12T08:00:00Z',
  sender: { id: 77, name: 'Test Patient', phone_number: '+971500000000', type: 'contact' },
  inbox: { id: 3, name: 'WhatsApp DN' },
  conversation: { id: 9001, contact_inbox: { contact_id: 77 }, additional_attributes: {}, labels: [] },
  ...over,
});

test('reads the lead from a message_created payload', () => {
  const p = message();
  assert.equal(eventOf(p), 'message_created');
  assert.equal(isIncomingPatientMessage(p), true);
  assert.deepEqual(leadOf(p), {
    conversationId: 9001, contactId: 77, name: 'Test Patient', phone: '+971500000000',
    firstMessage: 'Hi, how much are clear aligners?', inbox: 'WhatsApp DN', createdAt: '2026-11-12T08:00:00Z',
  });
});

test('team replies, private notes and other events never count as a new lead message', () => {
  assert.equal(isIncomingPatientMessage(message({ message_type: 'outgoing' })), false);
  assert.equal(isIncomingPatientMessage(message({ private: true })), false);
  assert.equal(isIncomingPatientMessage({ event: 'conversation_created', id: 9001 }), false);
});

test('ad detection: Meta referral, ctwa_clid, ad labels; plain chats are not ads', () => {
  assert.deepEqual(adSourceOf(message()), { fromAd: false, detail: null });
  const referral = message({ content_attributes: { referral: { headline: 'Close the gap', source_id: '1202', source_url: 'https://fb.me/x' } } });
  assert.deepEqual(adSourceOf(referral), { fromAd: true, detail: 'Meta ad referral: Close the gap' });
  const clid = message({ conversation: { id: 9001, additional_attributes: { ctwa_clid: 'abc123' } } });
  assert.equal(adSourceOf(clid).fromAd, true);
  const label = message({ conversation: { id: 9001, labels: ['meta_ad', 'ortho'] } });
  assert.deepEqual(adSourceOf(label), { fromAd: true, detail: 'label: meta_ad' });
  const notAd = message({ conversation: { id: 9001, labels: ['appointment_request'] } });
  assert.equal(adSourceOf(notAd).fromAd, false);
});

test('modes: test sends every lead to Fahad; live sends only ad leads to Dr Luvi; off sends nothing', () => {
  const ad = { fromAd: true, detail: 'x' }, none = { fromAd: false, detail: null };
  assert.deepEqual(decide('test', none), { send: true, to: 'fahad' });
  assert.deepEqual(decide('live', ad), { send: true, to: 'luvi' });
  assert.deepEqual(decide('live', none), { send: false, to: null });
  assert.deepEqual(decide('off', ad), { send: false, to: null });
});

test('the email names the lead, the source and links the conversation; text is escaped', () => {
  const p = message({ content: '<b>hi</b> braces?' });
  const { subject, html } = buildLeadEmail(leadOf(p), { fromAd: true, detail: 'Meta ad referral: Close the gap' }, 'live');
  assert.equal(subject, 'New ad lead in Zavis: Test Patient (+971500000000)');
  assert.ok(html.includes('https://crm.zavis.ai/app/accounts/13/conversations/9001'));
  assert.ok(html.includes('From an ad (Meta ad referral: Close the gap)'));
  assert.ok(html.includes('&lt;b&gt;hi&lt;/b&gt;') && !html.includes('<b>hi</b>'));
  assert.ok(buildLeadEmail(leadOf(p), { fromAd: false, detail: null }, 'test').subject.startsWith('[Test] New lead in Zavis'));
});

test("Zavis's own ad marker: content_attributes.ad_referral with the ad ID", () => {
  const p = message({ content_attributes: { ad_referral: { source_id: '120253762148530092', headline: 'Braces for adults' } } });
  assert.deepEqual(adSourceOf(p), { fromAd: true, detail: 'Meta click-to-WhatsApp ad: Braces for adults (ad 120253762148530092)' });
  const label = message({ conversation: { id: 9001, labels: ['fb_ctwa_sr'] } });
  assert.equal(adSourceOf(label).fromAd, true);
});

test('signature: HMAC-SHA256 over "<timestamp>.<raw body>", header names matched by ending', async () => {
  const { createHmac } = await import('crypto');
  const { signatureStatus } = await import('../lib/zavis/leadAlert');
  const h = (k: string, m: string) => createHmac('sha256', k).update(m).digest('hex');
  const body = '{"event":"message_created"}';
  const good = `sha256=${h('s3cret', `1731400000.${body}`)}`;
  assert.equal(signatureStatus({ 'x-chatwoot-timestamp': '1731400000', 'x-chatwoot-signature': good }, body, 's3cret', h), 'ok');
  assert.equal(signatureStatus({ 'x-zavis-timestamp': '1731400000', 'x-zavis-signature': good }, body, 's3cret', h), 'ok');
  assert.equal(signatureStatus({ 'x-zavis-timestamp': '1731400000', 'x-zavis-signature': good }, body + ' ', 's3cret', h), 'mismatch');
  assert.equal(signatureStatus({}, body, 's3cret', h), 'missing');
  assert.equal(signatureStatus({ 'x-zavis-timestamp': '1', 'x-zavis-signature': good }, body, null, h), 'missing');
});
