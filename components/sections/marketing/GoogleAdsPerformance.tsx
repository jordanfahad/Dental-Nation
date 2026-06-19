import { getGoogleAdsDetail } from '@/lib/sync/adapters/google-ads-adapter';
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
    t === 'ENABLED' ? 'bg-good/10 text-good'
    : t === 'PAUSED' ? 'bg-watch/10 text-watch'
    : t === 'REMOVED' ? 'bg-stop/10 text-stop'
    : 'bg-na/10 text-ink-faint';
  return <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${tone}`}>{clean(text)}</span>;
}

const th = 'py-2 px-2 text-[10.5px] font-medium uppercase tracking-wide text-ink-faint';
const td = 'py-2 px-2 text-[12px] text-ink';
const num = 'py-2 px-2 text-right text-[12px] tabular-nums text-ink-soft';

/**
 * Google Ads Performance — the campaign → ad group → ad (with responsive-search
 * assets) deep dive. Live from the Google Ads API; aggregated over the window.
 * Honest: any API issue degrades to an owned data gap, never a fabricated zero.
 */
export async function GoogleAdsPerformance() {
  const r = await getGoogleAdsDetail();

  if (!r.available) {
    return (
      <Card>
        <SectionHeader tag="G" eyebrow="Google Ads · live" title="Google Ads Performance" />
        <div className="px-5 pb-5 pt-4">
          <DataGapInline detail={r.note ?? 'Google Ads detail unavailable'} owner={ownerFor('spend')} />
        </div>
      </Card>
    );
  }

  const ctr = r.totals.impressions > 0 ? r.totals.clicks / r.totals.impressions : 0;
  const cpc = r.totals.clicks > 0 ? r.totals.cost / r.totals.clicks : 0;
  const cpConv = r.totals.conversions > 0 ? r.totals.cost / r.totals.conversions : 0;
  const period = r.period ? `${dubaiDateLabel(r.period.from)} → ${dubaiDateLabel(r.period.to)}` : '';

  const kpis: KpiItem[] = [
    { label: 'Spend', value: aed(r.totals.cost), hint: `${r.campaigns.length} campaigns` },
    { label: 'Impressions', value: int(r.totals.impressions) },
    { label: 'Clicks', value: int(r.totals.clicks), hint: `${pct(ctr)} CTR` },
    { label: 'Avg CPC', value: aed(cpc), goodWhenUp: false },
    { label: 'Conversions', value: int(r.totals.conversions), hint: 'Google-tracked' },
    { label: 'Cost / conv.', value: r.totals.conversions > 0 ? aed(cpConv) : null, goodWhenUp: false, gapDetail: 'no conversions in window', gapOwner: ownerFor('attribution') },
  ];

  const ads = r.ads.slice(0, 30);

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader
          tag="G" eyebrow="Google Ads · live" title="Google Ads Performance"
          right={<span className="text-[11px] text-ink-faint">{period}</span>}
        />
        <div className="px-5 pb-5 pt-4">
          <p className="text-[12.5px] leading-snug text-ink-soft">
            Live from the Google Ads API — every campaign, ad group and ad (with its responsive-search
            headlines &amp; descriptions) with spend, impressions, clicks and Google-tracked
            conversions. Conversions are Google&apos;s own count; cross-check against the GA4 and tracker
            lenses on the Overview.
          </p>
        </div>
      </Card>

      <Card>
        <SectionHeader tag="G1" eyebrow="Scorecard" title="Account totals" />
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
        <SectionHeader tag="G2" eyebrow="Campaigns" title="Campaigns" />
        <div className="px-5 pb-5 pt-4 overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="border-b border-line">
              <th className={th}>Campaign</th><th className={th}>Type</th><th className={th}>Status</th>
              <th className={`${th} text-right`}>Daily budget</th><th className={`${th} text-right`}>Spend</th>
              <th className={`${th} text-right`}>Impr.</th><th className={`${th} text-right`}>Clicks</th>
              <th className={`${th} text-right`}>Conv.</th>
            </tr></thead>
            <tbody>
              {r.campaigns.map((c) => (
                <tr key={c.id} className="border-b border-line/60 last:border-0">
                  <td className={td}><span className="block max-w-[260px] truncate" title={c.name}>{c.name}</span></td>
                  <td className={td}><span className="text-[11px] text-ink-soft">{clean(c.channelType)}</span></td>
                  <td className={td}><Pill text={c.status} /></td>
                  <td className={num}>{c.dailyBudget != null ? aed(c.dailyBudget) : '—'}</td>
                  <td className={`${num} font-medium text-ink`}>{aed(c.cost)}</td>
                  <td className={num}>{int(c.impressions)}</td>
                  <td className={num}>{int(c.clicks)}</td>
                  <td className={num}>{int(c.conversions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <SectionHeader tag="G3" eyebrow="Ad groups" title={`Ad groups (${r.adGroups.length})`} />
        <div className="px-5 pb-5 pt-4 overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="border-b border-line">
              <th className={th}>Ad group</th><th className={th}>Campaign</th><th className={th}>Status</th>
              <th className={`${th} text-right`}>Spend</th><th className={`${th} text-right`}>Impr.</th>
              <th className={`${th} text-right`}>Clicks</th><th className={`${th} text-right`}>Conv.</th>
            </tr></thead>
            <tbody>
              {r.adGroups.slice(0, 60).map((g) => (
                <tr key={g.id} className="border-b border-line/60 last:border-0">
                  <td className={td}><span className="block max-w-[220px] truncate" title={g.name}>{g.name}</span></td>
                  <td className={td}><span className="block max-w-[200px] truncate text-[11px] text-ink-soft" title={g.campaign}>{g.campaign}</span></td>
                  <td className={td}><Pill text={g.status} /></td>
                  <td className={`${num} font-medium text-ink`}>{aed(g.cost)}</td>
                  <td className={num}>{int(g.impressions)}</td>
                  <td className={num}>{int(g.clicks)}</td>
                  <td className={num}>{int(g.conversions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <SectionHeader tag="G4" eyebrow="Ads & assets" title={`Top ads (${ads.length} of ${r.ads.length})`} />
        <div className="px-5 pb-5 pt-4 space-y-3">
          {ads.map((a) => (
            <div key={a.id} className="rounded-card border border-line p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-ink-soft">{clean(a.type)}</span>
                  <Pill text={a.status} />
                  {a.strength ? <span className="rounded bg-accent/8 px-1.5 py-0.5 text-[10px] font-medium text-accent">Strength: {clean(a.strength)}</span> : null}
                </div>
                <div className="flex items-center gap-3 text-[11.5px] tabular-nums text-ink-soft">
                  <span className="font-medium text-ink">{aed(a.cost)}</span>
                  <span>{int(a.impressions)} impr</span>
                  <span>{int(a.clicks)} clicks</span>
                  <span>{int(a.conversions)} conv</span>
                </div>
              </div>
              <p className="mt-1 text-[10.5px] text-ink-faint truncate" title={`${a.campaign} › ${a.adGroup}`}>{a.campaign} › {a.adGroup}</p>
              {a.headlines.length > 0 ? (
                <div className="mt-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">Headlines</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {a.headlines.slice(0, 8).map((h, i) => (
                      <span key={i} className="rounded bg-na/8 px-1.5 py-0.5 text-[11px] text-ink-soft">{h}</span>
                    ))}
                  </div>
                </div>
              ) : null}
              {a.descriptions.length > 0 ? (
                <div className="mt-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">Descriptions</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {a.descriptions.slice(0, 4).map((d, i) => (
                      <span key={i} className="rounded bg-na/8 px-1.5 py-0.5 text-[11px] text-ink-soft">{d}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
          <Takeaway>
            Ad &ldquo;assets&rdquo; are the responsive-search headlines and descriptions Google rotates;
            ad strength flags creatives that need more variety. Pair low-strength, high-spend ads with
            the conversion column to spot budget going to weak creative.
          </Takeaway>
        </div>
      </Card>
    </div>
  );
}
