import { PLAN_RATES, PLAN_Y1 } from './plan-model';

/**
 * THE IMPACT REGISTRY — every action translated into patients.
 *
 * Mr. Akbar's instruction: "every single action that we'll do should translate
 * to patients." So nothing appears on this page as an activity. Each item
 * declares the plan line it owns, the monthly qualified leads that line
 * carries, and therefore the patients and revenue that depend on it.
 *
 * HOW THE ARITHMETIC WORKS, AND WHERE IT STOPS
 *
 * Channel items are grounded: the plan assigns each channel a share of the
 * Year-1 lead target, so "SEO carries 10% of 38,985 leads" is the plan's own
 * number divided by twelve, not an invention.
 *
 * Roles and systems are DIFFERENT and the page must not pretend otherwise. The
 * plan does not say "a designer produces N leads" — no honest plan would. What
 * it does say is which lines exist, and those lines need someone to run them.
 * So a role's impact is expressed as the volume it OWNS: the leads that do not
 * arrive if nobody is doing that job. That is a real, defensible statement of
 * consequence, and it is labelled `enables` rather than `adds` so nobody reads
 * it as incremental on top of the channels.
 *
 * Double counting is therefore impossible by construction: only items of kind
 * 'channel' contribute to the waterfall total. Everything else explains who
 * makes those channels reach their number.
 */

/** Monthly qualified-lead target at full plan run rate. */
export const PLAN_MONTHLY_QLS = Math.round(PLAN_Y1.totalQLs.value / 12);
/** Monthly new patients at full run rate — QLs × the plan's 20% arrival rate. */
export const PLAN_MONTHLY_PATIENTS = Math.round(PLAN_MONTHLY_QLS * PLAN_RATES.arrivalRate.value);

/** Leads a channel carries per month, from its share of the Year-1 target. */
const fromShare = (share: number) => Math.round((PLAN_Y1.totalQLs.value * share) / 12);

export type ImpactKind = 'channel' | 'system' | 'role' | 'capacity';
export type ImpactState = 'LIVE' | 'PIPELINE' | 'FUTURE';

export interface ImpactItem {
  id: string;
  name: string;
  kind: ImpactKind;
  state: ImpactState;
  /** Plain-words description of what it does. */
  what: string;
  /**
   * Monthly qualified leads. For 'channel' this is additive into the
   * waterfall. For every other kind it is the volume the item ENABLES —
   * shown, but never summed, so nothing is counted twice.
   */
  monthlyLeads: number;
  /** How the number was derived, in one line. */
  basis: string;
  /** Which funnel stages it touches. */
  stages: string[];
  /** Only for non-channel items: the consequence if it is not done. */
  ifAbsent?: string;
}

