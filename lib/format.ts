/** Presentation helpers. Numbers are heroes — keep them tabular and clean. */

export function fmtInt(n: number | null | undefined): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US').format(Math.round(n));
}

export function fmtPct(n: number | null | undefined, digits = 0): string {
  if (n == null) return '—';
  return `${(n * 100).toFixed(digits)}%`;
}

export function fmtDelta(n: number | null | undefined, isPct = false): string {
  if (n == null) return '';
  const sign = n > 0 ? '+' : '';
  return isPct ? `${sign}${(n * 100).toFixed(0)}pt` : `${sign}${fmtInt(n)}`;
}

/** Direction of a delta for colouring. For most KPIs up is good; pass
 *  invert=true for "lower is better" metrics (e.g. unattributed leads). */
export function deltaTone(n: number | null | undefined, invert = false): 'good' | 'stop' | 'na' {
  if (n == null || n === 0) return 'na';
  const positive = n > 0;
  const good = invert ? !positive : positive;
  return good ? 'good' : 'stop';
}
