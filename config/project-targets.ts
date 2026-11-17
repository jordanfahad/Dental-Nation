/**
 * Monthly targets for the daily snapshot (Ms Shadi, 12 Nov 2026) and
 * /next/projects. Only targets management has set go here. Each one says
 * where it comes from. A measure with no target shows "No target set" and is
 * never marked behind.
 *
 * Revenue: the 2026 annual billed-revenue targets from the KPI workbook
 * (lane_e.platform_kpi_targets), divided by 12. Rating: the 2026 KPI target.
 * Ms Shadi's own project plan (shared with Dr Luvi) has its own targets: add
 * them here when they arrive, with their source.
 */
export interface MonthlyTarget {
  value: number;
  source: string;
}

const ANNUAL_SOURCE = '2026 annual target (KPI workbook), divided by 12';

export const REVENUE_TARGETS: Record<'dental-nation' | 'dr-tosun' | 'al-maher' | 'total', MonthlyTarget> = {
  'dental-nation': { value: Math.round(2_375_410 / 12), source: ANNUAL_SOURCE },
  'dr-tosun': { value: Math.round(5_889_285 / 12), source: ANNUAL_SOURCE },
  'al-maher': { value: Math.round(2_082_516 / 12), source: ANNUAL_SOURCE },
  total: { value: Math.round(10_347_212 / 12), source: ANNUAL_SOURCE },
};

/** Average Google rating to hold (2026 KPI target). */
export const RATING_TARGET: MonthlyTarget = { value: 4.7, source: '2026 KPI target' };

/**
 * Ms Shadi's GBP plan (GBP Plan sheet, Executive Dashboard): per clinic, Google
 * reviews at the start of the plan, the 30-day review target, and the 30-day
 * target of new patients from Google.
 */
export const GBP_PLAN_TARGETS: Record<'dental-nation' | 'dr-tosun' | 'al-maher', { reviewsBaseline: number; reviewsTarget: number; patientTarget: number }> = {
  'dental-nation': { reviewsBaseline: 79, reviewsTarget: 250, patientTarget: 100 },
  'dr-tosun': { reviewsBaseline: 124, reviewsTarget: 300, patientTarget: 100 },
  'al-maher': { reviewsBaseline: 60, reviewsTarget: 150, patientTarget: 100 },
};
export const GBP_PLAN_SOURCE = "Ms Shadi's GBP plan (30-day targets)";

export const NO_TARGET_NOTE = "No target set yet: waiting for Ms Shadi's project plan";
