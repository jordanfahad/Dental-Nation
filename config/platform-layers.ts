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
  /** Optional note under Block 06 — e.g. a cross-reference when a capability's
   *  evidence deliberately lives under sibling sections (never a gap). */
  evidenceNote?: string;
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
  /** "Capability built" — the investor teaser's concise bullets for the
   *  Level-1 overview cards (executive summary, not the capability detail). */
  builtSummary: string[];
  /** Executive proof points for the overview cards (investor teaser, H1-2026
   *  unless a live figure supersedes them on the layer page). */
  highlights: string[];
  /** The LIVE reports that belong to this layer (Ms Shadi's direction: the
   *  platform is the overarching structure — Operations, Growth, Finance and
   *  Branding contribute their reports INTO layers, they are not parallel
   *  categories). Room-relative paths, rendered under the room token. */
  reports: { label: string; href: string }[];
  capabilities: Capability[];
}

const SEEDED = '2026-08-26';
const SHADI_DATE = '2026-08-31'; // Ms Shadi's content package

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
    builtSummary: [
      'Coordinated clinics, chairs, clinician and specialty network',
      'Hub-and-spoke referral model',
      'Specialty strategy across 6 priority areas (ortho, implants, pediatrics, cosmetic, prevention, oral surgery)',
    ],
    highlights: ['3 operating clinics + 1 flagship (DIFC) under development', '6 priority specialty areas', '4.85★ Google rating'],
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
    builtSummary: [
      'Premium affordable-luxury brand identity & patient-experience doctrine',
      'Structured growth & conversion stack across patient-acquisition channels',
    ],
    highlights: ['3.68M ad impressions in H1-2026', '48% enquiry-to-booking', '28,210 pages published · ~19.4K indexed'],
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
          'A value-based, premium dental-health brand built around accessible, affordable, high-quality care and a shift from reactive treatment to proactive lifelong dental health — patient-centric, one-stop-shop, lifestyle-integrated, affordable luxury, supported by a scalable DSO and IPU operating model.',
        built:
          'Full brand platform, governed: strategy & positioning with a GCC ambition; the "Beyond Smiles" brand story; values (transparency, patient centricity, empathy, community, lifetime partnerships, holistic well-being, global standards / local relevance); brand architecture (Dental Nation master brand with Smile Club, DSO, IPU, De Novo and M&A capabilities); a 120-page Brand Identity & Design Standards system covering logo, spark icon, colour, typography, illustration, iconography, photography and tone of voice; and an experience direction — calm, welcoming, modern, stress-free.',
        coverage:
          'Dental Nation master brand + Dental Nation Orto; three (+1) clinic locations operating under Dental Nation trademarks, with branch branding transitioning onto the brand system; structured for replication across additional UAE locations and GCC markets.',
        evidence: [
          { label: 'Brand Book — overview (2024)', href: '/evidence/brand/brand-book-overview.jpg', kind: 'doc' },
          { label: 'Visual identity system', href: '/evidence/brand/visual-identity-system.jpg', kind: 'doc' },
          { label: 'Visual expression', href: '/evidence/brand/visual-expression.jpg', kind: 'doc' },
          { label: 'MOE trademark (Dr Tosun)', href: '/evidence/brand/moe-trademark.pdf', kind: 'doc' },
        ],
        pnl:
          'The brand supports a multi-layer revenue model: higher acquisition & conversion, retention and lifetime value, preventive-care frequency, Smile Club recurring membership revenue, clinic occupancy, cross-service utilisation, De Novo expansion, M&A consolidation and future partner deployment. (Finance validation: Mr Jawad Shafiq.)',
        owner: 'Shadi — Head of Brand',
        status: 'built',
        refresh: 'Manual — Brand Book 2024; updated on change',
        updated: SHADI_DATE,
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
    builtSummary: [
      'Centralised CRM and AI-enabled contact centre',
      'Centralised booking channels & lead management',
      'Patient-journey, treatment-coordination, follow-up and recall workflows',
    ],
    highlights: ['885 appointments booked in H1-2026', '3,521 conversations centralised (WhatsApp & Instagram)', '46% booking-to-attendance'],
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
    builtSummary: [
      'Organisational structure, relationships & communication',
      'Roles, responsibilities & accountability framework',
      'Clinical protocols, care pathways, safety and audit systems standardised across the platform',
    ],
    highlights: ['5 functional policy manuals', '22-chapter SOP manual', '3 end-to-end journeys — patient · regulatory · clinician'],
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
    builtSummary: [
      'One orchestration layer connecting growth, finance, procurement, IT & tech, governance, HR and clinical support',
    ],
    highlights: ['10 systems built & operating within 9 months', '23% procurement-cost reduction', '3× net-margin uplift in mature clinic'],
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
    builtSummary: [
      'End-to-end capability from site selection and clinic design through build, launch and ramp-up',
      'Disciplined acquisition and integration, with performance & economics tracked through a KPI-driven cadence',
    ],
    highlights: ['AMC profitable within 4 months of acquisition', '3-month integration vs 9-month global benchmark', '7-step integration & commissioning playbook'],
    reports: [
      { label: 'Operating Platform report — integration & expansion', href: OPS },
    ],
    capabilities: [
      {
        id: '6.1',
        title: 'M&A Clinic Integration',
        overview:
          'Disciplined acquisition integration covering diligence handover, Day-1 control, legal and licence transfer, migration onto DN systems, brand transition, governance, operating cadence and economics tracking.',
        built:
          'Structured M&A integration pathway from acquisition close through platform certification: Day-1 financial and governance controls; PMS/EMR, CRM, reporting and contact-centre migration; DN branding, procurement and shared-service deployment; clinic-level scorecards and monthly P&L monitoring; founder and key-doctor retention as an integration gate. AMC integration in progress — soft-renamed "AMC by Dental Nation", reporting on the group platform, final signage pending.',
        coverage:
          'Two live acquisition integrations — AMC (acquired Feb 2026) and Dr Tosun (Apr 2025); additional M&A target pipeline in progress. Proof: AMC reached its first profitable month within 4 months (monthly net result −AED 61,445 in March → +AED 14,586 in June 2026).',
        evidence: [
          { label: 'M&A integration playbook — SOP library', href: '/evidence/expansion/sop-library.jpg', kind: 'doc' },
          { label: 'Corporate policy manual', href: '/evidence/expansion/corporate-policy-manual.jpg', kind: 'doc' },
          { label: 'End-to-end patient journey', href: '/evidence/expansion/end-to-end-patient-journey.jpg', kind: 'doc' },
          { label: 'AMC handover tracker', href: '/evidence/expansion/amc-handover.jpg', kind: 'doc' },
          { label: 'Merger integration tracker', href: '/evidence/expansion/merger-integration.jpg', kind: 'doc' },
          { label: 'Dentalcorp report (benchmark)', href: '/evidence/expansion/dentalcorp-benchmark.pdf', kind: 'doc' },
          { label: 'AMC turnaround — Operating Platform report', href: OPS, kind: 'live' },
        ],
        pnl:
          'Acquisition baseline → transition and integration costs → revenue stabilisation → shared-service and procurement migration → demand-channel activation → monthly break-even → EBITDA target and platform certification. (Finance validation: Mr Jawad Shafiq.)',
        owner: 'Integration Manager · Shadi (expansion)',
        status: 'demonstrated',
        refresh: 'Manual — milestone updates from the integration team',
        updated: SHADI_DATE,
      },
      {
        id: '6.2',
        title: 'De Novo Clinic Development',
        overview:
          'End-to-end development of new clinics and specialist centres: site selection, concept, design, build, licensing, equipment specification, recruitment, commissioning, pre-opening, launch and ramp-up.',
        built:
          'End-to-end de novo framework: site-selection and investment-assessment process; clinic concept, design and build coordination; equipment planning and procurement; regulatory and licensing pathway; workforce planning and recruitment; pre-opening readiness and commissioning gates; DN brand, EMR, CRM, contact-centre, procurement and reporting deployment; launch and post-opening performance controls.',
        coverage:
          'DN Al Wasl is the live validation — rebuilt from scratch, launched June 2025, first full operating year completed FY2025, gross margin 11.3% (FY2025) → 18.8% (H1 2026), a 66% relative uplift during ramp-up. Three clinics on the shared platform; one flagship under development.',
        evidence: [
          { label: 'Equipment supplier intelligence register', href: '/evidence/expansion/equipment-supplier-register.jpg', kind: 'doc' },
          { label: 'Clinic expansion phasing plan', href: '/evidence/expansion/clinic-expansion-phasing.jpg', kind: 'doc' },
          { label: 'Healthcare renovation & licensing guide', href: '/evidence/expansion/renovation-licensing-guide.jpg', kind: 'doc' },
          { label: 'Dental clinic design guideline', href: '/evidence/expansion/clinic-design-guideline.jpg', kind: 'doc' },
          { label: 'Project staging plan', href: '/evidence/expansion/project-staging-plan.jpg', kind: 'doc' },
          { label: 'DN Al Wasl — Operating Platform report', href: OPS, kind: 'live' },
        ],
        pnl:
          'Approved business case → CapEx and pre-opening investment → clinic launch → patient and chair-utilisation ramp-up → specialty-mix optimisation → gross-margin progression → operating break-even → target EBITDA. (Finance validation: Mr Jawad Shafiq.)',
        owner: 'De Novo Manager · Shadi (expansion)',
        status: 'demonstrated',
        refresh: 'Manual — development pipeline updates',
        updated: SHADI_DATE,
      },
      {
        id: '6.3',
        title: 'Existing-Clinic Transformation',
        overview:
          'Standardised transformation of acquired or legacy clinics into the DN operating model — governance, systems, brand, workforce roles, patient journeys, commercial controls and performance management.',
        built:
          'Standard transformation pathway (diagnostic → migration → activation → stabilisation): seven shared enterprise systems across the group; five functional policy manuals; a 22-chapter standardised SOP framework; group-wide clinical, nursing and patient-experience standards; centralised finance, procurement, HR, IT and reporting; governed pricing, discounts and clinician compensation; branch and doctor-level scorecards; DN brand and patient-journey deployment.',
        coverage:
          'Dr Tosun & AMC operating under the DN platform model; DN Al Wasl rebuilt to DN standards; common governance and shared services across the network. Outcomes: strong profitability improvement, meaningful gross-margin expansion, significant laboratory-cost reduction, lower administrative overheads.',
        evidence: [
          { label: 'Operating-model implementation plan', href: '/evidence/expansion/operating-model-implementation.jpg', kind: 'doc' },
          { label: 'SOP library (22 chapters)', href: '/evidence/expansion/sop-library.jpg', kind: 'doc' },
          { label: 'Corporate policy manual', href: '/evidence/expansion/corporate-policy-manual.jpg', kind: 'doc' },
          { label: 'Before/after operating assessment — Operations report', href: OPS, kind: 'live' },
        ],
        pnl:
          'Baseline operational and financial diagnostic → Day-1 controls → systems and shared-service migration → procurement and laboratory savings → pricing and productivity improvement → margin stabilisation → target branch profitability. (Finance validation: Mr Jawad Shafiq.)',
        owner: 'CEO · Shadi (expansion)',
        status: 'demonstrated',
        refresh: 'Manual — transformation milestones',
        updated: SHADI_DATE,
      },
      {
        id: '6.5',
        title: 'Replication & Commissioning Playbook',
        overview:
          'A reusable 12-month launch and integration system combining readiness gates, deployment standards, commissioning controls and post-launch stabilisation.',
        built:
          'Months 1–3, Foundation: legal & licence transfer, financial controls, DN branding, PMS/EMR migration initiated, founder and key-doctor retention secured. Months 4–9, Activation & integration: SOP adoption, CRM and contact centre connected, demand channels activated, procurement on group terms, clinic scorecard live. Months 10–12, Performance: weekly chair-utilisation tracking, specialty-mix optimisation, EBITDA target set, integration scorecard completed, platform transition certified.',
        coverage:
          'Applies to M&A integrations, de novo clinics, existing-clinic transformations and specialist centres; validated live through AMC (profitable in 4 months), Dr Tosun (significant net-margin uplift) and DN Al Wasl (strong gross-margin improvement); ready for the flagship under development.',
        evidence: [{ label: 'Live validation — Operating Platform report', href: OPS, kind: 'live' }],
        evidenceNote:
          'Per Ms Shadi (31 Aug): the playbook\u2019s evidence is already shared under 6.1\u20136.3 (integration playbook, SOP library, policy manuals, trackers) and is deliberately not duplicated here.',
        pnl:
          'Foundation investment and transition cost → integration and revenue activation → central-cost and procurement leverage → utilisation and specialty optimisation → EBITDA target → certification for stable platform operation. (Finance validation: Mr Jawad Shafiq.)',
        owner: 'CEO · Shadi (expansion)',
        status: 'built',
        refresh: 'Manual — playbook version-controlled',
        updated: SHADI_DATE,
      },
    ],
  },
];

export const layerBySlug = (slug: string): PlatformLayer | undefined =>
  PLATFORM_LAYERS.find((l) => l.slug === slug);
