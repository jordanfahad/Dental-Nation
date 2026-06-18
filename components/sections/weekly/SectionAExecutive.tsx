import type { RangeReport } from '@/lib/types';
import type { WeeklyModel } from './prepare';
import { Card, SectionHeader } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { DecisionBanner, type BannerTone } from '@/components/charts/DecisionBanner';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import { TrendChart, ChartLegend, TOKENS } from '@/components/charts/Charts';
import { dubaiDateLabel } from '@/lib/dates';
import { ownerFor } from '@/config/data-gap-owners';
import { aed, num, pct } from './format';

const TONE: Record<string, BannerTone> = {
  Scale: 'good',
  Fix: 'watch',
  Stop: 'stop',
  Hold: 'neutral',
};

/**
 * §A — Weekly Executive View. Answer-first: the overall Scale/Fix/Hold/Stop call
 * up top, a scorecard band of the week's headline numbers (with prior-week
 * deltas + sparklines), the week's acquisition trend, then the executive answers.
 * Every field with no real source renders an explicit, owned data gap.
 */
export function SectionAExecutive({
  report,
  model,
}: {
  report: RangeReport;
  model: WeeklyModel;
}) {
  const { range, paid, leads, bookings, series } = report;
  const { overall, bestChannel, worstChannel, totals, leakage } = model;

  const recommendation =
    overall.decision === 'Scale'
      ? 'Increase budget on the efficient channels; hold structure otherwise.'
      : overall.decision === 'Fix'
        ? `Fix the top issue before scaling — ${overall.reason.replace(/^Fix — /, '')}.`
        : overall.decision === 'Stop'
          ? 'Pause spend on the failing channels and re-test creative/targeting.'
          : 'Hold spend; gather more volume before changing direction.';

  // Scorecard band — real metrics with prior-week deltas + weekly sparklines.
  const kpis: KpiItem[] = [
    {
      label: 'Ad spend',
      value: totals.spend == null ? null : aed(totals.spend),
      deltaPct: paid.spend.deltaPct,
      goodWhenUp: false,
      spark: series.map((s) => s.spend),
      sparkColor: TOKENS.accent400,
      gapDetail: 'no ad-spend source',
      gapOwner: ownerFor('spend'),
    },
    {
      label: 'Qualified inquiries',
      value: num(totals.qualified),
      deltaPct: paid.leads.deltaPct,
      goodWhenUp: true,
      spark: series.map((s) => s.paidLeads),
      sparkColor: TOKENS.accent,
    },
    {
      label: 'Glow Up bookings',
      value: num(totals.bookings),
      deltaPct: bookings.booked.deltaPct,
      goodWhenUp: true,
      spark: series.map((s) => s.bookings),
      sparkColor: TOKENS.good,
    },
    {
      label: 'Lead → booking',
      value: totals.leadToBooking == null ? null : pct(totals.leadToBooking),
      goodWhenUp: true,
      gapDetail: 'no qualified inquiries to divide by',
      gapOwner: ownerFor('tracking'),
      hint: 'bookings ÷ qualified',
    },
    {
      label: 'Cost / qualified',
      value: totals.costPerQualified == null ? null : aed(totals.costPerQualified),
      goodWhenUp: false,
      gapDetail: 'needs spend + qualified',
      gapOwner: ownerFor('cost'),
    },
    {
      label: 'Unattributed',
      value: totals.unattributed == null ? null : num(totals.unattributed),
      goodWhenUp: false,
      hint:
        totals.unattributedShare != null ? `${Math.round(totals.unattributedShare * 100)}% of leads` : undefined,
      gapDetail: 'attribution not sourced',
      gapOwner: ownerFor('attribution'),
    },
  ];

  // The week's acquisition trend (each population on its own footing).
  const trendData = series.map((s) => ({
    date: s.date,
    inquiries: s.inquiries,
    bookings: s.bookings,
    spend: s.spend,
  }));
  const trendSeries = [
    { key: 'spend', label: 'Spend (AED)', color: TOKENS.accent400, kind: 'bar' as const, axis: 'right' as const },
    { key: 'inquiries', label: 'Inquiries', color: TOKENS.accent, kind: 'area' as const },
    { key: 'bookings', label: 'Bookings', color: TOKENS.good, kind: 'line' as const },
  ];

  const gap = (detail: string, area: string) => <DataGapInline detail={detail} owner={ownerFor(area)} />;

  const answers: { label: string; value: React.ReactNode }[] = [
    {
      label: 'Best-performing channel',
      value: bestChannel ? (
        <span className="font-medium text-good">{bestChannel.channel}</span>
      ) : (
        gap('no paid channel had enough qualified volume to rank', 'channel')
      ),
    },
    {
      label: 'Worst-performing channel',
      value: worstChannel ? (
        <span className="font-medium text-stop">{worstChannel.channel}</span>
      ) : (
        gap('fewer than two paid channels with judgeable volume', 'channel')
      ),
    },
    {
      label: 'Main conversion bottleneck',
      value: leakage ? (
        <span className="text-ink">
          {leakage.from} → {leakage.to}{' '}
          <span className="text-ink-faint">({Math.round(leakage.drop * 100)}% drop)</span>
        </span>
      ) : (
        gap('not enough measured funnel stages to locate a leak', 'tracking')
      ),
    },
    {
      label: 'Main tracking gap',
      value:
        totals.unattributed != null && totals.unattributed > 0 ? (
          <span className="text-ink">
            {num(totals.unattributed)} unattributed inquiries
            {totals.unattributedShare != null ? ` (${Math.round(totals.unattributedShare * 100)}%)` : ''}
            <span className="text-ink-faint"> · {ownerFor('attribution')}</span>
          </span>
        ) : totals.unattributed === 0 ? (
          <span className="font-medium text-good">No unattributed inquiries this week</span>
        ) : (
          gap('attribution coverage not sourced', 'attribution')
        ),
    },
    {
      label: 'Best-performing creative',
      value: gap('no per-creative performance metric in the content source', 'creative'),
    },
    {
      label: 'Main clinic / PAC issue',
      value: gap('no PAC / clinic feedback source for the week', 'pac'),
    },
  ];

  return (
    <div className="space-y-4">
      <DecisionBanner
        eyebrow="Weekly review · All Lanes — Lifestyle & Aesthetics"
        verdict={overall.decision}
        tone={TONE[overall.decision] ?? 'neutral'}
        headline={overall.reason}
        meta={`Week covered: ${dubaiDateLabel(range.from)} → ${dubaiDateLabel(range.to)} · vs. prior 7 days`}
        right={
          <div className="rounded-card border border-line bg-surface px-4 py-3 text-right">
            <p className="text-[10.5px] uppercase tracking-wide text-ink-faint">Next week</p>
            <p className="mt-0.5 max-w-[220px] text-[12px] leading-snug text-ink-soft">{recommendation}</p>
          </div>
        }
      />

      <KpiBand items={kpis} />

      <Card>
        <SectionHeader tag="A" eyebrow="Weekly review" title="Acquisition trend — this week" />
        <div className="px-5 pb-5 pt-3">
          <TrendChart data={trendData} series={trendSeries} height={250} leftFormat="int" rightFormat="aed" />
          <ChartLegend items={trendSeries.map((s) => ({ label: s.label, color: s.color }))} />
          <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {answers.map((a) => (
              <div key={a.label} className="flex flex-col gap-0.5 border-b border-line/60 pb-2.5">
                <span className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                  {a.label}
                </span>
                <span className="text-[13px] leading-snug text-ink">{a.value}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
