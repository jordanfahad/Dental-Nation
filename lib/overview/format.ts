/**
 * Date label shared by the Overview reader and view, with no further imports:
 * the view renders in environments where the reader's module graph (which
 * reaches server-only code) must not load.
 */

/** "22 Oct 2026" for an ISO day; one formatter owns this label. */
export const dayMonthYear = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${iso}T12:00:00Z`));

const dayMonth = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(`${iso}T12:00:00Z`));

/**
 * "1 to 28 Oct 2026", "29 Sep to 28 Oct 2026", "20 Dec 2025 to 5 Jan 2026",
 * or "28 Oct 2026" for a single day. Within one month this is the same text
 * the pages have always printed (rangeLabel plus the year).
 */
export function rangeDates(r: { from: string; to: string }): string {
  if (r.from === r.to) return dayMonthYear(r.to);
  if (r.from.slice(0, 7) === r.to.slice(0, 7)) return `${Number(r.from.slice(8))} to ${dayMonthYear(r.to)}`;
  if (r.from.slice(0, 4) === r.to.slice(0, 4)) return `${dayMonth(r.from)} to ${dayMonthYear(r.to)}`;
  return `${dayMonthYear(r.from)} to ${dayMonthYear(r.to)}`;
}
