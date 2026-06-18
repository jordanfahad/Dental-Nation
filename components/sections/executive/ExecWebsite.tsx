import type { ExecutiveReport } from '@/lib/executive/types';
import { Card, SectionHeader } from '@/components/ui/Card';
import { Donut, type BarDatum } from '@/components/charts/Charts';
import { FunnelViz, type FunnelStageViz } from '@/components/charts/FunnelViz';
import { DataGapInline } from '@/components/ui/DataGap';
import { ownerFor } from '@/config/data-gap-owners';
import { StatCard, fmtInt, fmtPct } from './parts';

/**
 * Website analytics (GA4). Sessions / users / conversions stat cards, a channel
 * donut (sessions), and the on-site booking funnel. Renders a single owned data
 * gap when GA4 is not connected — never an empty grid of zeros.
 */
export function ExecWebsite({ report }: { report: ExecutiveReport }) {
  const { ga4 } = report;

  if (!ga4 || (ga4.sessions.value ?? 0) === 0) {
    return (
      <Card>
        <SectionHeader eyebrow="Executive dashboard · website" title="Website analytics (GA4)" />
        <div className="px-5 pb-5 pt-4">
          <DataGapInline
            detail={ga4?.note ?? 'GA4 not connected'}
            owner={ownerFor('tracking')}
          />
        </div>
      </Card>
    );
  }

  const sessions = ga4.sessions.value ?? 0;
  const conversions = ga4.conversions.value ?? 0;
  const convRate = sessions > 0 ? conversions / sessions : null;

  const channelData: BarDatum[] = ga4.channels
    .map((c) => ({ label: c.channel, value: c.sessions }))
    .filter((c) => c.value > 0);

  const funnel: FunnelStageViz[] = ga4.onsite_funnel.map((s) => ({ label: s.label, value: s.count }));

  return (
    <Card>
      <SectionHeader
        eyebrow="Executive dashboard · website"
        title="How the website performs"
        right={
          ga4.fellBack ? (
            <span className="text-[10.5px] text-ink-faint">stored summary</span>
          ) : undefined
        }
      />
      <div className="px-5 pb-5 pt-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Sessions" value={fmtInt(sessions)} hint="GA4, all-time" tone="accent" />
          <StatCard label="Users" value={fmtInt(ga4.users.value)} hint="unique visitors" />
          <StatCard label="Conversions" value={fmtInt(conversions)} hint="GA4 events" tone="good" />
          <StatCard
            label="Conversion rate"
            value={fmtPct(convRate)}
            hint="conversions ÷ sessions"
          />
        </div>

        <div className="mt-5 grid gap-x-8 gap-y-5 md:grid-cols-2">
          <div>
            <p className="mb-3 text-[12px] font-medium text-ink">Traffic by channel</p>
            {channelData.length === 0 ? (
              <DataGapInline detail="no channel breakdown in GA4" owner={ownerFor('tracking')} />
            ) : (
              <Donut data={channelData} valueFormat="int" centerLabel="sessions" height={180} />
            )}
          </div>
          <div>
            <p className="mb-3 text-[12px] font-medium text-ink">On-site booking funnel</p>
            {funnel.length === 0 ? (
              <DataGapInline detail="no on-site funnel events configured" owner={ownerFor('tracking')} />
            ) : (
              <FunnelViz stages={funnel} />
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
