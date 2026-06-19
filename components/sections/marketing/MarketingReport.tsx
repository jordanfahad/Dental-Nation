import { getMarketingReport } from '@/lib/marketing/report';
import { MarketingSubNav } from './MarketingSubNav';
import { resolveMarketingSub } from './subtabs';
import { GoogleAdsPerformance } from './GoogleAdsPerformance';
import { MetaAdsPerformance } from './MetaAdsPerformance';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import {
  ChartLegend,
  Donut,
  HBarChart,
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

/** Distinct colour for the GA4 (site-tagged) lens — kept apart from the navy
 *  platform palette and the green tracker so the three lenses read as separate. */
const GA4_COLOR = '#6D28D9';

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
/**
 * Marketing tab dispatcher — renders the sub-nav (Overview · Google Ads · Meta
 * Ads) and the active sub-section. Only the chosen section's data is fetched.
 */
export async function MarketingReport({ sub }: { sub?: string }) {
  const active = resolveMarketingSub(sub);
  return (
    <div className="space-y-5">
      <MarketingSubNav active={active} />
      {active === 'google' ? (
        <GoogleAdsPerformance />
      ) : active === 'meta' ? (
        <MetaAdsPerformance />
      ) : (
        <MarketingOverview />
      )}
    </div>
  );
}

async function MarketingOverview() {
  const report = await getMarketingReport();
  const { source, platforms, totals, monthly, topCampaigns, trackedByChannel, ga4 } = report;

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
      label: 'GA4 site leads',
      value: ga4.available ? int(ga4.totalLeads) : null,
      hint: 'independent · site-tagged',
      gapDetail: ga4.note ?? 'GA4 lead lens unavailable',
      gapOwner: ownerFor('channel'),
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
    ga4Leads: m.ga4Leads,
    trackedLeads: m.trackedLeads,
  }));
  const trendSeries: TrendSeries[] = [
    { key: 'spend', label: 'Ad spend (AED)', color: TOKENS.accent400, kind: 'bar', axis: 'right', valueFormat: 'aed' },
    { key: 'reportedLeads', label: 'Platform-reported leads', color: TOKENS.accent, kind: 'area', axis: 'left', valueFormat: 'int' },
    ...(ga4.available
      ? [{ key: 'ga4Leads', label: 'GA4 site leads', color: GA4_COLOR, kind: 'line', axis: 'left', valueFormat: 'int' } as TrendSeries]
      : []),
    { key: 'trackedLeads', label: 'Tracked leads', color: TOKENS.good, kind: 'line', axis: 'left', valueFormat: 'int' },
  ];

  // --- Tracked by channel donut ---
  const channelData: BarDatum[] = trackedByChannel.map((c) => ({ label: c.label, value: c.value }));

  const sharePctText = totals.trackedShare != null ? pct(totals.trackedShare) : null;

  // --- GA4 site-tagged lens ---
  const ga4ChannelData: BarDatum[] = ga4.byChannel.map((c) => ({ label: c.channel, value: c.leads }));
  // Three independent lenses on the SAME demand, side-by-side (not nested).
  const lensCompare: BarDatum[] = [
    { label: 'Platform-reported', value: totals.reportedLeads, color: TOKENS.accent, note: 'platforms claim' },
    ...(ga4.available ? [{ label: 'GA4 site-tagged', value: ga4.totalLeads, color: GA4_COLOR, note: 'site truth' }] : []),
    { label: 'Tracked (CRM)', value: totals.trackedLeads, color: TOKENS.good, note: 'logged in-house' },
  ];
  const googleReported = google?.reportedLeads ?? 0;
  const ga4LeadEventsLabel = ga4.events.join(', ');

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
        <SectionHeader
          tag="M3.5"
          eyebrow="Triangulation"
          title="Three lenses on gross leads"
          right={
            ga4.available && ga4.period ? (
              <span className="text-right text-[11px] text-ink-faint">
                GA4: {dubaiDateLabel(ga4.period.from)} → {dubaiDateLabel(ga4.period.to)}
              </span>
            ) : null
          }
        />
        <div className="px-5 pb-5 pt-4">
          <HBarChart data={lensCompare} valueFormat="int" />
          <Takeaway>
            Three <span className="font-medium text-ink">independent counts of the same demand</span>,
            shown side-by-side rather than as a funnel because they are not nested:{' '}
            <span className="font-medium text-ink">platform-reported</span> is what Meta + Google
            claim — and it runs high because the platforms total every configured conversion action
            (calls, form-views, page engagements), not gross leads;{' '}
            <span className="font-medium text-ink">GA4 site-tagged</span> is the website&apos;s own
            first-party lead count (the cleaner gross-lead measure); and{' '}
            <span className="font-medium text-ink">tracked</span> is what the in-house CRM ultimately
            logs. GA4 is added to triangulate — it does not replace or alter the platform/tracker
            numbers above.
          </Takeaway>
        </div>
      </Card>

      <Card>
        <SectionHeader tag="M3.6" eyebrow="GA4 · site truth" title="Gross leads by acquisition channel (GA4)" />
        <div className="px-5 pb-5 pt-4">
          {!ga4.available ? (
            <DataGapInline
              detail={ga4.note ?? 'GA4 lead lens unavailable'}
              owner={ownerFor('channel')}
            />
          ) : ga4ChannelData.length === 0 ? (
            <DataGapInline detail="no GA4 lead events in this window" owner={ownerFor('channel')} />
          ) : (
            <>
              <Donut data={ga4ChannelData} valueFormat="int" centerLabel="site leads" height={200} />
              <div className="mt-5 rounded-card border border-accent/20 bg-accent/5 p-4">
                <p className="text-[10.5px] font-medium uppercase tracking-wide text-accent">
                  Google Ads tracking sanity check
                </p>
                <p className="mt-1.5 text-[13px] leading-snug text-ink">
                  Google Ads reports{' '}
                  <span className="text-[16px] font-semibold tabular-nums">{int(googleReported)}</span>{' '}
                  conversions, while GA4 attributes{' '}
                  <span className="text-[16px] font-semibold tabular-nums text-accent">{int(ga4.paidLeads)}</span>{' '}
                  leads to paid channels (Paid Search, Cross-network, Display).{' '}
                  {googleReported > 0 && ga4.paidLeads > googleReported * 1.15 ? (
                    <>GA4 sees materially more paid leads than Google Ads records — consistent with a{' '}
                      <span className="font-medium">conversion-tracking gap</span> on the Google Ads side.</>
                  ) : googleReported > ga4.paidLeads * 3 ? (
                    <>Google Ads counts many times more &ldquo;conversions&rdquo; than GA4 logs as paid leads —
                      Google Ads totals <span className="font-medium">every configured conversion action</span>{' '}
                      (calls, form-views, page engagements), not gross leads, so it{' '}
                      <span className="font-medium">overstates true lead volume</span>. Treat GA4&apos;s
                      site-tagged count as the cleaner gross-lead measure and the Google Ads number as an
                      upper bound.</>
                  ) : googleReported > ga4.paidLeads * 1.15 ? (
                    <>Google Ads records more conversions than GA4 attributes to paid — likely{' '}
                      <span className="font-medium">view-through / cross-device</span> conversions GA4&apos;s
                      last-click model doesn&apos;t credit to paid.</>
                  ) : (
                    <>The two broadly agree — no obvious paid-channel tracking gap.</>
                  )}
                </p>
              </div>
              <Takeaway>
                This is GA&apos;s own &ldquo;First user primary channel group&rdquo; lead breakdown — the
                same view the CEO sees in Analytics — so the numbers reconcile with the GA UI. Counts
                the lead event{ga4.events.length > 1 ? 's' : ''}{' '}
                <span className="font-medium text-ink">{ga4LeadEventsLabel}</span>; the set is tunable
                in config if ops marks more events as leads (owner: {ownerFor('channel')}).
              </Takeaway>
            </>
          )}
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
                  ...(ga4.available ? [{ label: 'GA4 site leads', color: GA4_COLOR }] : []),
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
