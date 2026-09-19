'use client';

import { useMemo, useState } from 'react';
import type { MetaAdsDetailReport } from '@/lib/meta/detail';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';

/**
 * Client view for the Meta deep-dive: ALL campaigns, ad sets and ads with
 * instant filters — status (active / inactive), campaign, and date presets.
 * Status + campaign filter locally (zero refetch); a date change re-fetches
 * server-side because the Marketing API aggregates insights per window.
 */

const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`;
const int = (n: number) => Math.round(n).toLocaleString('en-US');
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

type StatusFilter = 'all' | 'active' | 'inactive';

const isActive = (s: string) => s.toUpperCase() === 'ACTIVE';

function FilterPill({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`inline-block rounded-full border px-3 py-1 text-[11.5px] font-medium transition ${
        on ? 'border-accent bg-accent text-white' : 'border-line bg-card text-ink-soft hover:border-accent/40 hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

export function MetaAdsView({ r, range }: { r: MetaAdsDetailReport; range?: { from: string; to: string } }) {
  const [status, setStatus] = useState<StatusFilter>('all');
  const [camp, setCamp] = useState<string>('all');
  // The logical layer: an ad can be ACTIVE inside a paused campaign — this
  // filters ad sets and ads by their PARENT CAMPAIGN's state.
  const [campState, setCampState] = useState<StatusFilter>('all');

  const campaignNames = useMemo(() => r.campaigns.map((c) => c.name), [r.campaigns]);
  const activeCampaignNames = useMemo(
    () => new Set(r.campaigns.filter((c) => isActive(c.status)).map((c) => c.name)),
    [r.campaigns],
  );

  const byStatus = <T extends { status: string }>(rows: T[]) =>
    status === 'all' ? rows : rows.filter((x) => (status === 'active' ? isActive(x.status) : !isActive(x.status)));
  const byCampState = <T extends { campaign: string }>(rows: T[]) =>
    campState === 'all'
      ? rows
      : rows.filter((x) => (campState === 'active' ? activeCampaignNames.has(x.campaign) : !activeCampaignNames.has(x.campaign)));

  const campaigns = byStatus(r.campaigns).filter((c) => camp === 'all' || c.name === camp);
  const adSets = byCampState(byStatus(r.adSets).filter((s) => camp === 'all' || s.campaign === camp));
  const ads = byCampState(byStatus(r.ads).filter((a) => camp === 'all' || a.campaign === camp));

  // Landing pages, aggregated from the FILTERED ads so the table obeys every
  // filter above. Meta reports metrics per ad; the destination comes from the
  // creative, so ads without an exposed link land under "(destination not set)".
  const landingPages = useMemo(() => {
    const agg = new Map<string, { url: string; spend: number; impressions: number; clicks: number; leads: number; adCount: number }>();
    for (const a of ads) {
      const url = a.linkUrl ?? '(destination not set)';
      const row = agg.get(url) ?? { url, spend: 0, impressions: 0, clicks: 0, leads: 0, adCount: 0 };
      row.spend += a.spend; row.impressions += a.impressions; row.clicks += a.clicks; row.leads += a.leads; row.adCount += 1;
      agg.set(url, row);
    }
    return [...agg.values()].sort((a, b) => b.spend - a.spend);
  }, [ads]);

  const campStatePills = (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">Campaign state</span>
      <FilterPill on={campState === 'all'} onClick={() => setCampState('all')}>All</FilterPill>
      <FilterPill on={campState === 'active'} onClick={() => setCampState('active')}>Active</FilterPill>
      <FilterPill on={campState === 'inactive'} onClick={() => setCampState('inactive')}>Inactive</FilterPill>
    </div>
  );

  // Date presets re-fetch server-side (the API aggregates per window).
  const today = range?.to ?? new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;
  const d30 = new Date(new Date(`${today}T00:00:00Z`).getTime() - 29 * 86400_000).toISOString().slice(0, 10);
  const presets: { label: string; from: string }[] = [
    { label: 'This month', from: monthStart },
    { label: 'Last 30 days', from: d30 },
    { label: 'Full history', from: '2025-11-24' },
  ];
  const dateHref = (from: string) => `?tab=marketing&mtab=meta&from=${from}&to=${today}&preset=custom`;

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader tag="M1.5" eyebrow="Filters" title="Slice the account" />
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 pb-5 pt-4">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Status</span>
            <FilterPill on={status === 'all'} onClick={() => setStatus('all')}>All</FilterPill>
            <FilterPill on={status === 'active'} onClick={() => setStatus('active')}>Active</FilterPill>
            <FilterPill on={status === 'inactive'} onClick={() => setStatus('inactive')}>Inactive</FilterPill>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Campaign</span>
            <select
              id="meta-campaign-filter"
              value={camp}
              onChange={(e) => setCamp(e.target.value)}
              className="max-w-[280px] rounded-card border border-line bg-card px-2 py-1 text-[12px] text-ink"
            >
              <option value="all">All campaigns ({r.campaigns.length})</option>
              {campaignNames.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Date</span>
            {presets.map((p) => {
              const on = range?.from === p.from;
              return (
                <a
                  key={p.label}
                  href={dateHref(p.from)}
                  aria-current={on ? 'page' : undefined}
                  className={`inline-block rounded-full border px-3 py-1 text-[11.5px] font-medium transition ${
                    on ? 'border-accent bg-accent text-white' : 'border-line bg-card text-ink-soft hover:border-accent/40 hover:text-ink'
                  }`}
                >
                  {p.label}
                </a>
              );
            })}
            <span className="text-[10.5px] text-ink-faint">(or use the date picker top right — dates re-fetch from Meta)</span>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeader
          tag="M2"
          eyebrow="Campaigns · active first"
          title={`Campaigns — showing ${campaigns.length} of ${r.campaigns.length}`}
        />
        <div className="overflow-x-auto px-5 pb-5 pt-4">
          <table className="w-full text-left">
            <thead><tr className="border-b border-line">
              <th className={th}>Campaign</th><th className={th}>Objective</th><th className={th}>Status</th>
              <th className={`${th} text-right`}>Budget</th><th className={`${th} text-right`}>Spend</th>
              <th className={`${th} text-right`}>Impr.</th><th className={`${th} text-right`}>Clicks</th>
              <th className={`${th} text-right`}>Leads</th>
            </tr></thead>
            <tbody>
              {campaigns.map((c) => (
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
          {campaigns.length === 0 ? <p className="pt-3 text-[12px] text-ink-faint">No campaigns match the current filters.</p> : null}
        </div>
      </Card>

      <Card>
        <SectionHeader tag="M3" eyebrow="Ad sets · targeting & budgets" title={`Ad sets — showing ${adSets.length} of ${r.adSets.length}`} right={campStatePills} />
        <div className="overflow-x-auto px-5 pb-5 pt-4">
          <table className="w-full text-left">
            <thead><tr className="border-b border-line">
              <th className={th}>Ad set</th><th className={th}>Campaign</th><th className={th}>Status</th>
              <th className={`${th} text-right`}>Budget</th><th className={th}>Optimization</th>
              <th className={th}>Targeting</th><th className={`${th} text-right`}>Spend</th>
              <th className={`${th} text-right`}>Leads</th>
            </tr></thead>
            <tbody>
              {adSets.map((s) => (
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
          {adSets.length === 0 ? <p className="pt-3 text-[12px] text-ink-faint">No ad sets match the current filters.</p> : null}
        </div>
      </Card>

      <Card>
        <SectionHeader tag="M3.5" eyebrow="Destinations" title={`Landing pages (${landingPages.length}) — from the filtered ads`} />
        <div className="overflow-x-auto px-5 pb-5 pt-4">
          {landingPages.length === 0 ? (
            <p className="text-[12px] text-ink-faint">No ads match the current filters.</p>
          ) : (
            <table className="w-full text-left">
              <thead><tr className="border-b border-line">
                <th className={th}>Landing page</th><th className={`${th} text-right`}>Ads</th>
                <th className={`${th} text-right`}>Spend</th><th className={`${th} text-right`}>Impr.</th>
                <th className={`${th} text-right`}>Clicks</th><th className={`${th} text-right`}>Leads</th>
                <th className={`${th} text-right`}>Cost / lead</th>
              </tr></thead>
              <tbody>
                {landingPages.map((lp) => (
                  <tr key={lp.url} className="border-b border-line/60 last:border-0">
                    <td className={td}><span className="block max-w-[320px] truncate" title={lp.url}>{lp.url.replace(/^https?:\/\/(www\.)?/, '')}</span></td>
                    <td className={num}>{int(lp.adCount)}</td>
                    <td className={`${num} font-medium text-ink`}>{aed(lp.spend)}</td>
                    <td className={num}>{int(lp.impressions)}</td>
                    <td className={num}>{int(lp.clicks)}</td>
                    <td className={num}>{int(lp.leads)}</td>
                    <td className={num}>{lp.leads > 0 ? aed(lp.spend / lp.leads) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="px-0 pt-2">
            <Takeaway>
              Where the filtered ads send people, with each destination&apos;s cost per lead — the read that
              separates creative problems from landing-page problems. Click-to-WhatsApp ads carry no page URL
              and group under &ldquo;destination not set&rdquo;.
            </Takeaway>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeader tag="M4" eyebrow="Ads & creative assets" title={`Ads — showing ${ads.length} of ${r.ads.length}`} right={campStatePills} />
        <div className="grid grid-cols-1 gap-3 px-5 pb-5 pt-4 sm:grid-cols-2">
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
        {ads.length === 0 ? <p className="px-5 pb-4 text-[12px] text-ink-faint">No ads match the current filters.</p> : null}
        <div className="px-5 pb-5">
          <Takeaway>
            Every ad in the account is listed — filter by status or campaign above to slice instantly. Each card
            is one ad&apos;s creative asset (thumbnail, headline, body, CTA) with its spend and leads for the
            selected dates; read it against the ad-set targeting to see which audience + creative pairs produce.
          </Takeaway>
        </div>
      </Card>
    </div>
  );
}
