import type { RangeReport } from '@/lib/types';
import type { WeeklyModel } from './prepare';
import { Card, SectionHeader } from '@/components/ui/Card';
import { ownerFor } from '@/config/data-gap-owners';

interface ActionRow {
  action: string;
  owner: string;
  due: string;
  impact: string;
}

const IMPACT_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

/**
 * §E — Next Week Action Plan. Generated from the open blockers (§G) plus the
 * week's top data gaps (each gap → an action to close it, routed to its owner).
 * Action / Owner / Due date / Expected impact.
 */
export function SectionEActions({
  report,
  model,
}: {
  report: RangeReport;
  model: WeeklyModel;
}) {
  const rows: ActionRow[] = [];

  // 1) Open blockers (§G), worst impact first.
  const openBlockers = report.blockers
    .filter((b) => b.status !== 'done' && b.blocker)
    .sort((a, b) => (IMPACT_RANK[a.impact ?? 'low'] ?? 3) - (IMPACT_RANK[b.impact ?? 'low'] ?? 3))
    .slice(0, 6);
  for (const b of openBlockers) {
    rows.push({
      action: b.fix || `Resolve: ${b.blocker}`,
      owner: b.owner || ownerFor(b.type ?? 'channel'),
      due: b.due_time || 'This week',
      impact: b.impact ? `${b.impact} impact` : 'unblocks the week',
    });
  }

  // 2) Top data gaps → an action to CLOSE each gap (the honest spine of the week).
  const gapActions: ActionRow[] = [];
  if (model.totals.unattributed != null && model.totals.unattributed > 0) {
    gapActions.push({
      action: `Close attribution gap on ${Math.round(model.totals.unattributed)} unattributed inquiries (enforce channel/UTM tagging)`,
      owner: ownerFor('attribution'),
      due: 'Next week',
      impact: 'restores channel decisions',
    });
  }
  if (model.totals.spend == null) {
    gapActions.push({
      action: 'Map an ad-spend source so cost-per-inquiry / cost-per-booking can be computed',
      owner: ownerFor('spend'),
      due: 'Next week',
      impact: 'unlocks paid efficiency view',
    });
  }
  gapActions.push(
    {
      action: 'Add a per-channel booking source so per-channel cost-per-booking + quality are real (not gaps)',
      owner: ownerFor('clinic'),
      due: 'Next week',
      impact: 'enables Scale/Stop by channel',
    },
    {
      action: 'Capture attended-visit / show-rate data at the clinics',
      owner: ownerFor('attendance'),
      due: 'Next week',
      impact: 'closes show-rate gap',
    },
    {
      action: 'Log per-creative performance + proof/review capture in the content source',
      owner: ownerFor('content'),
      due: 'Next week',
      impact: 'enables best/worst creative',
    },
  );

  rows.push(...gapActions);

  return (
    <Card>
      <SectionHeader
        tag="E"
        eyebrow="Weekly review"
        title="Next week action plan"
        right={<span className="text-[11px] text-ink-faint">{rows.length} actions</span>}
      />
      <div className="overflow-x-auto px-5 pb-5 pt-4">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-faint">
              <th className="py-2 pr-4 font-medium">Action</th>
              <th className="py-2 pr-4 font-medium">Owner</th>
              <th className="py-2 pr-4 font-medium">Due date</th>
              <th className="py-2 font-medium">Expected impact</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 text-good">
                  No open blockers or data gaps — nothing queued for next week.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="border-b border-line/60 align-top last:border-0">
                  <td className="py-2 pr-4 leading-snug text-ink">{r.action}</td>
                  <td className="py-2 pr-4 text-ink-soft">{r.owner}</td>
                  <td className="py-2 pr-4 text-ink-soft">{r.due}</td>
                  <td className="py-2 text-ink-soft">{r.impact}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
