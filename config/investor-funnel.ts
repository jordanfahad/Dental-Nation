/**
 * Investor Funnel Dashboard — content source (build spec v2).
 *
 * Mr. Akbar's bar: "a very amazing infographic… very logical, not at all
 * confusing, for a layman." So the governing rule for every string in this
 * file is the LAYMAN TEST: the funnel must read as one sentence to someone
 * with no marketing background —
 *
 *   "We reached 2.1M people; 8,400 asked; 3,100 booked; 2,400 came in;
 *    1,600 started treatment; that produced AED X."
 *
 * Plain words are ALWAYS primary; the technical term is a secondary caption.
 * No unexplained acronyms — if CPL appears it appears as
 * "cost per inquiry (CPL)". If a label needs marketing knowledge to parse,
 * it is wrong and must be rewritten.
 */

export type StageId =
  | 'visibility'
  | 'reach'
  | 'inquiries'
  | 'bookings'
  | 'showups'
  | 'treatments'
  | 'revenue';

export interface FunnelStage {
  id: StageId;
  n: number;
  /** Plain words — what a layman reads first. */
  label: string;
  /** The technical term, small, second. */
  caption: string;
  /** One sentence: "What this means". */
  meaning: string;
  /** Unit for the big number. */
  unit: 'people' | 'count' | 'aed';
  /** Where the real number will come from in Phase 2 (shown as a source caption). */
  source: string;
  /** The word used in the conversion chip leading INTO this stage. */
  ofPrevious?: string;
}

export const STAGES: FunnelStage[] = [
  {
    id: 'visibility',
    n: 1,
    label: 'People who know us',
    caption: 'Brand searches, followers, reviews',
    meaning:
      'How many people already recognise Dental Nation — they search for us by name, follow us, or leave us a review. This is the audience we have earned rather than paid for.',
    unit: 'people',
    source: 'Search Console brand queries · social followers · review platforms',
  },
  {
    id: 'reach',
    n: 2,
    label: 'People who saw us',
    caption: 'Impressions and unique reach',
    meaning:
      'How many people our clinics appeared in front of this period — through ads, search results and social. Seeing us is the first step; it does not yet mean they acted.',
    unit: 'people',
    source: 'Meta & Google Ads impressions · Search Console impressions',
    ofPrevious: 'of the people who know us',
  },
  {
    id: 'inquiries',
    n: 3,
    label: 'People who asked about treatment',
    caption: 'Inbound leads — calls, WhatsApp, forms',
    meaning:
      'People who did something about it: called a clinic, messaged us on WhatsApp, or filled in a form. This is the first moment a person becomes a real opportunity.',
    unit: 'count',
    source: 'Lane E lead tables · Zavis CRM conversations',
    ofPrevious: 'of the people who saw us',
  },
  {
    id: 'bookings',
    n: 4,
    label: 'Inquiries that became appointments',
    caption: 'Confirmed bookings',
    meaning:
      'Of the people who asked, how many we actually got into the diary with a date and a time. This is where speed of reply matters most.',
    unit: 'count',
    source: 'Practo — the clinics’ booking system of record',
    ofPrevious: 'of the people who asked',
  },
  {
    id: 'showups',
    n: 5,
    label: 'Patients who walked in',
    caption: 'Show-up rate',
    meaning:
      'Of the appointments booked, how many people actually arrived. Everyone who books but does not arrive is money already spent with nothing to show for it.',
    unit: 'count',
    source: 'Practo attendance — arrived and completed',
    ofPrevious: 'of the appointments booked',
  },
  {
    id: 'treatments',
    n: 6,
    label: 'Visits that became treatment',
    caption: 'Treatment plans started',
    meaning:
      'Of the patients who walked in, how many went ahead with a course of treatment rather than only a consultation.',
    unit: 'count',
    source: 'Clinic treatment records',
    ofPrevious: 'of the patients who walked in',
  },
  {
    id: 'revenue',
    n: 7,
    label: 'What that care generated',
    caption: 'Billed revenue, AED',
    meaning:
      'The money those treatments actually billed. This is the end of the chain that started with someone simply seeing our name.',
    unit: 'aed',
    source: 'Practo billing · group revenue platform',
    ofPrevious: 'from the treatments started',
  },
];

// ── Projects powering each stage (spec §4 seed map) ─────────────────────────

export type ProjectState = 'LIVE' | 'PIPELINE' | 'FUTURE';

export interface FunnelProject {
  name: string;
  state: ProjectState;
  stages: StageId[];
  /** One line: what it does, or what it adds when switched on. */
  note: string;
  /** Only for PIPELINE/FUTURE — always rendered as an explicit projection. */
  projected?: string;
  /** true when the name itself still needs confirming (renders as a pending chip). */
  pending?: boolean;
}

