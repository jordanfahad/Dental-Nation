/**
 * The forward view — what is in the pipeline and what it is expected to do.
 *
 * THE PROBLEM THIS FILE HAS TO SOLVE
 * Everything else on the Command Deck is a measurement. This section is not:
 * it is a set of projections, and a projection cannot survive "where did that
 * come from?" the way a billed patient can. The deck's credibility is built on
 * that distinction, so a forward view that blurs it would damage the rest of
 * the page rather than add to it.
 *
 * THE RULES, THEREFORE
 * 1. Every projection resolves through the SAME measured conversion chain the
 *    business actually runs at — enquiry to booking to attendance to bill —
 *    computed from our own trading history, never from an industry figure.
 *    An initiative's own assumption is only ever about how much DEMAND it
 *    creates; what that demand is worth is measured.
 * 2. Every assumption is tagged 'measured', 'benchmark' or 'estimate' and
 *    carries its source. An untagged number is a bug.
 * 3. Every initiative shows a low, base and high case. A single number implies
 *    a precision no forecast has.
 * 4. Every initiative names what would make it wrong, and initiatives whose
 *    results we would NOT be able to verify say so before the money is spent.
 *    "We cannot tell whether this worked" is a finding, not an omission.
 */

export type Certainty = 'measured' | 'benchmark' | 'estimate';

export const CERTAINTY_LABEL: Record<Certainty, string> = {
  measured: 'Measured — our own data',
  benchmark: 'Industry benchmark',
  estimate: 'Judgement — no data behind it',
};

export interface Assumption {
  label: string;
  value: string;
  basis: Certainty;
  source: string;
}

/**
 * How an initiative creates value.
 *
 * 'enquiries' — it produces incremental net enquiries per month; the measured
 *               chain converts them. quality/value factors adjust for demand
 *               that behaves differently from our average (an affiliate lead
 *               books less often; an aesthetics enquiry bills far more).
 * 'bookings'  — it produces bookings directly, skipping the enquiry stage
 *               (recovering a booking that was already made and then lost).
 * 'recurring' — it produces monthly recurring revenue directly.
 * 'capability'— it produces no revenue of its own; it makes other things
 *               possible and displaces cost.
 */
export type PipelineModel =
  | {
      kind: 'enquiries';
      low: number;
      base: number;
      high: number;
      /** Multiplier on the measured enquiry→booking rate. 1 = behaves like our average. */
      quality: { low: number; base: number; high: number };
      /** Multiplier on the measured average bill. 1 = bills like our average. */
      value: { low: number; base: number; high: number };
    }
  | { kind: 'bookings'; low: number; base: number; high: number }
  | { kind: 'recurring'; low: number; base: number; high: number }
  | { kind: 'capability' };

export type PipelineStatus = 'live' | 'committed' | 'proposed' | 'not_recommended';

export const STATUS_LABEL: Record<PipelineStatus, string> = {
  live: 'Running now',
  committed: 'Committed — building',
  proposed: 'Proposed — awaiting approval',
  not_recommended: 'Not recommended yet',
};

export type Confidence = 'high' | 'medium' | 'low' | 'unverifiable';

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  unverifiable: 'Cannot be verified',
};

export interface Initiative {
  key: string;
  name: string;
  group: string;
  status: PipelineStatus;
  /** One sentence: the mechanism, in the board's language. */
  thesis: string;
  /** The causal chain, stage by stage — what turns spend into patients. */
  chain: string[];
  model: PipelineModel;
  /** Recurring monthly investment, AED. */
  monthlyCost: number | null;
  /** One-off build or setup cost, AED. */
  oneOffCost: number | null;
  /** Months before the first measurable effect, and months to the modelled run rate. */
  leadMonths: number;
  maturityMonths: number;
  assumptions: Assumption[];
  confidence: Confidence;
  confidenceNote: string;
  /** What would make this projection wrong. Never omitted. */
  risk: string;
  /** Value that is real but does not show up as revenue. */
  softImpact: string | null;
  /** Initiatives that must exist for this one to be deliverable. */
  dependsOn?: string[];
}

/* ─────────────────────────────────────────────────────────── initiatives ── */

