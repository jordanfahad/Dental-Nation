import type { ExecutiveReport } from '@/lib/executive/types';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { TrendChart, ChartLegend, TOKENS, type TrendSeries } from '@/components/charts/Charts';

/**
 * Monthly performance across the business. Spend (bars, right AED axis), leads
 * (area, left count axis) and clinic revenue (line, right AED axis) over the full
 * monthly roll-up. TrendChart keys on `date`, so each month maps to `${month}-01`.
 */
export function ExecMonthlyTrend({ report }: { report: ExecutiveReport }) {
  const { monthly } = report;

  const data = monthly.map((m) => ({
    date: `${m.month}-01`,
    spend: m.spend,
    leads: m.leads,
    revenue: m.revenue,
  }));

  const series: TrendSeries[] = [
    { key: 'spend', label: 'Marketing spend (AED)', color: TOKENS.accent400, kind: 'bar', axis: 'right' },
    { key: 'leads', label: 'Leads', color: TOKENS.accent, kind: 'area', axis: 'left' },
    { key: 'revenue', label: 'Clinic revenue (AED)', color: TOKENS.good, kind: 'line', axis: 'right' },
  ];

  const months = monthly.length;

  return (
    <Card>
      <SectionHeader
        eyebrow="Executive dashboard · momentum"
        title="Monthly performance — spend, leads & revenue"
      />
      <div className="px-5 pb-5 pt-3">
        <TrendChart data={data} series={series} height={280} leftFormat="int" rightFormat="aed" />
        <ChartLegend items={series.map((s) => ({ label: s.label, color: s.color }))} />
        <Takeaway>
          {months > 0
            ? `${months} month${months === 1 ? '' : 's'} of activity across the business — leads on the left axis, spend and clinic revenue on the right. Each line is its own population, charted on a shared timeline.`
            : 'No monthly activity has rolled up yet across the connected sources.'}
        </Takeaway>
      </div>
    </Card>
  );
}
