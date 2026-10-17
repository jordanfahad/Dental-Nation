import type { ReactNode } from 'react';
import { coverageLabel, type ClinicComparison, type ComparisonPeriod, type CoveredMetric } from '@/lib/gbp/clinic-comparison';

const number = (value: number | null) => value == null ? 'Unavailable' : value.toLocaleString('en-GB');
function GbpValue({ metric }: { metric: CoveredMetric }) {
  return <>{metric.expectedDays ? number(metric.value) : null}<span className="mt-1 block text-xs text-ink-soft">{coverageLabel(metric)}</span></>;
}

export function GbpClinicTable({ report }: { report: ClinicComparison | null }) {
  const periods: ComparisonPeriod[] = ['mtd', 'lastMonth'];
  const measures: { label: string; render: (row: ClinicComparison['branches'][number]['mtd']) => ReactNode }[] = [
    { label: 'GBP calls', render: (r) => <GbpValue metric={r.calls} /> },
    { label: 'GBP direction requests', render: (r) => <GbpValue metric={r.directions} /> },
    { label: 'GBP website clicks', render: (r) => <GbpValue metric={r.websiteClicks} /> },
    { label: 'Tracker leads logged', render: (r) => number(r.leads) },
    { label: 'Growth bookings', render: (r) => number(r.bookings) },
    { label: 'Billed AED', render: (r) => r.revenue == null ? 'Unavailable' : r.revenue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
  ];
  return <section className="rounded-card border border-line bg-card p-5">
    <h3 className="mb-3 text-lg font-semibold">GBP vs clinic</h3>
    {report ? <>
      <div className="overflow-x-auto"><table className="w-full text-left text-xs">
        <caption className="mb-3 text-left text-ink-soft">
          All three branches. MTD: {report.periods.mtd.from > report.periods.mtd.to ? 'no completed days in this month yet' : `${report.periods.mtd.from} to ${report.periods.mtd.to} (last complete Dubai day)`}.
          {' '}Last calendar month: {report.periods.lastMonth.from} to {report.periods.lastMonth.to}.
        </caption>
        <thead>
          <tr><th rowSpan={2} scope="col" className="border-b border-line p-2">Branch</th>{measures.map((m) => <th key={m.label} colSpan={2} scope="colgroup" className="border-b border-line p-2">{m.label}</th>)}</tr>
          <tr>{measures.flatMap((m) => periods.map((p) => <th key={`${m.label}-${p}`} scope="col" className="border-b border-line p-2">{p === 'mtd' ? 'MTD' : 'Last month'}</th>))}</tr>
        </thead>
        <tbody>{report.branches.map((b) => <tr key={b.key}>
          <th scope="row" className="whitespace-nowrap border-b border-line p-2 align-top">{b.label}</th>
          {measures.flatMap((m) => periods.map((p) => <td key={`${m.label}-${p}`} className="min-w-28 border-b border-line p-2 align-top">{m.render(b[p])}</td>))}
        </tr>)}</tbody>
      </table></div>
      <p className="mt-3 text-xs text-ink-soft">Correlation is visual, not causal; GBP counts are Google&apos;s counters, leads and revenue are our own records.</p>
      <p className="mt-2 text-xs text-ink-soft">GBP values sum only covered days; partial month labels show coverage for each metric. Tracker leads are logged rows before deduplication. Unassigned leads: MTD {number(report.unassigned.mtd)}, last month {number(report.unassigned.lastMonth)}; excluded from branch counts. {report.undated} undated or invalid-date tracker rows and {report.headerEchoes} repeated headers excluded.</p>
      {report.missingSources.length > 0 && <p className="mt-2 text-xs text-ink-soft">No data in either reporting period: {report.missingSources.join(', ')}. These values are Unavailable for all branches.</p>}
      <p className="mt-2 text-xs text-ink-soft">Bookings use Growth appointment counts, including cancellations, without phone-path estimates. Revenue is non-cancelled billed AED, including unattributed bills, not cash collected. Al Maher has no Growth or billing feed.</p>
      <p className="mt-2 text-xs text-ink-soft">Latest recorded bill through the reporting day: {report.branches.filter((b) => b.key !== 'al-maher').map((b) => `${b.label}: ${b.latestBill ?? 'unavailable'}`).join('; ')}. Missing later days are not proof of no business.</p>
    </> : <p role="status" className="text-sm text-ink-soft">GBP vs clinic is unavailable because a stored source could not be read.</p>}
  </section>;
}
