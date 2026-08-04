import type { PeriodKey, StageId } from '@/config/investor-funnel';

/**
 * ⚠️ SAMPLE DATA — PHASE 1 DESIGN REVIEW ONLY. ⚠️
 *
 * Every number in this file is invented for the design gate. It exists so the
 * layout can be judged with realistic shapes and digit-counts before any real
 * data is wired (spec §10, Phase 1). The viewer watermarks every screen that
 * renders it, and Phase 3 deletes this file outright.
 *
 * The file is deliberately named `sample`, every export is prefixed `SAMPLE_`,
 * and nothing here is imported by any live surface — so it cannot leak into a
 * real report by accident.
 *
 * Shapes are modelled on the real orders of magnitude already measured in the
 * Lane E pipeline (≈95K media spend, ~774 bookings, ~500K billed since launch)
 * so the design is stress-tested against digit counts it will actually meet.
 */

export interface SampleStageValue {
  value: number;
  /** Fractional change vs. the equivalent prior period. */
  delta: number | null;
  /** Month-by-month series for the drill-down sparkline. */
  series: { month: string; value: number }[];
  /** Where this stage's volume came from, this period. */
  channels: { name: string; value: number }[];
  /** true → this stage has no feed yet and renders an honest "connecting data" state. */
  pending?: boolean;
}

const months = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
const series = (vals: number[]) => vals.map((v, i) => ({ month: months[i], value: v }));

export const SAMPLE_FUNNEL: Record<PeriodKey, Record<StageId, SampleStageValue>> = {
  month: {
    visibility: {
      value: 41200, delta: 0.08,
      series: series([9800, 14200, 18900, 22400, 26100, 31000, 36400, 41200]),
      channels: [
        { name: 'Brand searches on Google', value: 18400 },
        { name: 'Social followers', value: 15800 },
        { name: 'Google reviews & profile views', value: 7000 },
      ],
      pending: true,
    },
    reach: {
      // The series' final step and the delta must agree in SIGN, or the chip
      // above the chart contradicts the chart. Jun is 402,940 (a digit was
      // dropped here originally), so Jun → Jul is −4.2% and the −4% chip reads
      // as the same movement the bars show.
      value: 386000, delta: -0.042,
      series: series([43607, 438428, 1741720, 512535, 617718, 200939, 402940, 386000]),
      channels: [
        { name: 'Google Ads', value: 214000 },
        { name: 'Meta', value: 98000 },
        { name: 'Organic search', value: 52000 },
        { name: 'Google Business Profile', value: 22000 },
      ],
    },
    inquiries: {
      value: 612, delta: 0.31,
      series: series([48, 96, 128, 142, 181, 244, 388, 612]),
      channels: [
        { name: 'WhatsApp', value: 381 },
        { name: 'Phone calls', value: 142 },
        { name: 'Website form', value: 63 },
        { name: 'Instagram direct', value: 26 },
      ],
    },
    bookings: {
      value: 318, delta: 0.95,
      series: series([6, 14, 24, 31, 108, 137, 174, 318]),
      channels: [
        { name: 'Practice platform', value: 198 },
        { name: 'Website booking widget', value: 70 },
        { name: 'CRM & AI agent', value: 34 },
        { name: 'Walk-in', value: 16 },
      ],
    },
    showups: {
      value: 186, delta: 0.87,
      series: series([0, 0, 0, 0, 5, 74, 107, 186]),
      channels: [
        { name: 'Dr Tosun Dental', value: 96 },
        { name: 'Dental Nation Al Wasl', value: 74 },
        { name: 'AMC', value: 16 },
      ],
    },
    treatments: {
      value: 118, delta: 0.42,
      series: series([0, 0, 0, 0, 3, 41, 68, 118]),
      channels: [
        { name: 'General & hygiene', value: 61 },
        { name: 'Cosmetic', value: 28 },
        { name: 'Implants', value: 17 },
        { name: 'Orthodontics', value: 12 },
      ],
      pending: true,
    },
    revenue: {
      value: 298316, delta: 0.71,
      series: series([0, 0, 0, 0, 380, 24437, 177408, 298316]),
      channels: [
        { name: 'Implants & full-arch', value: 121000 },
        { name: 'Cosmetic & smile design', value: 84000 },
        { name: 'General & family', value: 61316 },
        { name: 'Orthodontics', value: 32000 },
      ],
    },
  },

  // Quarter and since-launch reuse the same shapes at larger magnitudes — the
  // design only needs to survive the digit counts, not model a real quarter.
  quarter: {} as never,
  launch: {} as never,
};

