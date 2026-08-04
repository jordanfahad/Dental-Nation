/**
 * THE PLAN MODEL — every constant the investor page reasons with, and where
 * it came from.
 *
 * Source: `DentalNation_Y1_ComprehensivePlan_v1.xlsx` (Year-1 Comprehensive
 * Plan) and the Revenue Rescue Plan execution deck, 23 March 2026. Sheet names
 * are recorded per block so any figure on the page can be traced back to the
 * cell it came from.
 *
 * WHY THIS FILE REPLACED THE EARLIER RANGES
 *
 * The first scenario engine multiplied generic benchmark bands together and
 * produced a return of 0.5×–6.6×. A thirteen-fold spread is not a forecast,
 * it is an admission that nothing is known — and the bottom of it implied a
 * loss while the top implied a windfall, from the same slider position.
 *
 * The plan already answers this properly. Its own scenario sheet states
 * ROAS 1.05→1.72 on first-instance revenue across Conservative, Base and
 * Stretch. That band is narrow because it is anchored on a modelled AOV range
 * (AED 470–770), not on stacked guesses. This file uses the plan's numbers and
 * the page quotes them as the plan's, not as ours.
 */

export interface Sourced<T> {
  value: T;
  source: string;
}

const s = <T>(value: T, source: string): Sourced<T> => ({ value, source });

const XL = 'Y1 Comprehensive Plan';

// ── Core funnel conversion, as the plan defines it ──────────────────────────

export const PLAN_RATES = {
  leadToBooking: s(0.25, `${XL} · 20_Assumptions`),
  showRate: s(0.8, `${XL} · 20_Assumptions`),
  /** One arrival per five qualified leads — the plan's headline conversion. */
  arrivalRate: s(0.2, `${XL} · 20_Assumptions`),
  weightedCpl: s(161, `${XL} · 20_Assumptions — weighted CPL`),
  aovLow: s(470, `${XL} · 20_Assumptions — AOV first instance`),
  aovHigh: s(770, `${XL} · 20_Assumptions — AOV first instance`),
};

/** Per 1,000 qualified leads, as the plan states it. */
export const PLAN_FUNNEL_PER_1000 = {
  qualifiedLeads: 1000,
  bookings: 250,
  shows: 200,
  arrivals: 200,
  source: `${XL} · 04A_Funnel_1000QLs`,
};

// ── The plan's own scenarios — the definitive answer on return ──────────────

export interface PlanScenario {
  key: 'conservative' | 'base' | 'stretch';
  label: string;
  newPatientShare: string;
  newPatients: number;
  paidMedia: number;
  revenueLow: number;
  revenueHigh: number;
  totalCost: number;
  roasLow: number;
  roasHigh: number;
  roiLow: number;
  roiHigh: number;
}

export const PLAN_SCENARIOS: PlanScenario[] = [
  {
    key: 'conservative',
    label: 'Conservative',
    newPatientShare: '20% new',
    newPatients: 5197,
    paidMedia: 2_330_000,
    revenueLow: 2_442_590,
    revenueHigh: 4_001_690,
    totalCost: 2_658_000,
    roasLow: 1.05,
    roasHigh: 1.72,
    roiLow: 0.92,
    roiHigh: 1.51,
  },
  {
    key: 'base',
    label: 'Base',
    newPatientShare: '30% new',
    newPatients: 7796,
    paidMedia: 3_493_909,
    revenueLow: 3_664_120,
    revenueHigh: 6_002_920,
    totalCost: 3_821_909,
    roasLow: 1.05,
    roasHigh: 1.72,
    roiLow: 0.96,
    roiHigh: 1.57,
  },
  {
    key: 'stretch',
    label: 'Stretch',
    newPatientShare: '40% new',
    newPatients: 10395,
    paidMedia: 4_660_000,
    revenueLow: 4_885_650,
    revenueHigh: 8_004_150,
    totalCost: 4_988_000,
    roasLow: 1.05,
    roasHigh: 1.72,
    roiLow: 0.98,
    roiHigh: 1.6,
  },
];

export const PLAN_SCENARIOS_SOURCE = `${XL} · 18_Scenarios`;

