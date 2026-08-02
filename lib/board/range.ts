import { addDays, differenceInCalendarDays, format, parseISO, startOfQuarter, subDays, subQuarters } from 'date-fns';

/**
 * Date windows for the board report's Part 1 metrics (spec §2).
 *
 * Three presets plus a custom range, each carrying its own comparison window
 * so every metric card can show an honest delta:
 *
 *   last30   — last 30 days      vs. the 30 before it
 *   quarter  — this quarter      vs. the previous quarter
 *   launch   — since first spend vs. nothing (there is no "before launch")
 *   custom   — any range         vs. the equally-long window before it
 *
 * "Since launch" starts at the first day the data actually records spend, not
 * at a date from the narrative. If the deck says December and the ad platforms
 * say 24 November, the report shows what the platforms say and labels it.
 */

export type BoardPreset = 'last30' | 'quarter' | 'launch' | 'custom';

export interface BoardRange {
  preset: BoardPreset;
  from: string;
  to: string;
  /** Comparison window — null for "since launch", which has no prior period. */
  compareFrom: string | null;
  compareTo: string | null;
  label: string;
  compareLabel: string | null;
  days: number;
}

const iso = (d: Date): string => format(d, 'yyyy-MM-dd');
const isIso = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

export const PRESET_OPTIONS: { key: BoardPreset; label: string }[] = [
  { key: 'last30', label: 'Last 30 days' },
  { key: 'quarter', label: 'This quarter' },
  { key: 'launch', label: 'Since launch' },
];

/** Human label for a window, e.g. "1 Jul – 2 Aug 2026". */
export function rangeLabel(from: string, to: string): string {
  const a = parseISO(from);
  const b = parseISO(to);
  const sameYear = a.getFullYear() === b.getFullYear();
  return `${format(a, sameYear ? 'd MMM' : 'd MMM yyyy')} – ${format(b, 'd MMM yyyy')}`;
}

/**
 * Resolve the requested window against the span the data actually covers.
 * `dataFrom` / `dataTo` are the first and last day the aggregate view knows
 * about, so a preset can never run off the end of the data.
 */
export function resolveBoardRange(
  sp: { preset?: string; from?: string; to?: string },
  dataFrom: string,
  dataTo: string,
): BoardRange {
  // An explicit custom range wins over any preset.
  if (isIso(sp.from) && isIso(sp.to) && sp.from <= sp.to) {
    const from = sp.from < dataFrom ? dataFrom : sp.from;
    const to = sp.to > dataTo ? dataTo : sp.to;
    const days = differenceInCalendarDays(parseISO(to), parseISO(from)) + 1;
    const cTo = iso(subDays(parseISO(from), 1));
    const cFrom = iso(subDays(parseISO(from), days));
    return {
      preset: 'custom',
      from,
      to,
      compareFrom: cFrom >= dataFrom ? cFrom : null,
      compareTo: cFrom >= dataFrom ? cTo : null,
      label: rangeLabel(from, to),
      compareLabel: cFrom >= dataFrom ? `vs. ${rangeLabel(cFrom, cTo)}` : null,
      days,
    };
  }

  const preset: BoardPreset =
    sp.preset === 'last30' || sp.preset === 'quarter' || sp.preset === 'launch'
      ? sp.preset
      : 'launch';

  const end = parseISO(dataTo);

  if (preset === 'last30') {
    const from = iso(subDays(end, 29));
    const cTo = iso(subDays(end, 30));
    const cFrom = iso(subDays(end, 59));
    const hasCompare = cFrom >= dataFrom;
    return {
      preset,
      from: from < dataFrom ? dataFrom : from,
      to: dataTo,
      compareFrom: hasCompare ? cFrom : null,
      compareTo: hasCompare ? cTo : null,
      label: rangeLabel(from < dataFrom ? dataFrom : from, dataTo),
      compareLabel: hasCompare ? 'vs. prior 30 days' : null,
      days: 30,
    };
  }

  if (preset === 'quarter') {
    const qStart = startOfQuarter(end);
    const prevStart = startOfQuarter(subQuarters(end, 1));
    const prevEnd = iso(subDays(qStart, 1));
    const from = iso(qStart) < dataFrom ? dataFrom : iso(qStart);
    const hasCompare = iso(prevStart) >= dataFrom || prevEnd >= dataFrom;
    return {
      preset,
      from,
      to: dataTo,
      compareFrom: hasCompare ? (iso(prevStart) < dataFrom ? dataFrom : iso(prevStart)) : null,
      compareTo: hasCompare ? prevEnd : null,
      label: rangeLabel(from, dataTo),
      compareLabel: hasCompare ? 'vs. previous quarter' : null,
      days: differenceInCalendarDays(end, parseISO(from)) + 1,
    };
  }

  // Since launch — the whole recorded history; nothing precedes it.
  return {
    preset: 'launch',
    from: dataFrom,
    to: dataTo,
    compareFrom: null,
    compareTo: null,
    label: rangeLabel(dataFrom, dataTo),
    compareLabel: null,
    days: differenceInCalendarDays(parseISO(dataTo), parseISO(dataFrom)) + 1,
  };
}

/** Next day — used when walking month spines. */
export const nextDay = (d: string): string => iso(addDays(parseISO(d), 1));
