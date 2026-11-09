/**
 * Clinic Activation wording shared by the page (a client-safe import) and the
 * 09:00 email. Pure: no server imports.
 */
import type { AmcMonthFile } from '@/lib/activation/read';

/** Dr Luvi, 30 Oct 2026: Dr Tosun takes no marketing leads, every campaign number rings Al Wasl. */
export const TOSUN_LEADS_NOTE = 'Dr Tosun receives no marketing leads: every campaign number goes to Al Wasl, so those leads are counted under Al Wasl.';
export const CONVERTED_RULE = 'Converted means the Status column says Booked or Arrived (or the Conversion column says booked).';

const aedPlain = (v: number) => `AED ${v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const shortDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
/** One plain sentence for Dr Luvi's month-to-date file (page and email share it). */
export function amcMonthFileLine(m: AmcMonthFile): string {
  const doctors = Object.entries(m.doctors)
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([name, v]) => `${name} ${aedPlain(v.amount)}`).join(', ');
  const total = m.amount == null ? 'total not given' : aedPlain(m.amount);
  const patients = m.patients == null ? '' : ` from ${m.patients} patients`;
  return `${shortDay(m.from)} to ${shortDay(m.to)} comes from Dr Luvi's month-to-date file (daily Report tabs start in November): ${total}${patients}${doctors ? ` (${doctors})` : ''}.`;
}

/** Dr Luvi, 9 Nov 2026: the email and the page disagreed because leads are typed in after 09:00. */
export const SNAPSHOT_NOTE =
  'The 09:00 email is a snapshot. The front office often logs yesterday’s leads later in the morning, so the live dashboard can show more than this email; the dashboard is the up-to-date figure.';
/** How bills reach a doctor when Practo leaves the treating doctor empty. */
export const DOCTOR_RULE =
  'Al Wasl and Dr Tosun: each Practo bill counts for the doctor the patient saw that day (as Practo’s own Bills Report groups by admitting doctor); bills with no appointment that day show as "Not matched", so the rows add up to the clinic total. Al Maher: the doctor column of Dr Luvi’s AMC daily sheet.';
