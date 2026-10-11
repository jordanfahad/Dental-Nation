import { clinicOfCenter } from '@/config/clinics';
import { computeNewPatientAcquisition, type BillInput } from '@/lib/executive/acquisitionCore';

/** Aggregate-only report. Patient identifiers stay inside this pure computation. */
export type PerformanceBranch = 'dn-alwasl' | 'dr-tosun' | 'al-maher';
export const PERFORMANCE_BRANCHES: PerformanceBranch[] = ['dn-alwasl', 'dr-tosun', 'al-maher'];
export interface PerformanceMetric {
  value: number | null;
  reason: string | null;
  source: string;
  note?: string;
}
export interface SpendInput { date: string; amount: number }
export interface ManualSpendInput extends SpendInput {
  branch: PerformanceBranch;
  /** A campaign-period total cannot be split across months without daily rows. */
  endDate?: string;
}
export type FinanceRevenueMeasure = 'collected' | 'billed' | 'legacy-billed';
export interface FinanceRevenueInput {
  month: string | null;
  branch: PerformanceBranch;
  measure: FinanceRevenueMeasure;
  amount: number;
  note?: string;
}
export interface RevenueSummary {
  total: PerformanceMetric;
  mean: PerformanceMetric;
  median: PerformanceMetric;
}
export interface BranchPerformance {
  spend: { adAccounts: PerformanceMetric; manual: PerformanceMetric };
  acquisition: {
    newPatients: PerformanceMetric;
    paid: PerformanceMetric;
    digitalUnpaid: PerformanceMetric;
    notMarketing: PerformanceMetric;
    channels: Record<string, number> | null;
    blendedCost: PerformanceMetric;
  };
  /** Revenue to date of patients whose first bill falls in this period. */
  ltv: { patients: PerformanceMetric; revenue: PerformanceMetric; mean: PerformanceMetric; median: PerformanceMetric };
  retention: {
    returning: PerformanceMetric;
    existingFiles: PerformanceMetric;
    returningNewFiles: PerformanceMetric;
    tosunBilled: PerformanceMetric;
    /** Distinct files seen in this period and in at least two months since July 2026. */
    tosunRepeat: PerformanceMetric;
  };
  revenue: { collected: PerformanceMetric; billed: PerformanceMetric; legacyBilled: PerformanceMetric; practo: PerformanceMetric };
}
export interface PerformancePeriod {
  key: string;
  from: string;
  to: string;
  branches: Record<PerformanceBranch, BranchPerformance>;
}
export interface PerformanceCohort {
  month: string;
  patients: number;
  /** Minimum elapsed days across cohort members, so fixed windows are complete. */
  historyDays: number;
  revenue30: RevenueSummary;
  revenue90: RevenueSummary;
  revenueToDate: RevenueSummary;
  retainedLater: PerformanceMetric;
  retentionMonths: { month: number; patients: PerformanceMetric; share: PerformanceMetric }[];
  blendedCost: PerformanceMetric;
}
export interface MarketingPerformance {
  asOf: string;
  years: PerformancePeriod[];
  months: PerformancePeriod[];
  cohorts: PerformanceCohort[];
  historyMonths: number;
}
export interface MarketingPerformanceInput {
  asOf: string;
  bills: BillInput[] | null;
  /** First appointment verdicts from the existing Growth waterfall; no model estimates. */
  channels: ReadonlyMap<string, string> | null;
  metaSpend: SpendInput[] | null;
  googleSpend: SpendInput[] | null;
  manualSpend: ManualSpendInput[] | null;
  financeRevenue: FinanceRevenueInput[] | null;
  /** Allows one finance measure to fail without hiding the other. */
  unavailableFinanceMeasures?: FinanceRevenueMeasure[];
  patientSourceNote?: string;
  /** Reader-supplied coverage bound, conservatively the latest loaded branch
   * bill date when sync coverage is unknown. Omit only for complete input data. */
  patientObservedThrough?: Partial<Record<PerformanceBranch, string>>;
}

