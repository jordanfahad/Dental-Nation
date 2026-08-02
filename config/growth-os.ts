/**
 * PART 2 — The Growth Operating System.
 *
 * Transcribed from `Dental_Nation_Growth_Report.pptx` (Growth Operating Report,
 * July 2026 — compiled from the Dental Nation Notion workspace). These are
 * STATIC STRATEGY FIGURES from the deck, not live measurements: targets, TAM
 * estimates and design intent. Part 1 is where live numbers live.
 *
 * The per-section `source` strings are the deck's own attributions and are
 * rendered as small captions — they are what makes this read as a documented
 * system rather than an assertion.
 */

export const AT_A_GLANCE = [
  { value: '4', label: 'clinic entities live or in pipeline', sub: 'Al Wasl · Dr. Tosun · AMC (Al Maher) · DIFC (Q1-2027)' },
  { value: '13', label: 'demand lanes (A–M)', sub: 'every campaign, offer and hire traces to a lane' },
  { value: '8', label: 'Growth Office functions', sub: 'Strategy → Demand → Conversion → Activation → Pods → Retention → Partnerships → Analytics' },
  { value: 'AED 3.2B+', label: 'combined Dubai TAM', sub: 'across the 13 lanes' },
] as const;

export const FUNNEL_STAGES = [
  'Visibility', 'Trust', 'Demand', 'Booking', 'Show-up',
  'Diagnosis', 'Acceptance', 'Revenue', 'Retention', 'Referral',
] as const;

export const OPERATING_MODEL = {
  rows: [
    { layer: 'Brand', owner: 'Brand Engine / Founder', purpose: 'Trust, positioning, preference, proof language' },
    { layer: 'Content', owner: 'DN Studio', purpose: 'Doctor content, clinic content, proof and campaign assets' },
    { layer: 'Demand', owner: 'Growth Office', purpose: 'Traffic, leads, paid / organic activation' },
    { layer: 'Conversion', owner: 'Revenue Operations', purpose: 'Calls, WhatsApp, CRM, bookings, no-show recovery, follow-up' },
    { layer: 'Delivery', owner: 'Clinical Operations', purpose: 'Clinical quality, patient experience, chair capacity' },
    { layer: 'Retention', owner: 'Growth + Clinic Ops', purpose: 'Recall, referral, Smile Club, patient lifecycle' },
    { layer: 'Analytics', owner: 'Growth Analytics', purpose: 'Funnel visibility, CAC, ROI, clinic performance, diagnosis' },
  ],
  source: 'DN Growth Command Center — V1 (Notion)',
} as const;

export const GROWTH_OFFICE = {
  functions: [
    { n: 1, name: 'Growth Strategy & Revenue Planning', detail: 'Monthly growth plan, clinic revenue and volume targets, chair-utilization targets, budget allocation' },
    { n: 2, name: 'Demand Generation', detail: 'Google, Meta, TikTok, SEO, landing pages, influencers, retargeting, WhatsApp broadcasts' },
    { n: 3, name: 'Conversion & Revenue Ops', detail: 'Call center, WhatsApp quality, CRM pipeline, speed-to-lead, no-show recovery, plan follow-up' },
    { n: 4, name: 'Clinic Growth Activation', detail: 'A Clinic Growth Chapter per clinic: DN Acacia, DN Al Maher, DN Tosan, DN Elite DIFC' },
    { n: 5, name: 'Specialty Growth Pods', detail: 'Hygiene, Whitening & Aesthetics, Emergency, Implants, Orthodontics, Pediatric (+ future pods)' },
    { n: 6, name: 'Patient Lifecycle & Retention', detail: 'Recall, Smile Club, family plans, referral program, reactivation, review generation' },
    { n: 7, name: 'Partnerships & Community', detail: 'Schools, corporates, residential, hotels, gyms, pharmacies, embassies, insurance-adjacent' },
    { n: 8, name: 'Growth Analytics & Performance', detail: 'Revenue by clinic and specialty, leads by source, CAC, ROAS, utilization, no-show, retention' },
  ],
  team: 'Founder/CEO · Head of Growth · Growth PM · CRM/Conversion Lead · Performance Marketing · Clinic Growth Coordinator · DN Studio Lead (shared) · Data support',
  source: 'DN Growth Command Center — V1, Growth Office structure (Notion)',
} as const;

