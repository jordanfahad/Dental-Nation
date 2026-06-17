import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { format, parseISO, subDays } from 'date-fns';

/**
 * Everything is computed on the clinic's day boundary: Dubai midnight (UTC+4,
 * no DST). Vercel cron fires in UTC; we convert before deciding the report date.
 */
export const DUBAI_TZ = 'Asia/Dubai';

/** The current Dubai-local date as YYYY-MM-DD. */
export function dubaiToday(now: Date = new Date()): string {
  return formatInTimeZone(now, DUBAI_TZ, 'yyyy-MM-dd');
}

/**
 * Which report date a sync at `now` (UTC instant) belongs to. A sync is always
 * attributed to the Dubai-local calendar day in which it fires.
 */
export function reportDateForSync(now: Date = new Date()): string {
  return dubaiToday(now);
}

/** Dubai-local wall-clock time as HH:mm, for the footer ("Last synced …"). */
export function dubaiTime(instant: Date | string): string {
  const d = typeof instant === 'string' ? parseISO(instant) : instant;
  return formatInTimeZone(d, DUBAI_TZ, 'HH:mm');
}

/** Human date label, e.g. "Tue 17 Jun 2026", rendered in Dubai time. */
export function dubaiDateLabel(dateISO: string): string {
  // dateISO is a plain YYYY-MM-DD; format without tz shifting.
  return format(parseISO(dateISO), 'EEE d MMM yyyy');
}

/** The previous Dubai calendar date for a YYYY-MM-DD string. */
export function previousDate(dateISO: string): string {
  return format(subDays(parseISO(dateISO), 1), 'yyyy-MM-dd');
}

/** Trailing N dates ending at (and including) `dateISO`, oldest → newest. */
export function trailingDates(dateISO: string, n: number): string[] {
  const end = parseISO(dateISO);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    out.push(format(subDays(end, i), 'yyyy-MM-dd'));
  }
  return out;
}

/** Convert a UTC instant to a Dubai-zoned Date (for date-fns arithmetic). */
export function toDubai(instant: Date | string): Date {
  const d = typeof instant === 'string' ? parseISO(instant) : instant;
  return toZonedTime(d, DUBAI_TZ);
}
