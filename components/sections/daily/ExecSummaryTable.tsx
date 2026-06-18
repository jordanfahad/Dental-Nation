import type { Blocker, ReportView } from '@/lib/types';
import { Card, SectionHeader } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { REPORT_BRAND } from '@/config/report-brand';
import { dubaiDateLabel } from '@/lib/dates';
import { ownerFor } from '@/config/data-gap-owners';

/**
 * §A — Executive Summary. A clean two-column table answering the day's operating
 * questions from the real snapshot. Every value with no source renders an honest
 * "—" or a labelled data gap; nothing is fabricated. The "Founder decision
 * needed = Yes" state turns the whole card amber.
 */
export function ExecSummaryTable({
  view,
  topBlocker,
}: {
  view: ReportView;
  topBlocker: Blocker | null;
}) {
  const s = view.snapshot;
  const amber = s.founder_decision_needed;

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Report date', value: dubaiDateLabel(s.report_date) },
    { label: 'Lane', value: REPORT_BRAND.lane },
    { label: 'Offer', value: REPORT_BRAND.offer },
    { label: 'Main CTA', value: REPORT_BRAND.cta },
    {
      label: "Today's decision",
      value: (
        <span>
          <span className="font-semibold text-ink">{s.decision}</span>
          {s.decision_reason ? (
            <span className="text-ink-soft"> — {s.decision_reason}</span>
          ) : null}
          <span className="ml-2 rounded bg-na/10 px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">
            suggested — reviewer overrides
          </span>
        </span>
      ),
    },
    {
      label: 'Main channel working today',
      value: s.best_channel ? <span className="text-good">{s.best_channel}</span> : '—',
    },
    {
      label: 'Main channel underperforming',
      value: s.worst_channel ? <span className="text-stop">{s.worst_channel}</span> : '—',
    },
    { label: 'Main conversion bottleneck', value: s.main_bottleneck ?? '—' },
    {
      label: 'Main action required tomorrow',
      value: topBlocker?.fix ? (
        topBlocker.fix
      ) : (
        <DataGapInline detail="no open high-impact blocker fix logged" owner={ownerFor('channel')} />
      ),
    },
    {
      label: 'Founder decision needed',
      value: amber ? (
        <span className="font-semibold text-watch">Yes — {s.founder_decision}</span>
      ) : (
        <span className="text-ink-soft">No</span>
      ),
    },
    {
      label: 'Owner of next fix',
      value: topBlocker?.owner ?? '—',
    },
    {
      label: 'Due time',
      value: topBlocker?.due_time ?? '—',
    },
  ];

  return (
    <Card highlight={amber}>
      <SectionHeader tag="A" eyebrow="Executive summary" title="Today's operating answer" />
      <div className="px-5 pb-5 pt-4">
        <table className="w-full border-collapse text-[13px]">
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-line/60 last:border-0 align-top">
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
