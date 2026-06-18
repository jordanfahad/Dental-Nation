import type { WeeklyModel } from './prepare';
import type { WeeklyDecision } from '@/lib/metrics/weekly';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { WeeklyDecisionChip } from './WeeklyDecisionCell';
import { HBarChart, Donut, TOKENS, type BarDatum } from '@/components/charts/Charts';
import { ownerFor } from '@/config/data-gap-owners';
import { aed, num } from './format';

/** Decision → bar color (matches the Scale/Fix/Hold/Stop chip palette). */
const DECISION_COLOR: Record<WeeklyDecision, string> = {
  Scale: TOKENS.good,
  Fix: TOKENS.watch,
  Hold: TOKENS.na,
  Stop: TOKENS.stop,
};

/** A muted "data gap" cell for columns that have NO real source. Never a fake 0. */
function GapCell({ owner }: { owner: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-watch" title={`owner: ${owner}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-watch" />
      gap
    </span>
  );
}

/**
 * §B — Weekly Channel Performance. A bar chart of inquiries by channel (colored
 * by the suggested decision) and a spend-share donut sit above the detail table.
 * Reach, per-channel bookings and cost-per-booking are honest data gaps (no
 * per-channel booking source), so quality that can't be judged degrades to Hold.
 */
export function SectionBChannels({ model }: { model: WeeklyModel }) {
  const rows = model.channelRows;

  const inquiryBars: BarDatum[] = [...rows]
    .filter((r) => (r.inquiries ?? 0) > 0)
    .sort((a, b) => (b.inquiries ?? 0) - (a.inquiries ?? 0))
    .slice(0, 8)
    .map((r) => ({
      label: r.channel,
      value: r.inquiries ?? 0,
      color: DECISION_COLOR[r.decision],
      note: r.decision,
    }));

  const spendShare: BarDatum[] = [...rows]
    .filter((r) => r.kind === 'paid' && r.spend != null && r.spend > 0)
    .sort((a, b) => (b.spend ?? 0) - (a.spend ?? 0))
    .slice(0, 6)
    .map((r) => ({ label: r.channel, value: r.spend ?? 0 }));

  // Decision distribution chips.
  const dist = rows.reduce<Record<WeeklyDecision, number>>(
    (acc, r) => ((acc[r.decision] = (acc[r.decision] ?? 0) + 1), acc),
    { Scale: 0, Fix: 0, Hold: 0, Stop: 0 },
  );

  return (
    <Card>
      <SectionHeader
        tag="B"
        eyebrow="Weekly review"
        title="Weekly channel performance"
        right={<span className="text-[11px] text-ink-faint">decision = suggested, reviewer overrides</span>}
      />

      {rows.length > 0 ? (
        <div className="grid gap-6 px-5 pb-2 pt-4 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
              Inquiries by channel · colored by decision
            </p>
            <HBarChart data={inquiryBars} valueFormat="int" />
            <div className="mt-3 flex flex-wrap gap-2">
              {(Object.keys(dist) as WeeklyDecision[])
                .filter((k) => dist[k] > 0)
                .map((k) => (
                  <span key={k} className="inline-flex items-center gap-1.5 text-[11px] text-ink-faint">
                    <span className="h-2 w-2 rounded-sm" style={{ background: DECISION_COLOR[k] }} />
                    {dist[k]} {k}
                  </span>
                ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
              Spend share · paid channels
            </p>
            <Donut data={spendShare} valueFormat="aed" centerLabel="spend" height={180} />
          </div>
        </div>
      ) : null}

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
