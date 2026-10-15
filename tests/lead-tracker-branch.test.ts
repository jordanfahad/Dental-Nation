import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { canonicalBranch, isHeaderEcho, readOutcome } from '../lib/lead-tracker/branch';
import { buildPeriod, parseGrossRows, performanceChannel } from '../lib/performance/core';
import { growth } from './fixtures/dn015';

test('every observed tracker branch spelling maps to its owner-confirmed branch', () => {
  const expected: [string, string][] = [
    ['Al Wasl', 'dental-nation'], ['AL Wasl', 'dental-nation'], ['Al wasl', 'dental-nation'], ['DN Al Wasl', 'dental-nation'],
    ['Dental Nation - Al Badaa St.', 'dental-nation'], ['TDC Al wasl 4 Jumeirah - Branch', 'dental-nation'],
    ['Dr. Tosun Dental Clinic Brach', 'dr-tosun'], ['Tosun Clinic', 'dr-tosun'],
    ['AMC BRANCH', 'al-maher'], ['Al Wasl / Al Maher', 'al-maher'],
    ['N/A', 'unassigned'], ['', 'unassigned'], ['Clinic / Branch', 'unassigned'],
  ];
  for (const [text, branch] of expected) assert.equal(canonicalBranch(text), branch, text);
});

test('branch matching is exact: addresses and partial text are never guessed', () => {
  assert.equal(canonicalBranch('Villa 886 Al Wasl Rd, Umm Suqeim 1'), 'unassigned');
  assert.equal(canonicalBranch('Al Wasl Rd - Jumeirah 1'), 'unassigned');
  assert.equal(canonicalBranch('Tosun'), 'unassigned');
});

test('a blank branch inherits only a single-branch tab', () => {
  assert.equal(canonicalBranch('', 'DN Campaign Leads  ❤'), 'dental-nation');
  assert.equal(canonicalBranch('', 'Smile Club'), 'unassigned');
  assert.equal(canonicalBranch('', 'TDC Campaign Leads  ❤'), 'dental-nation');
});

test('header echoes are excluded and counted; a note mentioning Date is not one', () => {
  assert.equal(isHeaderEcho({ Date: 'Date', 'Clinic / Branch': 'Clinic / Branch' }), true);
  assert.equal(isHeaderEcho({ Date: '12.10.2026', 'Notes / Remarks': 'Date of visit to confirm' }), false);
  const parsed = parseGrossRows([
    { data: { Date: 'Date', 'Clinic / Branch': 'Clinic / Branch' } },
    { data: { Date: '12.10.2026', 'Clinic / Branch': 'Al Wasl', 'Source Type': 'Facebook' } },
  ]);
  assert.equal(parsed.headerEchoes, 1);
  assert.equal(parsed.rows.length, 1);
});

test('rows without a date are counted and never placed on a day', () => {
  const parsed = parseGrossRows([{ data: { Date: '', 'Clinic / Branch': 'Al Wasl' } }, { data: { Date: 'soon', 'Clinic / Branch': 'Al Wasl' } }]);
  assert.equal(parsed.undated, 2);
  assert.equal(parsed.rows.length, 0);
});

test('a future date is kept but falls outside every completed day window', () => {
  const parsed = parseGrossRows([{ data: { Date: '25.07.2027', 'Clinic / Branch': 'Al Wasl', 'Source Type': 'ZAVIS', 'Inquiry Platform': 'WhatsApp' } }]);
  assert.equal(parsed.rows[0].date, '2027-07-25');
  const period = buildPeriod('2026-10-01', '2026-10-12', { all: growth(), wasl: growth(), tosun: growth(0, 0) }, parsed, []);
  assert.equal(period.rows.find((r) => r.clinic === 'Group' && r.group === 'Total')?.gross, 0);
});

test('TDC Al wasl 4 Jumeirah rows now count under Al Wasl instead of no branch', () => {
  const parsed = parseGrossRows([{ data: { Date: '12.10.2026', 'Clinic / Branch': 'TDC Al wasl 4 Jumeirah - Branch', _source_tab: 'TDC Campaign Leads  ❤' } }]);
  assert.equal(parsed.rows[0].clinic, 'dental-nation');
});

test('readOutcome skips N/A, blanks and leaked headers, and prefers Dr Luvi\'s column', () => {
  assert.equal(readOutcome({ 'Conversion - Dr Luvi': 'New patient converted', Conversion: 'Yes', 'Lead Stage': 'Responded' }), 'New patient converted');
  assert.equal(readOutcome({ 'Conversion - Dr Luvi': '', Conversion: 'N/A', 'Lead Stage': 'Responded' }), 'Responded');
  assert.equal(readOutcome({ Conversion: 'Conversion', 'Lead Stage': 'Lead Stage' }), null);
  assert.equal(readOutcome({ Conversion: 'NOT APPLICABLE' }), null);
});

test('the WEBSTE misspelling counts as website in the performance classifier only', () => {
  assert.equal(performanceChannel('WEBSTE', 'WEBSTE', ''), 'website');
});

test('Unclassified funnel rows carry gross only; outcomes are unavailable, not zero', () => {
  const parsed = parseGrossRows([{ data: { Date: '11.10.2026', 'Clinic / Branch': 'Al Wasl', 'Source Type': 'N/A', 'Inquiry Platform': 'N/A' } }]);
  const period = buildPeriod('2026-10-11', '2026-10-11', { all: growth(), wasl: growth(), tosun: growth(0, 0) }, parsed, []);
  for (const clinic of ['Al Wasl', 'Group']) {
    const row = period.rows.find((r) => r.clinic === clinic && r.group === 'Unclassified')!;
    assert.equal(row.gross, 1, clinic);
    assert.deepEqual([row.net, row.bookings, row.shows, row.billed, row.revenue], [null, null, null, null, null], clinic);
  }
});
