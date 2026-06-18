import type { WeeklyModel } from './prepare';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { WeeklyDecisionChip } from './WeeklyDecisionCell';
import { ownerFor } from '@/config/data-gap-owners';
import { aed, num } from './format';

/** A muted "data gap" cell used for the per-channel reach / bookings / cost-per-
 *  booking columns that have NO real source. Never a fabricated 0. */
function GapCell({ owner }: { owner: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-watch" title={`owner: ${owner}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-watch" />
      gap
    </span>
  );
}

/**
 * §B — Weekly Channel Performance. One row per channel that has data: paid
 * channels (real spend/clicks/inquiries from the perf rows) and lead-tracker
 * channels (inquiries only). Reach, per-channel bookings and cost-per-booking
 * are honest data gaps (no per-channel booking source), so a channel's decision
 * degrades to "Hold — insufficient data" when quality can't be judged.
 */
export function SectionBChannels({ model }: { model: WeeklyModel }) {
  const rows = model.channelRows;

  return (
    <Card>
      <SectionHeader
        tag="B"
        eyebrow="Weekly review"
        title="Weekly channel performance"
        right={<span className="text-[11px] text-ink-faint">decision = suggested, reviewer overrides</span>}
      />
      <div className="overflow-x-auto px-5 pb-3 pt-4">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-faint">
              <th className="py-2 pr-3 font-medium">Channel</th>
              <th className="py-2 pr-3 text-right font-medium">Spend</th>
              <th className="py-2 pr-3 text-right font-medium">Reach</th>
              <th className="py-2 pr-3 text-right font-medium">Clicks</th>
              <th className="py-2 pr-3 text-right font-medium">Inquiries</th>
              <th className="py-2 pr-3 text-right font-medium">Qualified</th>
              <th className="py-2 pr-3 text-right font-medium">Bookings</th>
              <th className="py-2 pr-3 text-right font-medium">Cost / booking</th>
              <th className="py-2 pr-3 font-medium">Booking quality</th>
              <th className="py-2 font-medium">Decision</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-4 text-ink-faint">
                  No channel had data in this week.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={`${r.kind}:${r.channel}`} className="border-b border-line/60 last:border-0">
                  <td className="py-2 pr-3 font-medium text-ink" title={r.reason}>
                    {r.channel}
                    <span className="ml-1.5 rounded bg-na/10 px-1 py-0.5 text-[9.5px] uppercase tracking-wide text-ink-faint">
                      {r.kind === 'paid' ? 'paid' : 'inquiries'}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {r.spend == null ? <span className="text-ink-ghost">—</span> : aed(r.spend)}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <GapCell owner={ownerFor('tracking')} />
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {r.clicks == null ? <span className="text-ink-ghost">—</span> : num(r.clicks)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{num(r.inquiries)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {r.qualified == null ? <GapCell owner={ownerFor('attribution')} /> : num(r.qualified)}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <GapCell owner={ownerFor('clinic')} />
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <GapCell owner={ownerFor('clinic')} />
                  </td>
                  <td className="py-2 pr-3">
                    <GapCell owner={ownerFor('clinic')} />
                  </td>
                  <td className="py-2">
                    <WeeklyDecisionChip decision={r.decision} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="px-5 pb-4">
        <Takeaway>
          Reach, per-channel bookings and cost-per-booking are data gaps — there is no per-channel
          booking source. Channels whose quality can&apos;t be judged honestly degrade to{' '}
          <span className="font-medium text-ink-soft">Hold — insufficient data</span>. Paid spend /
          clicks / inquiries are real; lead-tracker channels show inquiries only.
        </Takeaway>
      </div>
    </Card>
  );
}
