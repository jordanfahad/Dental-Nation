import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { TAG_RULES } from '../config/growth-channels';
import { leadTrackerChannel } from '../lib/growth/attribution';
import { GROUPS, parseGrossRows, patientSplits, performanceChannel } from '../lib/performance/core';

test('performance gross parser leaves Paid / Google unclassified and preserves explicit paid, walk-in and referral groups', () => {
  const rows = [
    { 'Source Type': 'Paid', 'Inquiry Platform': 'Google' },
    { 'Source Type': 'Lead form', 'Inquiry Platform': 'Google' },
    { 'Inquiry Platform': 'Walk-in' },
    { 'Source Type': 'Paid', 'Notes / Remarks': 'Patient referral' },
    { 'Inquiry Platform': 'WhatsApp' },
    { 'Follow-up Remarks': 'Doctor referral' },
    { 'Follow up Remarks': 'Smile Club' },
    {},
  ].map((data) => ({ data: { Date: '2026-10-11', 'Clinic / Branch': 'Al Wasl', ...data } }));
  const parsed = parseGrossRows(rows);
  assert.deepEqual(parsed.rows.map((r) => r.group), [
    'Unclassified', 'Paid digital', 'Direct & walk-in', 'Referral', 'Organic digital', 'Referral', 'Referral', 'Unclassified',
  ]);
  assert.equal(parsed.undated, 0);
  assert.deepEqual(GROUPS.slice(-2), ['Existing patients', 'Unclassified']);
});

test('leadTrackerChannel representative snapshot stays unchanged for DN-016', () => {
  const inputs: [string, string, string][] = [
    ['Paid', 'Google', ''], ['', '', ''], ['', '', 'WhatsApp'],
    ['Lead form', 'Google', ''], ['', '', 'ADS WhatsApp'],
    ['Facebook', 'WhatsApp', ''], ['Instagram', 'Instagram', ''],
    ['Website inquiry', '', ''], ['', '', 'Website'],
    ['', 'Walk-in', ''], ['Walk in', '', ''], ['', 'Telephone', ''], ['Redirect call', '', ''],
    ['Organic leads', 'Instagram', ''], ['Organic leads', 'Facebook', ''],
    ['WhatsApp', '', ''], ['', 'WhatsApp', ''], ['', 'Zavis', ''], ['Zavis', 'Google', ''],
  ];
  assert.deepEqual(inputs.map((args) => leadTrackerChannel(...args)), [
    'whatsapp', 'whatsapp', 'whatsapp', 'paid-social', 'paid-social', 'paid-social', 'paid-social',
    'website', 'website', 'direct-walkin', 'direct-walkin', 'direct-walkin', 'direct-walkin',
    'social-organic', 'social-organic', 'whatsapp', 'whatsapp', 'whatsapp', 'whatsapp',
  ]);
  assert.deepEqual(inputs.map((args) => performanceChannel(...args)), [
    null, null, null, 'paid-social', 'paid-social', 'paid-social', 'paid-social',
    'website', 'website', 'direct-walkin', 'direct-walkin', 'direct-walkin', 'direct-walkin',
    'social-organic', 'social-organic', 'whatsapp', 'whatsapp', 'whatsapp', null,
  ]);
});

test('performance classifier preserves existing tag coverage, field scope and precedence', () => {
  for (const rule of TAG_RULES) {
    for (const keyword of rule.keywords) {
      assert.equal(performanceChannel('Lead form', 'WhatsApp', '', keyword.toUpperCase()), rule.channel, keyword);
    }
  }
  assert.equal(performanceChannel('Patient referral', 'WhatsApp', ''), 'patient-referral');
  assert.equal(performanceChannel('', 'WhatsApp', 'Google ads'), 'paid-search');
  assert.equal(performanceChannel('Lead form', 'WhatsApp', '', 'Walk-in and Smile Club'), 'partnership');
  assert.equal(performanceChannel('Lead form', 'Walk-in', ''), 'paid-social');
  assert.equal(performanceChannel('Paid', 'Google ads', ''), null); // Inquiry Platform was never tag-scanned.
});

test('billing-file totals count distinct non-cancelled files per clinic and window while preserving unavailable splits', () => {
  const bill = (mr: string, day: string, center = 'Dental Nation', status = '') => ({ bill_date: day, amount: 100, data: { mr_no: mr, center_name: center, bill_status: status } });
  const patients = patientSplits([
    bill('DN-SYN-A', '2026-09-01'), bill('DN-SYN-A', '2026-10-11'), bill(' DN-SYN-A ', '2026-10-11'),
    bill('DN-SYN-B', '2026-10-11'), bill('DNJ-SYN-C', '2026-10-11'),
    bill('DN-SYN-D', '2026-10-11', 'Dental Nation', 'CANCELLED'), bill('', '2026-10-11'),
    bill('DN-SYN-FUTURE', '2026-10-12'),
    bill('DNJ-SYN-C', '2026-10-11', 'Dr Tosun'), bill('DNJ-SYN-T', '2026-10-11', 'Dr Tosun'),
    bill('DNJ-SYN-T', '2026-10-11', 'Dr Tosun'), bill('DNJ-SYN-OLD', '2026-10-10', 'Dr Tosun'),
    bill('DNJ-SYN-CANCELLED', '2026-10-11', 'Dr Tosun', 'cancelled'),
  ], '2026-10-11', '2026-10-11');
  assert.deepEqual(patients.map((p) => [p.clinic, p.total, p.new, p.existing, p.unclassified]), [
    ['Al Wasl', 3, 1, 1, 1], ['Dr Tosun', 2, null, null, null], ['Al Maher', null, null, null, null],
  ]);
});
