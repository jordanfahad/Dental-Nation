import { getDigitalSeo } from '@/lib/analytics/digital';
import { getManualMetrics } from '@/lib/board/metrics';
import { getAuthorityReport, getBacklinkDetail } from '@/lib/analytics/authority';
import { getTechBenchmark, getCommercialBenchmark, getMarketDemand, getBranchDemand, CLINIC_FOOTPRINT } from '@/lib/analytics/benchmark';
import { getSiteSizeReport } from '@/lib/analytics/site-size';
import { TrendChart, TOKENS, type TrendSeries } from '@/components/charts/Charts';
import { QueryTable } from './QueryTable';
import { GoogleReviewsCard, LocalSearchCard } from '@/components/sections/gmb/GmbLocalCards';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import { HBarChart, type BarDatum } from '@/components/charts/Charts';
import { ownerFor } from '@/config/data-gap-owners';

const int = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toLocaleString('en-US'));
const pct1 = (n: number | null | undefined) => (n == null ? '—' : `${(n * 100).toFixed(1)}%`);
const pos = (n: number | null | undefined) => (n == null ? '—' : n.toFixed(1));
const scoreTone = (s: number | null) => (s == null ? 'text-ink-faint' : s >= 90 ? 'text-good' : s >= 50 ? 'text-watch' : 'text-stop');

function Score({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-card border border-line p-4 text-center">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={`mt-1 text-[26px] font-semibold tabular-nums ${scoreTone(value)}`}>{value == null ? '—' : value}</p>
      <p className="text-[10px] text-ink-faint">/ 100</p>
    </div>
  );
}

/**
 * Digital & SEO tab — ORGANIC ONLY, per the CEO's framing: organic search
 * (per engine), AI-assistant traffic (per assistant), Direct, Google Search
 * Console performance, Lighthouse on-page health, and whole-site geography.
 * Paid media lives on Marketing / the Growth Platform; social has its own tab;
 * demographics live on Google Analytics — none of them are repeated here.
 */