export const IMPACTS: ImpactItem[] = [
  // ── Paid channels — LIVE today, scaling under the plan ────────────────────
  {
    id: 'google-search',
    name: 'Google Search (exact match)',
    kind: 'channel',
    state: 'LIVE',
    what: 'Catches people already searching for a dentist — the highest intent demand there is.',
    monthlyLeads: fromShare(0.22),
    basis: '22% of the Year-1 lead target · cost per lead AED 140',
    stages: ['reach', 'inquiries'],
  },
  {
    id: 'pmax',
    name: 'Performance Max',
    kind: 'channel',
    state: 'PIPELINE',
    what: 'Google’s automated placement across search, maps, YouTube and display — reach at category scale.',
    // 14%, not the plan's 18%: the performance partner below sources 4% of the
    // paid envelope, and it is carved OUT of this line rather than added on
    // top. The plan's channel shares total 100%; if a partner were added
    // alongside them the funnel would total 104% and the waterfall would
    // "reach" 123% of a target that is by definition 100%.
    monthlyLeads: fromShare(0.14),
    basis: '14% of the Year-1 lead target · cost per lead AED 150 · a further 4% is delivered by the partner below',
    stages: ['reach', 'inquiries'],
  },
  {
    id: 'meta-ctw',
    name: 'Meta click-to-WhatsApp',
    kind: 'channel',
    state: 'PIPELINE',
    what: 'Instagram and Facebook adverts that open a WhatsApp chat directly — no form to fill in.',
    monthlyLeads: fromShare(0.16),
    basis: '16% of the Year-1 lead target · cost per lead AED 170',
    stages: ['reach', 'inquiries'],
  },
  {
    id: 'meta-lead',
    name: 'Meta lead ads',
    kind: 'channel',
    state: 'PIPELINE',
    what: 'Short in-app forms for people who are interested but not yet ready to talk.',
    monthlyLeads: fromShare(0.08),
    basis: '8% of the Year-1 lead target · cost per lead AED 140',
    stages: ['reach', 'inquiries'],
  },
  {
    id: 'tiktok',
    name: 'TikTok lead generation',
    kind: 'channel',
    state: 'FUTURE',
    what: 'Creator-made videos and treatment walkthroughs aimed at a younger audience.',
    monthlyLeads: fromShare(0.1),
    basis: '10% of the Year-1 lead target · cost per lead AED 160',
    stages: ['reach', 'inquiries'],
  },
  {
    id: 'youtube-rmk',
    name: 'YouTube remarketing',
    kind: 'channel',
    state: 'FUTURE',
    what: 'Short proof-led films shown to people who already visited but did not book.',
    monthlyLeads: fromShare(0.06),
    basis: '6% of the Year-1 lead target · cost per lead AED 320 — an assist channel',
    stages: ['reach', 'inquiries'],
  },
  {
    id: 'araby',
    name: 'Araby Ads — partner & affiliate campaigns',
    kind: 'channel',
    state: 'LIVE',
    what: 'An external performance partner buying leads on our behalf, paid per qualified lead.',
    monthlyLeads: fromShare(0.04),
    basis: 'Partner-sourced volume, reconciled line-by-line against our own data before it is accepted',
    stages: ['reach', 'inquiries'],
  },

  // ── Organic channels — the Zavis Marketing-OS deliverables ────────────────
  {
    id: 'seo-local',
    name: 'SEO & Google Business Profile',
    kind: 'channel',
    state: 'PIPELINE',
    what: 'Ranking for treatment searches and in the local map pack, and collecting reviews that make people choose us.',
    monthlyLeads: fromShare(0.1),
    basis: '10% of the Year-1 lead target · effective cost per lead AED 80 — roughly half the paid average',
    stages: ['visibility', 'reach', 'inquiries'],
  },
  {
    id: 'programmatic-seo',
    name: 'Programmatic SEO',
    kind: 'system',
    state: 'PIPELINE',
    what: 'Generating a page for every treatment and every area at once, instead of writing them one at a time.',
    monthlyLeads: fromShare(0.1),
    basis: 'The mechanism behind the SEO lead target — it is how 10% share becomes reachable inside a year',
    stages: ['visibility', 'reach'],
    ifAbsent: 'SEO stays hand-written, a handful of pages a month, and the 10% organic share slips beyond Year 1.',
  },
  {
    id: 'ai-seo',
    name: 'AI search & off-page authority',
    kind: 'system',
    state: 'FUTURE',
    what: 'Being the clinic that AI assistants name when someone asks them to recommend a dentist in Dubai.',
    monthlyLeads: 0,
    basis: 'Brand affinity — it raises who knows us, which every other channel then converts more cheaply',
    stages: ['visibility'],
    ifAbsent: 'We stay invisible in the answer engines a growing share of patients now ask first.',
  },
  {
    id: 'referrals',
    name: 'Referrals & word of mouth',
    kind: 'channel',
    state: 'FUTURE',
    what: 'Existing patients recommending us, with a referral code so it can be measured.',
    monthlyLeads: fromShare(0.04),
    basis: '4% of the Year-1 lead target · effective cost per lead AED 60 — the cheapest demand there is',
    stages: ['referral', 'inquiries'],
  },
  {
    id: 'corporate',
    name: 'Corporate, schools & banks',
    kind: 'channel',
    state: 'FUTURE',
    what: 'On-site screenings and staff pricing with employers, schools and banks.',
    monthlyLeads: fromShare(0.03),
    basis: '3% of the Year-1 lead target · effective cost per lead AED 75',
    stages: ['inquiries'],
  },
  {
    id: 'reactivation',
    name: 'Database reactivation',
    kind: 'channel',
    state: 'PIPELINE',
    what: 'WhatsApp and calls to patients who have not been back — people who already trust us.',
    monthlyLeads: fromShare(0.02),
    basis: '2% of the Year-1 lead target · effective cost per lead AED 70',
    stages: ['retention', 'inquiries'],
  },
  {
    id: 'pr',
    name: 'PR & earned media',
    kind: 'channel',
    state: 'FUTURE',
    what: 'Coverage in health and lifestyle press — trust we do not have to buy.',
    monthlyLeads: fromShare(0.01),
    basis: '1% of the Year-1 lead target · effective cost per lead AED 90',
    stages: ['visibility', 'inquiries'],
  },

  // ── Systems already built ─────────────────────────────────────────────────
  {
    id: 'creative-platform',
    name: 'Asset generation platform',
    kind: 'system',
    state: 'LIVE',
    what: 'Our own software for producing adverts — 20–30 videos and 20–30 statics a month without an agency.',
    monthlyLeads: fromShare(0.8),
    basis: 'Every paid channel needs creative; without a supply of it the paid lead target cannot be bought at any budget',
    stages: ['reach'],
    ifAbsent: 'Creative becomes the bottleneck: ad fatigue raises cost per lead and the paid plan quietly under-delivers.',
  },
  {
    id: 'marketing-os',
    name: 'Marketing Operating System & WhatsApp',
    kind: 'system',
    state: 'LIVE',
    what: 'Every patient conversation in one place, answered fast, with booking and no-show recovery built in.',
    monthlyLeads: 0,
    basis: 'Owns the step from asking to booking — the plan needs 25% of leads to book, and speed of reply is what decides it',
    stages: ['inquiries', 'bookings', 'showups'],
    ifAbsent: 'Leads arrive and cool. Every point lost on lead-to-booking costs about 32 patients a month at plan volume.',
  },
  {
    id: 'dashboard',
    name: 'The control dashboard',
    kind: 'system',
    state: 'LIVE',
    what: 'Twelve data sources in one screen, refreshed every fifteen minutes — this page reads from it.',
    monthlyLeads: 0,
    basis: 'Measurement is what lets budget move to what works; without it, spend is allocated on opinion',
    stages: ['visibility', 'reach', 'inquiries', 'bookings', 'showups', 'treatments', 'revenue'],
    ifAbsent: 'No one can tell which half of the budget is working, so none of it can be defended or scaled.',
  },

  // ── The hires ─────────────────────────────────────────────────────────────
  {
    id: 'hire-designer',
    name: 'Senior digital designer (full time)',
    kind: 'role',
    state: 'PIPELINE',
    what: 'Design system, landing pages, ad sets and motion — the supply of creative every paid channel burns through.',
    monthlyLeads: fromShare(0.8),
    basis: 'Owns the creative behind the 80% of leads that come from paid and paid-assisted channels',
    stages: ['reach', 'inquiries'],
    ifAbsent: 'Ad creative goes stale, cost per lead drifts up from the AED 140–170 the plan assumes, and the budget buys fewer patients.',
  },
  {
    id: 'hire-creative-director',
    name: 'Creative director',
    kind: 'role',
    state: 'FUTURE',
    what: 'Owns how the group looks and sounds, and the doctor-led proof content that makes people choose a clinic.',
    monthlyLeads: 0,
    basis: 'Brand affinity and proof — the stage before anyone counts as a lead, and the reason a lead converts rather than shops around',
    stages: ['visibility'],
    ifAbsent: 'We compete on price and proximity instead of preference, which is the expensive way to buy patients.',
  },
  {
    id: 'hire-growth-manager',
    name: 'Full-stack growth manager (full time)',
    kind: 'role',
    state: 'PIPELINE',
    what: 'Runs Search, Performance Max, Meta and TikTok day to day, and moves budget to whatever is working.',
    monthlyLeads: fromShare(0.8),
    basis: 'Owns the entire paid mix — the plan’s target of cost per lead at or below AED 150 by month six depends on someone doing this daily',
    stages: ['reach', 'inquiries'],
    ifAbsent: 'Campaigns run unattended. The plan’s CPL improvement from AED 250 to AED 153 does not happen on its own.',
  },
  {
    id: 'hire-coordinator',
    name: 'Patient recall & retention lead (full time)',
    kind: 'role',
    state: 'PIPELINE',
    what: 'Looks after patients after the first visit: recall, membership, reactivation and the follow-up that turns one visit into a relationship.',
    monthlyLeads: Math.round(PLAN_Y1.existingRecall.value / 12),
    basis: `Owns the ${PLAN_Y1.existingRecall.value.toLocaleString('en-US')} existing and recall interactions the plan expects in Year 1 — more than twice the new-patient number`,
    stages: ['retention', 'referral', 'showups'],
    ifAbsent: 'The largest patient pool in the plan goes untouched, and first-visit revenue never compounds into lifetime value.',
  },

  // ── Capacity ──────────────────────────────────────────────────────────────
  {
    id: 'difc',
    name: 'DIFC clinic',
    kind: 'capacity',
    state: 'FUTURE',
    what: 'Index Tower, six chairs, opening Q1-2027 — plugs into this same system from day one.',
    monthlyLeads: 0,
    basis: 'Adds 1,928 arrivals of capacity by Q4 — demand only becomes revenue if there is a chair to put it in',
    stages: ['bookings', 'showups', 'treatments'],
    ifAbsent: 'Demand generated above current chair capacity has nowhere to go and is turned away.',
  },
  {
    id: 'fairmont',
    name: 'Fairmont clinic',
    kind: 'capacity',
    state: 'FUTURE',
    what: 'Four chairs serving the Fairmont catchment.',
    basis: 'Adds 1,607 arrivals of capacity by Q4',
    monthlyLeads: 0,
    stages: ['bookings', 'showups', 'treatments'],
    ifAbsent: 'Capacity stays the ceiling on how much of the plan can actually be delivered.',
  },
];

