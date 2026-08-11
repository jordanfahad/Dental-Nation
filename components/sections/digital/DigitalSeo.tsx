import { getDigitalSeo } from '@/lib/analytics/digital';
import { getGmbReviewsReport } from '@/lib/analytics/gmb-reviews';
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
  const [d, reviews] = await Promise.all([getDigitalSeo(range ?? {}), getGmbReviewsReport()]);
  const o = d.organic;

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
          : d.search?.available && d.search.pagesInSearch > 0
            ? `${int(d.search.pagesInSearch)}+`
            : null,
      hint:
        d.pagesIndexed != null
          ? 'Search Console · submitted sitemaps'
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
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <SearchStat label="Clicks" value={int(d.search.clicks)} />
                <SearchStat label="Impressions" value={int(d.search.impressions)} />
                <SearchStat label="CTR" value={pct1(d.search.ctr)} />
                <SearchStat label="Avg position" value={pos(d.search.position)} />
                <SearchStat label="Pages indexed" value={d.pagesIndexed != null ? int(d.pagesIndexed) : '—'} />
              </div>
              {d.search.topQueries.length ? (
                <div className="mt-4 overflow-x-auto">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Top search queries</p>
                  <table className="w-full min-w-[480px] text-[12.5px]">
                    <thead>
                      <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                        <th className="py-2 pr-3">Query</th>
                        <th className="py-2 pr-3 text-right">Clicks</th>
                        <th className="py-2 pr-3 text-right">Impressions</th>
                        <th className="py-2 pl-3 text-right">Avg pos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.search.topQueries.map((q) => (
                        <tr key={q.query} className="border-b border-line/60">
                          <td className="py-2 pr-3 text-ink">{q.query}</td>
                          <td className="py-2 pr-3 text-right tabular-nums text-ink">{int(q.clicks)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{int(q.impressions)}</td>
                          <td className="py-2 pl-3 text-right tabular-nums text-ink-soft">{pos(q.position)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              <Takeaway>
                Live Google Search Console: <strong>{int(d.search.impressions)}</strong> impressions →{' '}
                <strong>{int(d.search.clicks)}</strong> clicks ({pct1(d.search.ctr)} CTR) at avg position{' '}
                <strong>{pos(d.search.position)}</strong>. Pages indexed: <strong>{d.pagesIndexed != null ? int(d.pagesIndexed) : '—'}</strong>
                {d.pagesIndexed == null ? ' (no sitemap counts — submit a sitemap in Search Console for an exact figure)' : ''}.
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

      {/* Reputation — Google reviews, full history (not range-filtered: the
          rating is a property of the clinic, not of the week being viewed). */}
      <Card>
        <SectionHeader tag="D6" eyebrow="Reputation · Google Business Profile" title="Google reviews" />
        <div className="px-5 pb-5 pt-4">
          {reviews ? (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <SearchStat label="Average rating" value={`${reviews.avg.toFixed(2)} ★`} />
                <SearchStat label="Total reviews" value={int(reviews.total)} />
                <SearchStat label="5-star share" value={pct1(reviews.fiveStarShare)} />
                <SearchStat label="Response rate" value={pct1(reviews.responseRate)} />
              </div>
              {reviews.unanswered > 0 ? (
                <p className="mt-3 text-[12px] font-medium text-watch">
                  {int(reviews.unanswered)} written review{reviews.unanswered === 1 ? '' : 's'} still without a reply — responses
                  are a local-ranking signal, and an unanswered complaint is public.
                </p>
              ) : null}
              {reviews.months.length > 1 ? (
                <div className="mt-4">
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-ink-faint">Reviews per month (avg rating)</p>
                  <HBarChart
                    data={reviews.months.map((m) => ({ label: `${m.month} · ${m.avg.toFixed(1)}★`, value: m.count })) as BarDatum[]}
                    valueFormat="int"
                  />
                </div>
              ) : null}
              <div className="mt-4 space-y-2.5">
                {reviews.latest.map((r, i) => (
                  <div key={i} className="rounded-card border border-line p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] font-medium text-ink">
                        {r.reviewer ?? 'Anonymous'}
                        <span className="ml-2 text-watch">{'★'.repeat(r.rating)}</span>
                      </p>
                      <p className="text-[10.5px] text-ink-faint">
                        {r.createdAt.slice(0, 10)}
                        {r.replied ? ' · replied' : r.comment ? ' · no reply yet' : ''}
                      </p>
                    </div>
                    {r.comment ? <p className="mt-1 text-[12px] leading-snug text-ink-soft">{r.comment}</p> : null}
                  </div>
                ))}
              </div>
              <Takeaway>
                Every Google review on the profile, synced hourly — reviewer, rating, text and whether the clinic replied.
                The calls / directions / map-view counts from the same profile live on the ⭐ Growth Platform under GMB.
              </Takeaway>
            </>
          ) : (
            <DataGapInline
              detail="no reviews synced yet — the hourly sync fills this automatically (needs the Google My Business API enabled in the same Google Cloud project)"
              owner={ownerFor('channel')}
            />
          )}
        </div>
      </Card>
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
