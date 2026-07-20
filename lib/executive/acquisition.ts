import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * New-patient acquisition economics for the Executive dashboard. Replaces the
 * meaningless "cost per (manual-tracker) lead" with a real cost-per-acquisition:
 * spend ÷ distinct NEW patients who were actually BILLED (revenue-backed), split
 * into a website-widget lens and an all-sources lens.
 *
 * Definitions (agreed 2026-07-20):
 *  - New patient   : a DN-series Practo file number (mr_no ~ ^DN — the Practo
 *                    Insta April-2026 new-patient numbering). ORN/other = existing.
 *  - Billed        : the new patient has a Practo bill in the window (has revenue).
 *  - Distinct      : counted once per patient (mr_no), not per booking.
 *  - Website-sourced: the patient's phone (from the appointment feed) matches a
 *                    non-test website booking-widget submission.
 *
 * Honest caveat carried in the UI: CPA(All) divides TOTAL ad spend by ALL new
 * patients (incl. organic/walk-in) → a blended CAC, not pure paid-CPL.
 */

export interface NewPatientAcquisition {
  billedNewPatients: number;
  websiteNewPatients: number;
  otherNewPatients: number;
  newPatientRevenue: number;
  cpaAll: number | null; // spend ÷ billed new patients
  cpaWebsite: number | null; // spend ÷ website-sourced billed new patients
  revenuePerNewPatient: number | null;
  roas: number | null; // new-patient revenue ÷ spend
}

const phone9 = (s: string | null | undefined): string => {
  const d = String(s ?? '').replace(/\D/g, '');
  return d.length >= 9 ? d.slice(-9) : '';
};
const isNewMr = (mr: string | null | undefined): boolean => /^DN/i.test(String(mr ?? '').trim());
const inRange = (day: string | null, from?: string, to?: string) =>
  !!day && (!from || day >= from) && (!to || day <= to);

const empty: NewPatientAcquisition = {
  billedNewPatients: 0,
  websiteNewPatients: 0,
  otherNewPatients: 0,
  newPatientRevenue: 0,
  cpaAll: null,
  cpaWebsite: null,
  revenuePerNewPatient: null,
  roas: null,
};

export async function getNewPatientAcquisition(opts: {
  from?: string;
  to?: string;
  spend: number | null;
}): Promise<NewPatientAcquisition> {
  const db = getSupabaseAdmin();
  if (!db) return empty;
  const { from, to, spend } = opts;

  try {
    const [billsRes, apptRes, widgetRes] = await Promise.all([
      db.from('practo_bills_raw').select('bill_date, amount, data'),
      db.from('practo_appointments_raw').select('mr_no, patient_phone'),
      db.from('raw_zavis').select('data'),
    ]);

    // New-patient bills in the window → distinct mr_no + revenue.
    const newMrRevenue = new Map<string, number>();
    for (const r of (billsRes.data as { bill_date: string | null; amount: number | null; data: Record<string, unknown> }[] | null) ?? []) {
      if (!inRange(r.bill_date, from, to)) continue;
      const mr = String(r.data?.mr_no ?? '').trim();
      if (!isNewMr(mr)) continue;
      newMrRevenue.set(mr, (newMrRevenue.get(mr) ?? 0) + (r.amount != null ? Number(r.amount) || 0 : 0));
    }
    const billedNewPatients = newMrRevenue.size;
    const newPatientRevenue = [...newMrRevenue.values()].reduce((a, v) => a + v, 0);

    // mr_no → phone (from the appointment feed), for the website match.
    const mrPhone = new Map<string, string>();
    for (const a of (apptRes.data as { mr_no: string | null; patient_phone: string | null }[] | null) ?? []) {
      const mr = String(a.mr_no ?? '').trim();
      if (!isNewMr(mr)) continue;
      const p = phone9(a.patient_phone);
      if (p && !mrPhone.has(mr)) mrPhone.set(mr, p);
    }
    // Non-test website-widget phones.
    const widgetPhones = new Set<string>();
    for (const r of (widgetRes.data as { data: Record<string, unknown> }[] | null) ?? []) {
      const d = r.data ?? {};
      if (!('Full Name' in d)) continue;
      const name = String(d['Full Name'] ?? '');
      const email = String(d['Email'] ?? '');
      const ref = String(d['Booking Reference'] ?? '').trim().toUpperCase();
      if (/zavis|test/i.test(email) || /test|sagar/i.test(name) || ref.startsWith('BK')) continue;
      const p = phone9(String(d['Phone Number'] ?? ''));
      if (p) widgetPhones.add(p);
    }
    let websiteNewPatients = 0;
    for (const mr of newMrRevenue.keys()) {
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
    };
  } catch {
    return empty;
  }
}