/** Only channels carry additive lead volume — see the double-counting note. */
export const CHANNEL_IMPACTS = IMPACTS.filter((i) => i.kind === 'channel');

export const impactsByState = (state: ImpactState) => IMPACTS.filter((i) => i.state === state);

/** Monthly leads currently switched on. */
export function leadsFor(ids: Set<string>): number {
  return CHANNEL_IMPACTS.filter((c) => ids.has(c.id)).reduce((a, c) => a + c.monthlyLeads, 0);
}

/** Leads → patients → first-visit revenue, using the plan's own rates. */
export function toPatients(leads: number): number {
  return Math.round(leads * PLAN_RATES.arrivalRate.value);
}
export function toRevenue(patients: number): { low: number; high: number } {
  return { low: patients * PLAN_RATES.aovLow.value, high: patients * PLAN_RATES.aovHigh.value };
}

/**
 * A discrepancy the two source documents carry, surfaced rather than smoothed.
 *
 * The March Revenue Rescue Plan models 500 patients a month producing
 * AED 500K — an average of AED 1,000 per patient. The Year-1 Comprehensive
 * Plan models first-visit value at AED 470–770. Both are internally
 * consistent; they are measuring different things (the AED 1,000 figure
 * appears to include follow-on treatment). The page uses the Year-1 figure
 * because it is the more conservative of the two, and says so.
 */
export const AOV_DISCREPANCY_NOTE =
  'The March plan assumes AED 1,000 per patient; the Year-1 plan assumes AED 470–770 for the first visit and counts follow-on treatment separately. This page uses the lower Year-1 figure throughout.';
