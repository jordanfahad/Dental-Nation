import 'server-only';
import { selectAll } from '../supabase/selectAll';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import type { ClinicFilterKey } from '@/config/clinics';
import {
  computeNewPatientAcquisition,
  emptyAcquisition,
  phone9,
  type ApptPhoneInput,
  type BillInput,
  type NewPatientAcquisition,
} from './acquisitionCore';

export type { NewPatientAcquisition } from './acquisitionCore';

/**
 * New-patient acquisition economics for the Executive dashboard: the reads.
 * The definitions and the arithmetic live in ./acquisitionCore (pure, tested).
 * Every table is read in full with selectAll: a plain select stops at 1,000
 * rows, which silently dropped a third of the bills (10 Oct 2026).
 */
export async function getNewPatientAcquisition(opts: {
  from?: string;
  to?: string;
  spend: number | null;
  clinic?: ClinicFilterKey;
}): Promise<NewPatientAcquisition> {
  const db = getSupabaseAdmin();
  if (!db) return emptyAcquisition;
  const { from, to, spend, clinic } = opts;

  try {
    const [billsRes, apptRes, widgetRes] = await Promise.all([
      selectAll(() => db.from('practo_bills_raw').select('bill_date, amount, data'), 'bill_key'),
      selectAll(() => db.from('practo_appointments_raw').select('mr_no, patient_phone'), 'appt_key'),
      selectAll(() => db.from('raw_zavis').select('data'), 'id'),
    ]);

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

    return computeNewPatientAcquisition({
      bills: (billsRes.data as BillInput[] | null) ?? [],
      appts: (apptRes.data as ApptPhoneInput[] | null) ?? [],
      widgetPhones,
      from,
      to,
      spend,
      clinic,
    });
  } catch {
    return emptyAcquisition;
  }
}