/**
 * The honest caveat that must travel with every ROAS figure on this page.
 *
 * The plan's ROAS is computed on FIRST-INSTANCE revenue only — the first visit,
 * at an AOV of AED 470–770. It deliberately excludes recall, retention and
 * higher-value follow-on treatment, which the plan tracks separately as
 * "Year-1 LTV revenue". Quoting 1.05×–1.72× without that sentence makes the
 * business look barely break-even when the actual case rests on the second,
 * third and fourth visit.
 */
export const ROAS_BASIS_NOTE =
  'Return is measured on first-visit revenue only (AED 470–770 per patient). It excludes recall, retention and follow-on treatment, which the plan counts separately as Year-1 lifetime value — so this figure is the floor of the commercial case, not the whole of it.';

// ── Channel mix and cost per lead ───────────────────────────────────────────

export interface PlanChannel {
  name: string;
  type: 'Paid' | 'Organic';
  role: string;
  cpl: number;
  share: number;
}

export const PLAN_CHANNELS: PlanChannel[] = [
  { name: 'Google Search (exact match)', type: 'Paid', role: 'Conversion', cpl: 140, share: 0.22 },
  { name: 'Performance Max', type: 'Paid', role: 'Conversion', cpl: 150, share: 0.18 },
  { name: 'Meta click-to-WhatsApp', type: 'Paid', role: 'Conversion', cpl: 170, share: 0.16 },
  { name: 'Meta lead ads', type: 'Paid', role: 'Consideration', cpl: 140, share: 0.08 },
  { name: 'TikTok lead generation', type: 'Paid', role: 'Conversion', cpl: 160, share: 0.1 },
  { name: 'YouTube remarketing', type: 'Paid', role: 'Assist', cpl: 320, share: 0.06 },
  { name: 'SEO & Google Business Profile', type: 'Organic', role: 'Organic', cpl: 80, share: 0.1 },
  { name: 'Referrals & word of mouth', type: 'Organic', role: 'Organic', cpl: 60, share: 0.04 },
  { name: 'Corporate, schools & banks', type: 'Organic', role: 'Organic', cpl: 75, share: 0.03 },
  { name: 'Database reactivation', type: 'Organic', role: 'Organic', cpl: 70, share: 0.02 },
  { name: 'PR & earned media', type: 'Organic', role: 'Assist', cpl: 90, share: 0.01 },
];

export const PLAN_CHANNELS_SOURCE = `${XL} · 05_Channel_Mix_CPL`;

/** Lead quality differs sharply by channel — this is why mix matters. */
export const PLAN_CHANNEL_QUALITY = [
  { channel: 'Search', qualified: 0.7, bookingFromQualified: 0.3, show: 0.85 },
  { channel: 'Meta', qualified: 0.45, bookingFromQualified: 0.2, show: 0.75 },
  { channel: 'TikTok', qualified: 0.35, bookingFromQualified: 0.18, show: 0.7 },
  { channel: 'YouTube', qualified: 0.1, bookingFromQualified: 0.1, show: 0.6 },
];

export const PLAN_CHANNEL_QUALITY_SOURCE = `${XL} · 06_Quality_By_Channel`;

// ── Budget: what is actually being spent vs what the plan asks for ──────────

/**
 * The budget ask in one comparison.
 *
 * Current run rate is roughly AED 7,000 a month of Google Ads — the measured
 * figure from the live pipeline. The plan's Year-1 envelope is AED 3.49M of
 * paid media, starting near AED 187K a month and ending near AED 364K. That
 * gap IS the ask, and stating both numbers side by side is more persuasive
 * than any slider.
 */
export const BUDGET = {
  currentMonthly: s(7000, 'Live Google Ads spend, Lane E pipeline'),
  y1PaidMedia: s(3_493_909, `${XL} · 09_H1_H2_Summary`),
  h1PaidMedia: s(1_341_034, `${XL} · 09_H1_H2_Summary`),
  h2PaidMedia: s(2_152_876, `${XL} · 09_H1_H2_Summary`),
};

export const PLAN_QUARTERS = [
  { quarter: 'Q1', newPatients: 1073, paidSharePct: 65, paidQLs: 3486, paidMedia: 561_182 },
  { quarter: 'Q2', newPatients: 1615, paidSharePct: 60, paidQLs: 4844, paidMedia: 779_852 },
  { quarter: 'Q3', newPatients: 2398, paidSharePct: 55, paidQLs: 6593, paidMedia: 1_061_537 },
  { quarter: 'Q4', newPatients: 2711, paidSharePct: 50, paidQLs: 6779, paidMedia: 1_091_339 },
];

