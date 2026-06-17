import type { Blocker } from '@/lib/types';
import { Card, SectionHeader } from '@/components/ui/Card';
import { ImpactDot, StatusTag, TypeTag } from '@/components/ui/pills';

const IMPACT_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

/** §G — Blockers & Fixes. Sorted by impact; the open high-impact count feeds the
 *  §A decision rule. */
export function BlockersFixes({ blockers }: { blockers: Blocker[] }) {
  const sorted = [...blockers].sort(
    (a, b) => (IMPACT_RANK[a.impact ?? 'low'] ?? 3) - (IMPACT_RANK[b.impact ?? 'low'] ?? 3),
  );
  const openHigh = blockers.filter((b) => b.impact === 'high' && b.status !== 'done').length;

  return (
    <Card>
      <SectionHeader
        tag="G"
        eyebrow="Execution"
        title="Blockers & fixes"
        right={
          <span
            className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium ${
              openHigh > 0 ? 'bg-stop/10 text-stop' : 'bg-good/10 text-good'
            }`}
          >
            {openHigh} open high-impact
          </span>
        }
      />
      <div className="overflow-x-auto p-5">
        <table className="w-full min-w-[820px] border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-line text-left text-ink-faint">
              <th className="py-2 pr-3 font-medium">Blocker</th>
              <th className="px-2 py-2 font-medium">Type</th>
              <th className="px-2 py-2 font-medium">Impact</th>
              <th className="px-2 py-2 font-medium">Owner</th>
              <th className="px-2 py-2 font-medium">Fix</th>
              <th className="px-2 py-2 font-medium">Due</th>
              <th className="px-2 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((b) => (
              <tr key={b.id} className="border-b border-line/60 align-top last:border-0">
                <td className="py-2 pr-3 font-medium text-ink">{b.blocker ?? '—'}</td>
                <td className="px-2 py-2"><TypeTag type={b.type} /></td>
                <td className="px-2 py-2"><ImpactDot impact={b.impact} /></td>
                <td className="px-2 py-2 text-ink-soft">{b.owner ?? '—'}</td>
                <td className="px-2 py-2 text-ink-soft">{b.fix ?? '—'}</td>
                <td className="px-2 py-2 text-ink-faint">{b.due_time ?? '—'}</td>
                <td className="px-2 py-2"><StatusTag status={b.status} /></td>
              </tr>
            ))}
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-4 text-center text-ink-faint">
                  No blockers logged.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
