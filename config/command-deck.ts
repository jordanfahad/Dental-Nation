/**
 * Command Deck (build spec v3) — the board/investor instrument one-pager.
 *
 * This file holds what is POLICY: which components appear in the revenue
 * waterfall and in what order, which of them have a real revenue-attribution
 * chain today, and the plain-English copy the board reads. The numbers all
 * come from aggregate-only views at request time (lib/deck/commandDeck.ts).
 *
 * THE ONE RULE THIS FILE EXISTS TO ENFORCE
 * A component either has an identity chain from click/enquiry to a billed
 * patient, or it does not. Where it does, its revenue is measured and shown as
 * a bar. Where it does not, the deck says "revenue attribution pending" and
 * shows the leads/spend it CAN prove. No component ever gets a modelled or
 * apportioned share dressed up as an actual — a board number that cannot
 * survive "where did that come from?" is worse than no number.
 */

/** Waterfall component keys, in the order the bars are laid out. */
export type ComponentKey =
  | 'seo'
  | 'ai_seo'
  | 'social_organic'
  | 'gmb'
  | 'google_ads'
  | 'meta'
  | 'partner'
  | 'smile_club'
  | 'crm'
  | 'ai_agent'
  | 'widget'
  | 'direct'
  | 'unattributed';

export interface ComponentDef {
  key: ComponentKey;
  label: string;
  /** One line: what this route actually is, in the board's language. */
  detail: string;
  /**
   * 'measured'  — a billed patient can be traced to this route; it gets a bar.
   * 'pending'   — real activity, but no identity chain to revenue yet.
   * 'residual'  — the honest remainder (direct/walk-in, or no CRM record).
   */
  attribution: 'measured' | 'pending' | 'residual';
  /** Why attribution is pending — shown on the deck, never hidden. */
  pendingNote?: string;
}

/**
 * Bar order runs acquisition-first (the things we spend on and build), then
 * the clinic's own demand, then the honest remainder — so the eye travels from
 * "what marketing produced" to "what walked in anyway" to the total.
 */
export const DECK_COMPONENTS: ComponentDef[] = [
  {
    key: 'seo',
    label: 'Organic / SEO',
    detail: 'Search engines finding the clinic without paid media.',
    attribution: 'pending',
    pendingNote:
      'Search Console access is still pending, and an organic visitor who later phones or walks in leaves no identifier to match. Impressions and clicks arrive with the Search Console feed.',
  },
  {
    key: 'ai_seo',
    label: 'AI SEO — assistants',
    detail: 'ChatGPT, Claude, Perplexity and Copilot recommending the clinic.',
    attribution: 'pending',
    pendingNote:
      'AI-assistant referrals are visible as website sessions, but an assistant sends no identifier and the visitor typically phones or walks in, so no bill can be traced back. Session volumes are on the Digital & SEO tab.',
  },
  {
    key: 'social_organic',
    label: 'Organic social',
    detail: 'Instagram and Facebook content the clinic did not pay to distribute.',
    attribution: 'pending',
    pendingNote:
      'Reach, followers and profile visits are measured, but a follower who books by phone or walk-in carries no identifier through to billing.',
  },
  {
    key: 'gmb',
    label: 'Google Business Profile',
    detail: 'Maps and local search — calls and direction requests.',
    attribution: 'pending',
    pendingNote:
      'Profile actions are counted by Google, but a Maps caller reaches reception directly and is booked as a normal clinic appointment, so the bill shows as direct.',
  },
  {
    key: 'google_ads',
    label: 'Google Ads',
    detail: 'Paid search — people actively looking for a dentist.',
    attribution: 'pending',
    pendingNote:
      'Google reports clicks and conversions, but a click carries no patient identity. UAE campaigns have no call-forwarding numbers, so the patient who clicks and then phones reception cannot be matched to a bill.',
  },
  {
    key: 'meta',
    label: 'Meta — Facebook & Instagram',
    detail: 'Paid social, including click-to-WhatsApp enquiries.',
    attribution: 'pending',
    pendingNote:
      'Meta reports lead events, but those leads are not yet written back with a phone number the practice-management system can match, so no bill can be traced to a specific ad.',
  },
  {
    key: 'crm',
    label: 'CRM / WhatsApp',
    detail: 'Patients booked by the team through the CRM and WhatsApp conversations.',
    attribution: 'measured',
  },
  {
    key: 'ai_agent',
    label: 'AI booking agent',
    detail: 'Appointments the automated agent booked end to end.',
    attribution: 'measured',
  },
  {
    key: 'widget',
    label: 'Website booking widget',
    detail: 'Patients who booked themselves on dentalnation.com.',
    attribution: 'measured',
  },
  {
    key: 'smile_club',
    label: 'Smile Club',
    detail: 'Membership plan — recurring revenue from members.',
    attribution: 'pending',
    pendingNote:
      'The plan is live and priced (AED 69/month · AED 799/year); membership and MRR are not yet fed into the platform, so no revenue is claimed here.',
  },
  {
    key: 'partner',
    label: 'Partner campaigns',
    detail: 'Affiliate-delivered leads.',
    attribution: 'pending',
    pendingNote: 'Delivery resumes with the campaign restart; reconciliation of verified vs billed leads is not yet wired.',
  },
  {
    key: 'direct',
    label: 'Direct, walk-in & referral',
    detail: 'Patients booked at the clinic or by phone — the practice’s own demand.',
    attribution: 'residual',
  },
  {
    key: 'unattributed',
    label: 'Unattributed',
    detail: 'Billed patients with no booking record in the CRM to trace back to a route.',
    attribution: 'residual',
  },
];

export const COMPONENT_BY_KEY: Record<string, ComponentDef> = Object.fromEntries(
  DECK_COMPONENTS.map((c) => [c.key, c]),
);

/** The attribution model, stated on the page in one sentence (spec §1.3). */
export const ATTRIBUTION_NOTE =
  'Attribution model: booking origin recorded by the CRM, matched to billed treatment through the practice-management record (bill → patient file → phone → the route that booked them). A patient who ever booked through a digital route is credited to it; everyone else is shown as direct/walk-in or, where no CRM record exists at all, as unattributed. Bars therefore add up to total billed revenue with nothing counted twice.';

/** Journey-strip stage definitions — six gauges, left to right. */
export interface StageDef {
  key: 'viewed' | 'inquired' | 'booked' | 'showed' | 'treated' | 'revenue';
  label: string;
  /** What the number literally counts — shown under the figure. */
  basis: string;
}

export const JOURNEY_STAGES: StageDef[] = [
  { key: 'viewed', label: 'Viewed', basis: 'Ad impressions across Meta and Google' },
  { key: 'inquired', label: 'Inquired', basis: 'Website forms + platform-reported lead events' },
  { key: 'booked', label: 'Booked', basis: 'Appointments in Practo, all sources' },
  { key: 'showed', label: 'Showed up', basis: 'Arrived or completed' },
  { key: 'treated', label: 'Treatment', basis: 'Bills raised for treatment delivered' },
  { key: 'revenue', label: 'Revenue', basis: 'Billed revenue, AED' },
];

/**
 * Module status vocabulary, matching the deck_modules check constraint.
 * LIVE = wired to a feed · PENDING_DATA = built, awaiting data · RD = in development.
 */
export type ModuleStatus = 'LIVE' | 'PENDING_DATA' | 'RD';

export const MODULE_STATUS_LABEL: Record<ModuleStatus, string> = {
  LIVE: 'Live',
  PENDING_DATA: 'Pending data',
  RD: 'In development',
};
