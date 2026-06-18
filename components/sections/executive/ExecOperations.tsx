import type { ExecutiveReport } from '@/lib/executive/types';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { TrafficHeatmap } from '@/components/charts/TrafficHeatmap';
import { MetricCallout, fmtHours, fmtInt, fmtPct } from './parts';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
function hourLabel(h: number): string {
  if (h === 0) return '12am';
  if (h === 12) return '12pm';
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

/**
 * Operational excellence — completion / cancellation / AI-agent highlights, the
 * conversation responsiveness read (the #1 automation opportunity), and the
 * conversation-traffic heatmap. Each callout degrades to an em-dash when its
 * source is absent; the heatmap self-handles an empty matrix.
 */
export function ExecOperations({ report }: { report: ExecutiveReport }) {
  const { kpis, crm } = report;
  const frHours = kpis.avgFirstResponseHours;
  const frDays = frHours == null ? null : frHours / 24;
  const frTone = frDays == null ? 'accent' : frDays >= 7 ? 'stop' : frDays >= 2 ? 'watch' : 'good';

  const peak = crm.traffic.peak;

  return (
    <Card>
      <SectionHeader
        eyebrow="Executive dashboard · operations"
        title="Operational excellence & the automation opportunity"
      />
      <div className="px-5 pb-5 pt-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCallout
            label="Completion rate"
            value={fmtPct(kpis.completionRate)}
            caption="Appointments attended vs. resolved — the show-up engine."
            tone={kpis.completionRate != null && kpis.completionRate >= 0.7 ? 'good' : 'accent'}
          />
          <MetricCallout
            label="Cancellation rate"
            value={fmtPct(kpis.cancellationRate)}
            caption="Booked appointments lost before attendance."
            tone={kpis.cancellationRate != null && kpis.cancellationRate >= 0.3 ? 'watch' : 'accent'}
          />
          <MetricCallout
            label="AI-agent bookings"
            value={fmtInt(kpis.aiAgentBookings)}
            caption="Appointments booked autonomously by the Zavis AI agent."
            tone="good"
          />
          <MetricCallout
            label="Avg first response"
            value={frHours == null ? '—' : fmtHours(frHours)}
            caption={
              frDays == null
                ? 'Conversation responsiveness — not yet measured.'
                : frDays >= 2
                  ? 'The #1 automation opportunity — warm enquiries wait too long for a first reply.'
                  : 'Fast enough to convert enquiries while intent is warm.'
            }
            tone={frTone}
          />
        </div>

        <div className="mt-6 grid gap-x-8 gap-y-4 md:grid-cols-[1fr_minmax(0,360px)]">
          <div>
            <p className="mb-3 text-[12px] font-medium text-ink">When patients reach out</p>
            <TrafficHeatmap matrix={crm.traffic.matrix} />
          </div>
          <div className="flex flex-col justify-center">
            <Takeaway>
              {peak
                ? `Conversation traffic peaks around ${hourLabel(peak.hour)} on ${WEEKDAYS[peak.weekday]} (${peak.conversations}/hr). Staffing — or the AI agent — should be sharpest in that window.`
                : 'Conversation traffic is not yet sourced; the heatmap fills in once a Zavis traffic export is ingested.'}
              {frDays != null && frDays >= 2
                ? ` Closing the ${fmtHours(frHours)} first-response gap is the single highest-leverage automation move.`
                : ''}
            </Takeaway>
          </div>
        </div>
      </div>
    </Card>
  );
}
