import { getSocialReport, type SocialChannel } from '@/lib/social/report';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import { ChartLegend, TrendChart, TOKENS, type TrendSeries } from '@/components/charts/Charts';
import { ownerFor } from '@/config/data-gap-owners';
import { dubaiDateLabel } from '@/lib/dates';

const int = (n: number) => Math.round(n).toLocaleString('en-US');

/**
 * Social tab — organic social + Google Business Profile signals synced from
 * salestrig-studio (Postiz). The ORGANIC / local-search lens: GMB calls,
 * direction requests, website clicks & map views; Meta (IG/FB) followers, reach,
 * views & engagement; TikTok followers, views & likes. Distinct from paid ad
 * spend (Marketing tab) and GA4 website analytics.
 */
export async function SocialReport({ range }: { range: { from: string; to: string } }) {
  const report = await getSocialReport({ from: range.from, to: range.to });
  const period = `${dubaiDateLabel(range.from)} → ${dubaiDateLabel(range.to)}`;

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader
          tag="S"
          eyebrow="Organic social & local · from salestrig-studio"
          title="Social & Google Business signals"
          right={<span className="text-[11px] text-ink-faint">{period}</span>}
        />
        <div className="px-5 pb-5 pt-4">
          <p className="text-[12.5px] leading-snug text-ink-soft">
            Organic reach and local-search performance, synced from the salestrig-studio (Postiz) channel
            connections — separate from paid ad spend (Marketing tab) and website analytics (GA4). Flow metrics
            (calls, directions, reach, views…) are totalled over the period; followers show the latest count.
            {report.lastSyncedAt ? (
              <span className="text-ink-faint"> Last synced {dubaiDateLabel(report.lastSyncedAt.slice(0, 10))}.</span>
            ) : null}
          </p>
          {report.source === 'empty' ? (
            <div className="mt-4">
              <DataGapInline
                detail="no social signals yet — awaiting the salestrig-studio → Supabase sync"
                owner={ownerFor('channel')}
              />
            </div>
          ) : null}
        </div>
      </Card>

      {report.channels.map((ch) => (
        <SocialChannelCard key={ch.channel} ch={ch} />
      ))}

      {report.source === 'live' ? (
        <Takeaway>
          For a clinic, the Google Business signals — <strong>phone calls</strong> and <strong>direction
          requests</strong> — are the closest social/local signal to an actual booking; the Meta &amp; TikTok
          figures are brand reach. These are organic; paid campaign performance stays on the Marketing tab.
        </Takeaway>
      ) : null}
    </div>
  );
}

function SocialChannelCard({ ch }: { ch: SocialChannel }) {
  const kpis: KpiItem[] = ch.metrics.map((m) => ({
    label: m.label,
    value: int(m.value),
    hint: m.isStock ? 'latest' : 'total in period',
  }));

  // Primary flow metric → a trend line (reach/views/calls, whichever is biggest).
  const primary = ch.metrics.find((m) => !m.isStock);
  const trendData = primary?.trend.map((t) => ({ date: t.date, value: t.value })) ?? [];
  const series: TrendSeries[] = [
    { key: 'value', label: primary?.label ?? 'Value', color: TOKENS.accent, kind: 'area', axis: 'left', valueFormat: 'int' },
  ];

  return (
    <Card>
      <SectionHeader
        eyebrow="Channel"
        title={ch.label}
        right={
          <span className="text-[11px] text-ink-faint">
            {ch.integration ? `${ch.integration} · ` : ''}
            {ch.lastDay ? dubaiDateLabel(ch.lastDay) : ''}
          </span>
        }
      />
      <div className="px-5 pb-5 pt-4">
        {kpis.length > 0 ? <KpiBand items={kpis} /> : null}
        {trendData.length > 1 ? (
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-faint">{primary?.label} over time</p>
            <TrendChart data={trendData} series={series} leftFormat="int" />
            <ChartLegend items={[{ label: primary?.label ?? 'Value', color: TOKENS.accent }]} />
          </div>
        ) : null}
      </div>
    </Card>
  );
}
