import type { StageId } from '@/config/investor-funnel';

/**
 * How wide each funnel segment is drawn — shared by the desktop band and the
 * mobile funnel so the two can never disagree about the shape.
 *
 * THE CATEGORY PROBLEM THIS SOLVES
 *
 * Sizing all seven stages off their raw values produces a band that is not a
 * funnel. Measured from the sample data, the naive heights ran
 * 153 → 192 → 79 → 67 → 58 → 50 → 187: it narrows correctly through the middle
 * and then flares back out at Revenue, because Revenue is 298,316 DIRHAMS
 * while every other stage counts PEOPLE. Money and people are not comparable
 * quantities, and drawing them on one scale says something false.
 *
 * Stage 1 has the same problem in reverse. "People who know us" is a STOCK —
 * an audience that has accumulated — while "people who saw us this period" is
 * a FLOW. A smaller stock than flow is perfectly normal and does not mean the
 * funnel widens.
 *
 * THE RULE
 *
 * The silhouette encodes the flow of PEOPLE through stages 2–6, log-scaled so
 * a 600:1 ratio stays legible, with a floor so late stages remain tappable.
 * Stage 1 is drawn as the mouth (widest) because it is the pool the flow is
 * drawn from, and Stage 7 is drawn at the terminal width because it is money,
 * not people. Both carry their exact figures in text, and the page says in
 * words that Revenue is not drawn to the people scale.
 *
 * The silhouette is then forced monotonically non-increasing. A funnel that
 * bulges is a funnel nobody trusts, and the printed numbers — not the
 * geometry — are what carry the precise magnitudes.
 */

/**
 * Stages whose values are directly comparable — all of them count people.
 *
 * Exported because the same invariant governs the CONVERSION CHIPS, not just
 * the silhouette. A chip between two stages divides one by the other, and that
 * is only meaningful when both are the same kind of quantity: dividing billed
 * dirhams by a headcount produces "252810%", which is arithmetic, not a
 * conversion rate.
 */
export const FLOW_STAGES: StageId[] = ['reach', 'inquiries', 'bookings', 'showups', 'treatments'];

/** True when a step-conversion between these two stages is a meaningful ratio. */
export function isComparableStep(from: StageId, to: StageId): boolean {
  return FLOW_STAGES.includes(from) && FLOW_STAGES.includes(to);
}

export interface StageValue {
  id: StageId;
  value: number;
  pending?: boolean;
}

/**
 * Returns a 0–1 scale factor per stage, in the given order.
 * 1 = full band height/width, and the series never increases.
 */
export function funnelScale(stages: StageValue[]): number[] {
  const flow = stages.filter((s) => FLOW_STAGES.includes(s.id) && !s.pending).map((s) => Math.max(s.value, 1));

  const max = flow.length ? Math.max(...flow) : 1;
  const min = flow.length ? Math.min(...flow) : 1;

  const FLOOR = 0.26; // never thinner than 26% — must stay readable and tappable

  const scaleOf = (v: number): number => {
    if (max === min) return 1;
    const t = (Math.log10(Math.max(v, 1)) - Math.log10(min)) / (Math.log10(max) - Math.log10(min));
    return FLOOR + t * (1 - FLOOR);
  };

  const raw = stages.map((s) => {
    if (s.id === 'visibility') return 1; // the mouth — the pool the flow comes from
    if (s.id === 'revenue') return null; // money, not people — resolved below
    if (s.pending) return null; // no feed yet — inherit the previous width
    return scaleOf(Math.max(s.value, 1));
  });

  // Resolve nulls and force a non-increasing silhouette.
  const out: number[] = [];
  let prev = 1;
  raw.forEach((r, i) => {
    const isRevenue = stages[i].id === 'revenue';
    // Revenue takes the terminal width; a pending stage holds the line rather
    // than collapsing to nothing and implying a loss that was never measured.
    let v = r == null ? prev : Math.min(r, prev);
    if (isRevenue) v = prev;
    out.push(v);
    prev = v;
  });

  return out;
}

/**
 * The explanation the page owes the reader — and it must not overclaim.
 *
 * An earlier version said "block size shows how the number of people narrows
 * at each step". That reads as proportional, and it is not: the scale is
 * logarithmic with a floor, so a true 631:1 ratio between reach and inquiries
 * draws at roughly 2.7:1, and the smallest stages all sit on the floor at the
 * same size. Saying "shows how it narrows" when the drawing compresses by two
 * orders of magnitude is exactly the kind of quiet overclaim this page cannot
 * afford. The note now tells the reader the sizes are squeezed and points them
 * at the printed figures.
 */
export const GEOMETRY_NOTE =
  'Block sizes are deliberately squeezed so the smaller later steps stay readable — they show that each step narrows, not by how much. The printed figures are the exact ones. Revenue is money rather than people, so it is not drawn to this scale at all.';