export const DEMAND_ENGINE = {
  layers: [
    { n: 1, name: 'Market Magnet', role: 'awareness', detail: 'Paid + organic campaigns, PR hooks, influencer & community voice, SEO & local ranking' },
    { n: 2, name: 'Offer Engine', role: 'conversion trigger', detail: 'Flash offers, bundles, limited-time campaigns, membership schemes' },
    { n: 3, name: 'Experience Conversion', role: 'in-clinic', detail: 'Signature experience, curated onboarding, cross-offer upsell: whitening → aligner → implant' },
    { n: 4, name: 'Relationship', role: 'retention & reactivation', detail: 'CRM automations, WhatsApp recall flows, subscription-style maintenance' },
    { n: 5, name: 'Data Intelligence', role: 'optimization loop', detail: 'Dashboards, performance analytics, AI ad optimization, feedback loops' },
  ],
  phases: [
    { name: 'Build (0→1)', detail: 'Offer system + CRM + conversion SOP', kpi: 'CAC' },
    { name: 'Scale (1→N)', detail: 'Localized micro-campaigns per clinic, geo-SEO, influencer alliances', kpi: 'Volume + CPL' },
    { name: 'Automate (N→∞)', detail: 'Predictive, self-optimizing — AI ads, look-alikes, retention automation', kpi: 'LTV & ROI' },
  ],
  source: 'Demand Generation Engine (Notion, Growth OS reference library)',
} as const;

export type Command = 'OWN' | 'BUILD' | 'PILOT' | 'RUN';

export const LANES: {
  lane: string; name: string; command: Command; ltvCac: number; priority: number; tam: number;
}[] = [
  { lane: 'A', name: 'Cosmetic & Smile Design', command: 'OWN', ltvCac: 38, priority: 1, tam: 680 },
  { lane: 'B', name: 'Family & Routine Care', command: 'OWN', ltvCac: 18, priority: 2, tam: 510 },
  { lane: 'C', name: 'Implants & Full-Arch', command: 'OWN', ltvCac: 52, priority: 3, tam: 410 },
  { lane: 'D', name: 'Emergency & Urgent', command: 'BUILD', ltvCac: 35, priority: 4, tam: 240 },
  { lane: 'E', name: 'Corporate & Insurance', command: 'BUILD', ltvCac: 25, priority: 5, tam: 310 },
  { lane: 'F', name: 'Specialty COE', command: 'BUILD', ltvCac: 45, priority: 6, tam: 190 },
  { lane: 'G', name: 'Aesthetic Adjacency', command: 'PILOT', ltvCac: 20, priority: 7, tam: 155 },
  { lane: 'H', name: 'Dental Tourism', command: 'PILOT', ltvCac: 38, priority: 8, tam: 130 },
  { lane: 'I', name: "Children's Dentistry", command: 'BUILD', ltvCac: 22, priority: 9, tam: 195 },
  { lane: 'J', name: 'Orthodontics', command: 'BUILD', ltvCac: 32, priority: 10, tam: 175 },
  { lane: 'K', name: 'Periodontics', command: 'RUN', ltvCac: 16, priority: 11, tam: 92 },
  { lane: 'L', name: 'Oral Surgery', command: 'RUN', ltvCac: 12, priority: 12, tam: 105 },
  { lane: 'M', name: 'TMJ / Night Guards', command: 'RUN', ltvCac: 15, priority: 13, tam: 48 },
];

export const FUNDING_COMMANDS: { key: Command; rule: string }[] = [
  { key: 'OWN', rule: 'Unrestricted within budget' },
  { key: 'BUILD', rule: 'Defined quarterly budget' },
  { key: 'PILOT', rule: 'Capped AED 15K/mo' },
  { key: 'RUN', rule: 'No acquisition spend' },
];

export const LANES_RULE =
  'No campaign, offer, hire or content goes live without a lane assignment. If it doesn’t trace to a lane, it doesn’t get funded.';

export const LANES_SOURCE = 'The 13 Demand Lanes v2.0 — Full Architecture (Notion, Founding Partner Strategy Room)';

