import type { ExecutiveReport } from '@/lib/executive/types';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { FunnelViz, type FunnelStageViz } from '@/components/charts/FunnelViz';
import { fmtAed } from './parts';

const int = (n: number) => Math.round(n).toLocaleString('en-US');

/**
 * The acquisition → outcome funnel: Enquiries → Bookings → Attended → Revenue,
 * each stage read from its ONE authoritative source and de-duplicated:
 *   • Enquiries  ← lead tracker (general-booking sheet)
 *   • Bookings   ← Zavis CRM appointments (the website booking widget writes into
 *                  Zavis, so it's already counted here — not added twice)
 *   • Attended   ← Zavis completed appointments (a true subset of bookings)
 *   • Revenue    ← Practo Insta finalized bills
 *
 * Honest framing: Enquiries is only the TRACKED-lead channel, so bookings can
 * exceed it (walk-ins / direct aren't in the tracker) — that step is coverage,
 * not a pure conversion. Attended ÷ Bookings IS a real conversion (same
 * population). Revenue is its own population (all billed patients), shown as the
 * outcome, not a count-stage.
 */
export function ExecPipeline({ report }: { report: ExecutiveReport }) {
  const { kpis } = report;

  const stages: FunnelStageViz[] = [
    { label: 'Enquiries (leads)', value: kpis.leadsGenerated, hint: 'lead tracker not sourced' },
    { label: 'Bookings', value: kpis.appointmentsBooked, hint: 'no CRM export' },
    { label: 'Attended (shows)', value: kpis.appointmentsCompleted, hint: 'no CRM export' },
  ];

  const revenue = kpis.clinicRevenue;
  const perAttended =
    revenue != null && kpis.appointmentsCompleted && kpis.appointmentsCompleted > 0
      ? revenue / kpis.appointmentsCompleted
      : null;

  const sources: { stage: string; src: string }[] = [
    { stage: 'Enquiries', src: 'Lead tracker · general-booking sheet' },
    { stage: 'Bookings', src: 'Zavis CRM · incl. website booking widget (deduped)' },
    { stage: 'Attended', src: 'Zavis CRM · completed appointments' },
    { stage: 'Revenue', src: 'Practo Insta · finalized bills' },
  ];

  return (
    <Card>
      <SectionHeader
        eyebrow="Executive dashboard · the funnel"
        title="Enquiries → Bookings → Attended → Revenue"
      />
      <div className="px-5 pb-5 pt-4">
        <FunnelViz stages={stages} />

        {/* Revenue outcome — its own population (AED), not a count-stage. */}
        <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-1 rounded-card border border-line bg-card px-4 py-3">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Clinic revenue</span>{' '}
            <span className="tnum text-[16px] font-semibold text-ink">
              {revenue != null ? fmtAed(revenue) : '—'}
            </span>
            <span className="ml-1 text-[11px] text-ink-faint">(Practo bills)</span>
          </div>
          {perAttended != null ? (
            <div className="text-[12.5px] text-ink-soft">
              ≈ <span className="tnum font-medium text-ink">{fmtAed(perAttended)}</span> per attended visit
            </div>
          ) : null}
        </div>

        {/* Source mapping — where each stage comes from. */}
        <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {sources.map((s) => (
            <div key={s.stage} className="flex items-baseline gap-2 text-[11.5px]">
              <span className="w-20 shrink-0 font-medium text-ink">{s.stage}</span>
              <span className="text-ink-faint">{s.src}</span>
            </div>
          ))}
        </div>

        <Takeaway>
          Each stage is read from its own source and de-duplicated — the website booking widget already writes
          into Zavis, so bookings aren&apos;t double-counted. <strong>Attended ÷ Bookings</strong> is a true
          conversion (same population). <strong>Enquiries</strong> is only the tracked-lead channel, so bookings
          can exceed it (walk-ins &amp; direct bookings aren&apos;t in the tracker) — read that step as coverage,
          not a drop-off.
          {revenue != null ? ` Clinic revenue stands at ${fmtAed(revenue)} (Practo).` : ''}
          {kpis.leadsGenerated != null && kpis.appointmentsBooked != null && kpis.leadsGenerated > 0
            ? ` Tracked enquiries: ${int(kpis.leadsGenerated)}; bookings: ${int(kpis.appointmentsBooked)}.`
            : ''}
        </Takeaway>
      </div>
    </Card>
  );
}
