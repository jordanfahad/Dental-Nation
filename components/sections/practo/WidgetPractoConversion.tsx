import type { WidgetConversionReport, ConversionOutcome } from '@/lib/practo/widgetConversion';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { dubaiDateLabel } from '@/lib/dates';

const OUTCOME: Record<ConversionOutcome, { label: string; cls: string }> = {
  attended: { label: 'Attended', cls: 'bg-good/10 text-good' },
  upcoming: { label: 'Booked', cls: 'bg-accent/10 text-accent' },
  noshow: { label: 'No-show', cls: 'bg-watch/10 text-watch' },
  cancelled: { label: 'Cancelled', cls: 'bg-panel-2 text-ink-soft' },
  notfound: { label: 'Not in Practo', cls: 'bg-stop/10 text-stop' },
};

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-card border border-line p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={`mt-0.5 text-[19px] font-semibold tabular-nums ${tone ?? 'text-ink'}`}>{value}</p>
    </div>
  );
}

/**
 * Widget → Practo conversion panel (under Practo Insta). Shows each non-test
 * website-widget booking and whether it actually became a Practo appointment,
 * with the real PMS status — or "Not in Practo" when the widget→Practo hand-off
 * dropped it. Matched by phone against the live Practo appointment feed.
 */
export function WidgetPractoConversion({ data }: { data: WidgetConversionReport }) {
  if (data.source === 'empty') {
    return (
      <Card>
        <SectionHeader tag="P5b" eyebrow="Website widget → Practo" title="Did widget bookings reach Practo?" />
        <div className="px-5 pb-5 pt-4">
          <p className="text-[12.5px] text-ink-soft">No non-test website-widget bookings in this period.</p>
        </div>
      </Card>
    );
  }

  const convRate = data.total > 0 ? Math.round((data.inPracto / data.total) * 100) : 0;

  return (
    <Card>
      <SectionHeader
        tag="P5b"
        eyebrow="Website widget → Practo"
        title="Did widget bookings reach Practo?"
        right={<span className="text-[11px] text-ink-faint">{convRate}% reached the PMS</span>}
      />
      <div className="px-5 pb-5 pt-4">
        <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Widget bookings" value={data.total} />
          <Stat label="In Practo" value={data.inPracto} tone="text-good" />
          <Stat label="Attended" value={data.attended} tone="text-good" />
          <Stat label="No-show" value={data.noshow} tone="text-watch" />
          <Stat label="Cancelled" value={data.cancelled} tone="text-ink-soft" />
          <Stat label="Not in Practo" value={data.notFound} tone="text-stop" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                <th className="py-2 pr-3">Patient</th>
                <th className="py-2 pr-3">Phone</th>
                <th className="py-2 pr-3">Lane</th>
                <th className="py-2 pr-3">Submitted</th>
                <th className="py-2 pr-3">Practo outcome</th>
                <th className="py-2 pl-3">Doctor · appt date</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => {
                const o = OUTCOME[r.outcome];
                return (
                  <tr key={r.key} className="border-b border-line/60">
                    <td className="py-2 pr-3 font-medium text-ink">{r.name ?? '—'}</td>
                    <td className="py-2 pr-3 font-mono text-[11.5px] text-ink-soft">{r.phone ?? '—'}</td>
                    <td className="py-2 pr-3 text-ink-soft">{r.lane ?? '—'}</td>
                    <td className="py-2 pr-3 tabular-nums text-ink-soft">{r.submittedAt ? dubaiDateLabel(r.submittedAt) : '—'}</td>
                    <td className="py-2 pr-3">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10.5px] font-medium ${o.cls}`}>
                        {o.label}
                        {r.practoStatus && r.outcome !== 'notfound' ? (
                          <span className="ml-1 font-normal opacity-70">({r.practoStatus})</span>
                        ) : null}
                      </span>
                    </td>
                    <td className="py-2 pl-3 text-ink-soft">
                      {r.doctor ? `${r.doctor}${r.apptDate ? ` · ${dubaiDateLabel(r.apptDate)}` : ''}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Takeaway>
          Each non-test website-widget booking matched by <strong>phone</strong> to the live Practo appointment book.{' '}
          <span className="font-medium text-good">In Practo</span> = the booking reached the PMS (with its real status);{' '}
          <span className="font-medium text-stop">Not in Practo</span> = the phone never appeared, so the widget→Practo hand-off
          dropped it. This is the true test of whether a widget lead became a real booking — bookings stay Practo-sourced.
        </Takeaway>
      </div>
    </Card>
  );
}
