/**
 * Date label shared by the Overview reader and view, with no further imports:
 * the view renders in environments where the reader's module graph (which
 * reaches server-only code) must not load.
 */

/** "22 Oct 2026" for an ISO day; one formatter owns this label. */
export const dayMonthYear = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${iso}T12:00:00Z`));
