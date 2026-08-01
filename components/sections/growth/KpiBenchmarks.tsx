import Link from 'next/link';
import { getKpiMap, type KpiRow, type KpiStatus } from '@/lib/growth/kpiMap';
import { KPI_DISCLAIMER } from '@/config/kpi-benchmarks';
import { Card, SectionHeader } from '@/components/ui/Card';

/**
 * KPI Benchmarks — the "what does good look like, and where are we" view
 * (built for Mr Akbar, 31 Jul). One card per growth motion: its KPI chain,
 * then a table of KPI · industry benchmark · our live number for the selected
 * window · status · where in the dashboard that number lives.
 *
 * Benchmarks come from config/kpi-benchmarks.ts (curated, editable); actuals
 * come from the same read layers the linked tabs render, via lib/growth/kpiMap.
 * Server component; pure CSS so it prints into the board pack.
 */

const STATUS_STYLE: Record<KpiStatus, { label: string; cls: string }> = {
  ahead: { label: 'Ahead of benchmark', cls: 'bg-good-50 text-good' },
  onpar: { label: 'Within benchmark', cls: 'bg-accent/5 text-accent' },
  behind: { label: 'Below benchmark', cls: 'bg-watch-50 text-watch' },
  na: { label: '—', cls: 'text-ink-faint' },
};

function StatusPill({ status, flagged }: { status: KpiStatus; flagged: string | null }) {
  // An open measurement-integrity flag suppresses the verdict entirely: a
  // number judged against a known-corrupt denominator would be a lie with a
  // color on it. The flag itself lives on Marketing OS → Overview.
  if (flagged) {
    return (
      <span
        className="inline-block whitespace-nowrap rounded-full border border-dashed border-watch/60 px-2 py-0.5 text-[10.5px] font-medium text-watch"
        title={flagged}
      >
        unreliable denominator
      </span>
    );
  }
  if (status === 'na') return <span className="text-[11px] text-ink-faint">—</span>;
  const s = STATUS_STYLE[status];
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

function Chain({ stages }: { stages: readonly string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 px-5 pt-3">
      {stages.map((s, i) => (
        <span key={s} className="flex items-center gap-1.5">
          <span className="rounded-full border border-line bg-panel/60 px-2.5 py-0.5 text-[10.5px] font-medium text-ink-soft">
            {s}
          </span>
          {i < stages.length - 1 ? <span className="text-[10px] text-ink-faint">→</span> : null}
        </span>
      ))}
    </div>
  );
}

function KpiTableRow({ row, rangeQs }: { row: KpiRow; rangeQs: string }) {
  const d = row.def;
  return (
    <tr className="border-t border-line/70 align-top">
      <td className="py-2.5 pl-3 pr-2">
        <span className="block text-[12.5px] font-medium leading-tight text-ink">{d.label}</span>
        <span className="mt-0.5 block max-w-[300px] text-[10.5px] leading-snug text-ink-faint">{d.explain}</span>
      </td>
      <td className="px-2 py-2.5">
        {d.benchmark ? (
          <>
            <span className="block whitespace-nowrap text-[12.5px] font-medium tabular-nums text-ink">{d.benchmark.label}</span>
            {d.source ? <span className="mt-0.5 block max-w-[190px] text-[10px] leading-snug text-ink-faint">{d.source}</span> : null}
          </>
        ) : (
          <span className="block max-w-[210px] text-[10.5px] leading-snug text-ink-faint">
            {d.benchmarkNote ?? 'No industry range — context metric.'}
          </span>
        )}
        {d.benchmark && d.benchmarkNote ? (
          <span className="mt-0.5 block max-w-[190px] text-[10px] leading-snug text-watch">{d.benchmarkNote}</span>
        ) : null}
      </td>
      <td className="px-2 py-2.5 text-right">
        <span className={`text-[13px] font-semibold tabular-nums ${row.value == null ? 'text-ink-faint' : 'text-ink'}`}>
          {row.display}
        </span>
        {row.note ? <span className="mt-0.5 block max-w-[200px] text-[10px] leading-snug text-ink-faint">{row.note}</span> : null}
      </td>
      <td className="px-2 py-2.5 text-center">
        <StatusPill status={row.status} flagged={row.flagged} />
      </td>
      <td className="py-2.5 pl-2 pr-3 text-right">
        {d.mapsTo ? (
          <Link
            href={`${d.mapsTo.href}${rangeQs}`}
            className="whitespace-nowrap text-[11px] font-medium text-accent underline-offset-2 hover:underline"
          >
            {d.mapsTo.label}
          </Link>
        ) : (
          <span className="inline-block max-w-[180px] rounded-full border border-dashed border-watch/50 px-2 py-0.5 text-left text-[10px] font-medium leading-snug text-watch">
            not yet measured
          </span>
        )}
        {!d.mapsTo && d.measureNote ? (
          <span className="mt-1 block max-w-[190px] text-left text-[10px] leading-snug text-ink-faint">{d.measureNote}</span>
        ) : null}
      </td>
    </tr>
  );
}

export async function KpiBenchmarks({
  range,
}: {
  range?: { from?: string; to?: string; preset?: string };
} = {}) {
  const report = await getKpiMap({ from: range?.from, to: range?.to });

  // Cross-links carry the active window, like every other Growth cross-link.
  const rangeQs = range?.from && range?.to ? `&preset=custom&from=${range.from}&to=${range.to}` : '';
  const windowLabel = report.from && report.to ? `${report.from} → ${report.to}` : 'all time';

  return (
    <div className="space-y-4">
      <Card>
        <SectionHeader eyebrow="Group · KPI map" title="KPI benchmarks — what good looks like, and where we are" />
        <div className="px-5 pb-5 pt-3">
          <p className="max-w-[860px] text-[12.5px] leading-relaxed text-ink-soft">
            Each growth motion below is shown as its KPI chain — the sequence of numbers that has to work for the
            motion to make money — followed by every KPI&apos;s <span className="font-medium text-ink">industry benchmark</span>,{' '}
            <span className="font-medium text-ink">our live number</span> for the selected window ({windowLabel}), and the
            dashboard tab where that number lives day to day.
          </p>
          <p className="mt-2 max-w-[860px] text-[11px] leading-relaxed text-ink-faint">{KPI_DISCLAIMER}</p>
          {report.caveats.length > 0 ? (
            <ul className="mt-3 space-y-1">
              {report.caveats.map((c) => (
                <li key={c} className="text-[11px] leading-snug text-watch">
                  ⚠ {c}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Card>

      {report.motions.map(({ motion, rows }, i) => (
        <Card key={motion.key}>
          <SectionHeader tag={String(i + 1)} eyebrow="Growth motion" title={motion.title} />
          <p className="max-w-[820px] px-5 pt-1 text-[11.5px] leading-snug text-ink-soft">{motion.subtitle}</p>
          <Chain stages={motion.chain} />
          <div className="overflow-x-auto px-2 pb-4 pt-3">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                  <th className="py-1.5 pl-3 pr-2 text-left">KPI</th>
                  <th className="px-2 py-1.5 text-left">Industry benchmark</th>
                  <th className="px-2 py-1.5 text-right">Ours ({windowLabel})</th>
                  <th className="px-2 py-1.5 text-center">Status</th>
                  <th className="py-1.5 pl-2 pr-3 text-right">In the dashboard</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <KpiTableRow key={row.def.key} row={row} rangeQs={rangeQs} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}