export const OWN_LANES = [
  {
    lane: 'A',
    name: 'Cosmetic & Smile Design',
    economics: 'Smile design case AED 35–60K · LTV 55–90K (3yr) · CAC AED 1.0–1.6K → LTV:CAC > 38× · consult → acceptance target > 62% (industry 45–55%) · one documented case ⇒ 3–5 organic referrals.',
    plan: ['DSD visual simulation in every cosmetic consult', '4 documented cases per month per clinic', 'Financing presented on any case > AED 15K', '2–3 micro-influencers per catchment'],
  },
  {
    lane: 'B',
    name: 'Family & Routine Care',
    economics: 'Family of 4: AED 12–25K/yr routine · LTV 22–45K (3yr) · CAC per family AED 350–700 → > 18× · recall adherence target > 58% (Dubai avg ~35%) · cross-booking target > 45% of households with 2+ active.',
    plan: ['Family registration programme + priority slots', 'Recall automation at M5.5 (WhatsApp) + M6.5 (call)', 'Daman + Aman insurance panels by end of Q1', '5 residential buildings per catchment with on-site dental days'],
  },
  {
    lane: 'C',
    name: 'Implants & Full-Arch',
    economics: 'All-on-4 bilateral AED 72–100K per case · LTV 45–80K · CAC 1.5–2.8K → > 52× · highest revenue per chair-hour in the portfolio · demand exceeds current clinical supply.',
    plan: ['"Implant Confidence" 45-min consult + CBCT + 3D plan', 'Tourism pages in Arabic, Hindi and French', 'Staged financing (AED 5K deposit + monthly)', 'Every extraction triggers an implant consult referral'],
  },
] as const;

export const OWN_LANES_SOURCE = 'The 13 Demand Lanes v2.0 — Lanes A, B, C (Notion)';

export const CONVERSION_TARGETS = [
  { metric: 'Consult → acceptance (Lane A)', dn: 62, industry: 50 },
  { metric: 'Recall adherence (Lane B)', dn: 58, industry: 35 },
  { metric: 'Family cross-booking (Lane B)', dn: 45, industry: 30 },
];

export const LTV_CAC_TARGETS = [
  { lane: 'Implants (C)', dn: 52, threshold: 45 },
  { lane: 'Specialty (F)', dn: 45, threshold: 40 },
  { lane: 'Cosmetic (A)', dn: 38, threshold: 35 },
  { lane: 'Emergency (D)', dn: 35, threshold: 30 },
  { lane: 'Ortho (J)', dn: 32, threshold: 28 },
  { lane: 'Family (B)', dn: 18, threshold: 15 },
];

export const TARGETS_SOURCE = 'The 13 Demand Lanes v2.0 — lane unit-economics tables (Notion)';

export const PORTFOLIO_REST = {
  build: [
    { lane: 'D', name: 'Emergency', detail: 'CAC AED 120–350; over 40% convert to lifetime patients; 2 protected same-day slots per clinic; booking under 30 minutes from first contact.' },
    { lane: 'E', name: 'Corporate & Insurance', detail: 'One 50-employee SME contract = AED 75–150K/yr at near-zero CAC; Daman + Aman panels in Q1; target 8–12 contracts per clinic in Year 1.' },
    { lane: 'F', name: 'Specialty COE', detail: 'Hire or partner one periodontist + one endodontist; formal GP referral programme; one clinic designated Specialty Hub.' },
    { lane: 'I', name: "Children's", detail: '"My First Dental Visit" protocol; school and nursery screenings; 70% of child patients bring one or more family members within 3 months.' },
    { lane: 'J', name: 'Orthodontics', detail: 'Invisalign Diamond Provider commitment → co-marketing + rebates; case value AED 16–24K; 18–24 months of recall anchor.' },
  ],
  pilot: [
    { lane: 'G', name: 'Aesthetic Adjacency', detail: 'Botox/fillers on cosmetic patients; 1 clinic × 1 provider × 6 months; go if over 15% uptake from Lane A patients.' },
    { lane: 'H', name: 'Dental Tourism', detail: '3 multilingual landing pages (AR/HI/FR) + origin-market campaigns; go: over 10 international leads/mo at 60 days, over 2 conversions/mo at 90 days.' },
  ],
  run: [
    { lane: 'K', name: 'Periodontics', detail: 'Upgrade to BUILD when the specialty hub and periodontist are live.' },
    { lane: 'L', name: 'Oral Surgery', detail: 'Every complex extraction feeds Lane C implant consults.' },
    { lane: 'M', name: 'TMJ / Night Guards', detail: 'GP upsell now; sleep-dental programme at 8+ clinics.' },
  ],
  source: 'The 13 Demand Lanes v2.0 — Lanes D–M (Notion)',
} as const;

