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
