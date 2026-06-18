import type { RangeReport } from '@/lib/types';
import type { WeeklyModel } from './prepare';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { FunnelViz, type FunnelStageViz } from '@/components/charts/FunnelViz';
import { ownerFor } from '@/config/data-gap-owners';
import { aed, num, pct } from './format';

/**
 * §C — Weekly Funnel Quality. A funnel infographic (impressions → clicks →
 * qualified → bookings) sits above the metric / result / comment table. Real
 * where the data supports it (spend, qualified paid leads, real bookings, derived
 * rates); everything else is an explicit, owned data gap — never a fabricated 0.
 */
export function SectionCFunnel({ report, model }: { report: RangeReport; model: WeeklyModel }) {
  const t = model.totals;

  const empty = (v: unknown) => v == null || (typeof v === 'number' && v === 0 && report.paid.empty);
  const funnelStages: FunnelStageViz[] = [
    {
      label: 'Impressions',
      value: empty(report.paid.impressions.value) ? null : report.paid.impressions.value,
      hint: 'reach source pending',
    },
    {
      label: 'Clicks',
      value: empty(report.paid.clicks.value) ? null : report.paid.clicks.value,
    },
    { label: 'Qualified inquiries', value: t.qualified },
    { label: 'Glow Up bookings', value: t.bookings },
  ];

  const real = (value: React.ReactNode) => <span className="text-ink">{value}</span>;
  const gap = (detail: string, area: string) => (
    <DataGapInline detail={detail} owner={ownerFor(area)} />
  );

  const leakageComment = model.leakage
    ? `Largest measured drop: ${model.leakage.from} → ${model.leakage.to} (${Math.round(
        model.leakage.drop * 100,
      )}%)`
    : 'Not enough measured stages to locate the leak';

  const rows: { metric: string; result: React.ReactNode; comment: React.ReactNode }[] = [
    {
      metric: 'Total spend',
      result: t.spend == null ? gap('no ad-spend source for the week', 'spend') : real(aed(t.spend)),
      comment: 'Paid media spend across all channels (perf rows).',
    },
    {
      metric: 'Total qualified inquiries',
      result: real(num(t.qualified)),
      comment: 'Paid leads — the qualified-inquiry signal we can source.',
    },
    {
      metric: 'Total Glow Up bookings',
      result: real(num(t.bookings)),
      comment: 'Real bookings from the booking-widget source (its own population).',
    },
    {
      metric: 'Lead → booking rate',
      result:
        t.leadToBooking == null
          ? gap('no qualified inquiries to divide by', 'tracking')
          : real(pct(t.leadToBooking)),
      comment: 'Bookings ÷ qualified inquiries (distinct populations — directional).',
    },
    {
      metric: 'Cost per qualified inquiry',
      result:
        t.costPerQualified == null
          ? gap('needs both spend and qualified inquiries', 'cost')
          : real(aed(t.costPerQualified)),
      comment: 'Spend ÷ qualified paid inquiries.',
    },
    {
      metric: 'Cost per booking',
      result:
        t.costPerBooking == null
          ? gap('needs both spend and bookings', 'cost')
          : real(aed(t.costPerBooking)),
      comment: 'Spend ÷ bookings (cross-population — directional only).',
    },
    {
      metric: 'Show rate',
      result: gap('no attended-visit source for the week', 'attendance'),
      comment: 'Attended ÷ booked — needs a clinic attendance source.',
    },
    {
      metric: 'Treatment / upgrade opps',
      result: gap('no treatment-opportunity source', 'clinic'),
      comment: 'Captured at the chair — not in the current sources.',
    },
    {
      metric: 'Average case value signal',
      result: gap('no per-case value source for the week', 'clinic'),
      comment: 'Requires treatment-plan value, not just booking price.',
    },
    {
      metric: 'Proof assets captured',
      result: gap('no proof-capture source', 'content'),
      comment: 'Before/after + testimonials — tracked by Content/Studio.',
    },
    {
      metric: 'Reviews captured',
      result: gap('no review-capture source', 'content'),
      comment: 'Google / platform reviews — not yet sourced.',
    },
    {
      metric: 'Main leakage point',
      result:
        model.leakage == null
          ? gap('not enough measured stages', 'tracking')
          : real(`${model.leakage.from} → ${model.leakage.to}`),
      comment: leakageComment,
    },
  ];

  return (
    <Card>
      <SectionHeader tag="C" eyebrow="Weekly review" title="Weekly funnel quality" />
      <div className="px-5 pt-4">
        <FunnelViz stages={funnelStages} />
        <Takeaway>
          {model.leakage
            ? `Largest measured drop: ${model.leakage.from} → ${model.leakage.to} (${Math.round(
                model.leakage.drop * 100,
              )}%). Upstream reach is a data gap until a paid-reach source is mapped.`
            : 'Not enough measured stages to locate the leak — upstream reach is a data gap.'}
        </Takeaway>
      </div>
      <div className="overflow-x-auto px-5 pb-5 pt-4">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-faint">
              <th className="py-2 pr-4 font-medium">Metric</th>
              <th className="py-2 pr-4 font-medium">Weekly result</th>
              <th className="py-2 font-medium">Comment</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.metric} className="border-b border-line/60 align-top last:border-0">
                <th className="w-[210px] py-2 pr-4 text-left font-medium text-ink-faint">{r.metric}</th>
                <td className="w-[230px] py-2 pr-4">{r.result}</td>
                <td className="py-2 leading-snug text-ink-soft">{r.comment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
