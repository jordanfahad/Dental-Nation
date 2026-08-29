/**
 * The six-layer platform structure — Mr Akbar's "Platform Link-Page
 * Structure" blueprint (Aug 2026), seeded verbatim: six layers as primary
 * navigation, each capability as one repeatable seven-block page, every
 * claim resolving to a live system, an evidence link, or a VISIBLE gap
 * (the blueprint's rule: show the source, owner and cadence even where
 * automation is not available yet — never hide the gap).
 *
 * This file is the structure and the seeded copy. Owners edit it through
 * Fahad; statuses use the blueprint's four chips. Evidence links point at
 * the LIVE reports this platform already serves — the room never carries a
 * second copy of a figure that could drift out of date, so capability pages
 * link to the live number instead of restating it.
 */

/** The blueprint's four status chips (build spec, rule 03). */
export type CapabilityStatus = 'built' | 'demonstrated' | 'in-implementation' | 'validate';

export const STATUS_LABEL: Record<CapabilityStatus, string> = {
  built: 'Built',
  demonstrated: 'Demonstrated',
  'in-implementation': 'In implementation',
  validate: 'Validate before release',
};

export interface EvidenceLink {
  label: string;
  /** Room-relative path (starts with /) rendered under the room token, or an
   *  absolute URL for an external live system. */
  href: string;
  /** live system · KPI dashboard · evidence document (blueprint's CTA kinds) */
  kind: 'live' | 'kpi' | 'doc';
}

export interface Capability {
  /** Blueprint numbering, e.g. "2.3" — stable, used in the URL fragment. */
  id: string;
  title: string;
  /** Block 1 — investor-facing overview (from the blueprint's own copy). */
  overview: string;
  /** Block 2 — what has been built (honest, current; blank = pending owner). */
  built: string;
  /** Block 3 — current coverage (where it is active today). */
  coverage: string;
  /** Block 4/6 — proof: links into live systems / KPIs / evidence docs. */
  evidence: EvidenceLink[];
  /** Block 5 — P&L pathway (Mr Jawad's input; blank = pending). */
  pnl: string;
  /** Block 7 — accountability. */
  owner: string;
  status: CapabilityStatus;
  /** Refresh rule shown on the page: live · daily · weekly · monthly · manual. */
  refresh: string;
  /** ISO date of the last content update to THIS entry. */
  updated: string;
}

export interface PlatformLayer {
  /** "01".."06" */
  n: string;
  slug: string;
  title: string;
  tagline: string;
  /** One-line value promise from the blueprint's layer cards. */
  promise: string;
  owner: string;
  /** The LIVE reports that belong to this layer (Ms Shadi's direction: the
   *  platform is the overarching structure — Operations, Growth, Finance and
   *  Branding contribute their reports INTO layers, they are not parallel
   *  categories). Room-relative paths, rendered under the room token. */
  reports: { label: string; href: string }[];
  capabilities: Capability[];
}

const SEEDED = '2026-08-26';

/** Live report paths (rendered under the room token by the platform pages). */
const GROWTH = '/growth';
const OPS = '/operations';
const FINANCE = '/finance';
const DIGITAL = '/dash?tab=digital';
const SOCIAL = '/dash?tab=social';
const CLINOPS = '/dash?tab=clinical-ops';
const MARKETING = '/dash?tab=marketing';
const GROUP = '/dash?tab=group';

