import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { TrendChart, ChartLegend, TOKENS, type TrendSeries } from '@/components/charts/Charts';
import { DataGapInline } from '@/components/ui/DataGap';
import { ownerFor } from '@/config/data-gap-owners';
import type { CrmReport } from '@/lib/crm/types';
import { fmtInt } from './format';

/**
 * Appointments created per day over the range. A real, per-day series (zeros on
 * quiet days are real). Empty → honest data gap, not a flat fake line.
 */
export function CrmTrend({ report }: { report: CrmReport }) {
  const series = report.appointments.series;
  const data = series.map((p) => ({ date: p.date, appointments: p.appointments }));
  const seriesDef: TrendSeries[] = [
    { key: 'appointments', label: 'Appointments created', color: TOKENS.accent, kind: 'area' },
  ];

  const total = series.reduce((s, p) => s + p.appointments, 0);
  const peak = series.reduce<{ date: string; v: number } | null>(
    (best, p) => (!best || p.appointments > best.v ? { date: p.date, v: p.appointments } : best),
    null,
  );

  return (
    <Card>
      <SectionHeader
        eyebrow="CRM — Zavis · momentum"
        title="Appointments created over time"
      />
      <div className="px-5 pb-5 pt-4">
        {data.length ? (
          <>
            <TrendChart data={data} series={seriesDef} leftFormat="int" />
            <ChartLegend items={[{ label: 'Appointments created', color: TOKENS.accent }]} />
            {peak ? (
              <Takeaway>
                {fmtInt(total)} appointments created across the window; busiest day was {peak.date}{' '}
                with {fmtInt(peak.v)}.
              </Takeaway>
            ) : null}
          </>
        ) : (
          <DataGapInline detail="no dated appointment activity to plot" owner={ownerFor('crm')} />
        )}
      </div>
    </Card>
  );
}
