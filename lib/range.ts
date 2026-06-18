import { format, parseISO, subDays, startOfMonth, endOfMonth, subMonths, differenceInCalendarDays } from 'date-fns';
import type { RangeMeta, RangePreset } from '@/lib/types';

/**
 * Pure date-range + period-comparison math. Shared by the server data layer
 * (lib/report.ts) and the client DateRangeControl, so it MUST stay free of
 * `server-only` and of any Supabase/Google imports.
 *
 * Range semantics: [from, to] are inclusive YYYY-MM-DD. The comparison period
 * (compare='prev') is the equal-length window immediately BEFORE `from`.
 */

export const PRESETS: { key: RangePreset; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'last30', label: 'Last 30 days' },
  { key: 'last90', label: 'Last 90 days' },
  { key: 'thisMonth', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
];

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

/** Inclusive day count between two YYYY-MM-DD dates (from ≤ to). */
export function inclusiveDays(from: string, to: string): number {
  return Math.max(1, differenceInCalendarDays(parseISO(to), parseISO(from)) + 1);
}

/**
 * Resolve a preset into concrete [from,to] given the available data span. The
 * `availableTo` is the latest data date (≈ today); `availableFrom` is the
 * earliest. Custom from/to (when supplied + valid) win over the preset.
 */
export function resolveDates(
  preset: RangePreset,
  availableFrom: string,
  availableTo: string,
  customFrom?: string,
  customTo?: string,
): { from: string; to: string; preset: RangePreset } {
  // Explicit custom range takes precedence (preset becomes 'custom').
  if (isIsoDate(customFrom) && isIsoDate(customTo) && customFrom! <= customTo!) {
    return { from: customFrom!, to: customTo!, preset: 'custom' };
  }

  const to = availableTo;
  const toDate = parseISO(to);
  switch (preset) {
    case 'last30':
      return { from: clampFrom(iso(subDays(toDate, 29)), availableFrom), to, preset };
    case 'last90':
      return { from: clampFrom(iso(subDays(toDate, 89)), availableFrom), to, preset };
    case 'thisMonth':
      return { from: clampFrom(iso(startOfMonth(toDate)), availableFrom), to, preset };
    case 'lastMonth': {
      const lm = subMonths(toDate, 1);
      return {
        from: clampFrom(iso(startOfMonth(lm)), availableFrom),
        to: iso(endOfMonth(lm)),
        preset,
      };
    }
    case 'all':
    default:
      return { from: availableFrom, to, preset: 'all' };
  }
}

/** Don't let a preset start before the earliest available data. */
function clampFrom(from: string, availableFrom: string): string {
  return from < availableFrom ? availableFrom : from;
}

export function isIsoDate(v: string | undefined | null): boolean {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
}

/**
 * Build the full RangeMeta (resolved range + comparison range). The comparison
 * is the equal-length window ending the day BEFORE `from`.
 */
export function buildRangeMeta(
  preset: RangePreset,
  compare: 'prev' | 'none',
  availableFrom: string,
  availableTo: string,
  customFrom?: string,
  customTo?: string,
): RangeMeta {
  const { from, to, preset: resolvedPreset } = resolveDates(
    preset,
    availableFrom,
    availableTo,
    customFrom,
    customTo,
  );
  const days = inclusiveDays(from, to);

  let compareFrom: string | null = null;
  let compareTo: string | null = null;
  if (compare === 'prev') {
    compareTo = iso(subDays(parseISO(from), 1));
    compareFrom = iso(subDays(parseISO(compareTo), days - 1));
  }

  return { from, to, preset: resolvedPreset, compare, compareFrom, compareTo, days };
}

/** Inclusive [from,to] membership for a nullable YYYY-MM-DD value. */
export function inRange(date: string | null | undefined, from: string, to: string): boolean {
  if (!date) return false;
  const d = date.slice(0, 10);
  return d >= from && d <= to;
}

/** {value, prev, deltaPct} with a hard null-guard against /0 (§ honesty). */
export function metricDelta(
  value: number | null,
  prev: number | null,
): { value: number | null; prev: number | null; deltaPct: number | null } {
  const deltaPct =
    value != null && prev != null && prev !== 0 ? (value - prev) / prev : null;
  return { value, prev, deltaPct };
}
