/**
 * Cell helpers for hand-laid-out report tabs (labels found by text, not by
 * fixed cell). Unlike normalize.ts's parseNum, an empty or unreadable cell is
 * null, never 0: a missing figure must stay missing.
 */

export const cellText = (v: unknown): string => String(v ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

/** Lower-case, single-spaced, trailing colon removed: for label matching. */
export const labelText = (v: unknown): string => cellText(v).toLowerCase().replace(/\s*:\s*$/, '');

/**
 * A numeric cell: numbers pass through; strings may carry thousands commas,
 * spaces, "AED" or a trailing "-" placeholder. Empty, "-", "N/A" and anything
 * not a number → null.
 */
export function cellNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = cellText(v).replace(/^aed\s*/i, '').replace(/\s*aed$/i, '');
  if (!s || /^(-+|n\/?a|nil|none)$/i.test(s)) return null;
  const m = s.replace(/,/g, '').replace(/\s/g, '');
  if (!/^[-+]?(\d+(\.\d*)?|\.\d+)$/.test(m)) return null;
  const n = Number(m);
  return Number.isFinite(n) ? n : null;
}

/** A whole-number count; a fractional or negative value is not a count → null. */
export function cellCount(v: unknown): number | null {
  const n = cellNumber(v);
  return n != null && Number.isInteger(n) && n >= 0 ? n : null;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

const iso = (y: number, m: number, d: number): string | null => {
  if (y < 100) y += 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const s = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const t = new Date(`${s}T12:00:00Z`);
  return Number.isFinite(t.getTime()) && t.toISOString().slice(0, 10) === s ? s : null;
};

/**
 * Day-first sheet dates: "28-Oct-26", "28 October 2026", "28.10.2026",
 * "28/10/26", ISO, or a Sheets serial number. Returns YYYY-MM-DD or null.
 */
export function cellDate(v: unknown): string | null {
  if (typeof v === 'number' && Number.isFinite(v) && v > 20000 && v < 80000) {
    // Sheets serial: days since 1899-12-30.
    return new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000).toISOString().slice(0, 10);
  }
  const s = cellText(v);
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[\s\-/.]+([a-z]{3,9})[\s\-/.,]+(\d{2}|\d{4})$/i);
  if (m) {
    const mo = MONTHS[m[2].toLowerCase().slice(0, m[2].toLowerCase().startsWith('sept') ? 4 : 3)];
    return mo ? iso(+m[3], mo, +m[1]) : null;
  }
  m = s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2}|\d{4})$/);
  if (m) return iso(+m[3], +m[2], +m[1]);
  return null;
}

/** True when a Supabase/PostgREST error means the table is not there yet (migration not applied). */
export function isMissingTable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === 'PGRST205' || error.code === '42P01' || /could not find the table|does not exist/i.test(error.message ?? '');
}