/**
 * Scale a period.
 *
 * The breakdowns MUST scale with the headline. An earlier version multiplied
 * only `value`, so selecting "This quarter" put a headline of 1,714 inquiries
 * directly above channel bars still reading 381 + 142 + 63 + 26 = 612. The
 * month view trains the reader that the parts add up to the whole in every
 * stage, so a period where they silently do not is a self-contradicting panel
 * — and this page is being judged on "not at all confusing, for a layman".
 */
const scale = (base: Record<StageId, SampleStageValue>, k: number, deltaShift: number) =>
  Object.fromEntries(
    Object.entries(base).map(([id, v]) => [
      id,
      {
        ...v,
        value: Math.round(v.value * k),
        delta: v.delta == null ? null : Math.max(-0.6, v.delta + deltaShift),
        series: v.series.map((p) => ({ ...p, value: Math.round(p.value * k) })),
        channels: v.channels.map((c) => ({ ...c, value: Math.round(c.value * k) })),
      },
    ]),
  ) as Record<StageId, SampleStageValue>;

SAMPLE_FUNNEL.quarter = scale(SAMPLE_FUNNEL.month, 2.8, -0.12);
SAMPLE_FUNNEL.launch = scale(SAMPLE_FUNNEL.month, 7.4, -0.2);

/**
 * Delivery scorecard strip (spec §2).
 *
 * Two corrections that matter in front of investors:
 *
 *  1. This strip counts SINCE LAUNCH and does not move with the period
 *     selector, so every label says so. Sitting unqualified under the period
 *     tabs, "AED 501K revenue attributed" read as this month's figure while
 *     the funnel beneath it said AED 298K.
 *  2. It previously claimed "14 projects delivered". The project list is 14
 *     entries of which SEVEN are live — the rest are pipeline and future,
 *     including a clinic that opens in 2027. Counting unbuilt things as
 *     delivered is the single most damaging claim this page could make.
 */
export const SAMPLE_SCORECARD = [
  { value: '7', label: 'projects live today' },
  { value: '6', label: 'systems running' },
  { value: 'AED 95K', label: 'media invested since Dec 2025' },
  { value: '3,451', label: 'patient conversations since Dec 2025' },
  { value: 'AED 501K', label: 'revenue billed since Dec 2025' },
];

/**
 * Scenario engine constants (spec §6) — seeded from the Growth Operating
 * System lane benchmarks, each carrying its source so the assumptions card can
 * show provenance rather than asking anyone to trust a number.
 */
export const SAMPLE_ASSUMPTIONS = [
  { key: 'Cost per inquiry (CPL)', value: 'AED 120 – 350', source: 'Growth Operating System benchmarks, July 2026' },
  { key: 'Inquiry → booking', value: '45% – 55%', source: '13 Demand Lanes v2.0 — portfolio scorecard' },
  { key: 'Booking → show-up', value: '70% – 85%', source: 'Revenue Operations control room targets' },
  { key: 'Show-up → treatment', value: '55% – 70%', source: 'Lane A / B / C acceptance targets' },
  { key: 'Average case value', value: 'AED 1,000 – 2,400', source: 'Lane unit economics, blended' },
];

/** Baseline monthly media budget the slider multiplies. */
export const SAMPLE_BASELINE_BUDGET = 7000;
