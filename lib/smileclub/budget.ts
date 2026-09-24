/**
 * Smile Club 30-day budget (rev. 7, 24 Sep) — built from what one member is
 * worth, then allocated by what each segment's members actually cost.
 * Single source of truth for every budget figure in the plan.
 */
import type { SegmentId } from '@/lib/smileclub/segments';

/** How one budget line is actually spent — so nobody has to improvise. */
export interface LineExec {
  /** Exactly what the money buys. */
  what: string;
  /** Who buys it and by which route. */
  buy: string;
  /** Who uses it and how. */
  use: string;
  /** How we see it worked. */
  track: string;
  /** The task that spends it. */
  task: string;
  /** Show the mock-up of this item. */
  mock?: 'invite';
}

export interface BudgetLine { item: string; aed: number; note?: string; exec?: LineExec }

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
      { item: 'Dentist-signed invitation cards + refreshed QR stands', aed: 1100, exec: {
        what: '1,500 A6 cards (500 per branch), 350 gsm matte, printed both sides in English plus the branch language (Arabic or Turkish); 6 acrylic A5 QR stands (2 per branch: desk and waiting area). The figure is an estimate — the two quotes decide.',
        buy: 'Mohan designs → Gautam raises the purchase request to Procurement with two print quotes → Finance approves → delivered to each branch by Mon 28 Sep.',
        use: 'The dentist signs one at the end of a check-up or cleaning and hands it over; the patient brings it to the desk; the receptionist keeps it with the joining form.',
        track: 'Every Friday per branch: cards handed out (stock count) → cards brought to the desk → joined.',
        task: 'g-procure', mock: 'invite' } },
      { item: 'Desk-team thank-you: AED 25 per member signed', aed: 900, note: 'paid only on results', exec: {
        what: 'AED 25 to the branch desk team for each paid chair membership: 36 × 25 = AED 900.',
        buy: 'Nothing to buy. Finance pays monthly with payroll, from the membership report by branch code.',
        use: 'Shared by the desk team on shift; explained at the refresher.',
        track: 'Paid only for memberships that carry the branch code and are paid and active.',
        task: 'g-incentives' } },
    ],
  },
  {
    seg: 'patients', target: 24,
    lines: [
      { item: 'WhatsApp message allowance — up to about 3,000 consent-checked messages', aed: 1000, exec: { what: 'WhatsApp message fees charged through Zavis for each message sent — up to about 3,000.', buy: 'Nothing to buy through Procurement: billed on the Zavis invoice. CRM-DN reports usage to Gautam every Friday.', use: 'Only the dentists’ group messages (waves 1–3) and the approved follow-ups.', track: 'Per dentist code: sent → delivered → replies → joins → opt-outs (Zavis report, Friday).', task: 'c-doctor-send' }, note: 'planning allowance only: 3,000 messages over the 15 weekdays 28 Sep–16 Oct needs about 10 dentists sending at the 20-a-day limit — confirm participating dentists and consenting group sizes first' },
      { item: 'Dentist incentive allowance — AED 40 per paid membership from their own patients', aed: 1000, exec: { what: 'AED 40 per paid membership from the dentist’s own patients (24 × 40 = AED 960).', buy: 'Nothing to buy. Finance pays monthly with payroll from the dentist-code report.', use: 'Explained to each dentist in Dr Luvi’s one-to-one briefing.', track: 'Paid only on memberships carrying that dentist’s code that are paid and active.', task: 'g-incentives' }, note: '24 memberships × AED 40 = AED 960; AED 40 remains within the AED 1,000 allowance; paid only on results' },
    ],
  },
  {
    seg: 'corporate', target: 24,
    lines: [
      { item: 'Print kit — one-pager, savings table, QR cards (EN/AR)', aed: 1500, exec: {
        what: '100 one-pagers (A4, two sides, English/Arabic) with the savings table; 500 QR cards (business-card size) with a space for the company code; 1 pull-up banner for dental days.',
        buy: 'Mohan’s files → Gautam’s purchase request with two quotes → Finance approves → delivered to Gautam by Mon 28 Sep.',
        use: 'A one-pager and a QR card left at every door and meeting; the banner at every dental day.',
        track: 'Kits used against companies visited (Gautam’s pipeline).',
        task: 'g-procure' } },
      { item: 'Two on-site dental days — materials and set-up (2 × 1,500)', aed: 3000, exec: {
        what: 'Per day, for about 60 staff: disposable exam kits, gloves and masks, a portable light, table covers, printed joining forms, and transport for the kit and team.',
        buy: 'Dr Luvi lists the items → Gautam raises the purchase request → Finance approves. Items already in branch stock are not bought.',
        use: 'Dr Luvi’s clinician runs the checks; staff join on the spot with the company QR code.',
        track: 'Per day: staff checked → joined → first visits booked, under the company code.',
        task: 'g-procure-2' } },
      { item: 'LinkedIn warm-up for HR contacts at target companies', aed: 1500, exec: {
        what: 'Sponsored posts shown to HR managers at the companies on Gautam’s list.',
        buy: 'Paid by card on the Dental Nation LinkedIn ad account by Fahad — no Procurement request.',
        use: 'Runs before and during Gautam’s visits, so HR managers have seen Smile Club before he arrives.',
        track: 'Views at target companies, clicks, and meetings where the contact mentions it.',
        task: 'f-linkedin' } },
      { item: 'Door-plan logistics', aed: 1500, exec: {
        what: 'Taxis, parking and small items for about 40 visits and meetings (≈ AED 35 each).',
        buy: 'Gautam pays and claims monthly with receipts (expense claim).',
        use: 'Visits grouped by tower and area to keep trips few.',
        track: 'Spend per visit against the pipeline.',
        task: 'g-doors-20' } },
    ],
  },
  {
    seg: 'search', target: 12,
    lines: [
      { item: 'Google — brand 500 · price searches 1,000 · insurance gap 500', aed: 2000, exec: {
        what: 'Three search campaigns: brand AED 500, price searches AED 1,000, insurance gap AED 500.',
        buy: 'Paid by card on the Google Ads account; Fahad sets daily caps so the month cannot overspend.',
        use: 'Each campaign sends people to the membership page with its own tracking code.',
        track: 'Every Monday: cost per enquiry and per paid member, by campaign.',
        task: 'f-keywords' } },
      { item: 'Facebook/Instagram — people who already visited us', aed: 1500, exec: {
        what: 'Reminder ads to people who visited the Smile Club page, plus a “chat on WhatsApp” ad.',
        buy: 'Paid by card on the Meta ad account; Fahad sets daily caps.',
        use: 'Uses Mohan’s ad designs; every click carries its code.',
        track: 'Every Monday: cost per enquiry and per paid member.',
        task: 'f-meta' } },
    ],
    gated: { aed: 3500, condition: 'Considered on 5 Oct, never released automatically: only if a paid online membership has cost AED 600 or less after enough follow-up time — zero paid memberships means hold. Google price searches +1,500; Facebook/Instagram +2,000 waits for its first seven-day review (Fri 9 Oct) if it launched 2 Oct.' },
  },
  {
    seg: 'community', target: 24,
    lines: [
      { item: 'Printed material — schools, building lobbies, gym and pharmacy counters', aed: 2000, exec: {
        what: '60 A3 lobby posters, 40 A5 counter cards with stands, 1,500 A5 school leaflets — each with its location’s own QR code.',
        buy: 'Mohan’s files → Gautam’s purchase request → Finance approves → delivered to Fahad by Thu 8 Oct.',
        use: 'Fahad places them with partners, building managers and two schools.',
        track: 'Joins by each location’s code.',
        task: 'g-procure-2' } },
      { item: 'One community event', aed: 1500, exec: {
        what: 'A stand at a school or community event: table, banner (reusing the corporate banner), check kits, leaflets and children’s toothbrush kits.',
        buy: 'Dr Luvi lists the items → Gautam orders with the dental-day kit; clinical items from branch stock.',
        use: 'Free smile checks; joining by QR with the event code; first visits booked.',
        track: 'Checks → joins → bookings under the event code.',
        task: 'l-csr' } },
      { item: 'Shared partner and promoter commission allowance — about AED 100 per paid membership', aed: 2000, exec: { what: 'About AED 100 per paid member brought by a partner or promoter.', buy: 'Nothing to buy. Finance pays monthly from the partner-code report, after checking each membership is paid and active.', use: 'Written into each partner’s one-page agreement.', track: 'Joins per partner code.', task: 'f-partners' }, note: 'one AED 2,000 allowance for 20 partner memberships: 7 local businesses + 7 promoters + 3 brokers + 3 benefit platforms; no duplicate commission' },
    ],
  },
];