export const SCORECARD = {
  rows: [
    { lane: 'A — Cosmetic', status: 'OWN', leads: '60–90', booking: '> 45%', acceptance: '> 62%', revenue: 'AED 180K–350K' },
    { lane: 'B — Family', status: 'OWN', leads: '150–250', booking: '> 55%', acceptance: '> 70%', revenue: 'AED 120K–220K' },
    { lane: 'C — Implants', status: 'OWN', leads: '30–50', booking: '> 42%', acceptance: '> 55%', revenue: 'AED 200K–420K' },
    { lane: 'D — Emergency', status: 'BUILD', leads: 'Same-day', booking: '> 75%', acceptance: '> 80%', revenue: 'AED 40K–80K' },
    { lane: 'E — Corporate', status: 'BUILD', leads: 'Contracts', booking: '—', acceptance: '—', revenue: 'AED 60K–140K' },
    { lane: 'F — Specialty', status: 'BUILD', leads: '20–35', booking: '> 60%', acceptance: '> 65%', revenue: 'AED 50K–100K' },
    { lane: 'G — Aesthetic', status: 'PILOT', leads: '15–25', booking: '> 40%', acceptance: '> 35%', revenue: 'AED 20K–45K' },
    { lane: 'H — Tourism', status: 'PILOT', leads: '5–15', booking: '> 35%', acceptance: '> 45%', revenue: 'AED 30K–100K' },
    { lane: 'I — Kids', status: 'BUILD', leads: '40–70', booking: '> 60%', acceptance: '> 75%', revenue: 'AED 25K–55K' },
    { lane: 'J — Ortho', status: 'BUILD', leads: '40–60', booking: '> 45%', acceptance: '> 50%', revenue: 'AED 80K–160K' },
    { lane: 'K, L, M', status: 'RUN', leads: 'Organic only', booking: '—', acceptance: '—', revenue: 'AED 30K–60K' },
  ],
  ifAllHit: 'If all lanes hit target: AED 835K–1.73M combined monthly revenue · 360–595+ monthly leads across active lanes.',
  source: '13 Demand Lanes v2.0 — Portfolio Health Scorecard (Notion)',
} as const;

export const REVOPS = {
  rule: 'Fix conversion leakage before scaling paid spend.',
  kpis: [
    { kpi: 'Speed to lead', target: 'Under 5 minutes' },
    { kpi: 'WhatsApp first response', target: 'Under 5 minutes' },
    { kpi: 'Call answer rate', target: '90%+' },
    { kpi: 'Lead → booking', target: '35–50% by source' },
    { kpi: 'Booking → show', target: '70–85%' },
    { kpi: 'No-show rate', target: 'Below 15–20%' },
    { kpi: 'Treatment-plan follow-up', target: '100% within 24 hours' },
  ],
  checklist: [
    'Missed calls reviewed', 'New leads contacted', 'WhatsApp conversations triaged',
    'Bookings confirmed', "Tomorrow's appointments confirmed", 'No-shows recovered',
    'Treatment plans followed up', 'Lost-lead reasons tagged', 'Campaign source tracked',
  ],
  owner: 'CRM / Conversion Lead — reports in the weekly Growth Meeting.',
  funnel: 'Impressions → Clicks → Leads → Contacted → Booked → Showed → Plan → Accepted → Revenue',
  source: 'DN Growth Command Center — Conversion & Revenue Operations control room (Notion)',
} as const;

export const CHAPTERS = {
  clinics: [
    { name: 'DN Acacia', detail: 'Platform-entry clinic, chapter live' },
    { name: 'DN Al Maher', detail: 'Integration asset; 3 chairs to unlock in 2027' },
    { name: 'DN Tosan', detail: 'Core revenue engine; 5 chairs fully active' },
    { name: 'DN Elite DIFC', detail: 'Pipeline; Index Tower, opening Q1-2027' },
  ],
  defines: [
    'Identity — positioning, catchment, priority segments, constraints',
    'Capacity — chairs, doctor hours, occupancy vs. target',
    'Local catchment map',
    '3–5 priority services only — never more',
    'Weekly activation plan — campaign, channel, owner, KPI',
    '12 clinic KPIs from leads through utilization',
  ],
  pods: ['Hygiene & Prevention', 'Whitening & Aesthetic', 'Emergency Dentistry', 'Implants', 'Orthodontics', 'Pediatric Dentistry'],
  podNote: 'Each pod owns a full funnel — leads → consults → plans → acceptance → revenue — with its own landing page, doctor videos, scripts, financing options and KPI dashboard.',
  source: 'DN Growth Command Center — Clinic Growth Chapters & Specialty Growth Pods (Notion)',
} as const;