const PATIENT_SOURCE = 'Practo non-cancelled bills';
const CHANNEL_SOURCE = 'Practo first appointment; Growth Platform attribution waterfall';
const AD_SOURCE = 'Meta and Google ad accounts';
const MANUAL_SOURCE = 'Manual sheet (lane_e.raw_raw_social), not in the ad account';
const AD_NOTE = 'One ad account per platform; ads ran for Dental Nation Al Wasl.';
const TOSUN_REASON = 'New and returning cannot be told apart after every patient was renumbered at the July 2026 move; a pre-migration patient list is needed.';
const HISTORIC_REASON = 'No patient-level data for 2025; new-patient files began in April 2026 and earlier patient data was never loaded.';
const AMC_REASON = 'Al Maher has no patient or channel feed.';
const PAID = new Set(['paid-search', 'paid-social', 'affiliate']);
const DIGITAL = new Set(['website', 'social-organic', 'gmb', 'ai-concierge']);
const DAY = 86_400_000;
const metric = (value: number, source: string, note?: string): PerformanceMetric => ({ value, reason: null, source, ...(note ? { note } : {}) });
const unavailable = (reason: string, source: string): PerformanceMetric => ({ value: null, reason, source });
const daysBetween = (from: string, to: string) => Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);
const monthShift = (month: string, n: number) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + n, 1)).toISOString().slice(0, 7);
const monthEnd = (month: string) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10);
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const amount = (value: number | null) => Number(value) || 0;
const inRange = (day: string, from: string, to: string) => day >= from && day <= to;

interface PatientFile {
  first: string;
  bills: { day: string; amount: number; branch: PerformanceBranch }[];
  channel: string;
}

