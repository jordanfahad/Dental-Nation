/**
 * Smile Club 30-day budget (rev. 7, 24 Sep) — built from what one member is
 * worth, then allocated by what each segment's members actually cost.
 * Single source of truth for every budget figure in the plan.
 */
import type { SegmentId } from '@/lib/smileclub/segments';

export interface BudgetLine { item: string; aed: number; note?: string }

export interface SegmentBudget {
  seg: SegmentId;
  target: number;
  lines: BudgetLine[];
  /** Released only at the Day-14 review, on a stated condition. */
  gated?: { aed: number; condition: string };
}

/** The ceiling logic — assumption to confirm with Finance (task g-cac). */
export const CEILING = {
  lowestAnnualFee: 999,
  includedCareShare: 0.5,
  spendShareOfYearOneMargin: 0.5,
  perMember: 250,
  members: 120,
  total: 30000,
};

export const SEGMENT_BUDGETS: SegmentBudget[] = [
  {
    seg: 'chair', target: 36,
    lines: [
      { item: 'Dentist-signed invitation cards + refreshed QR stands', aed: 1100 },
      { item: 'Desk-team thank-you: AED 25 per member signed', aed: 900, note: 'paid only on results' },
    ],
  },
  {
    seg: 'patients', target: 24,
    lines: [
      { item: 'WhatsApp message costs — about 3,000 curated messages', aed: 1000 },
      { item: 'Dentist thank-you: AED 40 per their patient who joins', aed: 1000, note: 'paid only on results' },
    ],
  },
  {
    seg: 'corporate', target: 24,
    lines: [
      { item: 'Print kit — one-pager, savings table, QR cards (EN/AR)', aed: 1500 },
      { item: 'Two on-site dental days — materials and set-up (2 × 1,500)', aed: 3000 },
      { item: 'LinkedIn warm-up for HR contacts at target companies', aed: 1500 },
      { item: 'Door-plan logistics', aed: 1500 },
    ],
  },
  {
    seg: 'search', target: 12,
    lines: [
      { item: 'Google — brand 500 · price searches 1,000 · insurance gap 500', aed: 2000 },
      { item: 'Facebook/Instagram — people who already visited us', aed: 1500 },
    ],
    gated: { aed: 3500, condition: 'Released at Day 14 (5 Oct) only if one online member has cost AED 600 or less: Google price searches +1,500, Facebook/Instagram +2,000.' },
  },
  {
    seg: 'community', target: 24,
    lines: [
      { item: 'Printed material — schools, building lobbies, gym and pharmacy counters', aed: 2000 },
      { item: 'One community event', aed: 1500 },
      { item: 'Partner and promoter commissions — about AED 100 per member', aed: 2000, note: 'paid only on results' },
    ],
  },
];

export const RESERVE = { aed: 3000, condition: 'Released at Day 14 only to the segment with the lowest cost per member.' };

export const segmentTotal = (b: SegmentBudget) => b.lines.reduce((a, l) => a + l.aed, 0) + (b.gated?.aed ?? 0);
export const COMMITTED = SEGMENT_BUDGETS.reduce((a, b) => a + segmentTotal(b), 0);
export const TOTAL = COMMITTED + RESERVE.aed;
export const BUDGET_BY_SEG: Record<SegmentId, SegmentBudget> = Object.fromEntries(SEGMENT_BUDGETS.map((b) => [b.seg, b])) as Record<SegmentId, SegmentBudget>;

export const fmtAed = (n: number) => `AED ${n.toLocaleString('en-US')}`;
