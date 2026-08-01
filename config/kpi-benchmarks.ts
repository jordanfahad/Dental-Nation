/**
 * Industry-benchmark KPI map — the curated data behind Group → KPI Benchmarks.
 *
 * Purpose (Mr Akbar's ask, 31 Jul): for every growth motion — programmatic
 * SEO, AI SEO, paid ads, organic social, affiliates/collaborations, GMB — lay
 * out the KPI chain, the industry benchmark for each KPI, and where the
 * dashboard measures our actual, so anyone can see what "good" looks like and
 * what we have achieved so far.
 *
 * HONESTY RULES for this file:
 *  - Benchmarks are PLANNING ASSUMPTIONS curated from public industry studies
 *    (healthcare/dental averages, 2024–26: LocaliQ/WordStream ad benchmarks,
 *    Google SERP CTR studies, Meta/IG engagement studies, dental patient-
 *    acquisition norms). They are directional ranges, not contractual targets.
 *    Edit them here — the UI re-renders from this file, nothing is hard-coded.
 *  - A KPI whose actual the dashboard cannot measure yet says so ("not yet
 *    measured") rather than showing a guessed number.
 *  - Money benchmarks are in AED (converted ~3.67/USD, rounded to round AED).
 */

export type KpiUnit = 'pct' | 'aed' | 'x' | 'count' | 'pos';

export interface KpiBenchmark {
  /** Range bounds in the KPI's native unit (pct as 0..1). */
  lo: number;
  hi: number;
  unit: KpiUnit;
  /** Which direction is good — CPL/CPC are 'lower', CTR/ROAS are 'higher'. */
  better: 'higher' | 'lower';
  /** Display string, e.g. "2–5%" or "AED 150–330". */
  label: string;
}

export interface KpiDef {
  key: string;
  label: string;
  /** One plain-English line: what this KPI means and why it matters. */
  explain: string;
  /** null = context/volume metric with no meaningful industry range. */
  benchmark: KpiBenchmark | null;
  /** Shown when benchmark is null (why there is no range), or as a caveat. */
  benchmarkNote?: string;
  /** Where the range comes from — kept generic and honest. */
  source: string | null;
  /** Where the live number lives in the dashboard; null = not yet measured. */
  mapsTo: { label: string; href: string } | null;
  /** Shown when mapsTo is null — what it would take to measure it. */
  measureNote?: string;
}

export interface KpiMotion {
  key: string;
  title: string;
  /** What this workstream is, in one line. */
  subtitle: string;
  /** The KPI chain, first stage → last (rendered as the motion's funnel). */
  chain: string[];
  kpis: KpiDef[];
}

const DIGITAL = { label: 'Digital & SEO tab', href: '/?tab=digital' };
const GROWTH = { label: 'Group → Growth Platform', href: '/?tab=group&gtab=growth' };
const MKT_GOOGLE = { label: 'Marketing → Google Ads', href: '/?tab=marketing&mtab=google' };
const MKT_META = { label: 'Marketing → Meta Ads', href: '/?tab=marketing&mtab=meta' };
const SOCIAL = { label: 'Social & Local tab', href: '/?tab=social' };
const ARABY = { label: 'Araby Ads tab', href: '/?tab=arabyads' };
const CRM_TAB = { label: 'CRM — Zavis tab', href: '/?tab=crm' };
const MOS = { label: 'Group → Marketing OS', href: '/?tab=group&gtab=mos' };
const MOS_SC = { label: 'Marketing OS → Smile Club', href: '/?tab=group&gtab=mos&mpipe=smile-club' };
const MOS_CRM = { label: 'Marketing OS → CRM pipeline', href: '/?tab=group&gtab=mos&mpipe=crm' };

const pct = (lo: number, hi: number, better: 'higher' | 'lower' = 'higher'): KpiBenchmark => ({
  lo, hi, unit: 'pct', better,
  label: `${lo * 100 % 1 ? (lo * 100).toFixed(1) : lo * 100}–${hi * 100 % 1 ? (hi * 100).toFixed(1) : hi * 100}%`,
});
const aed = (lo: number, hi: number): KpiBenchmark => ({
  lo, hi, unit: 'aed', better: 'lower', label: `AED ${lo}–${hi}`,
});