function summarise(values: number[], reason?: string, note?: string): RevenueSummary {
  if (reason || values.length === 0) {
    const missing = unavailable(reason ?? 'No eligible new-patient cohort in this period.', PATIENT_SOURCE);
    return { total: missing, mean: missing, median: missing };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return {
    total: metric(sum(values), PATIENT_SOURCE, note),
    mean: metric(sum(values) / values.length, PATIENT_SOURCE, note),
    median: metric(sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2, PATIENT_SOURCE, note),
  };
}

export function computeMarketingPerformance(input: MarketingPerformanceInput): MarketingPerformance {
  const { asOf } = input;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf) || !Number.isFinite(Date.parse(`${asOf}T00:00:00Z`))) throw new Error('A valid as-of date is required.');
  const observedThrough = (branch: PerformanceBranch) => {
    const bound = input.patientObservedThrough?.[branch];
    return bound && bound < asOf ? bound : asOf;
  };
  const alWaslThrough = observedThrough('dn-alwasl');
  const sourceBills = (input.bills ?? []).filter((b) => b.bill_date && b.bill_date <= asOf);
  const validBills = sourceBills.filter((b) => String(b.data?.bill_status ?? '').toUpperCase() !== 'CANCELLED' && b.bill_date);
  const byFile = new Map<string, BillInput[]>();
  for (const b of sourceBills) {
    const key = String(b.data?.mr_no ?? '').trim();
    if (key) byFile.set(key, [...(byFile.get(key) ?? []), b]);
  }
  const branchOf = (b: BillInput): PerformanceBranch => clinicOfCenter(String(b.data?.center_name ?? '')) === 'dr-tosun' ? 'dr-tosun' : 'dn-alwasl';
  const branchBills = (branch: PerformanceBranch) => validBills.filter((b) => branchOf(b) === branch);
  const files = new Map<string, PatientFile>();
  const firstAny = new Map<string, string>();
  for (const [key, bills] of byFile) {
    const valid = bills.filter((b) => String(b.data?.bill_status ?? '').toUpperCase() !== 'CANCELLED');
    const first = valid.map((b) => b.bill_date!).sort()[0];
    if (first) firstAny.set(key, first);
    // Delegate eligibility to Executive, including DNJ, migration, cross-clinic
    // ordering and cancelled-bill rules. Do not duplicate its definitions here.
    const result = computeNewPatientAcquisition({ bills, appts: [], widgetPhones: new Set(), spend: null });
    if (!result.billedNewPatients) continue;
    const alWasl = valid.filter((b) => branchOf(b) === 'dn-alwasl');
    files.set(key, {
      first: alWasl.map((b) => b.bill_date!).sort()[0],
      bills: alWasl.map((b) => ({ day: b.bill_date!, amount: amount(b.amount), branch: 'dn-alwasl' })),
      channel: input.channels?.get(key) ?? 'direct-walkin',
    });
  }
  const datedAds = [...(input.metaSpend ?? []), ...(input.googleSpend ?? [])].filter((r) => r.date <= asOf);
  const firstAd = datedAds.map((r) => r.date).sort()[0];
  const adThrough = datedAds.map((r) => r.date).sort().at(-1);
  const platformCoverage = (name: string, rows: SpendInput[] | null) => {
    const days = (rows ?? []).filter((r) => r.date <= asOf).map((r) => r.date).sort();
    return days.length ? `${name}: ${days[0]} to ${days.at(-1)}.` : `${name}: no loaded rows.`;
  };
  const adNote = `${AD_NOTE}${firstAd ? ` Recorded feed begins ${firstAd} and latest loaded day is ${adThrough}.` : ''} ${platformCoverage('Meta', input.metaSpend)} ${platformCoverage('Google', input.googleSpend)} Totals cover loaded rows only; later unsynced days are not estimated.`;
  const billNote = `${input.patientSourceNote ? `${input.patientSourceNote} ` : ''}Observed non-cancelled Al Wasl bills through ${alWaslThrough}; loaded history may be incomplete.`;

  const patientReason = (branch: PerformanceBranch, from: string, to: string): string | null => {
    if (branch === 'al-maher') return AMC_REASON;
    if (to < '2026-01-01') return HISTORIC_REASON;
    if (input.bills === null) return 'The patient-level bill feed could not be read.';
    const first = branchBills(branch).map((b) => b.bill_date!).sort()[0];
    if (!first) return 'No patient-level bills are loaded for this branch.';
    if (to < first) return `Patient-level bills for this branch are loaded only from ${first}.`;
    if (from > observedThrough(branch)) return `Patient-level bill coverage for this branch reaches only ${observedThrough(branch)}; this later period is not observed.`;
    return null;
  };
  const spend = (branch: PerformanceBranch, from: string, to: string): BranchPerformance['spend'] => {
    let adAccounts: PerformanceMetric;
    if (branch === 'al-maher') adAccounts = unavailable('No spend recorded for Al Maher.', AD_SOURCE);
    else if (input.metaSpend === null || input.googleSpend === null) adAccounts = unavailable('One or both ad account feeds could not be read, so combined spend is unavailable.', AD_SOURCE);
    else if (!firstAd) adAccounts = unavailable('No ad account spend rows are loaded.', AD_SOURCE);
    else if (branch === 'dr-tosun') adAccounts = metric(0, AD_SOURCE, AD_NOTE);
    else if (to < firstAd) adAccounts = unavailable(`No ad spend in the ad accounts for this period; first recorded feed date is ${firstAd}.`, AD_SOURCE);
    else if (adThrough && from > adThrough) adAccounts = unavailable(`The ad-account feeds are loaded only through ${adThrough}; this later period is not observed.`, AD_SOURCE);
    else adAccounts = metric(sum(datedAds.filter((r) => inRange(r.date, from, to)).map((r) => amount(r.amount))), AD_SOURCE, adNote);
    const manualRows = (input.manualSpend ?? []).filter((r) => r.branch === branch && r.date <= to && (r.endDate ?? r.date) >= from);
    const crossing = manualRows.filter((r) => r.date < from || (r.endDate ?? r.date) > to);
    const manual = input.manualSpend === null
      ? unavailable('The manual campaign sheet could not be read.', MANUAL_SOURCE)
      : crossing.length
        ? unavailable(`A manual campaign total spans ${crossing.map((r) => `${r.date} to ${r.endDate ?? r.date}`).join(', ')}; no daily split is recorded, so it cannot be allocated to this period.`, MANUAL_SOURCE)
      : manualRows.length
        ? metric(sum(manualRows.map((r) => amount(r.amount))), MANUAL_SOURCE, 'Separate recorded campaign spend; excluded from Executive ad-account spend and blended cost.')
        : unavailable('No manual campaign spend recorded for this branch and period.', MANUAL_SOURCE);
    return { adAccounts, manual };
  };
  const revenue = (branch: PerformanceBranch, from: string, to: string): BranchPerformance['revenue'] => {
    const finance = (measure: FinanceRevenueMeasure) => {
      const source = measure === 'collected' ? 'Legacy practice-system monthly export (collected money)' : measure === 'legacy-billed' ? 'Legacy practice-system monthly export (billed revenue)' : 'Zoho finance monthly export (billed revenue)';
      if (input.financeRevenue === null || input.unavailableFinanceMeasures?.includes(measure)) return unavailable('This finance revenue feed could not be read.', source);
      const rows = input.financeRevenue.filter((r) => r.branch === branch && r.measure === measure);
      const matching = rows.filter((r) => r.month && r.month >= from.slice(0, 7) && r.month <= to.slice(0, 7));
      if (!matching.length) return unavailable(rows.some((r) => !r.month) ? 'Only an undated multi-year total exists; it cannot be allocated to this period.' : 'No revenue recorded in this source for this branch and period.', source);
      const months = [...new Set(matching.map((r) => r.month!))].sort();
      const notes = [...new Set(matching.map((r) => r.note).filter(Boolean))];
      return metric(sum(matching.map((r) => amount(r.amount))), source, `Recorded months: ${months.join(', ')}. Missing months are not estimated.${notes.length ? ` ${notes.join(' ')}` : ''}`);
    };
    const reason = patientReason(branch, from, to);
    return {
      collected: finance('collected'), billed: finance('billed'), legacyBilled: finance('legacy-billed'),
      practo: reason ? unavailable(reason, PATIENT_SOURCE) : metric(sum(branchBills(branch).filter((b) => inRange(b.bill_date!, from, to)).map((b) => amount(b.amount))), PATIENT_SOURCE, `Billed amounts in loaded Practo history through ${observedThrough(branch)}, not collections. Later days are not observed.`),
    };
  };
  const forBranch = (branch: PerformanceBranch, from: string, to: string): BranchPerformance => {
    const branchSpend = spend(branch, from, to);
    const reason = patientReason(branch, from, to);
    const acquisitionReason = reason ?? (branch === 'dr-tosun' ? TOSUN_REASON : null);
    const cohortFiles = [...files.values()].filter((p) => inRange(p.first, from, to));
    const breakdown: Record<string, number> = {};
    for (const p of cohortFiles) breakdown[p.channel] = (breakdown[p.channel] ?? 0) + 1;
    const acquisition = computeNewPatientAcquisition({ bills: sourceBills, appts: [], widgetPhones: new Set(), from, to, spend: branchSpend.adAccounts.value });
    const count = acquisitionReason ? unavailable(acquisitionReason, PATIENT_SOURCE) : metric(acquisition.billedNewPatients, PATIENT_SOURCE, billNote);
    const channelReason = acquisitionReason ?? (input.channels === null ? 'The first-appointment attribution sources could not all be read.' : null);
    const channelMetric = (accept: (channel: string) => boolean) => channelReason ? unavailable(channelReason, CHANNEL_SOURCE) : metric(sum(Object.entries(breakdown).filter(([channel]) => accept(channel)).map(([, n]) => n)), CHANNEL_SOURCE, 'Default Direct / Walk-in means no source was recorded; estimated phone-path bookings are excluded.');
    const blendedCost = acquisitionReason ? unavailable(acquisitionReason, AD_SOURCE) : acquisition.cpaAll === null
      ? unavailable(count.value === 0 ? 'No measured new patients in this period.' : branchSpend.adAccounts.reason ?? 'No positive ad-account spend is recorded in this period.', AD_SOURCE)
      : metric(acquisition.cpaAll, `${AD_SOURCE}; Executive new-patient acquisition`, 'All ad-account spend divided by all new patients, regardless of channel.');
    const ltvReason = acquisitionReason ?? (to < '2026-05-01' ? 'Cohort value starts with May 2026; April bill history is incomplete.' : null);
    const eligible = cohortFiles.filter((p) => p.first >= '2026-05-01');
    const cohortNote = `Cohorts from May 2026 only; their revenue through ${alWaslThrough}. ${billNote}`;
    const value = summarise(eligible.map((p) => sum(p.bills.map((b) => b.amount))), ltvReason ?? undefined, cohortNote);
    const existing = new Set<string>(), returning = new Set<string>(), tosunBilled = new Set<string>(), tosunRepeat = new Set<string>();
    const tosunMonths = new Map<string, Set<string>>();
    for (const b of branchBills('dr-tosun').filter((b) => b.bill_date! >= '2026-07-01' && b.bill_date! <= to)) {
      const key = String(b.data?.mr_no ?? '').trim();
      if (!key) continue;
      const months = tosunMonths.get(key) ?? new Set<string>();
      months.add(b.bill_date!.slice(0, 7));
      tosunMonths.set(key, months);
    }
    for (const b of branchBills(branch).filter((b) => inRange(b.bill_date!, from, to))) {
      const key = String(b.data?.mr_no ?? '').trim();
      if (!key) continue;
      if (branch === 'dr-tosun') {
        tosunBilled.add(key);
        if ((tosunMonths.get(key)?.size ?? 0) >= 2) tosunRepeat.add(key);
      } else if (!/^DN/i.test(key)) existing.add(key);
      else if (firstAny.has(key) && b.bill_date!.slice(0, 7) > firstAny.get(key)!.slice(0, 7)) returning.add(key);
    }
    const retentionReason = reason ?? (branch === 'dr-tosun' ? TOSUN_REASON : null);
    const retainedMetric = (n: number) => retentionReason ? unavailable(retentionReason, PATIENT_SOURCE) : metric(n, PATIENT_SOURCE, `Distinct files in this period through ${observedThrough(branch)}; DN files count only after their first-bill month. Later days are not observed.`);
    const tosunMetric = (n: number) => branch !== 'dr-tosun' ? unavailable('This measure applies only to Dr Tosun.', PATIENT_SOURCE) : reason ? unavailable(reason, PATIENT_SOURCE) : metric(n, PATIENT_SOURCE, `New and returning cannot be told apart; repeated months are observed from July 2026 through the earlier of this period end and ${observedThrough(branch)}.`);
    return {
      spend: branchSpend,
      acquisition: {
        newPatients: count,
        paid: channelMetric((c) => PAID.has(c)),
        digitalUnpaid: channelMetric((c) => DIGITAL.has(c)),
        notMarketing: channelMetric((c) => !PAID.has(c) && !DIGITAL.has(c)),
        channels: channelReason ? null : breakdown,
        blendedCost,
      },
      ltv: { patients: ltvReason ? unavailable(ltvReason, PATIENT_SOURCE) : metric(eligible.length, PATIENT_SOURCE, cohortNote), revenue: value.total, mean: value.mean, median: value.median },
      retention: { returning: retainedMetric(new Set([...existing, ...returning]).size), existingFiles: retainedMetric(existing.size), returningNewFiles: retainedMetric(returning.size), tosunBilled: tosunMetric(tosunBilled.size), tosunRepeat: tosunMetric(tosunRepeat.size) },
      revenue: revenue(branch, from, to),
    };
  };
  const makePeriod = (key: string, from: string, to: string): PerformancePeriod => ({ key, from, to, branches: Object.fromEntries(PERFORMANCE_BRANCHES.map((branch) => [branch, forBranch(branch, from, to)])) as Record<PerformanceBranch, BranchPerformance> });
  const months: PerformancePeriod[] = [];
  for (let month = '2025-01'; month <= asOf.slice(0, 7); month = monthShift(month, 1)) months.push(makePeriod(month, `${month}-01`, monthEnd(month) < asOf ? monthEnd(month) : asOf));
  const years = [2025, 2026].filter((year) => `${year}-01-01` <= asOf).map((year) => makePeriod(String(year), `${year}-01-01`, `${year}-12-31` < asOf ? `${year}-12-31` : asOf));
  const cohortMonths = [...new Set([...files.values()].filter((p) => p.first >= '2026-05-01').map((p) => p.first.slice(0, 7)))].sort();
  const cohorts = cohortMonths.map((month): PerformanceCohort => {
    const cohort = [...files.values()].filter((p) => p.first.slice(0, 7) === month);
    const historyDays = Math.max(0, Math.min(...cohort.map((p) => daysBetween(p.first, alWaslThrough))));
    const fixed = (days: number) => summarise(cohort.map((p) => sum(p.bills.filter((b) => daysBetween(p.first, b.day) < days).map((b) => b.amount))), historyDays < days ? `The youngest patient in this cohort has ${historyDays} days of history; ${days} complete days are required.` : undefined, billNote);
    return {
      month, patients: cohort.length, historyDays,
      revenue30: fixed(30), revenue90: fixed(90),
      revenueToDate: summarise(cohort.map((p) => sum(p.bills.map((b) => b.amount))), undefined, billNote),
      retainedLater: metric(cohort.filter((p) => p.bills.some((b) => b.day.slice(0, 7) > month)).length, PATIENT_SOURCE, `Observed later-month returns through ${alWaslThrough}.`),
      retentionMonths: [1, 2, 3].map((offset) => {
        const target = monthShift(month, offset);
        const mature = monthEnd(target) <= alWaslThrough;
        const count = cohort.filter((p) => p.bills.some((b) => b.day.slice(0, 7) === target)).length;
        const missing = `Month ${offset} is ${target}, which is not fully observed until ${monthEnd(target)}; loaded history reaches ${alWaslThrough}.`;
        return {
          month: offset,
          patients: mature ? metric(count, PATIENT_SOURCE, `Billed again in ${target}; exact month, not cumulative.`) : unavailable(missing, PATIENT_SOURCE),
          share: mature ? metric(count / cohort.length, PATIENT_SOURCE, `Share of the original cohort billed again in ${target}.`) : unavailable(missing, PATIENT_SOURCE),
        };
      }),
      blendedCost: months.find((p) => p.key === month)!.branches['dn-alwasl'].acquisition.blendedCost,
    };
  });
  const oldest = [...files.values()].filter((p) => p.first >= '2026-05-01').map((p) => p.first).sort()[0];
  const historyMonths = oldest ? Math.max(0, (Number(alWaslThrough.slice(0, 4)) - Number(oldest.slice(0, 4))) * 12 + Number(alWaslThrough.slice(5, 7)) - Number(oldest.slice(5, 7)) + 1) : 0;
  return { asOf, years, months, cohorts, historyMonths };
}
