import type { RangeReport } from '@/lib/types';
import type { WeeklyModel } from './prepare';
import { Card, SectionHeader } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { WeeklyDecisionChip } from './WeeklyDecisionCell';
import { dubaiDateLabel } from '@/lib/dates';
import { ownerFor } from '@/config/data-gap-owners';
import { num } from './format';

/**
 * §A — Weekly Executive View. One table answering the week's operating
 * questions. The overall decision is the SUGGESTED weekly Scale/Fix/Hold/Stop
 * (reviewer overrides). Fields with no real source render an explicit, owned
 * data gap — never a fabricated value.
 */
export function SectionAExecutive({
  report,
  model,
}: {
  report: RangeReport;
  model: WeeklyModel;
}) {
  const { range } = report;
  const { overall, bestChannel, worstChannel, totals, leakage } = model;

  const gap = (detail: string, area: string) => (
    <DataGapInline detail={detail} owner={ownerFor(area)} />
  );

  const recommendation =
    overall.decision === 'Scale'
      ? 'Increase budget on the efficient channels; hold structure otherwise.'
      : overall.decision === 'Fix'
        ? `Fix the top issue before scaling — ${overall.reason.replace(/^Fix — /, '')}.`
        : overall.decision === 'Stop'
          ? 'Pause spend on the failing channels and re-test creative/targeting.'
          : 'Hold spend; gather more volume before changing direction.';

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Week covered', value: `${dubaiDateLabel(range.from)} → ${dubaiDateLabel(range.to)}` },
    {
      label: 'Overall weekly decision',
      value: (
        <span className="inline-flex flex-wrap items-center gap-2">
          <WeeklyDecisionChip decision={overall.decision} />
          <span className="text-ink-soft">{overall.reason}</span>
          <span className="rounded bg-na/10 px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">
            suggested — reviewer overrides
          </span>
        </span>
      ),
    },
    {
      label: 'Best-performing channel',
      value: bestChannel ? (
        <span className="text-good">{bestChannel.channel}</span>
      ) : (
        gap('no paid channel had enough qualified volume to rank', 'channel')
      ),
    },
    {
      label: 'Worst-performing channel',
      value: worstChannel ? (
        <span className="text-stop">{worstChannel.channel}</span>
      ) : (
        gap('fewer than two paid channels with judgeable volume', 'channel')
      ),
    },
    {
      label: 'Best-performing creative',
      value: gap('no per-creative performance metric in the content source', 'creative'),
    },
    {
      label: 'Main audience learning',
      value: gap('no per-audience response metric sourced this week', 'creative'),
    },
    {
      label: 'Main conversion bottleneck',
      value: leakage ? (
        `${leakage.from} → ${leakage.to} (${Math.round(leakage.drop * 100)}% drop)`
      ) : (
        gap('not enough measured funnel stages to locate a leak', 'tracking')
      ),
    },
    {
      label: 'Main tracking gap',
      value:
        totals.unattributed != null && totals.unattributed > 0 ? (
          <span>
            {num(totals.unattributed)} unattributed inquiries
            {totals.unattributedShare != null ? ` (${Math.round(totals.unattributedShare * 100)}% of total)` : ''}
            <span className="ml-1 text-ink-faint">· owner: {ownerFor('attribution')}</span>
          </span>
        ) : totals.unattributed === 0 ? (
          <span className="text-good">No unattributed inquiries this week</span>
        ) : (
          gap('attribution coverage not sourced', 'attribution')
        ),
    },
    {
      label: 'Main clinic / PAC issue',
      value: gap('no PAC / clinic feedback source for the week', 'pac'),
    },
    {
      label: 'Recommendation for next week',
      value: <span className="text-ink">{recommendation}</span>,
    },
  ];

  return (
    <Card>
      <SectionHeader tag="A" eyebrow="Weekly review" title="Weekly executive view" />
      <div className="px-5 pb-5 pt-4">
        <table className="w-full border-collapse text-[13px]">
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-line/60 align-top last:border-0">
                <th className="w-[230px] py-2 pr-4 text-left font-medium text-ink-faint">
                  {r.label}
                </th>
                <td className="py-2 leading-snug text-ink">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
