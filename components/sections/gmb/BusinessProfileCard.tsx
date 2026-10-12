import type { BusinessProfileReport } from '@/lib/social/gmb-report';
import { Card, SectionHeader } from '@/components/ui/Card';
import { KpiBand } from '@/components/charts/KpiBand';
import { TrendChart, ChartLegend, type TrendSeries } from '@/components/charts/Charts';
import { GmbClinicFilter } from './GmbClinicFilter';

const COLORS = { 'dental-nation': '#137c66', 'dr-tosun': '#3968b5', 'al-maher': '#b77722' };

export function BusinessProfileCard({ report }: { report: BusinessProfileReport }) {
  const series: TrendSeries[] = report.branches.filter((b) => b.connected).map((b) => ({
    key: b.clinic, label: b.label, color: COLORS[b.clinic], kind: 'line', valueFormat: 'int',
  }));
  return (
    <Card>
      <SectionHeader eyebrow="Local search" title="Google Business Profile" />
      <div className="space-y-4 px-5 pb-5 pt-4">
        <GmbClinicFilter active={report.active} />
        <div className="text-[12px] text-ink-soft">
          {report.branches.map((b) => (
            <p key={b.clinic}>{b.label}: {!b.connected ? 'not connected yet' : b.mapViews == null && b.calls == null && b.directions == null && b.websiteClicks == null ? 'awaiting sync data for this period' : 'connected'}</p>
          ))}
          {report.active === 'all' ? <p>Totals include available data from connected branches.</p> : null}
        </div>
        <KpiBand items={[
          { label: 'Phone calls', value: report.calls },
          { label: 'Direction requests', value: report.directions },
          { label: 'Website clicks', value: report.websiteClicks },
          { label: 'Map views', value: report.mapViews },
        ].map((m) => ({ label: m.label, value: m.value == null ? '—' : Math.round(m.value).toLocaleString('en-US'), hint: 'total in period' }))} />
        {report.trend.length ? <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-faint">Map views over time</p>
          <TrendChart data={report.trend} series={series} leftFormat="int" />
          <ChartLegend items={series.map((s) => ({ label: s.label, color: s.color }))} />
        </div> : null}
      </div>
    </Card>
  );
}
