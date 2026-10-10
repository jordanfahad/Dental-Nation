import { clinicOfCenter, type ClinicFilterKey } from '@/config/clinics';

/**
 * Pure core of the Executive new-patient acquisition economics (no IO, unit
 * tested in tests/exec-acquisition.test.ts). lib/executive/acquisition.ts reads
 * the rows and hands them here.
 *
 * Definitions (revised 10 Oct 2026, after the Dr Tosun Practo migration
 * inflated "new patients"):
 *  - New patient : a DN-series Practo file (the April-2026 new-patient
 *                  numbering) at Dental Nation Al Wasl, counted in the period
 *                  of its FIRST non-cancelled bill. A DN file billed again in
 *                  a later month is returning, not new.
 *  - Dr Tosun    : every patient got a DN-series file when the clinic moved
 *                  onto Practo in July 2026, so new and returning cannot be
 *                  told apart there yet. Those files are counted separately
 *                  and never added to new patients.
 *  - Revenue     : the new patients' non-cancelled bills inside the window.
 *  - Website     : the patient's phone matches a non-test booking-widget
 *                  submission.
 * Cost per new patient divides ALL ad spend by ALL new patients (any source),
 * so it is a blended cost, not an ad-attributed one; the UI says so.
 */

export interface NewPatientAcquisition {
  billedNewPatients: number;
  websiteNewPatients: number;
  otherNewPatients: number;
  newPatientRevenue: number;
  cpaAll: number | null; // spend ÷ new patients
  cpaWebsite: number | null; // spend ÷ website-sourced new patients
  revenuePerNewPatient: number | null;
  roas: number | null; // new-patient revenue ÷ spend (all new patients, not ad-attributed)
  /** True when the selected clinic is Dr Tosun: new patients can't be measured there yet. */
  notMeasurable: boolean;
  /** Dr Tosun DN-series files billed in the window, left out of new patients. */
  tosunFilesBilled: number;
}

export const emptyAcquisition: NewPatientAcquisition = {
  billedNewPatients: 0,
  websiteNewPatients: 0,
  otherNewPatients: 0,
  newPatientRevenue: 0,
  cpaAll: null,
  cpaWebsite: null,
  revenuePerNewPatient: null,
  roas: null,
  notMeasurable: false,
  tosunFilesBilled: 0,
};

export interface BillInput {
  bill_date: string | null;
  amount: number | null;
  data: Record<string, unknown> | null;
}
export interface ApptPhoneInput {
  mr_no: string | null;
  patient_phone: string | null;
}

export const phone9 = (s: string | null | undefined): string => {
  const d = String(s ?? '').replace(/\D/g, '');
  return d.length >= 9 ? d.slice(-9) : '';
};
const isNewMr = (mr: string): boolean => /^DN/i.test(mr);
const inRange = (day: string | null, from?: string, to?: string) =>
  !!day && (!from || day >= from) && (!to || day <= to);

export function computeNewPatientAcquisition(input: {
  bills: BillInput[];
  appts: ApptPhoneInput[];
  widgetPhones: ReadonlySet<string>;
  from?: string;
  to?: string;
  spend: number | null;
  clinic?: ClinicFilterKey;
}): NewPatientAcquisition {
  const { bills, appts, widgetPhones, from, to, spend } = input;
  const clinic = input.clinic ?? 'all';

  // First non-cancelled bill per Al Wasl DN file (all time), and in-window
  // revenue per file; Dr Tosun DN files billed in the window are only counted.
  const firstBill = new Map<string, string>();
  const windowRevenue = new Map<string, number>();
  const tosunInWindow = new Set<string>();
  for (const b of bills) {
    const d = b.data ?? {};
    const mr = String(d.mr_no ?? '').trim();
    if (!mr || !isNewMr(mr) || !b.bill_date) continue;
    if (String(d.bill_status ?? '').toUpperCase() === 'CANCELLED') continue;
    if (clinicOfCenter(String(d.center_name ?? '')) === 'dr-tosun') {
      if (inRange(b.bill_date, from, to)) tosunInWindow.add(mr);
      continue;
    }
    const prev = firstBill.get(mr);
    if (!prev || b.bill_date < prev) firstBill.set(mr, b.bill_date);
    if (inRange(b.bill_date, from, to)) {
      windowRevenue.set(mr, (windowRevenue.get(mr) ?? 0) + (b.amount != null ? Number(b.amount) || 0 : 0));
    }
  }
  const tosunFilesBilled = tosunInWindow.size;
  if (clinic === 'dr-tosun') return { ...emptyAcquisition, notMeasurable: true, tosunFilesBilled };

  const newFiles = [...firstBill.entries()].filter(([, first]) => inRange(first, from, to)).map(([mr]) => mr);
  const billedNewPatients = newFiles.length;
  const newPatientRevenue = newFiles.reduce((a, mr) => a + (windowRevenue.get(mr) ?? 0), 0);

  const mrPhone = new Map<string, string>();
  for (const a of appts) {
    const mr = String(a.mr_no ?? '').trim();
    if (!mr || !isNewMr(mr) || mrPhone.has(mr)) continue;
    const p = phone9(a.patient_phone);
    if (p) mrPhone.set(mr, p);
  }
  let websiteNewPatients = 0;
  for (const mr of newFiles) {
    const p = mrPhone.get(mr);
    if (p && widgetPhones.has(p)) websiteNewPatients++;
  }

  const s = spend != null && spend > 0 ? spend : null;
  return {
    billedNewPatients,
    websiteNewPatients,
    otherNewPatients: Math.max(0, billedNewPatients - websiteNewPatients),
    newPatientRevenue: Math.round(newPatientRevenue),
    cpaAll: s != null && billedNewPatients > 0 ? s / billedNewPatients : null,
    cpaWebsite: s != null && websiteNewPatients > 0 ? s / websiteNewPatients : null,
    revenuePerNewPatient: billedNewPatients > 0 ? Math.round(newPatientRevenue / billedNewPatients) : null,
    roas: s != null && newPatientRevenue > 0 ? newPatientRevenue / s : null,
    notMeasurable: false,
    tosunFilesBilled,
  };
}
