import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { buildAcquisition, channelOf, phoneKey, type ApptInput, type LeadInput } from '../lib/channels/acquisition';

const R = { from: '2026-10-01', to: '2026-10-31' };
const lead = (day: string, phone: string, src = 'ZAVIS', tab = 'DN Campaign Leads'): LeadInput =>
  ({ inquiry_date: day, raw_row: { _source_tab: tab, 'Contact Number': phone, 'Source Type': src, 'Campaign / Offer Name': src === 'ZAVIS' ? 'WHATSAPP AD' : '' } });
const appt = (day: string, phone: string, status: string): ApptInput => ({ appt_date: day, status, patient_phone: phone, data: null });

test('phones match on the last 9 digits; channels from the tracker source', () => {
  assert.equal(phoneKey('+971 50 000 0001'), phoneKey('0500000001'));
  assert.equal(phoneKey('12345'), null);
  assert.equal(channelOf({ 'Source Type': 'ZAVIS', 'Campaign / Offer Name': 'WHATSAPP AD' }), 'meta');
  assert.equal(channelOf({ 'Source Type': 'Facebook' }), 'meta');
  assert.equal(channelOf({ 'Source Type': 'Google Search' }), 'google');
  assert.equal(channelOf({ 'Source Type': 'N/A' }), 'other');
});

test('gross counts rows, net counts people; Practo booked and attended within 60 days; CPL and CAC', () => {
  const leads = [
    lead('2026-10-02', '+971500000001'), lead('2026-10-05', '0500000001'), // same person twice
    lead('2026-10-03', '0500000002'), lead('2026-10-04', '0500000003'),
    lead('2026-10-06', '0500000004', 'N/A'),
    lead('2026-10-07', '0500000005', 'ZAVIS', 'Smile Club'), // not a lead tab
    lead('2026-09-30', '0500000006'), // outside the dates
    lead('2026-10-08', ''), // no phone
  ];
  const appts = [
    appt('2026-10-10', '971500000001', 'Completed'), // attended
    appt('2026-10-12', '0500000002', 'Booked'), // booked only
    appt('2026-09-01', '0500000003', 'Arrived'), // before the enquiry: not counted
    appt('2026-10-20', '0500000004', 'Cancel'), // cancelled: not booked
  ];
  const a = buildAcquisition(R, leads, appts, { meta: 1000, google: 300 });
  const meta = a.rows.find((r) => r.channel === 'meta')!;
  assert.deepEqual([meta.grossLeads, meta.netLeads, meta.booked, meta.attended], [5, 3, 2, 1]);
  assert.equal(meta.cplGross, 200);
  assert.equal(meta.cplNet, 333.33);
  assert.equal(meta.costPerBooking, 500);
  assert.equal(meta.cac, 1000);
  const google = a.rows.find((r) => r.channel === 'google')!;
  assert.deepEqual([google.spend, google.grossLeads, google.cplGross, google.cac], [300, 0, null, null]); // never divide by zero
  const other = a.rows.find((r) => r.channel === 'other')!;
  assert.deepEqual([other.spend, other.netLeads, other.booked], [null, 1, 0]);
  assert.equal(a.noPhone, 1);
  assert.deepEqual([a.total.spend, a.total.netLeads, a.total.attended, a.total.cac], [1300, 4, 1, 1300]);
});
