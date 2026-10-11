import type { MarketingPerformance, PerformanceBranch, PerformanceMetric, PerformancePeriod } from './marketingPerformanceCore';

export const PERFORMANCE_BRANCH_LABELS: Record<PerformanceBranch, string> = {
  'dn-alwasl': 'Al Wasl',
  'dr-tosun': 'Dr Tosun',
  'al-maher': 'Al Maher',
};

export const PERFORMANCE_CHANNEL_LABELS: Record<string, string> = {
  'paid-search': 'Paid search',
  'paid-social': 'Paid social',
  affiliate: 'Affiliate',
  website: 'Website',
  'social-organic': 'Organic social',
  gmb: 'Google Business Profile',
  'ai-concierge': 'AI concierge',
  'direct-walkin': 'Direct / Walk-in',
  'patient-referral': 'Patient referral',
  partnership: 'Partnership',
};

export interface PerformanceExportSheet { name: string; rows: (string | number)[][] }
export interface PerformanceExport { asOf: string; sheets: PerformanceExportSheet[] }

/** Deliberately selects aggregate fields only before crossing the client boundary. */
export function buildMarketingPerformanceExport(report: MarketingPerformance): PerformanceExport {
  const header = ['Period type', 'Period', 'From', 'To / as of', 'Branch', 'Measure', 'Value', 'Unit', 'Availability / reason', 'Source', 'Coverage note'];
  const sheets = ['Marketing spend', 'Patients from marketing', 'Early patient value', 'Retention'].map((name) => ({ name, rows: [[...header]] as (string | number)[][] }));
  const add = (sheet: number, periodType: string, period: Pick<PerformancePeriod, 'key' | 'from' | 'to'>, branch: PerformanceBranch, label: string, value: PerformanceMetric, unit = 'patients') => {
    sheets[sheet].rows.push([
      periodType, period.key, period.from, period.to, PERFORMANCE_BRANCH_LABELS[branch], label,
      value.value ?? 'Not available', unit, value.reason ?? 'Measured', value.source, value.note ?? '',
    ]);
  };
  for (const [periodType, periods] of [['Year', report.years], ['Month', report.months]] as const) {
    for (const period of periods) {
      for (const branch of Object.keys(PERFORMANCE_BRANCH_LABELS) as PerformanceBranch[]) {
        const data = period.branches[branch];
        add(0, periodType, period, branch, 'Ad accounts', data.spend.adAccounts, 'AED');
        add(0, periodType, period, branch, 'Manual sheet, not in the ad account', data.spend.manual, 'AED');
        add(1, periodType, period, branch, 'All new patients', data.acquisition.newPatients);
        add(1, periodType, period, branch, 'Paid', data.acquisition.paid);
        add(1, periodType, period, branch, 'Digital, unpaid', data.acquisition.digitalUnpaid);
        add(1, periodType, period, branch, 'Not marketing', data.acquisition.notMarketing);
        add(1, periodType, period, branch, 'Blended ad spend per new patient', data.acquisition.blendedCost, 'AED / patient');
        for (const [channel, patients] of Object.entries(data.acquisition.channels ?? {})) {
          add(1, periodType, period, branch, `Channel: ${PERFORMANCE_CHANNEL_LABELS[channel] ?? channel}`, { value: patients, reason: null, source: data.acquisition.paid.source });
        }
        add(2, periodType, period, branch, 'New-patient cohort size', data.ltv.patients);
        add(2, periodType, period, branch, 'Cohort revenue to date', data.ltv.revenue, 'AED');
        add(2, periodType, period, branch, 'Mean per cohort patient to date', data.ltv.mean, 'AED / patient');
        add(2, periodType, period, branch, 'Median per cohort patient to date', data.ltv.median, 'AED / patient');
        add(3, periodType, period, branch, 'Returning patients', data.retention.returning);
        if (branch === 'dn-alwasl') {
          add(3, periodType, period, branch, 'Existing files billed', data.retention.existingFiles);
          add(3, periodType, period, branch, 'New-series files billed after their first-bill month', data.retention.returningNewFiles);
        }
        if (branch === 'dr-tosun') {
          add(3, periodType, period, branch, 'Files billed (new and returning cannot be told apart)', data.retention.tosunBilled, 'files');
          add(3, periodType, period, branch, 'Files billed in two or more months since July 2026', data.retention.tosunRepeat, 'files');
        }
      }
    }
  }
  for (const cohort of report.cohorts) {
    const period = { key: cohort.month, from: `${cohort.month}-01`, to: report.asOf };
    const cohortValue = (value: number): PerformanceMetric => ({ value, reason: null, source: 'Practo non-cancelled bills' });
    add(2, 'Cohort', period, 'dn-alwasl', 'Patients', cohortValue(cohort.patients));
    add(2, 'Cohort', period, 'dn-alwasl', 'Minimum history across cohort members', cohortValue(cohort.historyDays), 'days');
    for (const [window, summary] of [['First 30 days', cohort.revenue30], ['First 90 days', cohort.revenue90], ['To date', cohort.revenueToDate]] as const) {
      add(2, 'Cohort', period, 'dn-alwasl', `${window}: total revenue`, summary.total, 'AED');
      add(2, 'Cohort', period, 'dn-alwasl', `${window}: mean per patient`, summary.mean, 'AED / patient');
      add(2, 'Cohort', period, 'dn-alwasl', `${window}: median per patient`, summary.median, 'AED / patient');
    }
    add(2, 'Cohort', period, 'dn-alwasl', 'Blended ad spend per new patient in cohort month', cohort.blendedCost, 'AED / patient');
    add(3, 'Cohort', period, 'dn-alwasl', 'Original cohort size', cohortValue(cohort.patients));
    add(3, 'Cohort', period, 'dn-alwasl', 'Billed again in any later month', cohort.retainedLater);
    for (const retention of cohort.retentionMonths) {
      add(3, 'Cohort', period, 'dn-alwasl', `Billed again in month ${retention.month}`, retention.patients);
      add(3, 'Cohort', period, 'dn-alwasl', `Share billed again in month ${retention.month}`, retention.share, 'fraction of original cohort');
    }
  }
  return { asOf: report.asOf, sheets };
}
