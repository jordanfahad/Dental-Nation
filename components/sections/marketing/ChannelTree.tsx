import { getMarketingReport } from '@/lib/marketing/report';
import { getArabyAdsReport } from '@/lib/arabyads/report';
import { ChannelTreeView } from './ChannelTreeView';

/**
 * Server shell for the marketing channel tree: ONE parallel fetch of the two
 * reports, then everything — cards, drilldowns, group toggle — runs as client
 * state inside ChannelTreeView, so exploring the tree never re-hits the
 * ad platforms, GA4 or the affiliate feed. ?mchan / ?mgrp still deep-link.
 */
export async function ChannelTree({ range, grp, chan }: { range: { from: string; to: string }; grp?: string; chan?: string }) {
  const [mktRes, arabyRes] = await Promise.allSettled([getMarketingReport(), getArabyAdsReport(range)]);
  const mkt = mktRes.status === 'fulfilled' ? mktRes.value : null;
  const araby = arabyRes.status === 'fulfilled' ? arabyRes.value : null;
  if (!mkt) {
    return (
      <p className="rounded-lg px-3 py-2 text-[11px] font-medium leading-snug" style={{ backgroundColor: '#FBEFEC', color: '#B45F53' }}>
        Marketing report unavailable — owner: Acquisition.
      </p>
    );
  }
  return (
    <ChannelTreeView
      mkt={mkt}
      araby={araby}
      rangeQs={`&from=${range.from}&to=${range.to}&preset=custom`}
      initialChan={chan}
      initialGroup={grp === 'offline' ? 'offline' : 'online'}
    />
  );
}