export const RETENTION = {
  intro: 'Five canonical retention lanes; Lane A (Cosmetic) runs as a premium overlay inside aesthetic and rehab follow-up.',
  lanes: [
    { key: 'B', name: 'Family & Routine', detail: 'Become the family’s default oral-health home — recall compliance, family repeat rate, household penetration.' },
    { key: 'D', name: 'Emergency & Fast-Access', detail: 'Turn the rescue visit into retained care; every urgent visit ends with a second-step plan.' },
    { key: '—', name: 'Lifestyle & Aesthetics', detail: 'Extend the smile journey: maintenance, enhancement, referral at reveal moments.' },
    { key: 'J', name: 'Orthodontics / DN Align', detail: 'Protect start-to-finish completion across a long journey.' },
    { key: 'C', name: 'Implants & Full Rehab', detail: 'Never let a major case sit without the next clinical or maintenance step booked.' },
  ],
  rules: [
    'Every lane has a defined next-best-visit.',
    'Reactivation triggers: overdue recall, unfinished plans, lapsed cohorts, silent post-op.',
    'Monthly lane review.',
    'Loops to build: recall automation, reactivation playbooks, membership (Smile Club — live) journeys.',
  ],
  source: 'Lifecycle / Retention Engine (Notion, Growth OS — Engines)',
} as const;

export const CHANNEL_MAP = {
  groups: [
    { key: 'Paid', role: 'turn on demand', items: 'Google Search, Meta/TikTok/Snapchat, YouTube pre-roll, paid influencers, sponsored articles' },
    { key: 'Owned', role: 'convert & retain', items: 'Website + landing pages, SEO/GBP, email/SMS/WhatsApp lists, social accounts, in-clinic screens, CRM' },
    { key: 'Earned', role: 'trust engine', items: 'PR, Google reviews/Doctify, word-of-mouth, organic influencer mentions, backlinks and "top clinics" lists' },
    { key: 'Shared', role: 'social proof & warmth', items: 'Engagement/DMs, community groups, patient UGC, co-marketing, Reddit/Quora' },
    { key: 'Partner', role: 'quality pipeline', items: 'Corporates, schools, gyms, hotel concierges, tourism, insurance & memberships, affiliates, medical cross-referrals' },
  ],
  inOperation: 'Google Search · Meta · TikTok · SEO · landing pages · influencers/creators · retargeting · organic coordination · WhatsApp broadcasts',
  source: 'Marketing Channel Map · DN Growth Command Center (Notion)',
} as const;

export const PPP = {
  intro: '18 channels beyond paid marketing — more trusted than ads, cheaper than paid acquisition, and directly linked to chair utilization.',
  channels: 'Schools & nurseries · corporate wellness/HR · residential communities & developers · government warm contacts · internal clinical referral system · doctor-led trust content · embassies & expat communities · universities · insurance and access programs · hotels & hospitality · medical-referral partners (ENT, derma, pediatrics) · DN Academy external education events · family offices & executive circles · community prevention campaigns · broader public–private pilots · specialty referral networks',
  sprints: 'Rolled out in three sprints (30 / 60 / 90 days).',
  ownership: [
    { who: 'Dr. Hasna', what: 'PPP, schools, community health, institutional access' },
    { who: 'Dr. Tosun', what: 'Clinical credibility, governance, internal referrals' },
    { who: 'Founder/CEO', what: 'High-value intros, partnership closing' },
    { who: 'Marketing', what: 'Assets, QR journeys, campaigns' },
    { who: 'Ops', what: 'Capacity and activation logistics' },
    { who: 'Contact Center', what: 'Capture, follow-up, booking' },
    { who: 'Finance', what: 'Package economics, ROI' },
  ],
  machinery: 'One reusable Growth Kit (1-page proposals per channel, doctor profile sheets, screening workflow, QR booking journey, WhatsApp scripts, CRM stages) · weekly 45-minute Channel War Room · 11-stage pipeline from target identified → activation → revenue → repeat/scale · channel economics measured weekly.',
  source: 'PPP & Institutional Growth Channels Playbook (Notion)',
} as const;

