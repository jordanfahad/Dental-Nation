import type { Blocker, ReportView } from '@/lib/types';
import { Card, SectionHeader } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { DecisionBanner, type BannerTone } from '@/components/charts/DecisionBanner';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import { Donut, TOKENS, type BarDatum } from '@/components/charts/Charts';
import { REPORT_BRAND } from '@/config/report-brand';
import { dubaiDateLabel } from '@/lib/dates';
import { ownerFor } from '@/config/data-gap-owners';
import { fmtInt, fmtPct } from '@/lib/format';

const TONE: Record<string, BannerTone> = {
  Continue: 'good',
  Fix: 'watch',
  Stop: 'stop',
  Hold: 'neutral',
};

/** deltaPct from a trailing {today, yesterday}; null when yesterday is 0/missing. */
function deltaOf(today: number | null, yesterday: number | null): number | null {
  if (today == null || yesterday == null || yesterday === 0) return null;
  return (today - yesterday) / yesterday;
}

/**
 * §A — Executive Summary. Answer-first: the day's decision banner, a scorecard
 * band of headline KPIs (with day-over-day deltas + trailing sparklines), the
 * operating answers, and a channel-mix donut. Every value with no source is an
 * honest "—" or a labelled data gap; nothing is fabricated.
 */
export function ExecSummaryTable({
  view,
  topBlocker,
}: {
  view: ReportView;
  topBlocker: Blocker | null;
}) {
  const s = view.snapshot;
  const k = view.kpiTrends;
  const amber = s.founder_decision_needed;

  const kpis: KpiItem[] = [
    {
      label: 'Qualified inquiries',
      value: fmtInt(k.qualified_inquiries.today),
      deltaPct: deltaOf(k.qualified_inquiries.today, k.qualified_inquiries.yesterday),
      goodWhenUp: true,
      spark: k.qualified_inquiries.series,
      sparkColor: TOKENS.accent,
    },
    {
      label: 'Glow Up bookings',
      value: fmtInt(k.glow_up_bookings.today),
      deltaPct: deltaOf(k.glow_up_bookings.today, k.glow_up_bookings.yesterday),
      goodWhenUp: true,
      spark: k.glow_up_bookings.series,
      sparkColor: TOKENS.good,
    },
    {
      label: 'Lead → booking',
      value: s.lead_to_booking_rate == null ? null : fmtPct(s.lead_to_booking_rate),
      deltaPct: deltaOf(k.lead_to_booking_rate.today, k.lead_to_booking_rate.yesterday),
      goodWhenUp: true,
      spark: k.lead_to_booking_rate.series,
      sparkColor: TOKENS.accent400,
      gapDetail: 'no qualified inquiries to divide by',
      gapOwner: ownerFor('tracking'),
    },
    {
      label: 'Show rate',
      value: s.show_rate == null ? null : fmtPct(s.show_rate),
      goodWhenUp: true,
      gapDetail: 'needs clinic attendance source',
      gapOwner: ownerFor('attendance'),
    },
    {
      label: 'Unattributed',
      value: fmtInt(s.unattributed_leads),
      deltaPct: deltaOf(k.unattributed_leads.today, k.unattributed_leads.yesterday),
      goodWhenUp: false,
      spark: k.unattributed_leads.series,
      sparkColor: TOKENS.watch,
    },
  ];

  const answers: { label: string; value: React.ReactNode }[] = [
    {
      label: "Today's decision",
      value: (
        <span>
          <span className="font-semibold text-ink">{s.decision}</span>
          {s.decision_reason ? <span className="text-ink-soft"> — {s.decision_reason}</span> : null}
        </span>
      ),
    },
    {
      label: 'Main channel working',
      value: s.best_channel ? <span className="font-medium text-good">{s.best_channel}</span> : '—',
    },
    {
      label: 'Main channel underperforming',
      value: s.worst_channel ? <span className="font-medium text-stop">{s.worst_channel}</span> : '—',
    },
    { label: 'Main conversion bottleneck', value: s.main_bottleneck ?? '—' },
    {
      label: 'Main action required tomorrow',
      value: topBlocker?.fix ? (
        topBlocker.fix
      ) : (
        <DataGapInline detail="no open high-impact blocker fix logged" owner={ownerFor('channel')} />
      ),
    },
    {
      label: 'Owner / due',
      value:
        topBlocker?.owner || topBlocker?.due_time
          ? `${topBlocker?.owner ?? '—'}${topBlocker?.due_time ? ` · ${topBlocker.due_time}` : ''}`
          : '—',
    },
  ];

  const mix: BarDatum[] = Object.entries(s.inquiries_by_channel ?? {})
    .map(([label, value]) => ({ label, value }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return (
    <div className="space-y-4">
      <DecisionBanner
        eyebrow={`Daily control · ${REPORT_BRAND.lane}`}
        verdict={s.decision}
        tone={TONE[s.decision] ?? 'neutral'}
        headline={s.decision_reason || 'Suggested operating decision for the day.'}
        meta={`${dubaiDateLabel(s.report_date)} · Offer: ${REPORT_BRAND.offer} · CTA: ${REPORT_BRAND.cta}`}
        right={
          amber ? (
            <div className="rounded-card border border-watch/40 bg-watch/5 px-4 py-3 text-right">
              <p className="text-[10.5px] uppercase tracking-wide text-watch">Founder decision needed</p>
              <p className="mt-0.5 max-w-[220px] text-[12px] font-medium leading-snug text-ink">
                {s.founder_decision}
              </p>
            </div>
          ) : null
        }
      />

      <KpiBand items={kpis} />

      <Card highlight={amber}>
        <SectionHeader tag="A" eyebrow="Executive summary" title="Today's operating answer" />
        <div className="grid gap-6 px-5 pb-5 pt-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {answers.map((a) => (
              <div key={a.label} className="flex flex-col gap-0.5 border-b border-line/60 pb-2.5">
                <span className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                  {a.label}
                </span>
                <span className="text-[13px] leading-snug text-ink">{a.value}</span>
              </div>
            ))}
          </div>
          <div>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
              Inquiries by channel
            </p>
            {mix.length > 0 ? (
              <Donut data={mix} valueFormat="int" centerLabel="inquiries" height={180} />
            ) : (
              <DataGapInline detail="no channel-attributed inquiries today" owner={ownerFor('attribution')} />
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
