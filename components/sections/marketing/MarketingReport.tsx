import { getMarketingReport } from '@/lib/marketing/report';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import {
  ChartLegend,
  Donut,
  TOKENS,
  TrendChart,
  type BarDatum,
  type TrendSeries,
} from '@/components/charts/Charts';
import { FunnelViz, type FunnelStageViz } from '@/components/charts/FunnelViz';
import { ownerFor } from '@/config/data-gap-owners';
import { dubaiDateLabel } from '@/lib/dates';

const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`;
const int = (n: number) => Math.round(n).toLocaleString('en-US');
const pct = (n: number) => `${Math.round(n * 100)}%`;

const periodLabel = (p: { from: string | null; to: string | null }): string => {
  if (!p.from || !p.to) return 'no coverage yet';
  return `${dubaiDateLabel(p.from)} → ${dubaiDateLabel(p.to)}`;
};

/**
 * Marketing Performance tab — the recalibrated spend → reported leads → tracked
 * leads → leakage view. Ties LIVE Meta + Google ad spend (platform-reported
 * conversions, incl. click-to-WhatsApp + Google calls) to the in-house lead
 * tracker.
 *
 * Honest by construction (CLAUDE.md §15): these are DISTINCT populations — there
 * is no campaign-level attribution yet, so the comparison is directional, not
 * 1:1. Empty source → calm owned data gap; null derived metrics → honest gap
 * cards, never a fabricated zero.
 */
export async function MarketingReport() {
  const report = await getMarketingReport();
  const { source, platforms, totals, monthly, topCampaigns, trackedByChannel } = report;

  const meta = platforms.find((p) => p.platform === 'Meta');
  const google = platforms.find((p) => p.platform === 'Google');

  const metaPeriod = periodLabel(report.metaPeriod);
  const googlePeriod = periodLabel(report.googlePeriod);

  if (source === 'empty') {
    return (
      <div className="space-y-5">
        <Card>
          <SectionHeader
            tag="M"
            eyebrow="Live ad spend · Marketing"
            title="Marketing Performance — live ad spend vs tracked leads"
          />
          <div className="px-5 pb-5 pt-4">
            <p className="text-[12.5px] leading-snug text-ink-soft">
              Ties live Meta + Google ad spend (platform-reported conversions, including
              click-to-WhatsApp and Google calls) to the in-house lead tracker — surfacing the
              attribution leakage between the two. These are distinct populations, so the
              comparison is directional, not 1:1.
            </p>
            <div className="mt-4">
              <DataGapInline detail="ad-platform data not yet synced" owner={ownerFor('spend')} />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // --- KPI band ---
  const kpis: KpiItem[] = [
    {
      label: 'Total ad spend',
      value: aed(totals.adSpend),
      hint: 'Meta + Google',
    },
    {
      label: 'Meta spend',
      value: meta ? aed(meta.spend) : null,
      gapDetail: 'no Meta insight rows synced',
      gapOwner: ownerFor('spend'),
    },
    {
      label: 'Google spend',
      value: google ? aed(google.spend) : null,
      gapDetail: 'no Google Ads insight rows synced',
      gapOwner: ownerFor('spend'),
    },
    {
      label: 'Platform-reported leads',
      value: int(totals.reportedLeads),
      hint: 'incl. click-to-WhatsApp + calls',
    },
    {
      label: 'Tracked leads',
      value: int(totals.trackedLeads),
      hint: 'logged in tracker',
    },
    {
      label: 'Cost per tracked lead',
      value: totals.costPerTracked != null ? aed(totals.costPerTracked) : null,
      goodWhenUp: false,
      gapDetail: 'no tracked leads to divide spend by',
      gapOwner: ownerFor('attribution'),
    },
  ];

  // --- Spend by platform donut ---
  const spendByPlatform: BarDatum[] = [
    { label: 'Meta', value: meta?.spend ?? 0, color: TOKENS.accent },
    { label: 'Google', value: google?.spend ?? 0, color: TOKENS.accent400 },
  ];

  // --- Reconciliation funnel ---
  const funnel: FunnelStageViz[] = [
    { label: 'Ad spend (AED)', value: Math.round(totals.adSpend) },
    { label: 'Platform-reported leads', value: totals.reportedLeads },
    { label: 'Tracked leads (in-house)', value: totals.trackedLeads },
  ];

  // --- Monthly trend ---
  const trendData = monthly.map((m) => ({
    date: `${m.month}-01`,
    spend: Math.round(m.spend),
    reportedLeads: m.reportedLeads,
    trackedLeads: m.trackedLeads,
  }));
  const trendSeries: TrendSeries[] = [
    { key: 'spend', label: 'Ad spend (AED)', color: TOKENS.accent400, kind: 'bar', axis: 'right', valueFormat: 'aed' },
    { key: 'reportedLeads', label: 'Platform-reported leads', color: TOKENS.accent, kind: 'area', axis: 'left', valueFormat: 'int' },
    { key: 'trackedLeads', label: 'Tracked leads', color: TOKENS.good, kind: 'line', axis: 'left', valueFormat: 'int' },
  ];

  // --- Tracked by channel donut ---
  const channelData: BarDatum[] = trackedByChannel.map((c) => ({ label: c.label, value: c.value }));

  const sharePctText = totals.trackedShare != null ? pct(totals.trackedShare) : null;

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader
          tag="M"
          eyebrow="Live ad spend · Marketing"
          title="Marketing Performance — live ad spend vs tracked leads"
          right={
            <span className="text-right text-[11px] text-ink-faint">
              <span className="block">Meta: {metaPeriod}</span>
              <span className="block">Google: {googlePeriod}</span>
            </span>
          }
        />
        <div className="px-5 pb-5 pt-4">
          <p className="text-[12.5px] leading-snug text-ink-soft">
            This view ties live Meta + Google ad spend to the in-house lead tracker. The two are{' '}
            <span className="font-medium text-ink">distinct populations</span>:
            platform-reported leads are platform-attributed conversions (incl. click-to-WhatsApp on
            Meta and calls on Google), while tracked leads are records logged in the in-house
            tracker. There is no campaign-level attribution yet, so the comparison is{' '}
            <span className="font-medium text-ink">directional, not 1:1</span>.
          </p>
        </div>
      </Card>

      <Card>
        <SectionHeader tag="M1" eyebrow="Scorecard" title="Spend & leads at a glance" />
        <div className="px-5 pb-5 pt-4">
          <KpiBand items={kpis} />
        </div>
      </Card>

      <Card>
        <SectionHeader tag="M2" eyebrow="Mix" title="Spend by platform" />
        <div className="px-5 pb-5 pt-4">
          <Donut data={spendByPlatform} valueFormat="aed" centerLabel="ad spend" height={200} />
        </div>
      </Card>

      <Card>
        <SectionHeader tag="M3" eyebrow="Reconciliation" title="Spend → reported leads → tracked leads" />
        <div className="px-5 pb-5 pt-4">
          <FunnelViz stages={funnel} />
          <div className="mt-5 rounded-card border border-watch/30 bg-watch/5 p-4">
            <p className="text-[10.5px] font-medium uppercase tracking-wide text-watch">Attribution leakage</p>
            {sharePctText != null ? (
              <p className="mt-1.5 text-[13px] leading-snug text-ink">
                Only{' '}
                <span className="text-[18px] font-semibold tabular-nums text-ink">{sharePctText}</span>{' '}
                of platform-reported leads are logged in the in-house tracker
                {totals.leakageAbs != null ? (
                  <>
                    {' '}— a gap of{' '}
                    <span className="font-semibold tabular-nums">
                      {int(Math.abs(totals.leakageAbs))}
                    </span>{' '}
                    {totals.leakageAbs < 0 ? 'leads the platforms claim but the tracker never sees' : 'tracked leads beyond what the platforms report'}.
                  </>
                ) : (
                  '.'
                )}
              </p>
            ) : (
              <p className="mt-1.5">
                <DataGapInline
                  detail="no platform-reported leads to reconcile against the tracker"
                  owner={ownerFor('attribution')}
                />
              </p>
            )}
          </div>
          <Takeaway>
            This gap is the attribution problem, not necessarily lost demand: platform-reported and
            tracked leads are counted differently and can&apos;t be matched 1:1 today. Closing it —
            and unlocking per-campaign ROI — requires UTM/source tagging on every inbound lead so
            platform spend can be tied to tracked records (owner: {ownerFor('attribution')}).
          </Takeaway>
        </div>
      </Card>

      <Card>
        <SectionHeader tag="M4" eyebrow="Monthly" title="Spend vs reported & tracked leads over time" />
        <div className="px-5 pb-5 pt-4">
          {trendData.length === 0 ? (
            <DataGapInline detail="no dated spend/lead activity to chart" owner={ownerFor('spend')} />
          ) : (
            <>
              <TrendChart data={trendData} series={trendSeries} leftFormat="int" rightFormat="aed" />
              <ChartLegend
                items={[
                  { label: 'Ad spend (AED)', color: TOKENS.accent400 },
                  { label: 'Platform-reported leads', color: TOKENS.accent },
                  { label: 'Tracked leads', color: TOKENS.good },
                ]}
              />
            </>
          )}
        </div>
      </Card>

      <Card>
        <SectionHeader tag="M5" eyebrow="Detail" title="Top campaigns by spend" />
        <div className="px-5 pb-5 pt-4">
          {topCampaigns.length === 0 ? (
            <DataGapInline detail="no campaign rows in the synced window" owner={ownerFor('spend')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-faint">
                    <th className="py-2 pr-3 font-medium">Platform</th>
                    <th className="py-2 pr-3 font-medium">Campaign</th>
                    <th className="py-2 pl-3 text-right font-medium">Spend</th>
                    <th className="py-2 pl-3 text-right font-medium">Reported leads</th>
                    <th className="py-2 pl-3 text-right font-medium">Cost / reported</th>
                  </tr>
                </thead>
                <tbody>
                  {topCampaigns.map((c, i) => (
                    <tr key={`${c.platform}-${c.campaign}-${i}`} className="border-b border-line/60 last:border-0">
                      <td className="py-2 pr-3">
                        <span
                          className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10.5px] font-medium"
                          style={
                            c.platform === 'Meta'
                              ? { background: `${TOKENS.accent}14`, color: TOKENS.accent }
                              : { background: `${TOKENS.accent400}1F`, color: TOKENS.accent600 }
                          }
                        >
                          {c.platform}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-ink" title={c.campaign}>
                        <span className="block max-w-[280px] truncate">{c.campaign}</span>
                      </td>
                      <td className="py-2 pl-3 text-right tabular-nums text-ink">{aed(c.spend)}</td>
                      <td className="py-2 pl-3 text-right tabular-nums text-ink-soft">{int(c.reportedLeads)}</td>
                      <td className="py-2 pl-3 text-right tabular-nums text-ink-soft">
                        {c.costPerReported != null ? aed(c.costPerReported) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <SectionHeader tag="M6" eyebrow="Context" title="Tracked leads by channel" />
        <div className="px-5 pb-5 pt-4">
          {channelData.length === 0 ? (
            <DataGapInline detail="no channel-attributed tracker rows" owner={ownerFor('channel')} />
          ) : (
            <>
              <Donut data={channelData} valueFormat="int" centerLabel="tracked" height={200} />
              <Takeaway>
                Where in-house tracked leads actually originate (WhatsApp, ZAVIS, and others) — the
                denominator context for the leakage above. Ad platforms can&apos;t see most of these
                without source tagging.
              </Takeaway>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