export const GROUP_STRUCTURE = {
  rows: [
    { entity: 'Dental Nation Holdings (HoldCo)', status: 'Active', role: 'Group parent entity' },
    { entity: 'Dental Nation MSO', status: 'Active', role: 'Shared services platform: growth, marketing, CRM, finance, procurement' },
    { entity: 'Dental Nation IP Co', status: 'Active', role: 'Owns the brand, playbooks and IP used across the network' },
    { entity: 'Dental Nation Al Wasl Co', status: 'Trading', role: 'Platform-entry clinic; 2 active / 4 installed chairs' },
    { entity: 'Dental Nation Dr. Tosun Co', status: 'Trading', role: 'Core revenue engine; 5 active chairs' },
    { entity: 'Dental Nation AMC Co (Al Maher)', status: 'Integrating', role: 'Acquisition; 2 active / 5 installed; 3 chairs to unlock 2027' },
    { entity: 'Dental Nation DIFC Co', status: 'Pipeline', role: 'Index Tower; opening Q1-2027' },
    { entity: 'Dental Nation Academy Co', status: 'Future', role: 'CPD + training vertical' },
    { entity: 'Dental Nation Retail Co', status: 'Future', role: 'Consumer health products' },
  ],
  why: [
    'Each clinic is ring-fenced in its own entity — clean accountability per site.',
    'Growth, brand and shared services are built once at platform level and reused.',
    'New clinics plug into the same demand, conversion and retention system from day one.',
    'Future verticals extend the brand without touching clinic operations.',
  ],
  source: 'Dental Nation Group structure (Notion)',
} as const;

export const CADENCE = {
  phases: [
    {
      window: 'Days 1–30',
      name: 'Foundation & control',
      items: ['Growth Office charter + Growth Lead assigned', 'Clinic chapters for all 4 clinics', 'Lead-source and WhatsApp/call booking-flow audit', 'KPI dictionary + first Growth Dashboard', 'Weekly Growth Meeting + campaign calendar'],
    },
    {
      window: 'Days 31–60',
      name: 'Activation',
      items: ['2–3 campaigns per clinic live', 'First pods: hygiene, whitening, emergency, implants', 'Landing pages + WhatsApp scripts + retargeting', 'Review collection + partnership pipeline', 'No-show recovery + treatment follow-up systems'],
    },
    {
      window: 'Days 61–90',
      name: 'Optimization & scale',
      items: ['Cut weak campaigns, scale winners', 'Doctor-specific proof content', 'Recall + referral system, Smile Club structure', 'Clinic & specialty scorecards', 'Live dashboard + repeatable growth playbooks'],
    },
  ],
  weekly: 'Last week performance · revenue by clinic · leads by source · booking conversion · no-show leakage · treatment-plan follow-up · campaign performance · clinic activation · content needed · actions for next 7 days.',
  weeklyOutput: 'Every meeting produces: action, owner, deadline, KPI impacted, next review date.',
  source: 'DN Growth Command Center — 30/60/90 build plan & Weekly Growth Meeting template (Notion)',
} as const;

export const OPEN_WORK = {
  intro: 'The architecture is documented; the open items are ownership, live data, and operating discipline.',
  growth: ['Assign Growth Lead and CRM/Conversion owner', 'Build the working databases (Growth Actions, Clinic Chapters, Specialty Pods, Campaign Calendar, KPI Scorecard)', 'Start the weekly Growth Meeting', 'Run the conversion audit', 'Stand up the live Growth Dashboard'],
  channels: ['Launch Sprint 1 institutional channels (schools, corporate HR, residential)', 'Build the reusable Growth Kit', 'Start the weekly Channel War Room', 'Activate internal clinical referral tracking', 'Doctor trust-content sprint (20 short videos)'],
  decisionRules: [
    'Fix conversion leakage before scaling paid spend.',
    'Each clinic focuses on 3–5 priority services only.',
    'Build proof assets before pushing high-ticket services.',
    'Track by clinic AND by specialty, not only total revenue.',
    'Growth coordinates with clinical capacity before campaigns launch.',
    'Cut weak campaigns quickly; scale winners with discipline.',
  ],
  source: 'DN Growth Command Center — Immediate next actions & decision rules · PPP Playbook (Notion)',
} as const;

export const CLOSING = {
  headline: 'One system: Demand → Bookings → Treatment → Lifetime Value.',
  body: 'Every activity in this report — lanes, channels, pods, retention loops, clinic entities — is one operating model. The job now is to staff it, dashboard it, and run the weekly rhythm.',
} as const;
