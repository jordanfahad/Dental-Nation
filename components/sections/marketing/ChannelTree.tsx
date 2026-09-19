import { getMarketingReport } from '@/lib/marketing/report';
import { getArabyAdsReport } from '@/lib/arabyads/report';
import { getSocialReport } from '@/lib/social/report';
import { getDigitalSeo } from '@/lib/analytics/digital';
import { ChannelTreeView, type SeoLite, type SocialLite } from './ChannelTreeView';

/**
 * Server shell for the marketing channel tree: ONE parallel fetch of the two
 * reports, then everything — cards, drilldowns, group toggle — runs as client
 * state inside ChannelTreeView, so exploring the tree never re-hits the
 * ad platforms, GA4 or the affiliate feed. ?mchan / ?mgrp still deep-link.
 */
export async function ChannelTree({ range, grp, chan }: { range: { from: string; to: string }; grp?: string; chan?: string }) {
  const [mktRes, arabyRes, socialRes, seoRes] = await Promise.allSettled([
    getMarketingReport(range),
    getArabyAdsReport(range),
    getSocialReport(range),
    getDigitalSeo(range),
  ]);
  const mkt = mktRes.status === 'fulfilled' ? mktRes.value : null;
  const araby = arabyRes.status === 'fulfilled' ? arabyRes.value : null;
  // Compact, serializable social snapshot so the Social drilldown carries the
  // Social & Local tab's headline numbers instead of only linking out.
  const socialRep = socialRes.status === 'fulfilled' ? socialRes.value : null;
  const social: SocialLite | null =
    socialRep && socialRep.source === 'live' && socialRep.channels.length > 0
      ? {
          channels: socialRep.channels.map((c) => ({
            label: c.label,
            lastDay: c.lastDay,
            metrics: c.metrics.slice(0, 4).map((m) => ({ label: m.label, value: m.value, isStock: m.isStock })),
          })),
        }
      : null;
  // Compact SEO snapshot: organic traffic + Search Console reality for the
  // window, so the SEO drilldown shows the Digital & SEO numbers in place.
  const seoRep = seoRes.status === 'fulfilled' ? seoRes.value : null;
  const seo: SeoLite | null = seoRep
    ? {
        organicSessions: seoRep.ga4Available ? seoRep.organicSessions : null,
        pagesIndexed: seoRep.pagesIndexed ?? seoRep.search?.pagesIndexed ?? null,
        gsc: seoRep.search?.available
          ? {
              clicks: seoRep.search.clicks,
              impressions: seoRep.search.impressions,
              ctr: seoRep.search.ctr,
              position: seoRep.search.position,
              topQueries: seoRep.search.topQueries.slice(0, 5).map((q) => ({ query: q.query, clicks: q.clicks, position: q.position })),
            }
          : null,
      }
    : null;
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
      social={social}
      seo={seo}
      rangeQs={`&from=${range.from}&to=${range.to}&preset=custom`}
      initialChan={chan}
      initialGroup={grp === 'offline' ? 'offline' : 'online'}
    />
  );
}