export const PLATFORM_LAYERS: PlatformLayer[] = [
  {
    n: '01',
    slug: 'clinical-capacity',
    title: 'Clinical Capacity & Supply',
    tagline: 'Clinics · chairs · clinicians · specialties',
    promise: 'Reliable capacity',
    owner: 'Dr Luvi Kaprani · Mr Jawad Shafiq (finance inputs)',
    reports: [
      { label: 'Group Revenue — three clinics', href: GROUP },
      { label: 'Operating Platform report', href: OPS },
    ],
    capabilities: [
      {
        id: '1.1',
        title: 'Network Footprint & Capacity',
        overview:
          'Clinics, branches, chairs, facilities and specialty coverage — the current footprint, operating status, chair capacity, opening pipeline and site-level utilisation.',
        built:
          'Three operating clinics in Dubai — Dental Nation Al Wasl, Dr Tosun Dental Clinic (Umm Suqeim 1) and Al Maher Medical Centre (AMC, transitioning to "AMC by Dental Nation") — reporting into one group platform.',
        coverage: 'All three Dubai clinics; group revenue view live on the dashboard.',
        evidence: [
          { label: 'Group revenue — three clinics (live)', href: GROUP, kind: 'kpi' },
          { label: 'Operating Platform report', href: OPS, kind: 'live' },
        ],
        pnl: '',
        owner: 'Dr Luvi Kaprani',
        status: 'in-implementation',
        refresh: 'Chair / utilisation data: manual until EMR connection (Dr Luvi + Zavis)',
        updated: SEEDED,
      },
      {
        id: '1.2',
        title: 'Clinical Workforce & Specialty Supply',
        overview:
          'Clinician roster, specialty mix, coverage by location, workforce capacity and the ability to redirect patients across the network.',
        built: '',
        coverage: '',
        evidence: [],
        pnl: '',
        owner: 'Dr Luvi Kaprani',
        status: 'validate',
        refresh: 'Pending source: EMR / HR roster (owner handoff)',
        updated: SEEDED,
      },
      {
        id: '1.3',
        title: 'Centers of Excellence / Advanced Capacity',
        overview:
          'Current specialty-centre capacity and advanced-care supply, including the orthodontic programme documents and links.',
        built: '',
        coverage: '',
        evidence: [],
        pnl: '',
        owner: 'Dr Luvi Kaprani',
        status: 'validate',
        refresh: 'Pending: ortho documents & links from clinical team',
        updated: SEEDED,
      },
    ],
  },
  {
    n: '02',
    slug: 'demand-brand-growth',
    title: 'Patient Demand & Brand Growth',
    tagline: 'Brand · website · marketing · acquisition',
    promise: 'Predictable patient flow',
    owner: 'Mr Fahad Siddiqui (layer) · Shadi (2.1) · Mr Gautam (2.5)',
    reports: [
      { label: 'Growth Department Live Dashboard', href: GROWTH },
      { label: 'Digital & SEO', href: DIGITAL },
      { label: 'Social & Local', href: SOCIAL },
      { label: 'Marketing — paid media', href: MARKETING },
    ],
    capabilities: [
      {
        id: '2.1',
        title: 'Brand Platform',
        overview:
          'Brand strategy, identity, experience doctrine, governed standards and reusable brand assets across clinics and markets.',
        built: '',
        coverage: '',
        evidence: [],
        pnl: '',
        owner: 'Shadi',
        status: 'validate',
        refresh: 'Pending: brand book & governed assets from Shadi',
        updated: SEEDED,
      },
      {
        id: '2.2',
        title: 'Website & Content Infrastructure',
        overview:
          'Website architecture, landing pages, content, booking entry points and owned digital infrastructure deployable across clinics.',
        built:
          'dentalnation.com with campaign landing pages (SOS / Scan / Glow Up), the online booking widget as the conversion entry point, and 19,500+ programmatic SEO pages delivered and indexing (~19K pages indexed in Google).',
        coverage: 'Live for the Dubai network; architecture reusable per clinic and market.',
        evidence: [
          { label: 'Digital & SEO report (indexing, keywords, site speed)', href: DIGITAL, kind: 'kpi' },
          { label: 'dentalnation.com (live system)', href: 'https://www.dentalnation.com', kind: 'live' },
        ],
        pnl: '',
        owner: 'Mr Fahad Siddiqui',
        status: 'built',
        refresh: 'Live — Search Console / PageSpeed synced automatically',
        updated: SEEDED,
      },
      {
        id: '2.3',
        title: 'Marketing Intelligence & Demand Generation',
        overview:
          'Channel performance, campaign data, audience intelligence, lead generation, acquisition cost and demand-source visibility.',
        built:
          'This reporting platform: Search Console, PageSpeed, Google Business Profile, GA4, paid-media and backlink-authority feeds with competitor benchmarking (Dental Studio, Dr Joy, Dr Michael’s), refreshed automatically every 15 minutes.',
        coverage: 'All digital channels; ArabyAds affiliate campaign tracked lane-by-lane with lead validation.',
        evidence: [
          { label: 'Digital & SEO report', href: DIGITAL, kind: 'kpi' },
          { label: 'Marketing — paid media', href: MARKETING, kind: 'kpi' },
          { label: 'Social & Local (Business Profile)', href: SOCIAL, kind: 'kpi' },
        ],
        pnl: '',
        owner: 'Mr Fahad Siddiqui',
        status: 'built',
        refresh: 'Live — synced every 15 minutes',
        updated: SEEDED,
      },
      {
        id: '2.4',
        title: 'Patient Acquisition',
        overview:
          'The acquisition engine up to qualified enquiry / lead creation; the handoff to Layer 3 covers booking, attendance, treatment coordination and retention.',
        built:
          'Campaign lead forms with automatic ingestion, per-lead e-mail alerts to reception and management, lane attribution (SOS / Scan / Glow Up), a three-touch follow-up loop recorded in the shared feedback sheet, and a lead mirror keeping the agency workbook in sync automatically.',
        coverage: 'ArabyAds affiliate campaign live; Google Ads live; all enquiry channels unified on one trend.',
        evidence: [
          { label: 'Growth report (funnel & channels)', href: GROWTH, kind: 'kpi' },
          { label: 'Clinical Operations (lead worklists)', href: CLINOPS, kind: 'live' },
        ],
        pnl: '',
        owner: 'Mr Fahad Siddiqui',
        status: 'built',
        refresh: 'Live — synced every 15 minutes, alerts on every new lead',
        updated: SEEDED,
      },
      {
        id: '2.5',
        title: 'Membership, Loyalty & Retention',
        overview: 'Smile Club, membership tiers, the preventive-care programme, renewal and retention.',
        built: 'Smile Club is live.',
        coverage: '',
        evidence: [],
        pnl: '',
        owner: 'Mr Gautam',
        status: 'in-implementation',
        refresh: 'Pending source: membership data (Mr Gautam handoff)',
        updated: SEEDED,
      },
    ],
  },
  {
    n: '03',
    slug: 'patient-coordination',
    title: 'Patient Coordination Hub',
    tagline: 'Booking · conversion · journey · retention',
    promise: 'Retention & lifetime value',
    owner: 'Mr Fahad Siddiqui (layer) · Dr Luvi Kaprani (3.2)',
    reports: [
      { label: 'Clinical Operations (worklists & alerts)', href: CLINOPS },
      { label: 'Growth report — patient journey funnel', href: GROWTH },
    ],
    capabilities: [
      {
        id: '3.1',
        title: 'Contact Centre & Patient Support',
        overview:
          'Centralised phone, WhatsApp, messaging and patient-support workflows; visibility into enquiries, response time, ownership and outcomes.',
        built:
          'Call-centre worklist for unverified enquiries with call-outcome logging; per-lead alert e-mails to the responsible reception within 15 minutes of submission.',
        coverage: 'Website enquiries and campaign leads; phone/WhatsApp logging via the enquiry tracker.',
        evidence: [{ label: 'Clinical Operations (worklists & alerts)', href: CLINOPS, kind: 'live' }],
        pnl: '',
        owner: 'Mr Fahad Siddiqui · Dr Luvi Kaprani',
        status: 'demonstrated',
        refresh: 'Live — synced every 15 minutes',
        updated: SEEDED,
      },
      {
        id: '3.2',
        title: 'Booking, Conversion & Lead Management',
        overview:
          'Lead-to-booking, booking-to-attendance and consultation-conversion workflows, with acquisition source linked back to Layer 2.',
        built:
          'Online booking widget with availability monitoring and uptime alerts; three-layer lead dedupe; source attribution carried from campaign to booking; validation outcomes fed back per lead.',
        coverage: 'All three clinics for website bookings; ArabyAds lanes fully attributed.',
        evidence: [
          { label: 'Growth report (funnel)', href: GROWTH, kind: 'kpi' },
          { label: 'Clinical Operations', href: CLINOPS, kind: 'live' },
        ],
        pnl: '',
        owner: 'Mr Fahad Siddiqui · Dr Luvi Kaprani',
        status: 'built',
        refresh: 'Live — synced every 15 minutes',
        updated: SEEDED,
      },
      {
        id: '3.3',
        title: 'Patient Journey & Treatment Coordination',
        overview:
          'The end-to-end patient journey, referral routing, treatment-plan coordination and handoffs between clinics and specialty services.',
        built:
          'Patient Intelligence Platform plugged in for operations-triggered communications (validation of the data push to the marketing platform in progress; comms sending owned by Dr Luvi under Operations).',
        coverage: '',
        evidence: [],
        pnl: '',
        owner: 'Dr Luvi Kaprani',
        status: 'in-implementation',
        refresh: 'Pending: PIP data-push validation (Zavis)',
        updated: SEEDED,
      },
      {
        id: '3.4',
        title: 'Follow-up, Recall & Retention',
        overview:
          'Recall, rebooking, follow-up and recurring-relationship workflows that protect continuity of care and lifetime value.',
        built:
          'Three-touch follow-up cycle (FU 1–3) on campaign leads with outcomes recorded per lead and surfaced on the campaign report.',
        coverage: 'Campaign leads; clinical recall workflows pending EMR connection.',
        evidence: [{ label: 'Growth report', href: GROWTH, kind: 'kpi' }],
        pnl: '',
        owner: 'Dr Luvi Kaprani',
        status: 'in-implementation',
        refresh: 'Campaign follow-ups live; clinical recall pending EMR',
        updated: SEEDED,
      },
    ],
  },
  {
    n: '04',
    slug: 'clinical-delivery',
    title: 'Standardized Clinical Delivery',
    tagline: 'Governance · protocols · quality · safety',
    promise: 'Clinical excellence',
    owner: 'Dr Luvi Kaprani',
    reports: [
      { label: 'Operating Platform report — clinical governance', href: OPS },
    ],
    capabilities: [
      {
        id: '4.1',
        title: 'Clinical Leadership & Governance',
        overview:
          'Clinical governance structure, decision rights, leadership forums, network-wide clinical accountability and escalation.',
        built: '',
        coverage: '',
        evidence: [],
        pnl: '',
        owner: 'Dr Luvi Kaprani',
        status: 'validate',
        refresh: 'Pending: governance records from clinical leadership',
        updated: SEEDED,
      },
      {
        id: '4.2',
        title: 'Standards, Protocols & Care Pathways',
        overview:
          'Clinical protocols, referral rules, documentation standards and common care pathways used across clinics and specialties.',
        built: '',
        coverage: '',
        evidence: [],
        pnl: '',
        owner: 'Dr Luvi Kaprani',
        status: 'validate',
        refresh: 'Pending: SOPs / protocols for the evidence library',
        updated: SEEDED,
      },
      {
        id: '4.3',
        title: 'Quality, Safety, Compliance & Audit',
        overview:
          'Quality measures, safety controls, compliance requirements, audit routines and corrective-action evidence.',
        built: '',
        coverage: '',
        evidence: [],
        pnl: '',
        owner: 'Dr Luvi Kaprani',
        status: 'validate',
        refresh: 'Pending: audit & compliance evidence',
        updated: SEEDED,
      },
      {
        id: '4.4',
        title: 'Clinical Training & Competency',
        overview:
          'Clinical onboarding, training, competency validation and continuous professional-development evidence.',
        built: '',
        coverage: '',
        evidence: [],
        pnl: '',
        owner: 'Dr Luvi Kaprani',
        status: 'validate',
        refresh: 'Pending: training logs & competency records',
        updated: SEEDED,
      },
    ],
  },
  {
    n: '05',
    slug: 'support-technology',
    title: 'Centralized Support & Technology',
    tagline: 'Shared services · systems · data · KPIs',
    promise: 'Efficiency at scale',
    owner: 'Dr Luvi Kaprani · Mr Fahad Siddiqui · Mr Jawad Shafiq',
    reports: [
      { label: 'Finance section', href: FINANCE },
      { label: 'Operating Platform report — shared services', href: OPS },
      { label: 'Google Analytics', href: '/dash?tab=analytics' },
      { label: 'Growth Platform & Group Revenue', href: GROUP },
    ],
    capabilities: [
      {
        id: '5.1',
        title: 'Centralized Shared Services',
        overview:
          'Clinic operations & administration, commercial & finance, procurement & inventory, IT support, facilities & project management.',
        built: '',
        coverage: '',
        evidence: [{ label: 'Operating Platform report', href: OPS, kind: 'live' }],
        pnl: '',
        owner: 'Dr Luvi Kaprani · Mr Jawad Shafiq',
        status: 'in-implementation',
        refresh: 'Target: source directly from EMR + Zoho (owner handoff)',
        updated: SEEDED,
      },
      {
        id: '5.2',
        title: 'Organization & People',
        overview:
          'HR & workforce management, organisation structure, roles & responsibilities, recruitment, training & performance development.',
        built: '',
        coverage: '',
        evidence: [],
        pnl: '',
        owner: 'Dr Luvi Kaprani',
        status: 'validate',
        refresh: 'Pending: HR / organisation evidence',
        updated: SEEDED,
      },
      {
        id: '5.3',
        title: 'Technology, Data & Automation',
        overview:
          'Enterprise systems & integrations, AI infrastructure, the data model, workflow automation, reporting automation and technical support.',
        built:
          'The group reporting platform: automated 15-minute ingestion from the booking system, sheets, GA4, Search Console, Business Profile, paid media and SEO providers into one governed data model, with automated alerting, a lead mirror writing back to the agency workbook, and this Evidence Room rendered live from the same backbone.',
        coverage: 'Growth, marketing and clinical-operations data fully automated; EMR and Zoho connections pending.',
        evidence: [
          { label: 'This Evidence Room (live system)', href: '', kind: 'live' },
          { label: 'Growth report', href: GROWTH, kind: 'kpi' },
        ],
        pnl: '',
        owner: 'Mr Fahad Siddiqui',
        status: 'built',
        refresh: 'Live — automated every 15 minutes',
        updated: SEEDED,
      },
      {
        id: '5.4',
        title: 'Performance Management',
        overview:
          'Group / clinic / clinician KPIs, operational dashboards, capacity / quality / conversion reporting, scorecards and operating cadence.',
        built:
          'Two-level reporting on one backbone: this investor room (concise, evidence-backed) and the management dashboard (full drill-down, targets and worklists) — same source data, different depth, per the blueprint.',
        coverage: 'Growth, digital, social, clinical-operations and group-revenue KPIs live; finance cadence with Mr Jawad.',
        evidence: [
          { label: 'Growth report', href: GROWTH, kind: 'kpi' },
          { label: 'Finance section', href: FINANCE, kind: 'kpi' },
        ],
        pnl: '',
        owner: 'Mr Fahad Siddiqui · Mr Jawad Shafiq',
        status: 'built',
        refresh: 'Live — automated every 15 minutes',
        updated: SEEDED,
      },
    ],
  },
  {
    n: '06',
    slug: 'expansion-model',
    title: 'Repeatable Expansion Model',
    tagline: 'M&A · de novo · transformation · commissioning',
    promise: 'Replicate & grow',
    owner: 'Shadi',
    reports: [
      { label: 'Operating Platform report — integration & expansion', href: OPS },
    ],
    capabilities: [
      {
        id: '6.1',
        title: 'M&A Clinic Integration',
        overview:
          'Acquisition-diligence handoff, Day-1 integration, migration onto DN systems, governance, operating cadence and economics tracking.',
        built:
          'AMC integration in progress — soft-renamed "AMC by Dental Nation", formal transition pending signage; reporting migrated onto the group platform.',
        coverage: 'One integration in flight (AMC).',
        evidence: [{ label: 'Operating Platform report', href: OPS, kind: 'live' }],
        pnl: '',
        owner: 'Shadi',
        status: 'in-implementation',
        refresh: 'Manual — milestone updates from the integration team',
        updated: SEEDED,
      },
      {
        id: '6.2',
        title: 'De Novo Clinic Development',
        overview:
          'Site selection, concept, design, build, licensing, recruitment, pre-opening, launch and ramp-up of new clinics.',
        built: '',
        coverage: '',
        evidence: [],
        pnl: '',
        owner: 'Shadi',
        status: 'validate',
        refresh: 'Pending: development pipeline from expansion team',
        updated: SEEDED,
      },
      {
        id: '6.3',
        title: 'Existing-Clinic Transformation',
        overview:
          'Standardised transformation of an acquired / legacy clinic into the DN operating model — systems, brand, roles and performance controls.',
        built: '',
        coverage: '',
        evidence: [],
        pnl: '',
        owner: 'Shadi',
        status: 'validate',
        refresh: 'Pending: transformation playbook evidence',
        updated: SEEDED,
      },
      {
        id: '6.5',
        title: 'Replication & Commissioning Playbook',
        overview:
          'The reusable launch / integration sequence: readiness gates, commissioning checklist, deployment standards and post-launch stabilisation.',
        built: '',
        coverage: '',
        evidence: [],
        pnl: '',
        owner: 'Shadi',
        status: 'validate',
        refresh: 'Pending: playbook documents for the evidence library',
        updated: SEEDED,
      },
    ],
  },
];

export const layerBySlug = (slug: string): PlatformLayer | undefined =>
  PLATFORM_LAYERS.find((l) => l.slug === slug);