export const PIPELINE: Initiative[] = [
  {
    key: 'widget_completion',
    name: 'Fix the booking widget’s failure rate',
    group: 'Conversion of demand we already have',
    status: 'proposed',
    thesis:
      'Patients who have already chosen a clinic, a treatment, a date and a time — and verified their phone by one-time password — are failing at the last step. This is not a marketing problem and it needs no media spend.',
    chain: [
      'Booking widget viewed — 3,852 times',
      'Booking flow started — 443',
      'Personal details submitted and phone verified — 150',
      'Booking completed — 60 · booking ERROR — 50',
      'Removing the errors converts an already-qualified patient at no acquisition cost',
    ],
    model: { kind: 'bookings', low: 4, base: 8, high: 18 },
    monthlyCost: null,
    oneOffCost: 0,
    leadMonths: 1,
    maturityMonths: 2,
    assumptions: [
      {
        label: 'Qualified attempts ending in an error',
        value: '50 errors against 60 completions — 45% of final-step attempts',
        basis: 'measured',
        source: 'Google Analytics event counts, booking_error vs booking_completed, full history',
      },
      {
        label: 'Errors that are fixable',
        value: 'Base case assumes all of them; low case assumes half',
        basis: 'estimate',
        source: 'The error is not yet diagnosed — some share may be patients abandoning rather than a fault',
      },
      {
        label: 'Value of a recovered booking',
        value: 'The measured revenue per booking, applied unchanged',
        basis: 'measured',
        source: 'Billed revenue ÷ bookings, full trading history',
      },
      {
        label: 'High case',
        value: 'Errors fixed AND the flow-start to completion rate roughly doubled',
        basis: 'benchmark',
        source: 'Healthcare booking widgets typically complete 25–35% of started flows; ours completes 13.5%',
      },
    ],
    confidence: 'high',
    confidenceNote:
      'The loss is measured rather than forecast, and the patients are already ours — they arrived, chose, and verified a phone number. The only genuine uncertainty is what share of the 50 errors is a fault we can fix versus a patient changing their mind at the payment step.',
    risk:
      'If a large part of the 50 “errors” turns out to be patients abandoning at payment rather than a technical fault, the recoverable number is closer to the low case. Diagnosing this is a few hours of work and should happen before anything else in this pipeline is funded.',
    softImpact:
      'A patient who hits an error at the final step of a medical booking rarely tries again and may not return at all. The reputational cost is not in these figures.',
  },

  {
    key: 'programmatic_seo',
    name: 'Programmatic SEO',
    group: 'Owned demand',
    status: 'committed',
    thesis:
      'Generate a page for every treatment-by-area combination the group serves, so the clinics appear for the long-tail searches that make up most dental demand and that paid search charges the most for.',
    chain: [
      'Pages generated from the treatment and location matrix',
      'Pages indexed by Google',
      'Long-tail queries served — “veneers in Jumeirah”, “root canal near Al Wasl”',
      'Organic sessions',
      'Enquiries at the site’s conversion rate',
      'Bookings and billed treatment through the measured chain',
    ],
    model: {
      kind: 'enquiries',
      low: 3,
      base: 22,
      high: 90,
      quality: { low: 0.9, base: 1.0, high: 1.1 },
      value: { low: 1, base: 1, high: 1 },
    },
    monthlyCost: 8000,
    oneOffCost: 15000,
    leadMonths: 6,
    maturityMonths: 18,
    assumptions: [
      {
        label: 'Pages published',
        value: '300 over twelve months',
        basis: 'estimate',
        source: 'The treatment × area matrix for three clinics; a planning figure, not a commitment',
      },
      {
        label: 'Sessions per page per month once ranking',
        value: 'Low 2 · base 5 · high 10',
        basis: 'benchmark',
        source: 'Long-tail local service pages in a competitive metro market',
      },
      {
        label: 'Site conversion to enquiry',
        value: 'Low 0.5% · base 1.5% · high 3%',
        basis: 'benchmark',
        source:
          'Dental websites typically convert 1.5–3% of sessions to an enquiry. Our own site currently converts far below that, which is why the low case is set beneath the benchmark floor',
      },
      {
        label: 'Current organic baseline',
        value: 'About 178 organic sessions a month',
        basis: 'measured',
        source: 'Google Analytics, Organic Search channel, stored daily',
      },
    ],
    confidence: 'medium',
    confidenceNote:
      'The mechanism is well understood and the traffic is cheap once it exists. The wide band is honest: the outcome depends on how many pages actually rank, and dental content sits in the category Google holds to the highest quality bar.',
    risk:
      'Dentistry is “your money or your life” content, where Google applies its strictest quality standards, and mass-generated pages are precisely what its helpful-content system is built to demote. Pages can be devalued in bulk by a single algorithm update, which is a step-change risk rather than a gradual one. Each page must carry genuine clinical substance and a named practitioner, which caps how fast this can be produced and makes the SEO manager below a dependency rather than a nice-to-have.',
    softImpact:
      'Ranking for treatment queries across Dubai builds familiarity with the name before anyone is ready to book — the brand-affinity effect the CEO is describing. It is real, it compounds, and no attribution model on this page will ever capture it.',
    dependsOn: ['hire_seo_manager'],
  },

  {
    key: 'ai_seo',
    name: 'AI SEO — being the answer assistants give',
    group: 'Owned demand',
    status: 'live',
    thesis:
      'When someone asks ChatGPT, Claude, Perplexity or Copilot for a dentist in Dubai, the group should be among the practices named. This is a small revenue line today and a large positional one.',
    chain: [
      'Citations, structured data and digital PR that assistants draw on',
      'The clinics named in assistant answers',
      'Referral sessions from assistants — measurable, and already visible',
      'Enquiries and bookings through the measured chain',
    ],
    model: {
      kind: 'enquiries',
      low: 0.3,
      base: 1.5,
      high: 6,
      quality: { low: 1.0, base: 1.2, high: 1.4 },
      value: { low: 1, base: 1, high: 1 },
    },
    monthlyCost: 4000,
    oneOffCost: 0,
    leadMonths: 3,
    maturityMonths: 24,
    assumptions: [
      {
        label: 'Assistant referrals today',
        value: 'About 5 sessions a month',
        basis: 'measured',
        source: 'Google Analytics AI Assistant channel — 31 sessions across the stored history',
      },
      {
        label: 'Growth to maturity',
        value: 'Low 20 · base 80 · high 250 sessions a month',
        basis: 'estimate',
        source:
          'No reliable benchmark exists for this channel yet; the band reflects that rather than a forecast anyone should rely on',
      },
      {
        label: 'Enquiry quality',
        value: 'Slightly better than average — an assistant referral arrives pre-qualified',
        basis: 'estimate',
        source: 'Judgement. The volumes are too small to measure a booking rate from',
      },
    ],
    confidence: 'low',
    confidenceNote:
      'Direct revenue from this channel is small and the band is wide because the channel itself is new enough that nobody has trustworthy benchmarks. It is presented as a positional investment, not a revenue line.',
    risk:
      'Assistants change how they source and cite without notice, and none of them exposes a reliable referral identifier. A shift in one vendor’s retrieval behaviour can remove the channel overnight, and we would see it only as traffic disappearing.',
    softImpact:
      'The defensive case is the stronger one: if a competitor becomes the practice assistants name and we do not, that position is expensive to take back later. The cost of holding it now is small.',
  },

  {
    key: 'smile_club',
    name: 'Smile Club membership',
    group: 'Recurring revenue',
    status: 'committed',
    thesis:
      'A membership plan at AED 69 a month or AED 799 a year turns episodic dental visits into predictable recurring revenue and gives the group a reason to contact patients between treatments.',
    chain: [
      'Existing patients enrolled at the chair and through follow-up',
      'New patients offered membership at first visit',
      'Monthly recurring revenue, independent of treatment volume',
      'Members return more often — an effect this model does NOT claim',
    ],
    model: { kind: 'recurring', low: 4140, base: 13800, high: 34500 },
    monthlyCost: 3000,
    oneOffCost: 12000,
    leadMonths: 2,
    maturityMonths: 18,
    assumptions: [
      {
        label: 'Price',
        value: 'AED 69 a month or AED 799 a year',
        basis: 'measured',
        source: 'The plan as priced and published',
      },
      {
        label: 'Members at maturity',
        value: 'Low 60 · base 200 · high 500',
        basis: 'estimate',
        source:
          'Anchored to the measured patient base — roughly 570 attended patients a year — at a 10%, 35% and higher capture rate. The high case requires new-patient growth as well as converting the existing base',
      },
      {
        label: 'Revenue effect of higher visit frequency',
        value: 'Not included',
        basis: 'measured',
        source:
          'Membership plans usually raise visit frequency, but we have no members yet, so nothing is claimed for it. If it holds, the figures here are understated',
      },
    ],
    confidence: 'medium',
    confidenceNote:
      'The price is set and the mechanism is simple, so the uncertainty is entirely about take-up. Take-up in dental membership schemes depends far more on whether the clinical team actually offers it at the chair than on any marketing, which makes this an operational programme wearing a marketing badge.',
    risk:
      'If reception and clinical staff do not offer it consistently, enrolment stalls regardless of spend. Recurring revenue also carries a churn rate we have no basis to estimate yet, so the run rate shown is gross rather than net of cancellations.',
    softImpact:
      'A membership base is the one asset here that makes revenue predictable rather than campaign-dependent, which changes how the whole business is valued.',
  },

  {
    key: 'affiliates',
    name: 'Affiliate networks — ArabyAds and others joining',
    group: 'Paid demand',
    status: 'live',
    thesis:
      'Pay per delivered lead rather than per click, and add networks beyond ArabyAds so volume is not hostage to one partner’s inventory.',
    chain: [
      'Networks deliver leads at an agreed cost per lead',
      'Leads verified against duplicates and out-of-area contacts',
      'Verified leads worked by the CRM team',
      'Bookings and billed treatment through the measured chain, at a lower conversion rate than our own demand',
    ],
    model: {
      kind: 'enquiries',
      low: 125,
      base: 187,
      high: 272,
      quality: { low: 0.35, base: 0.5, high: 0.65 },
      value: { low: 1, base: 1, high: 1 },
    },
    monthlyCost: 15000,
    oneOffCost: 0,
    leadMonths: 1,
    maturityMonths: 4,
    assumptions: [
      {
        label: 'Cost per lead',
        value: 'Low AED 120 · base AED 80 · high AED 55',
        basis: 'benchmark',
        source: 'Regional affiliate rates for healthcare leads; our own Meta cost per lead is AED 42 for comparison',
      },
      {
        label: 'Lead quality against our own demand',
        value: 'Books at 35–65% of the rate our own enquiries book at',
        basis: 'estimate',
        source:
          'Affiliate leads are solicited rather than self-initiated. The discount is judgement — the ArabyAds worklist will replace it with a measured figure',
      },
      {
        label: 'Budget',
        value: 'AED 15,000 a month',
        basis: 'estimate',
        source: 'A planning figure for the restart, not a committed budget',
      },
    ],
    confidence: 'medium',
    confidenceNote:
      'We have run this channel before, so the mechanism is proven and the cost side is controllable — it is the only channel here that can be switched off mid-month. The quality discount is the soft number, and it is the one that decides whether the channel makes or loses money.',
    risk:
      'The low case is LOSS-MAKING: at AED 120 a lead and a 35% quality factor the channel returns less than it costs. That is not a remote scenario, it is what happens if lead verification is weak. This channel needs the verification worklist running before the budget is raised.',
    softImpact: null,
  },

  {
    key: 'corporate',
    name: 'Corporate collaborations',
    group: 'Partnerships',
    status: 'proposed',
    thesis:
      'Sign Dubai employers to an employee dental benefit, delivering a block of patients per agreement at no media cost.',
    chain: [
      'Business development signs an employer',
      'The benefit is communicated to that employer’s staff',
      'A share of employees book',
      'Bookings and billed treatment through the measured chain',
    ],
    model: {
      kind: 'enquiries',
      low: 1,
      base: 8,
      high: 48,
      quality: { low: 1.1, base: 1.2, high: 1.3 },
      value: { low: 1, base: 1, high: 1.1 },
    },
    monthlyCost: 6000,
    oneOffCost: 0,
    leadMonths: 4,
    maturityMonths: 18,
    assumptions: [
      {
        label: 'Agreements signed',
        value: 'Low 2 · base 5 · high 12 employers',
        basis: 'estimate',
        source: 'A business-development plan, with no signed agreement behind it yet',
      },
      {
        label: 'Employees per employer and take-up',
        value: '200–600 staff at 3–8% take-up a year',
        basis: 'benchmark',
        source: 'Typical uptake for a voluntary employee dental benefit',
      },
      {
        label: 'Booking quality',
        value: 'Better than average — the patient arrives with a reason to choose us',
        basis: 'estimate',
        source: 'Judgement',
      },
    ],
    confidence: 'low',
    confidenceNote:
      'Everything here is contingent on deals that do not exist yet. Until the first agreement is signed the honest projection for this line is zero, and it is shown at zero in the low case for that reason.',
    risk:
      'Corporate business development has a long and unpredictable cycle, and one signed employer can move the whole line — which cuts both ways. Employers may also demand discounted rates that erode the value of each patient below our measured average.',
    softImpact:
      'An employer agreement puts the group in front of hundreds of people at once with an implicit endorsement, which is worth more than the direct bookings suggest.',
  },

  {
    key: 'influencer',
    name: 'Influencer collaborations',
    group: 'Partnerships',
    status: 'proposed',
    thesis:
      'Work with Dubai lifestyle and beauty creators to reach patients for high-value aesthetic treatment, where a single case is worth many times an average bill.',
    chain: [
      'Creator produces content featuring a treatment',
      'Audience reached with an implicit personal endorsement',
      'Enquiries, tracked by a unique code or link per creator',
      'Aesthetic cases, which bill far above the group average',
    ],
    model: {
      kind: 'enquiries',
      low: 17,
      base: 29,
      high: 50,
      quality: { low: 0.4, base: 0.6, high: 0.75 },
      value: { low: 1.8, base: 2.5, high: 3 },
    },
    monthlyCost: 20000,
    oneOffCost: 0,
    leadMonths: 2,
    maturityMonths: 9,
    assumptions: [
      {
        label: 'Cost per enquiry',
        value: 'Low AED 1,200 · base AED 700 · high AED 400',
        basis: 'benchmark',
        source: 'Regional creator rates for aesthetics and cosmetic health',
      },
      {
        label: 'Value of an aesthetic case',
        value: '1.8× to 3× the measured average bill',
        basis: 'estimate',
        source:
          'Veneers and full smile work bill far above the AED 1,201 group average, but we have no measured average for aesthetic cases specifically. This multiplier is the single largest assumption in this initiative and the whole case rests on it',
      },
      {
        label: 'Tracking',
        value: 'A unique code or link per creator — REQUIRED before spending',
        basis: 'measured',
        source: 'Without it this channel joins the unmeasurable group below and cannot be evaluated',
      },
    ],
    confidence: 'low',
    confidenceNote:
      'Marginal at the base case and clearly loss-making at the low one. It only works if the collaborations actually land aesthetic cases rather than general check-ups, and nothing in our data yet shows that they would.',
    risk:
      'The case depends almost entirely on the assumed 2.5× case value, which is judgement rather than measurement. If influencer enquiries bill like our average patient, this channel loses money at every case in the band. One measured quarter with per-creator codes would settle it.',
    softImpact:
      'Creator content is reusable as paid social advertising, which recovers part of the cost even when the direct return disappoints.',
  },

  {
    key: 'radio',
    name: 'Radio',
    group: 'Offline media',
    status: 'not_recommended',
    thesis:
      'Broadcast reach across Dubai commuters. The reach is real; our ability to tell whether it produced a single patient is not.',
    chain: [
      'Schedule purchased across a station’s peak slots',
      'Reach delivered — reported by the station, not by us',
      'Listeners telephone or walk in',
      'The trail ends here: no system we run can connect that patient to the advert',
    ],
    model: { kind: 'capability' },
    monthlyCost: 35000,
    oneOffCost: 8000,
    leadMonths: 1,
    maturityMonths: 6,
    assumptions: [
      {
        label: 'Cost of a meaningful schedule',
        value: 'AED 25,000–60,000 a month',
        basis: 'benchmark',
        source: 'Dubai station rate cards for a schedule large enough to register',
      },
      {
        label: 'Attributable revenue',
        value: 'None — not estimated',
        basis: 'measured',
        source:
          'No projection is offered because none could be checked afterwards. Putting a number here would be inventing one',
      },
    ],
    confidence: 'unverifiable',
    confidenceNote:
      'This is not a judgement that radio does not work. It is that if we buy it today we will not be able to tell whether it worked, which makes the spend unmanageable rather than merely uncertain.',
    risk:
      'Spending AED 35,000 a month on a channel whose effect is invisible means the budget can neither be defended nor cut on evidence. It becomes permanent by default.',
    softImpact:
      'Broadcast reach does build familiarity, and that familiarity is part of why direct and walk-in demand exists at all. The honest statement is that its effect is already inside the direct block on the revenue chart, mixed with everything else.',
  },

  {
    key: 'billboards',
    name: 'Billboards and out-of-home',
    group: 'Offline media',
    status: 'not_recommended',
    thesis:
      'High-visibility placements near the clinics and on the main arteries. Same reach argument as radio, and the same measurement problem.',
    chain: [
      'Placement bought — unipole, mall or building wrap',
      'Impressions delivered',
      'Passers-by later telephone or walk in',
      'The trail ends here: no digital identifier exists at any point',
    ],
    model: { kind: 'capability' },
    monthlyCost: 55000,
    oneOffCost: 20000,
    leadMonths: 1,
    maturityMonths: 6,
    assumptions: [
      {
        label: 'Cost of a placement that registers',
        value: 'AED 40,000–150,000 a month depending on site',
        basis: 'benchmark',
        source: 'Dubai out-of-home rate cards, Sheikh Zayed Road and mall inventory',
      },
      {
        label: 'Attributable revenue',
        value: 'None — not estimated',
        basis: 'measured',
        source: 'Same reason as radio: a number here could never be verified against anything',
      },
    ],
    confidence: 'unverifiable',
    confidenceNote:
      'Out-of-home is the largest single spend proposed in this pipeline and the only one with no measurement path whatsoever. That combination is the argument against doing it first, not against doing it.',
    risk:
      'At AED 55,000 a month this would become the group’s largest marketing line while contributing nothing that can be seen in any report on this page.',
    softImpact:
      'Physical presence near the clinics genuinely does drive walk-ins, which is the largest revenue block the group has. The problem is purely that we cannot separate its contribution from everything else in that block.',
  },

  {
    key: 'attribution_instrument',
    name: 'Ask every new patient how they heard of us',
    group: 'Conversion of demand we already have',
    status: 'proposed',
    thesis:
      'One question at reception, recorded against the patient file, replaces every modelled allocation on this page with measurement — and is the only thing that makes radio, billboards and influencer spend evaluable.',
    chain: [
      'Reception asks the question at first registration',
      'The answer is stored on the patient record',
      'Bills join back to the answer, exactly as they already join to CRM booking origin',
      'Every channel on the revenue chart gets a measured bar instead of a modelled share',
    ],
    model: { kind: 'capability' },
    monthlyCost: null,
    oneOffCost: 4000,
    leadMonths: 1,
    maturityMonths: 4,
    assumptions: [
      {
        label: 'Cost',
        value: 'A field in the registration flow and a short briefing for reception',
        basis: 'estimate',
        source: 'Engineering and training time only — no media cost of any kind',
      },
      {
        label: 'Coverage achievable',
        value: '60–80% of new patients answering',
        basis: 'benchmark',
        source: 'Typical completion for a single optional question asked at registration',
      },
    ],
    confidence: 'high',
    confidenceNote:
      'It produces no revenue of its own, so it will always look unattractive next to a channel with a number beside it. It is nevertheless the highest-leverage item in this pipeline: without it, roughly AED 470,000 of revenue on the chart above stays modelled rather than measured, and three of the proposed channels cannot be judged at all.',
    risk:
      'Answers are self-reported and patients misremember, so it is good evidence rather than perfect evidence. It also depends on reception asking consistently when the clinic is busy.',
    softImpact:
      'It converts the argument about attribution from a modelling debate into a data question, which is worth more to a board than any single channel in this list.',
  },

  {
    key: 'hire_seo_manager',
    name: 'SEO manager — full time, in house',
    group: 'In-house capability',
    status: 'proposed',
    thesis:
      'Programmatic SEO in a medical category cannot be delivered by an agency retainer at the required quality bar. It needs someone accountable for it full time.',
    chain: [
      'Owns the treatment-by-area page programme end to end',
      'Holds clinical accuracy and named-practitioner requirements on every page',
      'Owns Search Console, indexation health and technical fixes',
      'Makes the programmatic SEO line above deliverable at all',
    ],
    model: { kind: 'capability' },
    monthlyCost: 18000,
    oneOffCost: 0,
    leadMonths: 2,
    maturityMonths: 6,
    assumptions: [
      {
        label: 'Salary',
        value: 'AED 15,000–22,000 a month, fully loaded',
        basis: 'benchmark',
        source: 'Dubai market rate for a mid-to-senior in-house SEO manager',
      },
      {
        label: 'Agency cost displaced',
        value: 'Partly — the current retainer would reduce, not disappear',
        basis: 'estimate',
        source: 'Judgement',
      },
    ],
    confidence: 'medium',
    confidenceNote:
      'This post has no revenue line of its own, but the programmatic SEO projection above is not deliverable without it. Judge the two together rather than separately.',
    risk:
      'A single hire carries key-person risk on a programme that takes eighteen months to mature, and the market for good in-house SEO in Dubai is competitive.',
    softImpact: 'Search Console access and indexation monitoring — currently a data gap on this page — become owned rather than chased.',
  },

  {
    key: 'hire_creative',
    name: 'Creative director and creative designer',
    group: 'In-house capability',
    status: 'proposed',
    thesis:
      'Paid social and Performance Max consume creative faster than freelance supply can feed them. Bringing the function in house changes asset volume from a constraint into a variable.',
    chain: [
      'Creative director sets the brand line across all channels',
      'Designer produces the asset volume paid social and Performance Max need',
      'Faster iteration on what the ad platforms report as working',
      'Lower cost per asset than commissioning each one',
    ],
    model: { kind: 'capability' },
    monthlyCost: 42000,
    oneOffCost: 0,
    leadMonths: 2,
    maturityMonths: 6,
    assumptions: [
      {
        label: 'Salaries',
        value: 'Creative director AED 25,000–35,000 · designer AED 10,000–15,000, fully loaded',
        basis: 'benchmark',
        source: 'Dubai market rates',
      },
      {
        label: 'Freelance and agency cost displaced',
        value: 'Not quantified',
        basis: 'estimate',
        source:
          'Current per-asset commissioning spend is not recorded in the platform, so the displacement cannot be netted off. Entering it would improve this case',
      },
      {
        label: 'Effect on advertising performance',
        value: 'Not claimed',
        basis: 'measured',
        source:
          'More creative usually lifts paid social performance, but attributing a revenue figure to it here would be inventing one',
      },
    ],
    confidence: 'medium',
    confidenceNote:
      'This is the largest recurring cost proposed after out-of-home, and it is the hardest to build a revenue case for, because its effect runs through other channels rather than beside them. The honest case for it is throughput and brand consistency, not a return multiple.',
    risk:
      'AED 42,000 a month is committed cost against a benefit that will show up, if at all, as improved performance in channels that cannot yet trace revenue. It should be sequenced after the measurement instrument above, not before it.',
    softImpact:
      'A single coherent brand line across three clinics, paid media, organic social and the website — currently assembled from different hands — is worth more than the asset count suggests.',
  },

  {
    key: 'hire_digital_exec',
    name: 'Digital marketing executive — full time',
    group: 'In-house capability',
    status: 'proposed',
    thesis:
      'Day-to-day campaign operation, lead follow-up discipline and reporting hygiene across every channel in this pipeline.',
    chain: [
      'Runs campaign setup, budgets and pacing day to day',
      'Works the affiliate verification worklist that decides whether that channel makes money',
      'Keeps tracking, naming conventions and reporting consistent',
      'Frees senior time from execution',
    ],
    model: { kind: 'capability' },
    monthlyCost: 10000,
    oneOffCost: 0,
    leadMonths: 1,
    maturityMonths: 3,
    assumptions: [
      {
        label: 'Salary',
        value: 'AED 8,000–12,000 a month, fully loaded',
        basis: 'benchmark',
        source: 'Dubai market rate for a digital marketing executive with two to four years’ experience',
      },
      {
        label: 'Affiliate verification capacity',
        value: 'Makes the lead worklist deliverable, which the affiliate case depends on',
        basis: 'estimate',
        source: 'Judgement — the worklist exists but is not consistently worked',
      },
    ],
    confidence: 'medium',
    confidenceNote:
      'The cheapest of the four hires and the one with the clearest link to money already being spent: affiliate leads that are not verified are the difference between that channel’s profitable and loss-making cases.',
    risk: 'Execution capacity does not create demand on its own; it only makes existing spend work harder.',
    softImpact: null,
  },
];

export const PIPELINE_GROUPS: string[] = [
  'Conversion of demand we already have',
  'Owned demand',
  'Recurring revenue',
  'Paid demand',
  'Partnerships',
  'In-house capability',
  'Offline media',
];

/** Stated on the page, above the whole section. */
export const FORWARD_NOTE =
  'Everything above this point on the page is measured. Everything below it is a projection, and is presented as a low, base and high case because a single figure would imply a precision no forecast has. Each initiative converts through the same chain the business actually runs at — enquiry to booking to attendance to bill — computed from our own trading history rather than from any industry figure, so an initiative only ever assumes how much DEMAND it creates, never what that demand is worth. Assumptions are labelled by where they come from, and the ones resting on judgement rather than data say so.';
