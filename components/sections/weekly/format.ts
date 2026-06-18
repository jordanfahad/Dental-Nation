/**
 * Pure formatting helpers for the Weekly Review tables. Plain module (no
 * 'use client', no server-only) so both server subcomponents can import it.
 */

/** Integer with thousands separators, or "—" for null. */
export function num(v: number | null | undefined): string {
  return v == null ? '—' : Math.round(v).toLocaleString('en-US');
}

/** AED amount (0 decimals), or "—" for null. */
export function aed(v: number | null | undefined): string {
  return v == null ? '—' : `AED ${Math.round(v).toLocaleString('en-US')}`;
}

/** Percentage from a 0–1 fraction, or "—" for null. */
export function pct(v: number | null | undefined): string {
  return v == null ? '—' : `${Math.round(v * 100)}%`;
}

/** safe ratio → null on zero/missing denominator (never /0 or a fabricated 0). */
export function rate(numerator: number | null, denominator: number | null): number | null {
  if (numerator == null || denominator == null || denominator === 0) return null;
  return numerator / denominator;
}
