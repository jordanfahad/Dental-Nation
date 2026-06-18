import { getReportView } from '@/lib/data';
import type { Blocker, ChannelStatus } from '@/lib/types';
import { CANONICAL_CHANNELS } from '@/config/channels';
import { ExecSummaryTable } from '@/components/sections/daily/ExecSummaryTable';
import { ChannelActivation } from '@/components/sections/ChannelActivation';
import { TrackingIntegrity } from '@/components/sections/TrackingIntegrity';
import { FunnelTable } from '@/components/sections/daily/FunnelTable';
import { ContentPerformance } from '@/components/sections/ContentPerformance';
import { PacFeedbackGaps } from '@/components/sections/daily/PacFeedbackGaps';
import { BlockersFixes } from '@/components/sections/BlockersFixes';

const IMPACT_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

/** Merge real channel_status rows over the canonical 28-channel list so EVERY
 *  channel renders. Channels with no row are shown as "not live yet". */
function fullChannelGrid(rows: ChannelStatus[]): ChannelStatus[] {
  const byName = new Map(rows.map((r) => [r.channel, r]));
  return CANONICAL_CHANNELS.map((channel) => {
    const row = byName.get(channel);
    if (row) return row;
    return {
      channel,
      is_live: false,
      content_populated: false,
      cta_correct: false,
      destination_correct: false,
      tracking_active: false,
      owner: null,
      blocker: 'not live yet',
    };
  });
}

/** The top open high-impact blocker drives §A's "next fix" owner/due/action. */
function topOpenBlocker(blockers: Blocker[]): Blocker | null {
  const open = blockers.filter((b) => b.status !== 'done');
  open.sort((a, b) => (IMPACT_RANK[a.impact ?? 'low'] ?? 3) - (IMPACT_RANK[b.impact ?? 'low'] ?? 3));
  return open[0] ?? null;
}

/**
 * The canonical Daily Control Report (§A–G), rendered in order from the real
 * ReportView for the selected report date. A server component: it reads the data
 * layer directly. Sections with no real source render honest, owned data gaps.
 */
export async function DailyControlReport({ reportDate }: { reportDate?: string }) {
  const view = await getReportView(reportDate);
  const channels = fullChannelGrid(view.channels);
  const topBlocker = topOpenBlocker(view.blockers);

  return (
    <div className="space-y-5">
      <ExecSummaryTable view={view} topBlocker={topBlocker} />
      <ChannelActivation channels={channels} />
      <TrackingIntegrity view={view} />
      <FunnelTable view={view} />
      <ContentPerformance content={view.content} />
      <PacFeedbackGaps />
      <BlockersFixes blockers={view.blockers} />
    </div>
  );
}
