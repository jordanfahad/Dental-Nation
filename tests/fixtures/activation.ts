/**
 * Synthetic Clinic Activation reads for tests/next-activation.test.ts and
 * tests/alerts-activation.test.ts, built with the reader's own pure counters
 * (lib/activation/read.ts) so the shape is exactly what readClinicActivation
 * returns. Send day Thu 29 Oct 2026: yesterday 28 Oct, window 1 to 28 Oct.
 * Synthetic data only; the PERSON/0500 values are planted to prove that no
 * patient name or phone number can reach the page or the email.
 */
import {
  countLeads, countSmileClub, summariseAmc, summariseGmb,
  type AmcRow, type ClinicActivation, type GmbRow, type LeadRow,
} from '../../lib/activation/read';
import { periods, periodsFor, type Range } from '../../lib/alerts/links';
import { ORTHO_GOOGLE_CAMPAIGN, type OrthoDailyData } from '../../lib/alerts/orthoDaily';
import { ORTHO_CHECKLIST } from '../../config/ortho-checklist';

export const TODAY = '2026-10-29';
export const PLANTED_NAME = 'PERSON ZETA';
export const PLANTED_PHONE = '0500000017';

const lead = (tab: string, date: string, platform: string | null, clinic: string | null, booked = false): LeadRow => ({
  inquiry_date: date, booking_status: booked ? 'booked' : null, channel_source: platform, clinic, whatsapp_ref: null,
  raw_row: { _source_tab: tab, 'Inquiry Platform': platform ?? '', 'Patient Name': PLANTED_NAME, 'Contact Number': PLANTED_PHONE },
});

const LEADS: LeadRow[] = [
  ...Array.from({ length: 5 }, (_, i) => lead('DN Campaign Leads  ❤', '2026-10-28', i < 3 ? 'Instagram' : 'WhatsApp', 'DN Al Wasl', i === 0)),
  ...Array.from({ length: 4 }, (_, i) => lead('TDC Campaign Leads', '2026-10-28', i < 2 ? 'Facebook' : 'Telephone', 'Tosun Clinic', i === 1)),
  ...Array.from({ length: 2 }, () => lead('AMC Campaign Leads  ❤', '2026-10-28', 'WhatsApp', 'AMC Branch')),
  lead('Leads', '2026-10-28', `${PLANTED_NAME} via phone`, 'Somewhere else'),
  // Free text typed into the platform column (a patient's name) never shows: it is "Other platform".
  lead('DN Campaign Leads  ❤', '2026-10-12', PLANTED_NAME, 'DN Al Wasl', true),
  lead('DN Campaign Leads  ❤', '2026-10-13', null, 'DN Al Wasl'),
  lead('TDC Campaign Leads', '2026-10-14', 'Google', 'Tosun Clinic', true),
  lead('Smile Club', '2026-10-28', 'Instagram', 'DN Al Wasl'), // excluded tab
];

const sc = (date: string, clinic: string, follow: string, conversion: string) => ({
  data: { _source_tab: 'Smile Club', Date: date, 'Clinic / Branch': clinic, 'Patient Name': PLANTED_NAME, 'Contact Number': PLANTED_PHONE, 'Follow up Remarks': follow, Conversion: conversion },
});
const SMILE = [
  sc('28.10.2026', 'DN Al Wasl', 'called', 'CONVERTED'),
  sc('28.10.2026 at 10:48PM', 'Tosun Clinic', '', ''),
  sc('27.10.2026', 'DN Al Wasl', 'no answer', ''),
  sc('20.10.2026', 'AMC Branch', 'called', 'booked'),
  sc('', 'DN Al Wasl', '', ''),
];

const gmb = (day: string, clinic: string, fo: string, today: number, total: number, photos: number, videos: number | null): GmbRow => ({
  snapshot_day: day, clinic, fo_name: fo, reviews_today: today, reviews_individual: null, reviews_total: total, photos, videos,
  month_title: 'Google My Business - October 2026', synced_at: `${day}T10:00:00Z`,
});
// Al Maher has no copy, so the page and the email say when daily copies start.
const GMB: GmbRow[] = [
  gmb('2026-10-28', 'dental-nation', 'Asha Example', 3, 618, 4, 1),
  gmb('2026-10-27', 'dental-nation', 'Asha Example', 2, 615, 2, null),
  gmb('2026-10-28', 'dr-tosun', 'Rina', 6, 349, 7, 8),
];

const amcRow = (date: string, over: Partial<AmcRow> = {}): AmcRow => ({
  report_date: date, total_appointments: 9, consulted: 8, invoiced: 8, non_invoiced: 1, cancelled: 1, patients_old: 7, patients_new: 2,
  invoice_amount_total: '3914.12', insurance_total: '2757.71', copay_total: '306.38', cash_total: '120', card_total: '889.50',
  advance_total: null, balance_total: null, invoice_count: 8, doctors: { 'Dr. Alpha': { invoices: 8, amount: 3914.12 } }, prepared_by: 'Dalia', ...over,
});
const AMC: AmcRow[] = [
  amcRow('2026-10-28'),
  amcRow('2026-10-27', { invoice_amount_total: '2210', total_appointments: 7, patients_new: null }),
];

/** A live DN Ortho campaign and the three Practo-fed orthodontists. */
export function sampleOrtho(): OrthoDailyData {
  return {
    doctors: [
      { key: 'hasna', name: 'Dr Hasna Alsaeed', clinic: 'dental-nation', clinicLabel: 'Dental Nation Al Wasl', billedMtd: 38600 },
      { key: 'yasmin', name: 'Dr Yasmin Youssef', clinic: 'dental-nation', clinicLabel: 'Dental Nation Al Wasl', billedMtd: null },
      { key: 'yahya', name: 'Dr Yahya Tosun', clinic: 'dr-tosun', clinicLabel: 'Dr. Tosun Dental Clinic', billedMtd: 47300 },
    ],
    googleSearch: {
      campaign: ORTHO_GOOGLE_CAMPAIGN,
      yesterday: { spend: 310, impressions: 2100, clicks: 41, activeDays: 1 },
      mtd: { spend: 1520, impressions: 9400, clicks: 183, activeDays: 6 },
    },
    checklist: ORTHO_CHECKLIST,
  };
}

/** Every source populated. `range` replaces month to yesterday. */
export function sampleActivation(range?: Range): ClinicActivation {
  const p = range ? periodsFor(range) : periods(TODAY);
  return {
    today: TODAY,
    yesterday: p.yesterday,
    window: p.mtd,
    leads: countLeads(LEADS, p),
    smileClub: countSmileClub(SMILE, p),
    gmb: summariseGmb(GMB, p),
    revenue: {
      practo: {
        source: 'practo',
        byClinic: {
          all: { yesterday: 14320, window: 402180 },
          'dental-nation': { yesterday: 7240, window: 241900 },
          'dr-tosun': { yesterday: 4339, window: 148600 },
          'al-maher': { yesterday: 2741, window: 11680 },
        },
      },
      amc: summariseAmc(AMC, p),
    },
    ortho: sampleOrtho(),
  };
}

/** Every source unreadable: each section null, Practo null, as readClinicActivation returns them. */
export function nullActivation(): ClinicActivation {
  const p = periods(TODAY);
  const none = { yesterday: null, window: null };
  return {
    today: TODAY,
    yesterday: p.yesterday,
    window: p.mtd,
    leads: null,
    smileClub: null,
    gmb: null,
    revenue: {
      practo: { source: 'practo', byClinic: { all: none, 'dental-nation': none, 'dr-tosun': none, 'al-maher': none } },
      amc: null,
    },
    ortho: null,
  };
}