export const PLAN_QUARTERS_SOURCE = `${XL} · 07_Budgets_Quarterly`;

/** Monthly cost ramp — paid, organic and fixed. */
export const PLAN_MONTHLY_COST = [
  { m: 'M1', q: 'Q1', paid: 168406, organic: 42084, fixed: 14350, totalQLs: 1609, paidCpl: 250 },
  { m: 'M2', q: 'Q1', paid: 185150, organic: 46345, fixed: 14350, totalQLs: 1770, paidCpl: 220 },
  { m: 'M3', q: 'Q1', paid: 207690, organic: 51876, fixed: 14350, totalQLs: 1984, paidCpl: 200 },
  { m: 'M4', q: 'Q2', paid: 249550, organic: 77217, fixed: 14350, totalQLs: 2583, paidCpl: 185 },
  { m: 'M5', q: 'Q2', paid: 257278, organic: 79684, fixed: 14350, totalQLs: 2664, paidCpl: 170 },
  { m: 'M6', q: 'Q2', paid: 273056, organic: 84468, fixed: 14350, totalQLs: 2826, paidCpl: 165 },
  { m: 'M7', q: 'Q3', paid: 350336, organic: 133055, fixed: 14350, totalQLs: 3956, paidCpl: 160 },
  { m: 'M8', q: 'Q3', paid: 350336, organic: 133055, fixed: 14350, totalQLs: 3956, paidCpl: 158 },
  { m: 'M9', q: 'Q3', paid: 360801, organic: 137166, fixed: 14350, totalQLs: 4076, paidCpl: 157 },
  { m: 'M10', q: 'Q4', paid: 360157, organic: 167216, fixed: 14350, totalQLs: 4474, paidCpl: 155 },
  { m: 'M11', q: 'Q4', paid: 360157, organic: 167216, fixed: 14350, totalQLs: 4474, paidCpl: 154 },
  { m: 'M12', q: 'Q4', paid: 371105, organic: 172224, fixed: 14350, totalQLs: 4609, paidCpl: 153 },
];

export const PLAN_MONTHLY_COST_SOURCE = `${XL} · Year1_Cost`;

// ── Year-1 acquisition need ─────────────────────────────────────────────────

export const PLAN_Y1 = {
  newPatients: s(7797, `${XL} · 04_Acquisition_Need`),
  totalQLs: s(38985, `${XL} · 04_Acquisition_Need`),
  paidQLs: s(21705, `${XL} · 04_Acquisition_Need`),
  organicQLs: s(17280, `${XL} · 04_Acquisition_Need`),
  newFromPaid: s(4341, `${XL} · 04_Acquisition_Need`),
  newFromOrganic: s(3456, `${XL} · 04_Acquisition_Need`),
  existingRecall: s(18191, `${XL} · 04_Acquisition_Need`),
};

/** Clinic capacity — the ceiling demand has to fit inside. */
export const PLAN_CAPACITY = [
  { branch: 'Acacia / DN', units: [4, 4, 7, 7], occupancy: [0.35, 0.4, 0.5, 0.55], targets: [1125, 1285, 2811, 3093] },
  { branch: 'Dr Tosun', units: [5, 5, 5, 5], occupancy: [0.45, 0.5, 0.55, 0.6], targets: [1807, 2008, 2209, 2410] },
  { branch: 'DIFC', units: [6, 6, 6, 6], occupancy: [0, 0.2, 0.35, 0.4], targets: [0, 964, 1687, 1928] },
  { branch: 'Fairmont', units: [4, 4, 4, 4], occupancy: [0.2, 0.35, 0.4, 0.5], targets: [643, 1125, 1285, 1607] },
];

export const PLAN_CAPACITY_SOURCE = `${XL} · 02_Branch_Targets, 03_Capacity_Occupancy`;

/** Governance KPIs — the targets the machine is judged against. */
export const PLAN_KPIS = [
  { kpi: 'Cost per qualified lead', target: '≤ AED 150 by month 6' },
  { kpi: 'Lead → booking', target: '≥ 25%' },
  { kpi: 'Show rate', target: '≥ 80%' },
  { kpi: 'Reviews & rating', target: '≥ 4.6★ · +1,000 reviews' },
];

export const PLAN_KPIS_SOURCE = `${XL} · 14_KPIs_Governance`;
