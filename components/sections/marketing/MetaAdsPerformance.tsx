import { getMetaAdsDetail } from '@/lib/meta/detail';
import { Card, SectionHeader } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import { ownerFor } from '@/config/data-gap-owners';
import { dubaiDateLabel } from '@/lib/dates';
import { MetaAdsView } from './MetaAdsView';

const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`;
const int = (n: number) => Math.round(n).toLocaleString('en-US');
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

/**
 * Meta Ads Performance — the campaign → ad set (budgets + targeting) → ad
 * (creative assets) deep dive. Live from the Meta Marketing API; metrics joined
 * from /insights per level. Honest: API issues degrade to an owned data gap.
 * The account slicing (ALL entities + status/campaign/date filters) lives in
 * the client MetaAdsView so filtering is instant.
 */
export async function MetaAdsPerformance({ range }: { range?: { from: string; to: string } } = {}) {
  const r = await getMetaAdsDetail(range ?? {});

  if (!r.available) {
    return (
      <Card>
        <SectionHeader tag="M" eyebrow="Meta Ads · live" title="Meta Ads Performance" />
        <div className="px-5 pb-5 pt-4">
          <DataGapInline detail={r.note ?? 'Meta Ads detail unavailable'} owner={ownerFor('spend')} />
        </div>
      </Card>
    );
  }

  const ctr = r.totals.impressions > 0 ? r.totals.clicks / r.totals.impressions : 0;
  const cpl = r.totals.leads > 0 ? r.totals.spend / r.totals.leads : 0;
  const period = r.period ? `${dubaiDateLabel(r.period.from)} → ${dubaiDateLabel(r.period.to)}` : '';

  const kpis: KpiItem[] = [
    { label: 'Spend', value: aed(r.totals.spend), hint: `${r.campaigns.length} campaigns` },
    { label: 'Impressions', value: int(r.totals.impressions) },
    { label: 'Clicks', value: int(r.totals.clicks), hint: `${pct(ctr)} CTR` },
    { label: 'Leads', value: int(r.totals.leads), hint: 'Meta-reported · incl. click-to-WhatsApp · not deduped' },
    { label: 'Cost / lead', value: r.totals.leads > 0 ? aed(cpl) : null, goodWhenUp: false, hint: 'platform CPL — net funnel costs live on the Growth Platform', gapDetail: 'no leads in window', gapOwner: ownerFor('attribution') },
    { label: 'Ad sets', value: int(r.adSets.length), hint: `${r.ads.length} ads` },
  ];

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader
          tag="M" eyebrow="Meta Ads · live" title="Meta Ads Performance"
          right={<span className="text-[11px] text-ink-faint">{period}</span>}
        />
        <div className="px-5 pb-5 pt-4">
          <p className="text-[12.5px] leading-snug text-ink-soft">
            Live from the Meta Marketing API — campaigns, ad sets (with budgets &amp; targeting) and ads
            (with creative assets), plus spend, impressions, clicks and leads. Leads include
            click-to-WhatsApp / messaging conversations, so they read higher than form-only leads.
          </p>
        </div>
      </Card>

      <Card>
        <SectionHeader tag="M1" eyebrow="Scorecard" title="Account totals" />
        <div className="px-5 pb-5 pt-4">
          <KpiBand items={kpis} />
          <p className="mt-3 text-[11px] leading-snug text-ink-faint">
            Pulled live from the API now, across currently-active campaigns — so this total can run a
            few % under the Marketing Overview&apos;s hourly-synced spend (which also retains
            closed/deleted campaigns). The Overview remains the authoritative all-in figure.
          </p>
        </div>
      </Card>

      <MetaAdsView r={r} range={range} />
    </div>
  );
}
