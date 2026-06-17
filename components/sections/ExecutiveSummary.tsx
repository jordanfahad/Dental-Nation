import type { ReportView } from '@/lib/types';
import { Card, Eyebrow } from '@/components/ui/Card';
import { DecisionPill } from '@/components/ui/pills';
import { KpiStat } from '@/components/ui/KpiStat';
import { fmtDelta, fmtInt, fmtPct, deltaTone } from '@/lib/format';

/** §A — Executive Summary (hero). Answer first: decision + reasoning, then a
 *  compact KPI strip, then the one-line answers and the founder-decision flag. */
export function ExecutiveSummary({ view }: { view: ReportView }) {
  const { snapshot: s, kpiTrends: k } = view;
  const amber = s.founder_decision_needed;

  return (
    <Card highlight={amber} className="overflow-hidden">
      <div className="flex flex-col gap-5 p-5 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xl">
          <Eyebrow>Lane E · Daily decision</Eyebrow>
          <div className="mt-2 flex items-center gap-3">
            <DecisionPill decision={s.decision} />
            <span className="text-sm text-ink-soft">
              <span className="rounded bg-na/10 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                Suggested
              </span>{' '}
              reviewer overrides
            </span>
          </div>
          <p className="mt-3 text-[15px] leading-snug text-ink">{s.decision_reason}</p>
          <p className="mt-1 text-[13px] text-ink-faint">
            Is Lane E becoming a controlled patient-acquisition engine?
          </p>
        </div>

        {amber ? (
          <div className="rounded-lg border border-watch/40 bg-watch/5 p-3 md:max-w-xs">
            <p className="eyebrow text-watch">Founder decision needed · Yes</p>
            <p className="mt-1 text-[13px] font-medium text-ink">{s.founder_decision}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-line bg-na/5 p-3 md:max-w-xs">
            <p className="eyebrow">Founder decision needed · No</p>
            <p className="mt-1 text-[13px] text-ink-soft">No founder input required today.</p>
          </div>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 divide-x divide-line border-t border-line md:grid-cols-5">
        <KpiStat
          label="Qualified inquiries"
          value={fmtInt(k.qualified_inquiries.today)}
          delta={fmtDelta(k.qualified_inquiries.delta)}
          deltaTone={deltaTone(k.qualified_inquiries.delta)}
          sparkData={k.qualified_inquiries.series}
        />
        <KpiStat
          label="Glow Up bookings"
          value={fmtInt(k.glow_up_bookings.today)}
          delta={fmtDelta(k.glow_up_bookings.delta)}
          deltaTone={deltaTone(k.glow_up_bookings.delta)}
          sparkData={k.glow_up_bookings.series}
        />
        <KpiStat
          label="Lead → booking"
          value={fmtPct(s.lead_to_booking_rate)}
          delta={fmtDelta(k.lead_to_booking_rate.delta, true)}
          deltaTone={deltaTone(k.lead_to_booking_rate.delta)}
          sparkData={k.lead_to_booking_rate.series.map((v) => v * 100)}
        />
        <KpiStat
          label="Show rate"
          value={fmtPct(s.show_rate)}
          delta={fmtDelta(k.show_rate.delta, true)}
          deltaTone={deltaTone(k.show_rate.delta)}
          sparkData={k.show_rate.series.map((v) => v * 100)}
        />
        <KpiStat
          label="Unattributed leads"
          value={fmtInt(s.unattributed_leads)}
          delta={fmtDelta(k.unattributed_leads.delta)}
          deltaTone={deltaTone(k.unattributed_leads.delta, true)}
          sparkData={k.unattributed_leads.series}
          sparkTone="watch"
        />
      </div>

      {/* One-line answers */}
      <div className="grid grid-cols-1 gap-px border-t border-line bg-line text-[13px] sm:grid-cols-2 lg:grid-cols-4">
        <Answer label="Best channel today" value={s.best_channel ?? '—'} tone="good" />
        <Answer label="Underperforming" value={s.worst_channel ?? '—'} tone="stop" />
        <Answer label="Main bottleneck" value={s.main_bottleneck ?? '—'} />
        <Answer
          label="Action required tomorrow"
          value={amber ? s.founder_decision : 'Maintain plan'}
        />
      </div>
    </Card>
  );
}

function Answer({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'good' | 'stop';
}) {
  const toneClass = tone === 'good' ? 'text-good' : tone === 'stop' ? 'text-stop' : 'text-ink';
  return (
    <div className="bg-card px-4 py-3">
      <p className="eyebrow">{label}</p>
      <p className={`mt-1 font-medium leading-snug ${toneClass}`}>{value}</p>
    </div>
  );
}