export const PROJECTS: FunnelProject[] = [
  {
    name: 'dentalnation.com',
    state: 'LIVE',
    stages: ['visibility', 'reach', 'inquiries'],
    note: 'The group’s owned front door — every paid click and organic search lands here.',
  },
  {
    name: 'Paid campaigns — Meta & Google',
    state: 'LIVE',
    stages: ['reach', 'inquiries'],
    note: 'Running since December 2025, per clinic and per practitioner.',
  },
  {
    name: 'Marketing Operating System + WhatsApp',
    state: 'LIVE',
    stages: ['inquiries', 'bookings', 'showups'],
    note: 'Speed of reply, booking flows and no-show recovery — the conversion layer.',
  },
  {
    name: 'Lane E control dashboard',
    state: 'LIVE',
    stages: ['visibility', 'reach', 'inquiries', 'bookings', 'showups', 'treatments', 'revenue'],
    note: 'The measurement spine. This page reads from it.',
  },
  {
    name: 'In-house creative engine',
    state: 'LIVE',
    stages: ['reach'],
    note: 'Our own production platform — more creative, faster, without an agency retainer.',
  },
  {
    name: 'Smile Club',
    state: 'LIVE',
    stages: ['revenue'],
    note: 'Membership programme — recurring revenue and a reason to come back.',
  },
  {
    name: 'Performance partner campaigns',
    state: 'LIVE',
    stages: ['inquiries'],
    note: 'External lead partner, reconciled line-by-line against our own data before anything is accepted.',
    pending: true,
  },
  {
    name: 'Demand generation ramp',
    state: 'PIPELINE',
    stages: ['reach', 'inquiries'],
    note: 'Sized plan across search, social and influencer — three engines with separate jobs.',
    projected: 'Targets 2,500 inquiries a month at full run rate',
  },
  {
    name: 'Voice agent',
    state: 'PIPELINE',
    stages: ['bookings', 'showups'],
    note: 'Answers and books when reception cannot. Infrastructure built; in development.',
    projected: 'Recovers a share of unanswered calls and overdue recalls',
  },
  {
    name: 'Lane B · D · E campaign launch',
    state: 'PIPELINE',
    stages: ['reach', 'inquiries'],
    note: 'Family, Emergency and Lifestyle launching together — waiting only on creative assets.',
    projected: 'Three lanes live simultaneously rather than in sequence',
  },
  {
    name: 'Smile Club corporate partnerships',
    state: 'FUTURE',
    stages: ['inquiries', 'revenue'],
    note: 'One 50-employee contract is worth AED 75–150K a year at almost no acquisition cost.',
    projected: 'Adds a contracted revenue base independent of advertising',
  },
  {
    name: 'Institutional channels — schools, corporates, residential',
    state: 'FUTURE',
    stages: ['visibility', 'reach', 'inquiries'],
    note: 'Eighteen routes to patients that are more trusted than ads and cheaper than paid media.',
    projected: 'Opens demand that does not compete on advertising cost',
  },
  {
    name: 'DIFC clinic',
    state: 'FUTURE',
    stages: ['bookings', 'showups', 'treatments', 'revenue'],
    note: 'Index Tower, opening Q1-2027 — plugs into this same system from day one.',
    projected: 'Adds chair capacity, which is what converts demand into revenue',
  },
  {
    name: 'Dental tourism pages — Arabic, Hindi, French',
    state: 'FUTURE',
    stages: ['reach', 'inquiries'],
    note: 'Multilingual landing pages aimed at patients travelling to Dubai for treatment.',
    projected: 'Reaches demand that never sees an English-language ad',
  },
];

export function projectsForStage(id: StageId): FunnelProject[] {
  const order: Record<ProjectState, number> = { LIVE: 0, PIPELINE: 1, FUTURE: 2 };
  return PROJECTS.filter((p) => p.stages.includes(id)).sort((a, b) => order[a.state] - order[b.state]);
}

// ── "The machine we built" (spec §5) ────────────────────────────────────────

export interface MachineSystem {
  name: string;
  what: string;
  powers: StageId[];
}

export const MACHINE: MachineSystem[] = [
  { name: 'The website', what: 'Our own front door, working every hour of every day.', powers: ['visibility', 'reach', 'inquiries'] },
  { name: 'The paid engine', what: 'Advertising across search and social, measured to the dirham.', powers: ['reach', 'inquiries'] },
  { name: 'The creative engine', what: 'We produce our own adverts — no agency retainer.', powers: ['reach'] },
  { name: 'Marketing Operating System', what: 'WhatsApp and patient conversations, answered and tracked in one place.', powers: ['inquiries', 'bookings', 'showups'] },
  { name: 'The control dashboard', what: 'Twelve data sources in one screen, refreshed every fifteen minutes.', powers: ['visibility', 'reach', 'inquiries', 'bookings', 'showups', 'treatments', 'revenue'] },
  { name: 'Smile Club', what: 'Membership that turns one visit into an ongoing relationship.', powers: ['revenue'] },
];

/** The honest narrative under the machine map — verbatim tone from the spec. */
export const MACHINE_NARRATIVE =
  'Lead volume is not yet where the targets say it should be. What has been built in eight months is the machine that gets it there: every system above is live, connected, and measuring itself — this page runs on it. Infrastructure like this is what lets budget turn into patients predictably, and it holds its value independent of any single campaign.';

// ── Hero + framing copy ─────────────────────────────────────────────────────

export const HERO = {
  eyebrow: 'Dental Nation',
  title: 'How the growth machine works',
  standfirst:
    'This page shows how people find us, book, show up, get treated — and what that produces. Every stage below can be opened to see exactly what feeds it.',
};

export const PERIODS = [
  { key: 'month', label: 'This month' },
  { key: 'quarter', label: 'This quarter' },
  { key: 'launch', label: 'Since Dec 2025' },
] as const;

export type PeriodKey = (typeof PERIODS)[number]['key'];
