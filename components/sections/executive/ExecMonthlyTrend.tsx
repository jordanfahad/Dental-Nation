import type { ExecutiveReport } from '@/lib/executive/types';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { TrendChart, ChartLegend, type TrendSeries } from '@/components/charts/Charts';

/**
 * Monthly performance across the business. Each point is one CALENDAR MONTH
 * (the current month is month-to-date). Spend (bars, right AED axis), leads &
 * bookings (left count axis) and clinic revenue (line, right AED axis) over the
 * monthly roll-up. TrendChart keys on `date`, so each month maps to `${month}-01`
 * and the axis is rendered in month granularity ("Jul 2026").
 *
 * Two demand lines, deliberately distinct:
 *   - Leads (tracker)  — the manual enquiry log (lane_e.leads). The team has
 *     largely stopped maintaining it, so recent months read low (≈2–3); it is NOT
 *     a measure of real demand on its own.
 *   - Bookings (ZAVIS) — actual patients booked via the CRM. The true demand
 *     signal (e.g. ~115 in a month where the tracker shows 3).
 */
export function ExecMonthlyTrend({ report }: { report: ExecutiveReport }) {
  const { monthly } = report;

  const data = monthly.map((m) => ({
    date: `${m.month}-01`,
    spend: m.spend,
    leads: m.leads,
    bookings: m.appointments,
    revenue: m.revenue,
  }));

  // Distinct, colorblind-safe categorical hues (validated: lightness band, chroma
  // floor, adjacent-pair CVD ≥ normal-vision floor; the legend + tooltip carry
  // identity so no line depends on colour alone). Different mark types (bar vs
  // line vs area) add a second cue. Replaces the old all-blue shades.
  const COLORS = { spend: '#D55E00', bookings: '#0072B2', enquiries: '#CC79A7', revenue: '#009E73' };
  const series: TrendSeries[] = [
    { key: 'spend', label: 'Marketing spend (AED)', color: COLORS.spend, kind: 'bar', axis: 'right' },
    { key: 'bookings', label: 'Bookings (ZAVIS)', color: COLORS.bookings, kind: 'line', axis: 'left' },
    { key: 'leads', label: 'Enquiries', color: COLORS.enquiries, kind: 'area', axis: 'left' },
    { key: 'revenue', label: 'Clinic revenue (AED)', color: COLORS.revenue, kind: 'line', axis: 'right' },
  ];

  const months = monthly.length;
  // The last bucket is the current month → month-to-date, not a full month.
  const lastLabel = monthly[monthly.length - 1]?.label;

  return (
    <Card>
      <SectionHeader
        eyebrow="Executive dashboard · momentum"
        title="Monthly performance — spend, bookings, enquiries & revenue"
      />
      <div className="px-5 pb-5 pt-3">
        <TrendChart data={data} series={series} height={280} leftFormat="int" rightFormat="aed" xFormat="month" />
        <ChartLegend items={series.map((s) => ({ label: s.label, color: s.color }))} />
        <Takeaway>
          {months > 0 ? (
            <>
              {months} month{months === 1 ? '' : 's'} of activity — each point is one calendar month
              {lastLabel ? ` (${lastLabel} is month-to-date)` : ''}. <strong>Bookings (ZAVIS)</strong> is the real
              demand signal — actual patients booked; <strong>Enquiries</strong> combines the manual lead tracker and the
              website-widget submissions (non-test), which are still few next to actual bookings. Counts on the left
              axis; spend &amp; clinic revenue (AED) on the right.
            </>
          ) : (
            'No monthly activity has rolled up yet across the connected sources.'
          )}
        </Takeaway>
      </div>
    </Card>
  );
}
