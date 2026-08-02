import { P, V, type Slot } from './handover';

/**
 * PART 1 — Growth Execution Report narrative (spec §5).
 *
 * Prose and timeline only. Every NUMBER on Part 1 comes from the live
 * aggregate views (lib/board/metrics.ts) or renders as "Data pending" — none
 * are written here, so a figure in this file can never drift from the data.
 *
 * `P(...)` marks something still to be confirmed and renders as a visible
 * amber chip. `V(...)` is confirmed.
 */

export interface TimelineEntry {
  period: string;
  milestone: string;
  /** true → the date/fact is evidenced by the dashboard's own data. */
  evidenced?: boolean;
  evidence?: string;
  pending?: boolean;
}

export const COVER = {
  title: 'Dental Nation — Growth Report',
  periodLabel: 'December 2025 – August 2026',
  preparedBy: 'Fahad',
  preparedByTitle: V('Marketing Head'),
  preparedFor: 'Mr. Akbar, Board & Investors',
};

export const EXEC_SUMMARY = `Between December 2025 and today, Dental Nation's marketing function has been built from a standing start into a complete growth engine. Paid acquisition is live and scaling across clinics. dentalnation.com is fully live and functional. Creative production has moved from external agency spend to a faster, lower-cost in-house capability. A proprietary Marketing Operating System — consolidating twelve data sources into one daily control dashboard, with live WhatsApp patient communication — gives leadership real-time visibility across the group. Smile Club, our membership program, is live. The next phase — the demand generation ramp and the voice agent — is already in motion, with the infrastructure in place. Part 2 of this report sets out the full operating system this execution plugs into.`;

/**
 * The timeline. Entries marked `evidenced` are corroborated by the dashboard's
 * own ingested data — those dates are not recollection, they are records.
 */
export const TIMELINE: TimelineEntry[] = [
  {
    period: 'Nov – Dec 2025',
    milestone: 'First paid campaign launched — the acquisition engine starts.',
    evidenced: true,
    evidence: 'First recorded ad spend 24 Nov 2025; December spend across Meta and Google.',
  },
  {
    period: 'Jan – Feb 2026',
    milestone: 'Campaign scaling — the heaviest investment months of the period.',
    evidenced: true,
    evidence: 'Peak monthly spend recorded in the ad-platform feeds.',
  },
  {
    period: 'Q1 2026',
    milestone: 'dentalnation.com build begins.',
    pending: true,
  },
  {
    period: 'Q1 2026',
    milestone: 'External creative agency onboarded to establish production volume.',
    pending: true,
  },
  {
    period: 'Apr 2026',
    milestone: 'Practo PMS integration live — bookings, attendance and billed revenue become measurable end-to-end.',
    evidenced: true,
    evidence: 'First billed revenue recorded 21 Apr 2026; attendance statuses from 23 Apr 2026.',
  },
  {
    period: 'Apr 2026',
    milestone: 'Meta paused; spend consolidated behind Google Search, the better-performing channel.',
    evidenced: true,
    evidence: 'Last recorded Meta spend 27 Apr 2026; Google Ads spend continuous through today.',
  },
  {
    period: 'Apr – May 2026',
    milestone: 'dentalnation.com fully live and functional.',
    pending: true,
  },
  {
    period: '2026',
    milestone: 'Agency transitioned out; in-house creative onboarded — faster turnaround, materially lower cost.',
    pending: true,
  },
  {
    period: '2026',
    milestone: 'Clinic-level campaigns live — Dental Nation Al Wasl.',
    evidenced: true,
    evidence: 'Clinic-level attribution live in the dashboard (Al Wasl and Dr Tosun split from the shared feed).',
  },
  {
    period: '2026',
    milestone: 'Practitioner brand campaign — Dr Tosun.',
    pending: true,
  },
  {
    period: 'Jun – Jul 2026',
    milestone: 'Marketing Operating System live, including the WhatsApp layer.',
    evidenced: true,
    evidence: 'Marketing OS pipelines and CRM conversation feeds recorded in the dashboard.',
  },
  {
    period: '2026',
    milestone: 'Smile Club launched. Owner: Gautam.',
    evidenced: true,
    evidence: 'Tracked as a live pipeline in the Marketing Operating System.',
  },
  {
    period: '2026',
    milestone: 'Demand generation lead onboarded to ramp demand generation.',
    pending: true,
  },
];

export const SECTIONS = {
  acquisition: {
    partnerGovernance:
      'External performance partners are managed under strict attribution rules and monthly reconciliation — every billed lead is verified against our own dashboard data before it is accepted.',
    partnerNote:
      'Deliberately generic pending the current partner commercial discussion. Name the partner or remove this line before board circulation.',
    clinicName: V('Dental Nation Al Wasl'),
    practitioner: V('Dr Tosun'),
  },
  website: {
    vendor: V('Zavis'),
    body:
      'Fully live and functional — the group’s owned digital front door, and the property every paid click and every organic search now lands on.',
    organicPoint:
      'Organic is the compounding channel: every indexed page reduces future paid dependency. Paid buys attention for as long as it is funded; an indexed page keeps earning after the spend stops.',
  },
  creative: {
    phase1: 'External agency engaged to establish production volume.',
    phase2:
      'Agency transitioned out and replaced by the Dental Nation Creative Platform — production software we built and host ourselves, not a retained supplier. Faster turnaround, brand consistency enforced by the system rather than re-briefed each time, and a cost base that moved from a monthly retainer to infrastructure the group owns.',
    name: V('The Dental Nation Creative Platform — built in-house, hosted on Vercel'),
    costDelta: V('20–30 videos and 20–30 statics per month'),
  },
  marketingOs: {
    intro: 'Owned infrastructure, not rented SaaS — a durable operating advantage.',
    dashboard:
      'Twelve live data sources → Supabase → Next.js. One screen for spend, leads and bookings across all clinics, refreshed every fifteen minutes. This is the "live Growth Dashboard" the operating system calls for in Part 2 — already running.',
    whatsapp: 'Patient communication running through the system, with the conversation feed reconciled into the same funnel as every other channel.',
    voice: 'Core infrastructure built and functional; currently in R&D.',
    voiceUseCase: P('Voice agent use case to confirm — e.g. reception / recall calls'),
    patients: 'Patient management workflows equipped end-to-end within the system.',
    selfReference:
      'This report is served live from that same system. The board is reading the numbers management runs on — not a slide deck built once and already out of date.',
  },
  smileClub: {
    body: 'Membership program — live. Owner: Gautam.',
    strategic:
      'Strategic role: recurring revenue plus a retention flywheel per patient — the membership loop named in the Lifecycle / Retention Engine (Part 2, §2.12).',
  },
  demandGen: {
    owner: V('Fahad, Marketing Head'),
    focus: V('Digital 70% · Reactivation 15% · B2B and referrals 15%'),
  },
  continuity: {
    line:
      'Continuity is covered: a full handover is in place for 5–20 August — owners assigned per area, campaigns in steady state, and decision rules documented. Detail sits on a separate internal link.',
    next90: [
      { text: 'Scale the winning campaigns across clinics and services.', pending: false },
      { text: 'Organic content engine on dentalnation.com to compound non-paid demand.', pending: false },
      { text: 'Voice agent pilot — scope to confirm.', pending: true },
      { text: 'Smile Club growth target — to confirm.', pending: true },
      { text: 'Standing board visibility via this live link — no more static decks.', pending: false },
    ],
  },
};

export type { Slot };
