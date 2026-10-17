import { GMB_CLINICS, type GmbClinicKey } from '@/config/gmb-clinics';
import { clinicOfCenter } from '@/config/clinics';
import { parseGrossRows, type Signal } from '@/lib/performance/core';
import type { BillInput } from '@/lib/executive/acquisitionCore';
import type { GrowthReport } from '@/lib/growth/channelPerformance';
import { addDays, dayCount } from './plan';

/** MTD ends at the last complete Dubai day, even on the first of a month. */
export function comparisonPeriods(today: string) {
  const from = `${today.slice(0, 7)}-01`;
  const last = addDays(from, -1);
  return { mtd: { from, to: addDays(today, -1) }, lastMonth: { from: `${last.slice(0, 7)}-01`, to: last } };
}
export type ComparisonPeriod = keyof ReturnType<typeof comparisonPeriods>;
export type ComparisonGrowth = Record<ComparisonPeriod, Record<'dental-nation' | 'dr-tosun', Pick<GrowthReport, 'totals'>>>;
export interface CoveredMetric { value: number | null; coveredDays: number; expectedDays: number }

function metricTotal(rows: Signal[], clinic: GmbClinicKey, metric: string, from: string, to: string): CoveredMetric {
  const days = new Map(rows.filter((r) => r.clinic === clinic && r.channel === 'gmb' && r.metric === metric &&
    r.day >= from && r.day <= to && r.value != null && Number.isFinite(r.value) && r.value >= 0).map((r) => [r.day, r.value!]));
  return { value: days.size ? [...days.values()].reduce((n, value) => n + value, 0) : null,
    coveredDays: days.size, expectedDays: dayCount(from, to) };
}

export function coverageLabel(metric: CoveredMetric) {
  if (!metric.expectedDays) return 'No completed days yet';
  return `${metric.coveredDays < metric.expectedDays ? 'partial month' : 'complete period'} (${metric.coveredDays}/${metric.expectedDays} days)`;
}

export function buildClinicComparison(input: {
  today: string; metrics: Signal[]; tracker: { data: Record<string, unknown> }[]; bills: BillInput[]; growth: ComparisonGrowth;
  bookingsAvailable: boolean;
}) {
  const periods = comparisonPeriods(input.today);
  const leads = parseGrossRows(input.tracker); // DN-018 mapper, header filtering and dates.
  const inWindow = (day: string | null | undefined) => !!day && day >= periods.lastMonth.from && day <= periods.mtd.to;
  const leadsAvailable = leads.rows.some((r) => inWindow(r.date));
  // Cancelled invoices still establish feed presence, but never contribute AED.
  const billingAvailable = input.bills.some((b) => inWindow(b.bill_date));
  const missingSources = [!leadsAvailable ? 'Tracker leads' : null,
    !input.bookingsAvailable ? 'Growth bookings' : null, !billingAvailable ? 'Billing' : null]
    .filter((source): source is string => source !== null);
  const bills = input.bills.filter((b) => b.bill_date && String(b.data?.bill_status ?? '').trim().toUpperCase() !== 'CANCELLED');
  const branches = GMB_CLINICS.map((clinic) => {
    const period = (key: ComparisonPeriod) => {
      const { from, to } = periods[key];
      const recorded = bills.filter((b) => b.bill_date! >= from && b.bill_date! <= to && clinicOfCenter(String(b.data?.center_name ?? '')) === clinic.key);
      return {
        calls: metricTotal(input.metrics, clinic.key, 'calls', from, to),
        directions: metricTotal(input.metrics, clinic.key, 'directions', from, to),
        websiteClicks: metricTotal(input.metrics, clinic.key, 'website_clicks', from, to),
        leads: leadsAvailable ? leads.rows.filter((r) => r.clinic === clinic.key && r.date >= from && r.date <= to).length : null,
        bookings: clinic.key === 'al-maher' || !input.bookingsAvailable ? null : input.growth[key][clinic.key].totals.booked,
        revenue: clinic.key === 'al-maher' || !billingAvailable ? null : Math.round(recorded.reduce((n, b) => n + (Number(b.amount) || 0), 0) * 100) / 100,
      };
    };
    const latestBill = clinic.key === 'al-maher' ? null : bills.filter((b) => b.bill_date! <= periods.mtd.to &&
      clinicOfCenter(String(b.data?.center_name ?? '')) === clinic.key).map((b) => b.bill_date!).sort().at(-1) ?? null;
    return { ...clinic, mtd: period('mtd'), lastMonth: period('lastMonth'), latestBill };
  });
  const unassigned = (key: ComparisonPeriod) => leadsAvailable ? leads.rows.filter((r) => !r.clinic && r.date >= periods[key].from && r.date <= periods[key].to).length : null;
  return { today: input.today, periods, branches, unassigned: { mtd: unassigned('mtd'), lastMonth: unassigned('lastMonth') },
    undated: leads.undated, headerEchoes: leads.headerEchoes, missingSources };
}
export type ClinicComparison = ReturnType<typeof buildClinicComparison>;
