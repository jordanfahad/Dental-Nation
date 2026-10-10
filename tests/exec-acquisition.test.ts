import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { computeNewPatientAcquisition, type BillInput } from '../lib/executive/acquisitionCore';

const bill = (mr: string, day: string, amount: number, extra: Record<string, unknown> = {}): BillInput => ({
  bill_date: day,
  amount,
  data: { mr_no: mr, center_name: 'Dental Nation Al Wasl', bill_status: 'CLOSED', ...extra },
});

const SEP = { from: '2026-09-01', to: '2026-09-30' };

test('a new patient is counted in the month of the first bill, never again', () => {
  const r = computeNewPatientAcquisition({
    bills: [
      bill('DNW1', '2026-08-20', 500), // first billed in August: returning in September
      bill('DNW1', '2026-09-05', 900),
      bill('DNW2', '2026-09-10', 1200),
      bill('DNW2', '2026-09-25', 300),
      bill('DNW3', '2026-09-12', 0), // no-charge first visit still makes a new patient
      bill('ORN9', '2026-09-03', 4000), // existing-patient file series
    ],
    appts: [],
    widgetPhones: new Set(),
    ...SEP,
    spend: 3000,
  });
  assert.equal(r.billedNewPatients, 2);
  assert.equal(r.newPatientRevenue, 1500);
  assert.equal(r.cpaAll, 1500);
  assert.equal(r.roas, 0.5);
  assert.equal(r.notMeasurable, false);
});

test('cancelled bills neither start a file nor add revenue', () => {
  const r = computeNewPatientAcquisition({
    bills: [
      bill('DNW4', '2026-08-28', 800, { bill_status: 'CANCELLED' }),
      bill('DNW4', '2026-09-02', 700),
      bill('DNW5', '2026-09-04', 999, { bill_status: 'cancelled' }),
    ],
    appts: [],
    widgetPhones: new Set(),
    ...SEP,
    spend: null,
  });
  assert.equal(r.billedNewPatients, 1);
  assert.equal(r.newPatientRevenue, 700);
  assert.equal(r.cpaAll, null);
  assert.equal(r.roas, null);
});

test('Dr Tosun files are counted apart and never added to new patients', () => {
  const tosun = { center_name: 'Dr Tosun Dental Clinic' };
  const input = {
    bills: [bill('DNJ1', '2026-09-08', 2500, tosun), bill('DNJ2', '2026-09-09', 100, tosun), bill('DNW6', '2026-09-11', 400)],
    appts: [],
    widgetPhones: new Set<string>(),
    ...SEP,
    spend: 1000,
  };
  const all = computeNewPatientAcquisition(input);
  assert.equal(all.billedNewPatients, 1);
  assert.equal(all.newPatientRevenue, 400);
  assert.equal(all.tosunFilesBilled, 2);

  const only = computeNewPatientAcquisition({ ...input, clinic: 'dr-tosun' });
  assert.equal(only.notMeasurable, true);
  assert.equal(only.billedNewPatients, 0);
  assert.equal(only.cpaAll, null);
  assert.equal(only.tosunFilesBilled, 2);
});

test('website new patients match a widget phone on the last nine digits', () => {
  const r = computeNewPatientAcquisition({
    bills: [bill('DNW7', '2026-09-15', 600), bill('DNW8', '2026-09-16', 600)],
    appts: [
      { mr_no: 'DNW7', patient_phone: '+971 50 000 0001' },
      { mr_no: 'DNW8', patient_phone: '0500000002' },
    ],
    widgetPhones: new Set(['500000001']),
    ...SEP,
    spend: 1200,
  });
  assert.equal(r.websiteNewPatients, 1);
  assert.equal(r.otherNewPatients, 1);
  assert.equal(r.cpaWebsite, 1200);
});