export const KPI_MOTIONS: KpiMotion[] = [
  // ── 1 · Programmatic SEO ──────────────────────────────────────────────────
  {
    key: 'pseo',
    title: 'Programmatic SEO',
    subtitle: 'Generate treatment/location pages at scale → get them indexed → rank → organic sessions → enquiries.',
    chain: ['Pages generated', 'Pages indexed', 'Impressions', 'Organic sessions', 'Enquiries', 'Bookings'],
    kpis: [
      {
        key: 'pseo.indexed',
        label: 'Pages indexed by Google',
        explain: 'How much of the generated content Google has accepted into search — the raw material of organic growth.',
        benchmark: null,
        benchmarkNote:
          'Target norm: 60–80% of generated pages indexed within ~90 days. Computing the RATE needs the pages-generated count from the pSEO workstream, which the dashboard does not receive yet — the indexed count itself is live below.',
        source: 'pSEO practitioner norms (indexation-rate)',
        mapsTo: DIGITAL,
      },
      {
        key: 'pseo.impressions',
        label: 'Search impressions',
        explain: 'How often our pages appear in Google results — visibility before anyone clicks.',
        benchmark: null,
        benchmarkNote: 'Volume metric — judge by trend (a healthy young pSEO program grows impressions +10–20% month over month as pages index).',
        source: null,
        mapsTo: DIGITAL,
      },
      {
        key: 'pseo.ctr',
        label: 'Organic CTR (search)',
        explain: 'Of the times we appeared in results, how often someone clicked — driven by ranking position and titles.',
        benchmark: pct(0.02, 0.05),
        source: 'Google SERP CTR studies (site-wide avg; position-dependent)',
        mapsTo: DIGITAL,
      },
      {
        key: 'pseo.position',
        label: 'Average search position',
        explain: 'Where we rank on average across all queries that showed us — page 1 is position ≤ 10.',
        benchmark: { lo: 1, hi: 10, unit: 'pos', better: 'lower', label: 'Top 10 (page 1)' },
        source: 'Page-1 visibility norm',
        mapsTo: DIGITAL,
      },
      {
        key: 'pseo.sessions',
        label: 'Organic SEO sessions',
        explain: 'Visits arriving from search engines — the traffic the whole motion exists to create.',
        benchmark: null,
        benchmarkNote: 'Volume metric — judge by trend against the impressions above.',
        source: null,
        mapsTo: DIGITAL,
      },
      {
        key: 'pseo.conv',
        label: 'Organic session → enquiry',
        explain: 'Of organic visitors, how many became an enquiry (form, call tap, WhatsApp) — the conversion step.',
        benchmark: pct(0.02, 0.05),
        source: 'Dental/healthcare website conversion norms',
        mapsTo: GROWTH,
      },
    ],
  },

  // ── 2 · AI SEO (AEO/GEO) ──────────────────────────────────────────────────
  {
    key: 'aiseo',
    title: 'AI SEO — citations in ChatGPT & friends',
    subtitle: 'Build authority (backlinks, citations) so AI assistants recommend Dental Nation → AI-referred sessions → enquiries.',
    chain: ['Backlinks & citations', 'AI recommendations', 'AI-chat sessions', 'Enquiries', 'Bookings'],
    kpis: [
      {
        key: 'aiseo.citations',
        label: 'Backlinks & AI citations earned',
        explain: 'The authority-building output: links from other sites and mentions inside AI answers.',
        benchmark: null,
        benchmarkNote: 'No public benchmark exists yet for AI citations — this discipline is ~2 years old.',
        source: null,
        mapsTo: null,
        measureNote:
          'Not measurable from our own analytics — needs the AI-SEO vendor\'s link/citation report (e.g. Ahrefs export + manual assistant audits) fed into the dashboard.',
      },
      {
        key: 'aiseo.sessions',
        label: 'AI-chat sessions',
        explain: 'Visits referred by ChatGPT, Claude, Perplexity, Copilot, Gemini — people the assistants sent to us.',
        benchmark: null,
        benchmarkNote: 'Volume metric — judge by trend; this is the earliest reliable signal that citations are landing.',
        source: null,
        mapsTo: DIGITAL,
      },
      {
        key: 'aiseo.share',
        label: 'AI share of site sessions',
        explain: 'AI-chat sessions as a share of all site sessions — how big the AI channel already is for us.',
        benchmark: pct(0.005, 0.02),
        source: 'Emerging web-traffic norms 2025–26 (AI referral share, most industries)',
        mapsTo: DIGITAL,
      },
      {
        key: 'aiseo.conv',
        label: 'AI-chat session → enquiry',
        explain: 'AI-referred visitors arrive pre-sold by the assistant, so their conversion should match or beat organic search.',
        benchmark: pct(0.02, 0.08),
        source: 'Early AI-referral studies (intent at or above organic search)',
        mapsTo: GROWTH,
      },
    ],
  },

  // ── 3 · Paid Search ───────────────────────────────────────────────────────
  {
    key: 'paid-search',
    title: 'Paid Search — Google Ads',
    subtitle: 'Buy high-intent searches ("dentist near me") → clicks → enquiries → bookings → revenue.',
    chain: ['Impressions', 'Clicks', 'Enquiries', 'Bookings', 'Showed', 'Revenue'],
    kpis: [
      {
        key: 'ps.ctr',
        label: 'CTR (search ads)',
        explain: 'Of the people who saw our ad, how many clicked — ad relevance and keyword targeting.',
        benchmark: pct(0.05, 0.07),
        source: 'LocaliQ/WordStream healthcare & dental search benchmarks 2024–25',
        mapsTo: MKT_GOOGLE,
      },
      {
        key: 'ps.cpc',
        label: 'Cost per click',
        explain: 'What one visit from a paid search costs us — dental keywords in Dubai are competitive.',
        benchmark: aed(10, 25),
        source: 'Healthcare/dental CPC norms (converted to AED)',
        mapsTo: MKT_GOOGLE,
      },
      {
        key: 'ps.conv',
        label: 'Click → enquiry',
        explain: 'Of paid clicks, how many turned into a measured enquiry — landing-page and call-path quality.',
        benchmark: pct(0.03, 0.05),
        benchmarkNote: 'Our click-to-enquiry tagging went live 29 Jul — windows before that under-count enquiries.',
        source: 'Healthcare search conversion norms',
        mapsTo: GROWTH,
      },
      {
        key: 'ps.cpl',
        label: 'Cost per enquiry (CPL)',
        explain: 'Spend divided by enquiries — the headline efficiency number for lead generation.',
        benchmark: aed(150, 330),
        source: 'Healthcare search CPL norms (converted to AED)',
        mapsTo: GROWTH,
      },
      {
        key: 'ps.cpb',
        label: 'Cost per booking',
        explain: 'Spend divided by booked appointments — closer to what a patient actually costs to acquire.',
        benchmark: aed(350, 800),
        source: 'Dental patient-acquisition norms (wide range by treatment mix)',
        mapsTo: GROWTH,
      },
      {
        key: 'ps.roas',
        label: 'ROAS (revenue ÷ spend)',
        explain: 'Billed revenue attributed to the channel per dirham of ad spend.',
        benchmark: { lo: 3, hi: 5, unit: 'x', better: 'higher', label: '3–5×' },
        source: 'Healthcare paid-media planning norms',
        mapsTo: GROWTH,
      },
    ],
  },

  // ── 4 · Paid Social ───────────────────────────────────────────────────────
  {
    key: 'paid-social',
    title: 'Paid Social — Meta (Instagram / Facebook)',
    subtitle: 'Interrupt-and-interest: reach people who weren\'t searching → clicks/leads → enquiries → bookings.',
    chain: ['Impressions', 'Clicks', 'Leads', 'Enquiries', 'Bookings'],
    kpis: [
      {
        key: 'so.ctr',
        label: 'CTR (Meta ads)',
        explain: 'Social CTR runs far below search — people aren\'t looking for a dentist when we appear.',
        benchmark: pct(0.009, 0.016),
        source: 'Meta healthcare CTR benchmarks 2024–25',
        mapsTo: MKT_META,
      },
      {
        key: 'so.cpl',
        label: 'Cost per lead',
        explain: 'Spend divided by leads — social leads are cheaper than search but lower intent.',
        benchmark: aed(55, 150),
        source: 'Healthcare Meta lead-gen CPL norms (converted to AED)',
        mapsTo: MKT_META,
      },
      {
        key: 'so.conv',
        label: 'Enquiry → booking',
        explain: 'Of social enquiries, how many actually booked — the intent gap shows up here.',
        benchmark: pct(0.10, 0.25),
        source: 'Lead-gen follow-up norms (speed-to-call dependent)',
        mapsTo: GROWTH,
      },
    ],
  },

  // ── 5 · Organic Social ────────────────────────────────────────────────────
  {
    key: 'social-organic',
    title: 'Organic Social',
    subtitle: 'Build trust and brand with content → reach → engagement → profile visits → enquiries over time.',
    chain: ['Posts', 'Reach', 'Engagement', 'Profile visits', 'Enquiries'],
    kpis: [
      {
        key: 'sg.followers',
        label: 'Followers (IG + FB)',
        explain: 'The audience we own — grows slowly and compounds.',
        benchmark: null,
        benchmarkNote: 'Volume metric — healthy pages grow ~1–3% per month; judge by trend.',
        source: null,
        mapsTo: SOCIAL,
      },
      {
        key: 'sg.engage',
        label: 'Engagement ÷ reach',
        explain: 'Of the people our content reached, how many reacted, commented, saved or shared — content quality.',
        benchmark: pct(0.03, 0.06),
        source: 'Instagram engagement-per-reach studies (healthcare pages)',
        mapsTo: SOCIAL,
      },
      {
        key: 'sg.enquiries',
        label: 'Enquiries from organic social',
        explain: 'DMs/profile-link enquiries the funnel attributes to organic social — usually modest and brand-driven.',
        benchmark: null,
        benchmarkNote: 'No meaningful industry range — organic social converts indirectly (brand → search → enquiry).',
        source: null,
        mapsTo: GROWTH,
      },
    ],
  },

  // ── 6 · Affiliates, Influencers & Collaborations ──────────────────────────
  {
    key: 'collab',
    title: 'Affiliates, Influencers & Collaborations',
    subtitle: 'Third parties send us leads (ArabyAds pay-per-lead) or audiences (influencers, partnerships like Smile Club).',
    chain: ['Partner activity', 'Leads delivered', 'Verified leads', 'Bookings', 'Revenue'],
    kpis: [
      {
        key: 'af.leads',
        label: 'Affiliate leads delivered (ArabyAds)',
        explain: 'Raw leads the affiliate sent — before verification and follow-up.',
        benchmark: null,
        benchmarkNote: 'Volume depends on the contracted plan, not an industry range.',
        source: null,
        mapsTo: ARABY,
      },
      {
        key: 'af.conv',
        label: 'Affiliate enquiry → booking',
        explain: 'Of affiliate leads, how many booked — the honest measure of lead quality.',
        benchmark: pct(0.10, 0.25),
        source: 'Pay-per-lead affiliate norms (quality varies widely by source)',
        mapsTo: GROWTH,
      },
      {
        key: 'af.influencer',
        label: 'Influencers & partnerships',
        explain: 'Collab posts and Smile Club partnership activity.',
        benchmark: null,
        benchmarkNote: 'Typical influencer engagement runs 2–5%, but our collabs have no tracking links yet.',
        source: 'Influencer campaign norms',
        mapsTo: null,
        measureNote:
          'Not tracked yet — needs per-collab UTM links or promo codes so bookings can be attributed. Shows as "not tracked yet" in the Growth Platform until then.',
      },
    ],
  },

  // ── 7 · Google Business Profile ───────────────────────────────────────────
  {
    key: 'gmb',
    title: 'Google Business Profile (Maps / local)',
    subtitle: '"Dentist near me" on Maps → profile views → calls & direction requests → bookings.',
    chain: ['Profile views', 'Calls / directions / clicks', 'Enquiries', 'Bookings'],
    kpis: [
      {
        key: 'gmb.views',
        label: 'Profile views (Maps + Search)',
        explain: 'How often the clinic profile was seen locally — local visibility.',
        benchmark: null,
        benchmarkNote: 'Volume metric — judge by trend and review velocity.',
        source: null,
        mapsTo: SOCIAL,
      },
      {
        key: 'gmb.enquiries',
        label: 'GMB enquiries (calls + actions)',
        explain: 'Actions taken from the profile that the funnel counts as enquiries.',
        benchmark: null,
        benchmarkNote: 'Typical profiles convert 5–10% of views into an action (call/directions/site click).',
        source: 'Local-SEO profile conversion norms',
        mapsTo: GROWTH,
      },
      {
        key: 'gmb.conv',
        label: 'GMB enquiry → booking',
        explain: 'Map callers are the highest-intent channel — most already chose us.',
        benchmark: pct(0.20, 0.40),
        source: 'Local call-to-appointment norms',
        mapsTo: GROWTH,
      },
    ],
  },

  // ── 8 · The clinic funnel every channel feeds ─────────────────────────────
  {
    key: 'funnel',
    title: 'Overall funnel — every channel lands here',
    subtitle: 'Whatever the channel, the same clinic funnel converts it: enquiry → booking → show → treatment → revenue.',
    chain: ['Enquiries', 'Bookings', 'Showed up', 'Treated', 'Revenue'],
    kpis: [
      {
        key: 'fu.enq2book',
        label: 'Enquiry → booking',
        explain: 'Reception effectiveness: of all enquiries across channels, how many became an appointment.',
        benchmark: pct(0.30, 0.50),
        source: 'Dental front-desk conversion norms',
        mapsTo: GROWTH,
      },
      {
        key: 'fu.show',
        label: 'Show rate',
        explain: 'Of booked appointments, how many actually showed (vs cancels and no-shows).',
        benchmark: pct(0.75, 0.85),
        benchmarkNote: 'Cohort split pending: Smile Club members vs non-members — members should exceed the norm.',
        source: 'Dental appointment show-rate norms',
        mapsTo: GROWTH,
      },
      {
        key: 'fu.treat',
        label: 'Booked patients → treated',
        explain: 'Of booked patients, how many were billed for treatment — case acceptance plus show-through.',
        benchmark: pct(0.60, 0.80),
        source: 'Dental case-acceptance norms',
        mapsTo: GROWTH,
      },
    ],
  },

  // ── 9 · CRM (WhatsApp + Email) — per the Marketing OS spec §9.5 ───────────
  {
    key: 'crm-reactivation',
    title: 'CRM — WhatsApp + Email reactivation',
    subtitle:
      'Re-engage the patients we already have: segmented WhatsApp broadcasts and email journeys → replies/clicks → bookings → reactivation revenue. The only motion where the audience is already paid for.',
    chain: ['Segments activated', 'Messages delivered', 'Opened / Read', 'Replied / Clicked', 'Bookings', 'Reactivation revenue'],
    kpis: [
      {
        key: 'crm.segments',
        label: 'Segments in live use ÷ built',
        explain: 'Of the 105 audience segments built, how many actually ran a campaign in the last 30 days.',
        benchmark: null,
        benchmarkNote: 'No industry range — activation metric. Internal target: ≥10 of 105 in live use by day 45.',
        source: 'Internal target (Marketing OS spec)',
        mapsTo: MOS_CRM,
      },
      {
        key: 'wa.delivery',
        label: 'WhatsApp delivery rate',
        explain: 'Of messages sent, how many actually reached a handset — list hygiene and number quality.',
        benchmark: pct(0.95, 0.99),
        source: 'WhatsApp Business API norms',
        mapsTo: CRM_TAB,
      },
      {
        key: 'wa.read',
        label: 'WhatsApp read rate',
        explain: 'WhatsApp\'s structural advantage over email — most delivered messages get read.',
        benchmark: pct(0.70, 0.90),
        source: 'WhatsApp Business messaging studies 2024–25',
        mapsTo: CRM_TAB,
      },
      {
        key: 'wa.reply',
        label: 'Reply / CTA click rate',
        explain: 'Of delivered broadcasts, how many replied or tapped the call-to-action.',
        benchmark: pct(0.05, 0.15),
        source: 'WhatsApp broadcast engagement norms (healthcare/retail)',
        mapsTo: CRM_TAB,
      },
      {
        key: 'wa.booking',
        label: 'Broadcast → booking',
        explain: 'Of delivered messages, how many produced a booking (recall/reactivation campaigns).',
        benchmark: pct(0.01, 0.05),
        source: 'Dental recall campaign norms',
        mapsTo: GROWTH,
      },
      {
        key: 'wa.optout',
        label: 'Opt-out rate (guard metric)',
        explain: 'The kill-switch: burning the list costs more than any campaign earns. >2% on any single broadcast pauses the segment.',
        benchmark: { lo: 0, hi: 0.01, unit: 'pct', better: 'lower', label: '<1% per broadcast' },
        benchmarkNote: 'Kill-switch at >2% on any single broadcast. UAE PDPL consent hygiene applies.',
        source: 'List-health norms',
        mapsTo: CRM_TAB,
      },
      {
        key: 'em.open',
        label: 'Email open rate',
        explain: 'Directional only post-Apple-MPP — opens are partly machine-generated.',
        benchmark: pct(0.20, 0.40),
        source: 'Healthcare/dental email norms 2024–25 (treat as directional)',
        mapsTo: CRM_TAB,
      },
      {
        key: 'em.ctr',
        label: 'Email click-through rate',
        explain: 'Of delivered emails, how many clicked through — the honest email engagement number.',
        benchmark: pct(0.02, 0.035),
        source: 'Healthcare email CTR norms',
        mapsTo: CRM_TAB,
      },
      {
        key: 'em.booking',
        label: 'Email → booking',
        explain: 'Of delivered recall/reactivation emails, how many produced a booking.',
        benchmark: pct(0.005, 0.02),
        source: 'Dental recall email norms',
        mapsTo: GROWTH,
      },
      {
        key: 'em.unsub',
        label: 'Unsubscribe rate (guard metric)',
        explain: 'List-health guard for email — sustained unsubscribes mean the segment or cadence is wrong.',
        benchmark: { lo: 0, hi: 0.003, unit: 'pct', better: 'lower', label: '<0.3% per send' },
        source: 'Email list-health norms',
        mapsTo: CRM_TAB,
      },
      {
        key: 'crm.react.patients',
        label: 'Reactivated patients (lapsed >6 months)',
        explain: 'Lapsed patients who booked after a CRM touch — the motion\'s reason to exist.',
        benchmark: pct(0.10, 0.20),
        benchmarkNote: 'Share of a lapsed list reactivated annually by recall programs.',
        source: 'Dental recall program norms',
        mapsTo: GROWTH,
      },
      {
        key: 'crm.react.cpb',
        label: 'Cost per reactivated booking',
        explain: 'Should run far below blended acquisition CPA — compare directly against the paid cost-per-booking rows.',
        benchmark: null,
        benchmarkNote: 'Judged against our own paid CPA rows (Motions 3–4), not an external range.',
        source: null,
        mapsTo: GROWTH,
      },
      {
        key: 'crm.share',
        label: 'CRM share of total bookings',
        explain: 'How much of demand comes from patients we already own vs paid acquisition.',
        benchmark: pct(0.20, 0.30),
        source: 'Mature dental groups (recall/CRM share of bookings)',
        mapsTo: GROWTH,
      },
      {
        key: 'crm.react.revenue',
        label: 'Reactivation revenue (AED)',
        explain: 'Billed revenue from CRM-attributed bookings — each reactivated patient ≈ recall visit + treatment-plan uplift.',
        benchmark: null,
        benchmarkNote: 'Volume metric — judge by trend.',
        source: null,
        mapsTo: GROWTH,
      },
    ],
  },

  // ── 10 · Smile Club (membership) — per the Marketing OS spec §9.6 ─────────
  {
    key: 'smile-club',
    title: 'Smile Club — membership plan',
    subtitle:
      'Recurring-revenue membership (AED 69/month · AED 799/year): eligible patients and corporate prospects → pitched → joined → active members → MRR → member lifetime value.',
    chain: ['Eligible / prospects', 'Pitched', 'Joined', 'Active members', 'MRR', 'Member LTV'],
    kpis: [
      {
        key: 'sc10.members',
        label: 'Members enrolled / MRR (AED)',
        explain: 'The headline: paying members and monthly recurring revenue.',
        benchmark: null,
        benchmarkNote: 'Volume — judge by trend. 90-day bar: 150 members ≈ AED 10K MRR.',
        source: 'Internal target (Marketing OS spec)',
        mapsTo: MOS_SC,
      },
      {
        key: 'sc10.pitch',
        label: 'Front-desk pitch → join',
        explain: 'Of eligible patients offered membership at checkout, how many joined.',
        benchmark: pct(0.15, 0.30),
        source: 'Dental membership plan norms (in-office enrollment)',
        mapsTo: MOS_SC,
      },
      {
        key: 'sc10.retention',
        label: 'Annual retention',
        explain: 'Membership plans are sticky when benefits are used — retention is the LTV engine.',
        benchmark: pct(0.85, 0.95),
        source: 'Dental membership plan studies',
        mapsTo: GROWTH,
      },
      {
        key: 'sc10.redemption',
        label: 'Benefit redemption rate',
        explain: 'Members using their included cleanings/check-ups annually — low redemption predicts churn.',
        benchmark: pct(0.60, 1.0),
        source: 'Membership plan health norms',
        mapsTo: MOS_SC,
      },
      {
        key: 'sc10.showrate',
        label: 'Member vs non-member show rate',
        explain: 'Members should exceed the 75–85% norm — the cohort split lands on Motion 8.',
        benchmark: pct(0.75, 0.85),
        source: 'Dental show-rate norms (member cohort should beat this)',
        mapsTo: GROWTH,
      },
      {
        key: 'sc10.value',
        label: 'Member vs non-member annual value',
        explain: 'Members typically produce a multiple of non-member annual revenue.',
        benchmark: { lo: 2, hi: 2.5, unit: 'x', better: 'higher', label: '2–2.5×' },
        source: 'Dental membership studies',
        mapsTo: GROWTH,
      },
      {
        key: 'sc10.corp',
        label: 'Corporate accounts signed / seats',
        explain: 'Companies and schools registering teams — the B2B channel for memberships.',
        benchmark: null,
        benchmarkNote: 'Volume — contracted-plan dependent. Bars: ≥3 proposals by day 30, first account by day 60.',
        source: 'Internal target (Marketing OS spec)',
        mapsTo: MOS_SC,
      },
    ],
  },
];

/** Global disclaimer rendered at the top of the KPI Benchmarks view. */
export const KPI_DISCLAIMER =
  'Benchmarks are planning assumptions curated from public industry studies (healthcare/dental averages, 2024–26) — directional ranges to judge progress against, not targets carved in stone. Money figures are AED. Every "ours" number is the live dashboard figure for the selected date window; follow the link on each row to see the detail behind it.';