export const RESERVE = { aed: 3000, condition: 'Released at Day 14 only to the segment with the lowest cost per member.' };

export const segmentTotal = (b: SegmentBudget) => b.lines.reduce((a, l) => a + l.aed, 0) + (b.gated?.aed ?? 0);
export const COMMITTED = SEGMENT_BUDGETS.reduce((a, b) => a + segmentTotal(b), 0);
export const TOTAL = COMMITTED + RESERVE.aed;
/** Held back until the 5 Oct review. */
export const HELD = SEGMENT_BUDGETS.reduce((a, b) => a + (b.gated?.aed ?? 0), 0);
/** Released on sign-off. */
export const SPEND_NOW = COMMITTED - HELD;

/** The one purchasing route for every item that is bought. */
export const PROCUREMENT_STEPS = [
  'The line’s owner (usually Mohan for print, Dr Luvi for clinical items) sends Gautam the spec and quantity.',
  'Gautam raises the purchase request to Procurement, copying Finance, with two supplier quotes.',
  'Finance approves against the budget line; anything above the line goes to Fahad first.',
  'Procurement issues the purchase order; the receiver confirms quantities on the task when it arrives.',
];
export const BUDGET_BY_SEG: Record<SegmentId, SegmentBudget> = Object.fromEntries(SEGMENT_BUDGETS.map((b) => [b.seg, b])) as Record<SegmentId, SegmentBudget>;

export const fmtAed = (n: number) => `AED ${n.toLocaleString('en-US')}`;