export async function DigitalSeo({ range }: { range?: { from?: string; to?: string } }) {
  const [d, manual, authority, backlinks, tech, commercial, marketDemand, branches, siteSize] = await Promise.all([
    getDigitalSeo(range ?? {}),
    getManualMetrics().catch(() => new Map()),
    getAuthorityReport().catch(() => null),
    getBacklinkDetail().catch(() => null),
    getTechBenchmark().catch(() => null),
    getCommercialBenchmark().catch(() => null),
    getMarketDemand().catch(() => null),
    getBranchDemand().catch(() => null),
    getSiteSizeReport().catch(() => null),
  ]);
  const dofollowShare =
    backlinks && backlinks.links.length > 0 ? backlinks.links.filter((l) => l.dofollow).length / backlinks.links.length : null;
  const spamFlagged = backlinks ? backlinks.links.filter((l) => (l.spamScore ?? 0) >= 50).length : 0;
  const qualityChip = (rank: number | null) =>
    rank == null ? { label: 'unrated', cls: 'bg-panel text-ink-faint' }
    : rank >= 200 ? { label: 'strong', cls: 'bg-good/10 text-good' }
    : rank >= 50 ? { label: 'moderate', cls: 'bg-panel text-ink-soft' }
    : { label: 'weak', cls: 'bg-watch/10 text-watch' };
  const o = d.organic;
  // Google's API exposes only sitemap-based indexed counts; the Page-indexing
  // report total (the "19K" in the Search Console UI) is entered manually.
  const manualIndexed = manual.get('gsc_indexed_pages');
  const indexedDisplay =
    d.pagesIndexed != null ? int(d.pagesIndexed) : manualIndexed?.value != null ? `~${int(manualIndexed.value)}` : '—';

  // ── Search-query analysis (top 250 from the API, keyed off live data) ──
  const BRANDED = /dental\s*nation|dentalnation|beyond the smile/i;
  const sq = d.search?.available ? d.search.topQueries : [];
  const sumBy = (list: typeof sq, f: (q: (typeof sq)[number]) => number) => list.reduce((a, q) => a + f(q), 0);
  const brandedQ = sq.filter((q) => BRANDED.test(q.query));
  const brandedClicks = sumBy(brandedQ, (q) => q.clicks);
  const brandedImpr = sumBy(brandedQ, (q) => q.impressions);
  const allClicks = sumBy(sq, (q) => q.clicks);
  const allImpr = sumBy(sq, (q) => q.impressions);
  const posBuckets = [
    { label: 'Positions 1–3', test: (p: number) => p <= 3.5 },
    { label: 'Positions 4–10 (page 1)', test: (p: number) => p > 3.5 && p <= 10.5 },
    { label: 'Positions 11–20 (page 2)', test: (p: number) => p > 10.5 && p <= 20.5 },
    { label: 'Positions 21–50', test: (p: number) => p > 20.5 && p <= 50.5 },
    { label: 'Beyond 50', test: (p: number) => p > 50.5 },
  ].map((b) => ({
    label: b.label,
    value: sumBy(sq.filter((q) => b.test(q.position)), (q) => q.impressions),
  }));
  // Striking distance: non-branded demand ranking just off the top — computed
  // on UAE searchers when the country-filtered report has data, so the list is
  // demand that can actually walk into a Dubai clinic (not the global tail).
  const uaeQ = d.search?.available ? d.search.uaeQueries : [];
  const oppSource = uaeQ.length > 0 ? uaeQ : sq;
  const oppScope = uaeQ.length > 0 ? 'UAE searchers only' : 'all countries';
  const opportunities = oppSource
    .filter((q) => !BRANDED.test(q.query) && q.impressions >= 10 && q.position > 3.5 && q.position <= 20.5)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10);

  // UAE vs international — the relevance lens over the big impression numbers.
  const uae = d.search?.available ? d.search.countries.find((c) => /United Arab Emirates/i.test(c.country)) ?? null : null;
  const totImpr = d.search?.available ? d.search.impressions : 0;
  const totClicks = d.search?.available ? d.search.clicks : 0;
  const topCountries = d.search?.available
    ? d.search.countries.slice().sort((a, b) => b.impressions - a.impressions).slice(0, 8)
    : [];
  const daily = d.search?.available ? d.search.daily : [];
  const trendData = daily.map((r) => ({ date: r.date, clicks: r.clicks, impressions: r.impressions }));
  const trendSeries: TrendSeries[] = [
    { key: 'impressions', label: 'Impressions', color: TOKENS.accent400, kind: 'area', axis: 'right', valueFormat: 'int' },
    { key: 'clicks', label: 'Clicks', color: TOKENS.accent, kind: 'line', axis: 'left', valueFormat: 'int' },
  ];
  const topPagesList = d.search?.available
    ? d.search.topPages.slice(0, 10).map((p) => ({ ...p, path: p.page.replace(/^https?:\/\/[^/]+/, '') || '/' }))
    : [];
  const devices = d.search?.available ? d.search.devices : [];
  const isUrlPrefix = Boolean(d.search?.siteUrl?.startsWith('http'));

  const kpis: KpiItem[] = [
    { label: 'Site sessions', value: d.traffic ? int(d.traffic.sessions) : null, hint: 'GA4 · whole site, all traffic (context)', gapDetail: d.ga4Note ?? 'no GA4 data', gapOwner: ownerFor('channel') },
    { label: 'Organic SEO sessions', value: o ? int(o.seoSessions) : d.ga4Available ? int(d.organicSessions) : null, hint: 'search engines · medium = organic', gapDetail: d.ga4Note ?? 'no GA4 data', gapOwner: ownerFor('channel') },
    { label: 'AI-chat sessions', value: o ? int(o.aiSessions) : null, hint: 'ChatGPT · Claude · Perplexity …', gapDetail: 'GA4 source data unavailable', gapOwner: ownerFor('channel') },
    { label: 'Direct sessions', value: o ? int(o.directSessions) : null, hint: 'typed / bookmarked', gapDetail: 'GA4 source data unavailable', gapOwner: ownerFor('channel') },
    { label: 'SEO score', value: d.seo?.seo != null ? String(d.seo.seo) : null, hint: 'Lighthouse · /100', gapDetail: 'PageSpeed unavailable', gapOwner: ownerFor('tracking') },
    // Exact indexed count needs a sitemap submitted in Search Console; until
    // then the count of pages actually appearing in Google results is an
    // honest floor — better than claiming GSC is not connected when it is.
    {
      label: 'Pages indexed',
      value:
        d.pagesIndexed != null
          ? int(d.pagesIndexed)
          : manualIndexed?.value != null
            ? `~${int(manualIndexed.value)}`
            : d.search?.available && d.search.pagesInSearch > 0
              ? `${int(d.search.pagesInSearch)}+`
              : null,
      hint:
        d.pagesIndexed != null
          ? 'Search Console · submitted sitemaps'
          : manualIndexed?.value != null
            ? `Search Console page-indexing report · manual reading, ${manualIndexed.periodEnd}`
            : 'pages seen in Google results · submit a sitemap for the exact count',
      gapDetail: d.search?.available ? 'no sitemap submitted in Search Console' : d.search?.note ?? 'connect Google Search Console',
      gapOwner: ownerFor('tracking'),
    },
  ];

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader tag="D" eyebrow="Digital & SEO" title="Organic search, AI-chat & search-engine traffic" />
        <div className="px-5 pb-5 pt-4">
          <KpiBand items={kpis} />
          <Takeaway>
            This tab covers <strong>organic discovery only</strong> — search engines, AI assistants and direct visits.
            Paid media economics live on the <strong>⭐ Growth Platform</strong> and the Marketing tab; social and
            audience demographics have their own tabs.
          </Takeaway>
        </div>
      </Card>

      {/* Where organic sessions come from */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionHeader tag="D1" eyebrow="Organic search" title="Sessions by search engine" />
          <div className="px-5 pb-5 pt-4">
            {o && o.seo.length ? (
              <>
                <HBarChart data={o.seo.map((e) => ({ label: e.label, value: e.sessions })) as BarDatum[]} valueFormat="int" />
                <p className="mt-2 text-[11px] text-ink-faint">
                  GA4 sessions with medium = organic, split by sessionSource · selected window · whole site.
                </p>
              </>
            ) : (
              <DataGapInline detail={d.ga4Note ?? 'no organic-search sessions in this window'} owner={ownerFor('channel')} />
            )}
          </div>
        </Card>
        <Card>
          <SectionHeader tag="D2" eyebrow="AI assistants" title="Sessions from AI chat" />
          <div className="px-5 pb-5 pt-4">
            {o && o.ai.length ? (
              <>
                <HBarChart data={o.ai.map((e) => ({ label: e.label, value: e.sessions })) as BarDatum[]} valueFormat="int" />
                <p className="mt-2 text-[11px] text-ink-faint">
                  Referrals from AI assistants (chatgpt.com, claude.ai, perplexity.ai, Gemini/Copilot…) · selected window.
                </p>
              </>
            ) : (
              <DataGapInline
                detail={o ? 'no AI-assistant referrals in this window — expected to grow as AI search adoption rises' : d.ga4Note ?? 'GA4 source data unavailable'}
                owner={ownerFor('channel')}
              />
            )}
          </div>
        </Card>
      </div>

      {/* Organic search · Search Console */}
      <Card>
        <SectionHeader
          tag="D3"
          eyebrow="Organic search · Search Console"
          title="How the site performs in Google Search"
          right={d.search?.siteUrl ? <span className="text-[11px] text-ink-faint">{d.search.siteUrl.replace('sc-domain:', '')}</span> : undefined}
        />
        <div className="px-5 pb-5 pt-4">
          {d.search?.available ? (
            <>
              {isUrlPrefix ? (
                <p className="mb-4 rounded-md bg-watch/10 px-3 py-2 text-[12px] leading-snug text-watch">
                  Reading the URL-prefix property <span className="font-medium">{d.search.siteUrl}</span> — the{' '}
                  <span className="font-medium">dentalnation.com domain property</span> is not visible to the
                  dashboard&apos;s service account yet. The domain property aggregates www, subdomains and every URL
                  variant, so the Search Console UI reads far higher than this section. Add the service account as a
                  user on the domain property and this section switches to it automatically within 30 minutes.
                </p>
              ) : null}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <SearchStat label="Clicks" value={int(d.search.clicks)} />
                <SearchStat label="Impressions" value={int(d.search.impressions)} />
                <SearchStat label="CTR" value={pct1(d.search.ctr)} />
                <SearchStat label="Avg position" value={pos(d.search.position)} />
                <SearchStat label="Pages indexed" value={indexedDisplay} />
              </div>

              {/* Branded vs non-branded — reputation confirms itself; growth is non-branded. */}
              {sq.length > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <SearchStat label="Branded clicks" value={`${int(brandedClicks)} · ${allClicks ? Math.round((brandedClicks / allClicks) * 100) : 0}%`} />
                  <SearchStat label="Non-branded clicks" value={`${int(allClicks - brandedClicks)} · ${allClicks ? Math.round(((allClicks - brandedClicks) / allClicks) * 100) : 0}%`} />
                  <SearchStat label="Branded impressions" value={`${allImpr ? Math.round((brandedImpr / allImpr) * 100) : 0}%`} />
                  <SearchStat label="Non-branded impressions" value={`${allImpr ? Math.round(((allImpr - brandedImpr) / allImpr) * 100) : 0}%`} />
                </div>
              ) : null}

              {/* The relevance lens: how much of the visibility is UAE demand. */}
              {uae ? (
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <SearchStat label="UAE impressions" value={`${int(uae.impressions)} · ${totImpr ? Math.round((uae.impressions / totImpr) * 100) : 0}%`} />
                  <SearchStat label="UAE clicks" value={`${int(uae.clicks)} · ${totClicks ? Math.round((uae.clicks / totClicks) * 100) : 0}%`} />
                  <SearchStat label="UAE CTR" value={pct1(uae.ctr)} />
                  <SearchStat label="Rest of world CTR" value={totImpr - uae.impressions > 0 ? pct1((totClicks - uae.clicks) / (totImpr - uae.impressions)) : '—'} />
                </div>
              ) : null}

              {/* Daily trend — spikes and slumps are visible, not anecdotal. */}
              {trendData.length > 1 ? (
                <div className="mt-5">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Clicks & impressions per day</p>
                  <TrendChart data={trendData} series={trendSeries} leftFormat="int" />
                </div>
              ) : null}

              {/* Where searchers are, and what they search on. */}
              {topCountries.length > 1 ? (
                <div className="mt-5 grid gap-6 lg:grid-cols-2">
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Impressions by country</p>
                    <HBarChart data={topCountries.map((c) => ({ label: c.country, value: c.impressions })) as BarDatum[]} valueFormat="int" />
                  </div>
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">By device</p>
                    <div className="space-y-2">
                      {devices.map((dev) => (
                        <div key={dev.device} className="flex items-center justify-between rounded-card border border-line px-3 py-2 text-[12.5px]">
                          <span className="capitalize text-ink">{dev.device}</span>
                          <span className="tabular-nums text-ink-soft">
                            {int(dev.clicks)} clicks · {int(dev.impressions)} impr · {pct1(dev.ctr)} CTR
                          </span>
                        </div>
                      ))}
                    </div>
                    {topPagesList.length > 0 ? (
                      <div className="mt-4">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Top pages in search</p>
                        <div className="space-y-1.5">
                          {topPagesList.map((p) => (
                            <div key={p.page} className="flex items-center justify-between gap-3 text-[12px]">
                              <span className="truncate text-ink" title={p.page}>{p.path}</span>
                              <span className="shrink-0 tabular-nums text-ink-soft">{int(p.clicks)} clicks · {int(p.impressions)} impr</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* Where the visibility sits — impressions by ranking position. */}
              {posBuckets.some((b) => b.value > 0) ? (
                <div className="mt-5">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                    Where impressions rank (visibility by position)
                  </p>
                  <HBarChart data={posBuckets as BarDatum[]} valueFormat="int" />
                </div>
              ) : null}

              {/* Striking distance — non-branded demand ranking just off the top. */}
              {opportunities.length > 0 ? (
                <div className="mt-5 overflow-x-auto">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                    Striking-distance opportunities ({oppScope} · non-branded · positions 4–20 · sorted by demand)
                  </p>
                  <table className="w-full min-w-[520px] text-[12.5px]">
                    <thead>
                      <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                        <th className="py-2 pr-3">Query</th>
                        <th className="py-2 pr-3 text-right">Impressions</th>
                        <th className="py-2 pr-3 text-right">Clicks</th>
                        <th className="py-2 pr-3 text-right">CTR</th>
                        <th className="py-2 pl-3 text-right">Avg pos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {opportunities.map((q) => (
                        <tr key={q.query} className="border-b border-line/60">
                          <td className="py-2 pr-3 font-medium text-ink">{q.query}</td>
                          <td className="py-2 pr-3 text-right tabular-nums text-ink">{int(q.impressions)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{int(q.clicks)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{pct1(q.ctr)}</td>
                          <td className="py-2 pl-3 text-right tabular-nums text-ink-soft">{pos(q.position)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-1.5 text-[11px] text-ink-faint">
                    Real search demand where the site already ranks on page 1–2 but not in the top 3 — content and
                    on-page work on these terms is the highest-leverage SEO effort available.
                  </p>
                </div>
              ) : null}

              {/* The full keyword report — every reported query, searchable and sortable. */}
              {sq.length ? (
                <div className="mt-5">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                    Search queries ({sq.length} reported) — click a column to sort, type to filter
                  </p>
                  <QueryTable
                    rows={sq.map((q) => ({
                      query: q.query,
                      clicks: q.clicks,
                      impressions: q.impressions,
                      ctr: q.ctr,
                      position: q.position,
                      branded: BRANDED.test(q.query),
                    }))}
                  />
                </div>
              ) : null}

              <Takeaway>
                Live Google Search Console ({d.search.siteUrl}): <strong>{int(d.search.impressions)}</strong> impressions →{' '}
                <strong>{int(d.search.clicks)}</strong> clicks ({pct1(d.search.ctr)} CTR) at avg position{' '}
                <strong>{pos(d.search.position)}</strong>. Branded terms are reputation confirming itself;{' '}
                <strong>non-branded</strong> clicks and the striking-distance list are where SEO work grows new demand.
                Pages indexed: <strong>{indexedDisplay}</strong>.
              </Takeaway>
            </>
          ) : (
            <DataGapInline
              detail={d.search?.note ?? 'Search Console not returning data yet — access may still be propagating (allow a few minutes), or the property has no recent search data.'}
              owner={ownerFor('tracking')}
            />
          )}
        </div>
      </Card>

      {/* Authority & backlinks — the off-page half of SEO. Google's Links
          report has no API; authority comes from Open PageRank, raw backlink
          counts from manual free-checker readings. */}
      <Card>
        <SectionHeader
          tag="D3b"
          eyebrow="Off-page SEO"
          title="Domain authority & backlinks"
          right={
            <span className="text-[11px] text-ink-faint">
              {authority?.provider === 'dataforseo' ? 'DataForSEO · refreshed weekly' : 'Open PageRank · refreshed daily'}
            </span>
          }
        />
        <div className="px-5 pb-5 pt-4">
          {authority?.site?.score != null ? (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <SearchStat
                  label={`Domain rank (0–${int(authority.site.scale)})`}
                  value={authority.site.scale === 10 ? authority.site.score.toFixed(1) : int(authority.site.score)}
                />
                <SearchStat
                  label="Referring domains"
                  value={
                    authority.site.referringDomains != null
                      ? int(authority.site.referringDomains)
                      : manual.get('referring_domains')?.value != null
                        ? int(manual.get('referring_domains')!.value!)
                        : '—'
                  }
                />
                <SearchStat
                  label="Total backlinks"
                  value={
                    authority.site.backlinks != null
                      ? int(authority.site.backlinks)
                      : manual.get('backlinks_total')?.value != null
                        ? int(manual.get('backlinks_total')!.value!)
                        : '—'
                  }
                />
                <SearchStat
                  label="Links per referring domain"
                  value={
                    authority.site.backlinks != null && authority.site.referringDomains
                      ? (authority.site.backlinks / authority.site.referringDomains).toFixed(1)
                      : '—'
                  }
                />
              </div>
              {authority.competitors.length > 0 ? (
                <div className="mt-5">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                    Competitor benchmarking — referring domains (the metric that ranks)
                  </p>
                  <HBarChart
                    data={[
                      { label: 'dentalnation.com', value: authority.site.referringDomains ?? 0 },
                      ...authority.competitors
                        .filter((c) => c.referringDomains != null)
                        .map((c) => ({ label: c.domain, value: c.referringDomains! })),
                    ] as BarDatum[]}
                    valueFormat="int"
                  />
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[560px] text-[12.5px]">
                      <thead>
                        <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                          <th className="py-2 pr-3">Domain</th>
                          <th className="py-2 pr-3 text-right">Domain rank (0–{int(authority.site.scale)})</th>
                          <th className="py-2 pr-3 text-right">Referring domains</th>
                          <th className="py-2 pr-3 text-right">Backlinks</th>
                          <th className="py-2 pl-3 text-right">Links / domain</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[authority.site, ...authority.competitors].map((c) => (
                          <tr key={c.domain} className={`border-b border-line/60 ${c.domain === 'dentalnation.com' ? 'font-medium' : ''}`}>
                            <td className="py-2 pr-3 text-ink">{c.domain}{c.domain === 'dentalnation.com' ? ' (us)' : ''}</td>
                            <td className="py-2 pr-3 text-right tabular-nums text-ink">{c.score != null ? int(c.score) : '—'}</td>
                            <td className="py-2 pr-3 text-right tabular-nums text-ink">{c.referringDomains != null ? int(c.referringDomains) : '—'}</td>
                            <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{c.backlinks != null ? int(c.backlinks) : '—'}</td>
                            <td className="py-2 pl-3 text-right tabular-nums text-ink-soft">
                              {c.backlinks != null && c.referringDomains ? (c.backlinks / c.referringDomains).toFixed(1) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {(() => {
                    const ours = authority.site.referringDomains;
                    const theirs = authority.competitors
                      .map((c) => c.referringDomains)
                      .filter((v): v is number => v != null)
                      .sort((a, b) => a - b);
                    if (ours == null || theirs.length === 0) return null;
                    const median = theirs[Math.floor(theirs.length / 2)];
                    const gap = ours > 0 ? median / ours : null;
                    return (
                      <p className="mt-3 rounded-md bg-watch/10 px-3 py-2 text-[12px] leading-snug text-watch">
                        <span className="font-semibold">The gap:</span> the median competitor has{' '}
                        <span className="font-semibold">{int(median)}</span> referring domains vs our{' '}
                        <span className="font-semibold">{int(ours)}</span>
                        {gap != null && gap > 1 ? <> — a {gap >= 10 ? Math.round(gap) : gap.toFixed(1)}× authority gap</> : null}. Every
                        quality UAE link closes it; this table refreshes weekly, so link-building progress is measurable here.
                      </p>
                    );
                  })()}
                </div>
              ) : null}
              {authority.note ? <p className="mt-3 text-[11.5px] text-ink-faint">{authority.note}</p> : null}
              <Takeaway>
                <strong>How many backlinks are needed?</strong> Authority is log-scale, so the honest answer is a target,
                not a count: reach the median authority of the clinics ranking top-3 for the striking-distance terms
                above. Quality dominates quantity — a handful of links from established UAE health, news and directory
                domains (Practo profile, insurer partner pages, Dubai media, dental association listings) move this score
                more than hundreds of low-grade directory links, which Google discounts. Track referring domains monthly
                (free Ahrefs/Moz checker → Board Report → manual metrics) and treat the authority gap above as the KPI.
              </Takeaway>
            </>
          ) : (
            <DataGapInline
              detail={authority?.note ?? 'Authority lookup unavailable.'}
              owner={ownerFor('tracking')}
            />
          )}
        </div>
      </Card>

      {/* Backlink profile — who links, to which pages, and how good the links are. */}
      <Card>
        <SectionHeader
          tag="D3c"
          eyebrow="Off-page SEO · link profile"
          title="Referring domains & linked pages"
          right={<span className="text-[11px] text-ink-faint">DataForSEO · refreshed weekly</span>}
        />
        <div className="px-5 pb-5 pt-4">
          {backlinks?.available ? (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <SearchStat label="Strong domains (rank ≥200)" value={int(backlinks.quality.strong)} />
                <SearchStat label="Moderate (50–199)" value={int(backlinks.quality.moderate)} />
                <SearchStat label="Weak (<50)" value={int(backlinks.quality.weak)} />
                <SearchStat label="Dofollow share" value={dofollowShare != null ? pct1(dofollowShare) : '—'} />
              </div>
              {spamFlagged > 0 ? (
                <p className="mt-3 text-[12px] font-medium text-watch">
                  {int(spamFlagged)} link{spamFlagged === 1 ? '' : 's'} carry a spam score ≥50 — worth reviewing before they
                  accumulate; a handful is normal, a pattern is not.
                </p>
              ) : null}
              <div className="mt-5 grid gap-6 lg:grid-cols-2">
                <div className="overflow-x-auto">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                    Referring domains (best first)
                  </p>
                  <table className="w-full min-w-[380px] text-[12.5px]">
                    <thead>
                      <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                        <th className="py-2 pr-3">Domain</th>
                        <th className="py-2 pr-3 text-right">Rank</th>
                        <th className="py-2 pr-3 text-right">Links</th>
                        <th className="py-2 pr-3">First seen</th>
                        <th className="py-2 pl-3">Quality</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backlinks.referringDomains.map((r) => {
                        const q = qualityChip(r.rank);
                        return (
                          <tr key={r.domain} className="border-b border-line/60">
                            <td className="py-2 pr-3 text-ink">{r.domain}</td>
                            <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{r.rank != null ? int(r.rank) : '—'}</td>
                            <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{int(r.backlinks)}</td>
                            <td className="py-2 pr-3 whitespace-nowrap text-[11px] text-ink-faint">{r.firstSeen ?? '—'}</td>
                            <td className="py-2 pl-3">
                              <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${q.cls}`}>{q.label}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="overflow-x-auto">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                    Our pages that receive links
                  </p>
                  <table className="w-full min-w-[320px] text-[12.5px]">
                    <thead>
                      <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                        <th className="py-2 pr-3">Page</th>
                        <th className="py-2 pr-3 text-right">Backlinks</th>
                        <th className="py-2 pl-3 text-right">Referring domains</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backlinks.linkedPages.map((p) => (
                        <tr key={p.path} className="border-b border-line/60">
                          <td className="py-2 pr-3 text-ink" title={p.path}>{p.path.length > 46 ? `${p.path.slice(0, 45)}…` : p.path}</td>
                          <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{int(p.backlinks)}</td>
                          <td className="py-2 pl-3 text-right tabular-nums text-ink-soft">{int(p.referringDomains)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <Takeaway>
                Quality over quantity, made visible: <strong>rank</strong> is DataForSEO&apos;s 0–1000 authority of the
                LINKING domain — links from <strong>strong</strong> domains move rankings, weak ones barely register, and
                spam-scored ones can hurt. &ldquo;Our pages that receive links&rdquo; shows where the authority lands: if
                it all points at the homepage, the treatment pages competing for the striking-distance terms above are
                fighting without link support.
              </Takeaway>
            </>
          ) : (
            <DataGapInline detail={backlinks?.note ?? 'Backlink detail unavailable.'} owner={ownerFor('tracking')} />
          )}
        </div>
      </Card>

      {/* Technical & commercial benchmark vs the competitor set. */}
      <Card>
        <SectionHeader
          tag="D3d"
          eyebrow="Benchmark · technical & commercial"
          title="How the site competes on tech and demand"
          right={<span className="text-[11px] text-ink-faint">Lighthouse + DataForSEO Labs · weekly</span>}
        />
        <div className="px-5 pb-5 pt-4">
          {(() => {
            // ── SEO benchmark at a glance — one comparison table (Mr Akbar's ask):
            // total pages each site PUBLISHES (its own sitemap.xml — availability,
            // not indexing) beside the benchmarks the card already tracks.
            const authRows = authority ? [authority.site, ...authority.competitors].filter(Boolean) : [];
            const authBy = new Map(authRows.map((a) => [a!.domain, a!]));
            const commBy = new Map((commercial?.rows ?? []).map((r) => [r.domain, r]));
            const techBy = new Map((tech ?? []).map((t) => [t.domain, t]));
            const domains = siteSize?.rows.map((r) => r.domain) ?? [];
            if (!siteSize || domains.length === 0) {
              return (
                <DataGapInline
                  detail={siteSize?.note ?? 'Site-size benchmark not warmed yet — fills on the next sync run (sitemap walk, cached weekly).'}
                  owner={ownerFor('tracking')}
                />
              );
            }
            const ours = siteSize.rows.find((r) => r.domain === 'dentalnation.com')?.pages ?? null;
            return (
              <div className="overflow-x-auto">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  SEO benchmark at a glance — site size &amp; strength
                </p>
                <table className="w-full min-w-[760px] text-[12.5px]">
                  <thead>
                    <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                      <th className="py-2 pr-3">Domain</th>
                      <th className="py-2 pr-3 text-right">Total pages (sitemap)</th>
                      <th className="py-2 pr-3 text-right">vs us</th>
                      <th className="py-2 pr-3 text-right">Referring domains</th>
                      <th className="py-2 pr-3 text-right">Authority (/1000)</th>
                      <th className="py-2 pr-3 text-right">Keywords ranked</th>
                      <th className="py-2 pr-3 text-right">Est. visits / mo</th>
                      <th className="py-2 pl-3 text-right">Lighthouse SEO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siteSize.rows.map((r) => {
                      const a = authBy.get(r.domain);
                      const c = commBy.get(r.domain);
                      const t = techBy.get(r.domain);
                      const us = r.domain === 'dentalnation.com';
                      const ratio = !us && r.pages != null && ours != null && ours > 0 ? r.pages / ours : null;
                      return (
                        <tr key={r.domain} className={`border-b border-line/60 ${us ? 'font-medium' : ''}`}>
                          <td className="py-2 pr-3 text-ink">
                            {r.domain}
                            {us ? ' (us)' : ''}
                            {r.note ? <span className="block text-[10.5px] font-normal text-ink-faint">{r.note}</span> : null}
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums text-ink">
                            {r.pages != null ? `${r.approx ? '≥' : ''}${int(r.pages)}` : '—'}
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">
                            {/* Precision follows magnitude: 27× · 1.4× · 0.01× — never a
                                rounded-to-zero "0×" for a site we dwarf. */}
                            {us ? '—' : ratio == null ? '—' : `${ratio >= 10 ? Math.round(ratio) : ratio >= 1 ? ratio.toFixed(1) : ratio.toFixed(2)}×`}
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">
                            {a?.referringDomains != null ? int(a.referringDomains) : '—'}
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{a?.score != null ? int(a.score) : '—'}</td>
                          <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">
                            {c?.keywordsRanked != null ? int(c.keywordsRanked) : '—'}
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">
                            {c?.estMonthlyOrganicVisits != null ? int(c.estMonthlyOrganicVisits) : '—'}
                          </td>
                          <td className={`py-2 pl-3 text-right tabular-nums ${t?.seo == null ? 'text-ink-faint' : scoreTone(t.seo)}`}>
                            {t?.seo ?? '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="mt-1.5 text-[11px] leading-snug text-ink-faint">
                  <span className="font-medium text-ink-soft">Total pages</span> = every URL each site declares in its own
                  public sitemap.xml — what the site has PUBLISHED, not what Google has indexed (our indexed count sits in
                  the Search Console card above). ≥ marks a capped walk (very large sitemap set — the count is a floor). A
                  site with no reachable public sitemap shows a note instead of a guess. Refreshed weekly with the other
                  benchmarks; authority &amp; demand from DataForSEO, on-page from Lighthouse.
                </p>
              </div>
            );
          })()}

          {tech?.some((t) => t.seo != null) ? (
            <div className="mt-6 overflow-x-auto">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                Technical / on-page (Lighthouse, mobile homepage)
              </p>
              <table className="w-full min-w-[560px] text-[12.5px]">
                <thead>
                  <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                    <th className="py-2 pr-3">Domain</th>
                    <th className="py-2 pr-3 text-right">Performance</th>
                    <th className="py-2 pr-3 text-right">SEO</th>
                    <th className="py-2 pr-3 text-right">Accessibility</th>
                    <th className="py-2 pl-3 text-right">Best practices</th>
                  </tr>
                </thead>
                <tbody>
                  {tech.map((t) => (
                    <tr key={t.domain} className={`border-b border-line/60 ${t.domain === 'dentalnation.com' ? 'font-medium' : ''}`}>
                      <td className="py-2 pr-3 text-ink">{t.domain}{t.domain === 'dentalnation.com' ? ' (us)' : ''}</td>
                      {[t.performance, t.seo, t.accessibility, t.bestPractices].map((v, i) => (
                        <td key={i} className={`py-2 ${i === 3 ? 'pl-3' : 'pr-3'} text-right tabular-nums ${v == null ? 'text-ink-faint' : scoreTone(v)}`}>
                          {v ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <DataGapInline detail="Technical benchmark not warmed yet — fills on the next sync run (four Lighthouse audits, cached weekly)." owner={ownerFor('tracking')} />
          )}

          {commercial?.available ? (
            <div className="mt-6 overflow-x-auto">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                Commercial — organic demand captured (UAE market)
              </p>
              <table className="w-full min-w-[620px] text-[12.5px]">
                <thead>
                  <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                    <th className="py-2 pr-3">Domain</th>
                    <th className="py-2 pr-3 text-right">Keywords ranked</th>
                    <th className="py-2 pr-3 text-right">Est. monthly organic visits</th>
                    <th className="py-2 pl-3 text-right">Est. website leads / month*</th>
                  </tr>
                </thead>
                <tbody>
                  {commercial.rows.map((r) => (
                    <tr key={r.domain} className={`border-b border-line/60 ${r.domain === 'dentalnation.com' ? 'font-medium' : ''}`}>
                      <td className="py-2 pr-3 text-ink">{r.domain}{r.domain === 'dentalnation.com' ? ' (us)' : ''}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{r.keywordsRanked != null ? int(r.keywordsRanked) : '—'}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-ink">{r.estMonthlyOrganicVisits != null ? int(r.estMonthlyOrganicVisits) : '—'}</td>
                      <td className="py-2 pl-3 text-right tabular-nums text-ink-soft">
                        {r.estMonthlyOrganicVisits != null
                          ? `${int(r.estMonthlyOrganicVisits * 0.01)}–${int(r.estMonthlyOrganicVisits * 0.03)}`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-1.5 text-[11px] text-ink-faint">
                *Estimated at a 1–3% visit-to-lead industry conversion — competitor lead counts are private, so this is a
                modelled range, never a measurement. Traffic estimates: DataForSEO Labs, UAE, Google organic.
              </p>
              {marketDemand?.available ? (
                <div className="mt-6 overflow-x-auto">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                    Organic demand by market — est. monthly visits (keywords ranked)
                  </p>
                  <table className="w-full min-w-[760px] text-[12.5px]">
                    <thead>
                      <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                        <th className="py-2 pr-3">Domain</th>
                        <th className="py-2 pr-3">Clinics</th>
                        {marketDemand.markets.map((m) => (
                          <th key={m} className="py-2 pr-3 text-right">{m}</th>
                        ))}
                        <th className="py-2 pl-3 text-right">Est. visits / clinic*</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marketDemand.rows.map((r) => {
                        const fp = CLINIC_FOOTPRINT[r.domain];
                        // Prefer a Dubai market column if the provider ever adds one;
                        // otherwise the first market with data (UAE-wide — and every
                        // group in this set is Dubai-based, so UAE ≈ Dubai here).
                        const dubai =
                          r.cells.find((c) => c.market === 'Dubai')?.visits ??
                          r.cells.find((c) => c.visits != null)?.visits ??
                          null;
                        return (
                          <tr key={r.domain} className={`border-b border-line/60 ${r.domain === 'dentalnation.com' ? 'font-medium' : ''}`}>
                            <td className="py-2 pr-3 text-ink">{r.domain}{r.domain === 'dentalnation.com' ? ' (us)' : ''}</td>
                            <td className="py-2 pr-3">
                              <span className="tabular-nums text-ink">{fp ? int(fp.clinics) : '—'}</span>
                              {fp ? <span className="block max-w-[220px] truncate text-[10.5px] text-ink-faint" title={fp.footprint}>{fp.footprint}</span> : null}
                            </td>
                            {r.cells.map((c) => (
                              <td key={c.market} className="py-2 pr-3 text-right tabular-nums text-ink">
                                {c.visits != null ? int(c.visits) : '—'}
                                {c.keywords != null ? <span className="text-[10.5px] text-ink-faint"> ({int(c.keywords)})</span> : null}
                              </td>
                            ))}
                            <td className="py-2 pl-3 text-right tabular-nums text-ink">
                              {fp && dubai != null ? int(dubai / fp.clinics) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="mt-1.5 text-[11px] text-ink-faint">
                    Emirate-level estimates are a hard provider limit: Search Console reports only country-level data,
                    and DataForSEO Labs&apos; UAE database is country-level too (Dubai/Abu Dhabi market codes return no
                    data — verified, not assumed). Every group in this set is Dubai-based, so the UAE-wide estimate
                    effectively IS the Dubai picture; GA4&apos;s MEASURED sessions by emirate (our own traffic) are in
                    the Geography section below (D5). *Visits / clinic divides each group&apos;s estimate by its clinic
                    count (footprints from their own location pages, Aug 2026) — a like-for-like efficiency read.
                  </p>
                </div>
              ) : null}

              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <SearchStat
                  label="OUR real website leads (30d)"
                  value={
                    commercial.actuals.widgetLeads30d != null || commercial.actuals.formLeads30d != null
                      ? int((commercial.actuals.widgetLeads30d ?? 0) + (commercial.actuals.formLeads30d ?? 0))
                      : '—'
                  }
                />
                <SearchStat
                  label="of which verified widget forms"
                  value={commercial.actuals.widgetLeads30d != null ? int(commercial.actuals.widgetLeads30d) : '—'}
                />
                <SearchStat
                  label="GMB Call-button taps (30d)"
                  value={commercial.actuals.gmbCallTaps30d != null ? int(commercial.actuals.gmbCallTaps30d) : '—'}
                />
              </div>
              <Takeaway>
                The technical table is measured identically for every domain — a like-for-like Lighthouse audit of each
                homepage. The commercial table is the honest version of &ldquo;how many leads do they get&rdquo;:
                competitor leads are private, so their column is a modelled range from estimated organic traffic, while
                OUR row is backed by the real 30-day numbers below it — verified widget forms, campaign form entries and
                Business Profile call taps. Competitor call-tap counts do not exist outside their own Google profiles;
                nothing here pretends otherwise.
              </Takeaway>
            </div>
          ) : (
            <div className="mt-4">
              <DataGapInline detail={commercial?.note ?? 'Commercial benchmark unavailable.'} owner={ownerFor('tracking')} />
            </div>
          )}
        </div>
      </Card>

      {/* Branch-level demand — the acquisition-scouting lens. */}
      <Card>
        <SectionHeader
          tag="D3e"
          eyebrow="Benchmark · branch level"
          title="Which branches carry the demand"
          right={<span className="text-[11px] text-ink-faint">Labs pages + Google Maps · weekly</span>}
        />
        <div className="px-5 pb-5 pt-4">
          {branches?.available ? (
            <>
              <p className="text-[12.5px] leading-snug text-ink-soft">
                Two public signals, per branch: the branch&apos;s own <span className="font-medium">Google Maps listing</span>{' '}
                (rating and lifetime review count — the classic footfall proxy) and, where a group gives each branch its own
                page, that page&apos;s <span className="font-medium">estimated organic visits</span>. A screening lens for
                which locations are strong or weak — never a substitute for diligence on an actual acquisition.
              </p>
              <div className="mt-4 space-y-6">
                {branches.groups.map((g) => (
                  <div key={g.domain}>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                      {g.domain}{g.domain === 'dentalnation.com' ? ' (us)' : ''}
                    </p>
                    <div className="grid gap-6 lg:grid-cols-2">
                      <div className="overflow-x-auto">
                        <p className="mb-1.5 text-[10.5px] uppercase tracking-wide text-ink-faint">Branch listings on Google Maps</p>
                        {g.listings.length === 0 ? (
                          <p className="text-[12px] text-ink-faint">No brand listings matched on Maps.</p>
                        ) : (
                          <table className="w-full min-w-[360px] text-[12px]">
                            <thead>
                              <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                                <th className="py-1.5 pr-3">Branch</th>
                                <th className="py-1.5 pr-3 text-right">Rating</th>
                                <th className="py-1.5 pl-3 text-right">Reviews (lifetime)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {g.listings.map((l, i) => (
                                <tr key={i} className="border-b border-line/60 align-top">
                                  <td className="py-1.5 pr-3">
                                    <span className="block text-ink">{l.title}</span>
                                    {l.address ? <span className="block text-[10.5px] text-ink-faint">{l.address}</span> : null}
                                  </td>
                                  <td className="py-1.5 pr-3 text-right tabular-nums text-ink-soft">{l.rating != null ? l.rating.toFixed(1) : '—'}</td>
                                  <td className="py-1.5 pl-3 text-right tabular-nums text-ink">{l.reviews != null ? int(l.reviews) : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                      <div className="overflow-x-auto">
                        <p className="mb-1.5 text-[10.5px] uppercase tracking-wide text-ink-faint">Top pages by est. organic visits / month</p>
                        {g.pages.length === 0 ? (
                          <p className="text-[12px] text-ink-faint">No page-level estimates available.</p>
                        ) : (
                          <table className="w-full min-w-[320px] text-[12px]">
                            <thead>
                              <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                                <th className="py-1.5 pr-3">Page</th>
                                <th className="py-1.5 pl-3 text-right">Est. visits (keywords)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {g.pages.map((p) => (
                                <tr key={p.page} className="border-b border-line/60">
                                  <td className="py-1.5 pr-3 text-ink" title={p.page}>{p.page.length > 42 ? `${p.page.slice(0, 41)}…` : p.page}</td>
                                  <td className="py-1.5 pl-3 text-right tabular-nums text-ink">
                                    {p.estVisits != null ? int(p.estVisits) : '—'}
                                    {p.keywords != null ? <span className="text-[10.5px] text-ink-faint"> ({int(p.keywords)})</span> : null}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Takeaway>
                Reading it as an acquirer: a branch with a <strong>large lifetime review count and strong rating</strong>{' '}
                has proven, durable footfall; a branch whose <strong>location page carries real organic traffic</strong>{' '}
                generates its own digital demand rather than borrowing the brand&apos;s. Branches strong on both are the
                expensive ones; strong footfall with weak digital presence is where an acquirer with a better digital
                machine — the thesis this platform demonstrates — adds the most value fastest.
              </Takeaway>
            </>
          ) : (
            <DataGapInline detail={branches?.note ?? 'Branch-level lookup unavailable.'} owner={ownerFor('tracking')} />
          )}
        </div>
      </Card>

      {/* Site health scores */}
      <Card>
        <SectionHeader tag="D4" eyebrow="Site health · Lighthouse" title="On-page scores (mobile)" />
        <div className="px-5 pb-5 pt-4">
          {d.seo ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Score label="SEO" value={d.seo.seo} />
              <Score label="Performance" value={d.seo.performance} />
              <Score label="Accessibility" value={d.seo.accessibility} />
              <Score label="Best practices" value={d.seo.bestPractices} />
            </div>
          ) : (
            <DataGapInline detail="PageSpeed Insights scores unavailable (set the PSI API key)." owner={ownerFor('tracking')} />
          )}
          <Takeaway>
            On-page SEO health from Google Lighthouse (0–100) — structure, meta, crawlability. These scores shape how well
            the site can rank; the Search Console section above shows how it actually ranks.
          </Takeaway>
        </div>
      </Card>

      {/* Geography — whole site */}
      <Card>
        <SectionHeader tag="D5" eyebrow="Geography" title="Sessions by UAE emirate (whole site)" />
        <div className="px-5 pb-5 pt-4">
          {d.byEmirate.length ? (
            <>
              <HBarChart data={d.byEmirate.map((e) => ({ label: e.label, value: e.sessions })) as BarDatum[]} valueFormat="int" />
              {d.emirateScope === 'site' ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[360px] text-[12px]">
                    <thead>
                      <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                        <th className="py-1.5 pr-3">Emirate</th>
                        <th className="py-1.5 pr-3 text-right">All sessions</th>
                        <th className="py-1.5 pl-3 text-right">of which organic search</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.byEmirate.map((e) => (
                        <tr key={e.label} className="border-b border-line/60">
                          <td className="py-1.5 pr-3 text-ink">{e.label}</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums text-ink">{int(e.sessions)}</td>
                          <td className="py-1.5 pl-3 text-right tabular-nums text-ink-soft">{int(e.organic)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              <p className="mt-2 text-[11px] text-ink-faint">
                {d.emirateScope === 'site'
                  ? 'ALL site sessions by GA4 region, selected window — with the organic-search share per emirate. (An earlier version of this card counted only the paid-offer landing pages, which is why the numbers looked far too low.)'
                  : 'Landing-page traffic only (GA4 region on the offer pages) — whole-site region data was unavailable for this window; the numbers are NOT total site traffic.'}
              </p>
            </>
          ) : (
            <DataGapInline detail="no emirate-level GA4 traffic" owner={ownerFor('channel')} />
          )}
        </div>
      </Card>

      {/* Google Business Profile: reputation + local search. Shared cards —
          the same two sections render on Social & Local. */}
      <GoogleReviewsCard tag="D6" />
      <LocalSearchCard tag="D7" />
    </div>
  );
}

function SearchStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-line p-4 text-center">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-1 text-[22px] font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}
