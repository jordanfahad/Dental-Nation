/**
 * The date range of the /next leadership pages, parsed once from the URL.
 *
 * Search params (Dubai calendar days, YYYY-MM-DD):
 *   - from + to: a custom range; a valid pair wins over a preset;
 *   - preset: yesterday | last7 | thismonth | lastmonth | last30.
 * Rules: nothing given = month to yesterday (the pages' original window);
 * `to` is capped at yesterday; from must be on or before to; a span longer
 * than MAX_SPAN_DAYS keeps its end and is shortened to MAX_SPAN_DAYS; any
 * other invalid input falls back to the default.
 *
 * Pure (no server imports): the view renders the date control from it.
 */
import { addDaysIso, periods, type Range } from '@/lib/alerts/links';
import { dayMonthYear, rangeDates } from './format';

export type RangePresetKey = 'yesterday' | 'last7' | 'thismonth' | 'lastmonth' | 'last30';

export const RANGE_PRESETS: { key: RangePresetKey; label: string }[] = [
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7', label: 'Last 7 days' },
  { key: 'thismonth', label: 'This month' },
  { key: 'lastmonth', label: 'Last month' },
  { key: 'last30', label: 'Last 30 days' },
];

export const MAX_SPAN_DAYS = 400;

export interface ViewRange extends Range {
  /** Dubai today when the page was opened. */
  today: string;
  /** How the range was chosen: no params ('default'), a preset, or a custom from/to pair. */
  preset: RangePresetKey | 'custom' | 'default';
  /** True when the dates are the default month to yesterday, however they were chosen. */
  isDefault: boolean;
}

const isDay = (s: unknown): s is string =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(`${s}T12:00:00Z`))
  && new Date(`${s}T12:00:00Z`).toISOString().slice(0, 10) === s;

const isPreset = (s: unknown): s is RangePresetKey => RANGE_PRESETS.some((p) => p.key === s);

/** Month to yesterday: exactly periods(today).mtd. */
export const defaultRange = (today: string): Range => periods(today).mtd;

/** A preset's dates for Dubai day `today`. "This month" and "Last month" follow yesterday's month. */
export function presetRange(key: RangePresetKey, today: string): Range {
  const y = addDaysIso(today, -1);
  switch (key) {
    case 'yesterday': return { from: y, to: y };
    case 'last7': return { from: addDaysIso(y, -6), to: y };
    case 'last30': return { from: addDaysIso(y, -29), to: y };
    case 'thismonth': return defaultRange(today);
    case 'lastmonth': {
      const end = addDaysIso(`${y.slice(0, 7)}-01`, -1);
      return { from: `${end.slice(0, 7)}-01`, to: end };
    }
  }
}

const make = (r: Range, today: string, preset: ViewRange['preset']): ViewRange => {
  const d = defaultRange(today);
  return { from: r.from, to: r.to, today, preset, isDefault: r.from === d.from && r.to === d.to };
};

type Param = string | string[] | undefined;

/** Resolve the page's range from its search params; never throws. */
export function parseRange(params: { from?: Param; to?: Param; preset?: Param }, today: string): ViewRange {
  const y = addDaysIso(today, -1);
  const { from, to, preset } = params;
  if (isDay(from) && isDay(to)) {
    const end = to > y ? y : to;
    if (from <= end) {
      const earliest = addDaysIso(end, -(MAX_SPAN_DAYS - 1));
      return make({ from: from < earliest ? earliest : from, to: end }, today, 'custom');
    }
  }
  if (isPreset(preset)) return make(presetRange(preset, today), today, preset);
  return make(defaultRange(today), today, 'default');
}

/** The params that reproduce this range on another page ({} for the default). */
export function rangeParams(r: ViewRange): Record<string, string> {
  if (r.preset === 'default') return {};
  if (r.preset === 'custom') return { from: r.from, to: r.to };
  return { preset: r.preset };
}

/** `path` with these params (empty values dropped); the bare path when none are left. */
export function hrefWith(path: string, params: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

/** The highlighted preset: the one chosen, This month for no params, none for custom dates. */
export function activePreset(r: ViewRange): RangePresetKey | null {
  if (r.preset === 'custom') return null;
  return r.preset === 'default' ? 'thismonth' : r.preset;
}

/**
 * The range's dates as the pages print them. The default keeps the pages'
 * original text exactly ("1 to 27 Oct 2026", even for a one-day month start).
 */
export const periodDates = (r: ViewRange): string =>
  r.isDefault ? `${Number(r.from.slice(8))} to ${dayMonthYear(r.to)}` : rangeDates(r);

/** "Month to yesterday · 1 to 27 Oct 2026", "Last 7 days · 22 to 28 Oct 2026", "Selected dates · ...". */
export function rangeHeading(r: ViewRange): string {
  if (r.isDefault) return `Month to yesterday · ${periodDates(r)}`;
  const named = r.preset !== 'custom' && r.preset !== 'default' ? RANGE_PRESETS.find((p) => p.key === r.preset)?.label : undefined;
  return `${named ?? 'Selected dates'} · ${rangeDates(r)}`;
}

/** Label of the tiles' small last-day figure: "Yesterday" for the default, else "Last day (28 Oct 2026)". */
export const lastDayLabel = (r: ViewRange) => (r.isDefault ? 'Yesterday' : `Last day (${dayMonthYear(r.to)})`);

/** The range a page's data was read for, when the page did not pass one (the default). */
export const rangeOfData = (mtd: Range, today: string): ViewRange => {
  const d = defaultRange(today);
  const isDefault = mtd.from === d.from && mtd.to === d.to;
  return { from: mtd.from, to: mtd.to, today, preset: isDefault ? 'default' : 'custom', isDefault };
};
