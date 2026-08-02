/**
 * Board report design language.
 *
 * The reference is a strategy-house exhibit page (McKinsey / BCG / Bain), and
 * the rules that actually produce that look are restraint rules, not
 * decoration rules:
 *
 *  1. ONE structural colour (navy) carries the argument. Amber is the single
 *     accent and is spent only where attention must go. Everything else is
 *     grey. A chart that needs six colours is usually a chart that should be
 *     two charts.
 *  2. Every exhibit has an ACTION TITLE — a full sentence stating the finding
 *     ("Cost per booking fell 49% while bookings nearly doubled"), never a
 *     label ("Cost per booking"). The reader should be able to read only the
 *     titles and still get the argument.
 *  3. Every exhibit is numbered and carries its source. Provenance is what
 *     separates a board document from a slide.
 *  4. Hairlines, not boxes. Whitespace, not dividers.
 *
 * Colours are hex rather than Tailwind classes because they are consumed by
 * inline SVG, where Tailwind's palette isn't reachable.
 */

export const C = {
  /** Primary structural navy — the argument colour. */
  navy: '#1F3A5F',
  navyDeep: '#142842',
  navyMid: '#2F5480',
  navySoft: '#5B7BA3',
  navyPale: '#A9BDD4',
  navyWash: '#EEF2F8',

  /** The single accent. Spend it sparingly. */
  amber: '#B45309',
  amberSoft: '#D98324',
  amberWash: '#FDF6EC',

  /** Semantics — used only for verdicts, never for decoration. */
  good: '#15803D',
  goodWash: '#ECFDF3',
  stop: '#B91C1C',
  stopWash: '#FEF2F2',

  /** Neutrals. */
  ink: '#111111',
  inkSoft: '#3F3F46',
  inkFaint: '#71717A',
  inkGhost: '#A1A1AA',
  rule: '#E6E6E6',
  ruleSoft: '#F0F0F2',
  panel: '#F4F4F6',
  paper: '#FFFFFF',
} as const;

/** Sequential navy ramp for ordered categories (funnel stages, maturity). */
export const NAVY_RAMP = ['#142842', '#1F3A5F', '#2F5480', '#4A719C', '#7C9BBE', '#A9BDD4'];

/** Number formatting — one place, so no two exhibits disagree. */
export const fmt = {
  aed(n: number): string {
    if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `AED ${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}K`;
    return `AED ${Math.round(n)}`;
  },
  aedExact: (n: number): string => `AED ${Math.round(n).toLocaleString('en-US')}`,
  int: (n: number): string => Math.round(n).toLocaleString('en-US'),
  compact(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}K`;
    return String(Math.round(n));
  },
  pct: (n: number, dp = 0): string => `${(n * 100).toFixed(dp)}%`,
  signedPct(n: number): string {
    const p = Math.round(n * 100);
    return `${p > 0 ? '+' : p < 0 ? '−' : '±'}${Math.abs(p)}%`;
  },
};
