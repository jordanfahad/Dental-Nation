/** Small shared formatters for the CRM tab. Honest: null → em-dash, never 0. */

export const fmtInt = (n: number | null): string =>
  n == null ? '—' : Math.round(n).toLocaleString('en-US');

export const fmtPct = (n: number | null): string =>
  n == null ? '—' : `${Math.round(n * 100)}%`;

/** Hours → a compact human label, e.g. 346 → "14.4 days", 5.2 → "5.2 hrs". */
export function fmtHours(hours: number | null): string {
  if (hours == null) return '—';
  if (hours >= 48) return `${(hours / 24).toFixed(1)} days`;
  if (hours >= 1) return `${hours.toFixed(1)} hrs`;
  return `${Math.round(hours * 60)} min`;
}

export function hoursToDays(hours: number | null): number | null {
  return hours == null ? null : hours / 24;
}

export function hourLabel(h: number): string {
  if (h === 0) return '12am';
  if (h === 12) return '12pm';
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
