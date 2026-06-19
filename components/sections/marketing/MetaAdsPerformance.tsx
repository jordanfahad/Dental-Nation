import { getMetaAdsDetail } from '@/lib/meta/detail';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import { ownerFor } from '@/config/data-gap-owners';
import { dubaiDateLabel } from '@/lib/dates';

const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`;
const int = (n: number) => Math.round(n).toLocaleString('en-US');
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const clean = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

function Pill({ text }: { text: string }) {
  const t = text.toUpperCase();
  const tone =
    t === 'ACTIVE' ? 'bg-good/10 text-good'
    : t === 'PAUSED' ? 'bg-watch/10 text-watch'
    : t.includes('DISAPPROVED') || t === 'DELETED' || t === 'ARCHIVED' ? 'bg-stop/10 text-stop'
    : 'bg-na/10 text-ink-faint';
  return <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${tone}`}>{clean(text)}</span>;
}

const budget = (daily: number | null, life: number | null) =>
  daily != null ? `${aed(daily)}/day` : life != null ? `${aed(life)} total` : '—';

const th = 'py-2 px-2 text-[10.5px] font-medium uppercase tracking-wide text-ink-faint';
const td = 'py-2 px-2 text-[12px] text-ink';
const num = 'py-2 px-2 text-right text-[12px] tabular-nums text-ink-soft';

/**
 * Meta Ads Performance — the campaign → ad set (budgets + targeting) → ad
 * (creative assets) deep dive. Live from the Meta Marketing API; metrics joined
 * from /insights per level. Honest: API issues degrade to an owned data gap.
 */
export async function MetaAdsPerformance() {
  const r = await getMetaAdsDetail();

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
    { label: 'Leads', value: int(r.totals.leads), hint: 'incl. click-to-WhatsApp' },
    { label: 'Cost / lead', value: r.totals.leads > 0 ? aed(cpl) : null, goodWhenUp: false, gapDetail: 'no leads in window', gapOwner: ownerFor('attribution') },
    { label: 'Ad sets', value: int(r.adSets.length), hint: `${r.ads.length} ads` },
  ];

  const ads = r.ads.slice(0, 24);

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

      <Card>
        <SectionHeader tag="M2" eyebrow="Campaigns" title="Campaigns" />
        <div className="px-5 pb-5 pt-4 overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="border-b border-line">
              <th className={th}>Campaign</th><th className={th}>Objective</th><th className={th}>Status</th>
              <th className={`${th} text-right`}>Budget</th><th className={`${th} text-right`}>Spend</th>
              <th className={`${th} text-right`}>Impr.</th><th className={`${th} text-right`}>Clicks</th>
              <th className={`${th} text-right`}>Leads</th>
            </tr></thead>
            <tbody>
              {r.campaigns.map((c) => (
                <tr key={c.id} className="border-b border-line/60 last:border-0">
                  <td className={td}><span className="block max-w-[240px] truncate" title={c.name}>{c.name}</span></td>
                  <td className={td}><span className="text-[11px] text-ink-soft">{clean(c.objective)}</span></td>
                  <td className={td}><Pill text={c.status} /></td>
                  <td className={num}>{budget(c.dailyBudget, c.lifetimeBudget)}</td>
                  <td className={`${num} font-medium text-ink`}>{aed(c.spend)}</td>
                  <td className={num}>{int(c.impressions)}</td>
                  <td className={num}>{int(c.clicks)}</td>
                  <td className={num}>{int(c.leads)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <SectionHeader tag="M3" eyebrow="Ad sets · targeting & budgets" title={`Ad sets (${r.adSets.length})`} />
        <div className="px-5 pb-5 pt-4 overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="border-b border-line">
              <th className={th}>Ad set</th><th className={th}>Campaign</th><th className={th}>Status</th>
              <th className={`${th} text-right`}>Budget</th><th className={th}>Optimization</th>
              <th className={th}>Targeting</th><th className={`${th} text-right`}>Spend</th>
              <th className={`${th} text-right`}>Leads</th>
            </tr></thead>
            <tbody>
              {r.adSets.slice(0, 60).map((s) => (
                <tr key={s.id} className="border-b border-line/60 last:border-0 align-top">
                  <td className={td}><span className="block max-w-[180px] truncate" title={s.name}>{s.name}</span></td>
                  <td className={td}><span className="block max-w-[160px] truncate text-[11px] text-ink-soft" title={s.campaign}>{s.campaign}</span></td>
                  <td className={td}><Pill text={s.status} /></td>
                  <td className={num}>{budget(s.dailyBudget, s.lifetimeBudget)}</td>
                  <td className={td}><span className="text-[11px] text-ink-soft">{clean(s.optimizationGoal)}</span></td>
                  <td className={`${td} text-[11px] text-ink-soft`}><span className="block max-w-[260px]" title={s.targeting}>{s.targeting}</span></td>
                  <td className={`${num} font-medium text-ink`}>{aed(s.spend)}</td>
                  <td className={num}>{int(s.leads)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <SectionHeader tag="M4" eyebrow="Ads & creative assets" title={`Top ads (${ads.length} of ${r.ads.length})`} />
        <div className="px-5 pb-5 pt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ads.map((a) => (
            <div key={a.id} className="flex gap-3 rounded-card border border-line p-3">
              {a.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- external Meta CDN thumbnail
                <img src={a.thumbnailUrl} alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded object-cover" loading="lazy" />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-na/10 text-[9px] text-ink-faint">no img</div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[12px] font-medium text-ink" title={a.name}>{a.name}</span>
                  <Pill text={a.status} />
                </div>
                {a.creativeTitle ? <p className="mt-0.5 truncate text-[11.5px] text-ink-soft" title={a.creativeTitle}>{a.creativeTitle}</p> : null}
                {a.creativeBody ? <p className="mt-0.5 line-clamp-2 text-[11px] text-ink-faint" title={a.creativeBody}>{a.creativeBody}</p> : null}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] tabular-nums text-ink-soft">
                  <span className="font-medium text-ink">{aed(a.spend)}</span>
                  <span>{int(a.impressions)} impr</span>
                  <span>{int(a.clicks)} clicks</span>
                  <span>{int(a.leads)} leads</span>
                  {a.cta ? <span className="rounded bg-accent/8 px-1.5 py-0.5 text-[10px] font-medium text-accent">{clean(a.cta)}</span> : null}
                </div>
                <p className="mt-1 truncate text-[10px] text-ink-faint" title={`${a.campaign} › ${a.adSet}`}>{a.campaign} › {a.adSet}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 pb-5">
          <Takeaway>
            Each card is one ad&apos;s creative asset (thumbnail, headline, body, CTA) with its spend and
            leads. Read it against the ad-set targeting above to see which audience + creative pairs are
            actually producing leads.
          </Takeaway>
        </div>
      </Card>
    </div>
  );
}
