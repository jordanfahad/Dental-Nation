import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { FunnelViz, type FunnelStageViz } from '@/components/charts/FunnelViz';
import { DataGapInline } from '@/components/ui/DataGap';
import { ownerFor } from '@/config/data-gap-owners';
import type { CrmReport } from '@/lib/crm/types';
import { fmtInt, fmtPct } from './format';

/**
 * Appointment funnel: Requested → Booked → Confirmed → Completed. Cancellations
 * are shown as a SEPARATE stat/takeaway (a drop-out, not a funnel stage). Stages
 * with no data render as honest gaps inside FunnelViz.
 */
export function CrmFunnel({ report }: { report: CrmReport }) {
  const a = report.appointments;

  const stages: FunnelStageViz[] = [
    { label: 'Requested', value: a.requested },
    { label: 'Booked', value: a.booked },
    { label: 'Confirmed', value: a.confirmed },
    { label: 'Completed', value: a.completed },
  ];

  return (
    <Card>
      <SectionHeader
        eyebrow="CRM — Zavis · funnel"
        title="From request to chair: where appointments fall away"
      />
      <div className="px-5 pb-5 pt-4">
        <FunnelViz stages={stages} />

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Cancelled" value={a.cancel != null ? fmtInt(a.cancel) : null} tone="stop" />
          <Stat
            label="Cancellation rate"
            value={a.cancellationRate != null ? fmtPct(a.cancellationRate) : null}
            tone="stop"
          />
          <Stat
            label="Completion rate"
            value={a.completionRate != null ? fmtPct(a.completionRate) : null}
            tone="good"
            hint="completed ÷ (completed + cancel)"
          />
          <Stat
            label="AI-agent bookings"
            value={a.aiAgentBookings != null ? fmtInt(a.aiAgentBookings) : null}
          />
        </div>

        {a.cancellationRate != null && a.completed != null && a.cancel != null ? (
          <Takeaway>
            {fmtInt(a.cancel)} appointments cancelled ({fmtPct(a.cancellationRate)} of all booked).
            Of appointments that resolved, {fmtPct(a.completionRate)} were completed — the rest were
            cancellations, the clearest leak after a patient has already committed.
          </Takeaway>
        ) : (
          <div className="mt-2">
            <DataGapInline
              detail="cancellation / completion not computable without status data"
              owner={ownerFor('clinic')}
            />
          </div>
        )}
      </div>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string | null;
  tone?: 'good' | 'stop';
  hint?: string;
}) {
  const color = value == null ? 'text-watch' : tone === 'stop' ? 'text-stop' : tone === 'good' ? 'text-good' : 'text-ink';
  return (
    <div className="rounded-card border border-line bg-card p-3">
      <p className="text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={`mt-1 text-[20px] font-semibold leading-none tabular-nums ${color}`}>
        {value ?? 'Data gap'}
      </p>
      {hint ? <p className="mt-1 text-[10px] text-ink-faint">{hint}</p> : null}
    </div>
  );
}
