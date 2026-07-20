import { getDigitalSeo } from '@/lib/analytics/digital';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import { HBarChart, Donut, type BarDatum } from '@/components/charts/Charts';
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
 * Digital & SEO tab — website traffic, organic/SEO + paid channels, the Google
 * PageSpeed on-page SEO score, the booking-widget funnel, UAE-emirate geography,
 * demographics and a social snapshot. Pages indexed + organic keyword data wait
 * on Google Search Console (surfaced as an honest gap).
 */
export async function DigitalSeo({ range }: { range?: { from?: string; to?: string } }) {
  const d = await getDigitalSeo(range ?? {});

  const kpis: KpiItem[] = [
    { label: 'Sessions', value: d.traffic ? int(d.traffic.sessions) : null, hint: 'GA4 · all traffic', gapDetail: d.ga4Note ?? 'no GA4 data', gapOwner: ownerFor('channel') },
    { label: 'Users', value: d.traffic ? int(d.traffic.users) : null, hint: d.traffic?.newUsers != null ? `${int(d.traffic.newUsers)} new` : undefined },
    { label: 'Organic (SEO) traffic', value: d.ga4Available ? int(d.organicSessions) : null, hint: 'Organic Search sessions' },
    { label: 'Paid traffic', value: d.ga4Available ? int(d.paidSessions) : null, hint: 'paid channels' },
    { label: 'SEO score', value: d.seo?.seo != null ? String(d.seo.seo) : null, hint: 'Lighthouse · /100', gapDetail: 'PageSpeed unavailable', gapOwner: ownerFor('tracking') },
    { label: 'Pages indexed', value: d.pagesIndexed != null ? int(d.pagesIndexed) : null, hint: 'Search Console', gapDetail: d.search?.note ?? 'connect Google Search Console', gapOwner: ownerFor('tracking') },
  ];

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader tag="D" eyebrow="Digital & SEO" title="Website, search & social at a glance" />
        <div className="px-5 pb-5 pt-4"><KpiBand items={kpis} /></div>
      </Card>

      {/* Site health scores */}
      <Card>
        <SectionHeader tag="D1" eyebrow="Site health · Lighthouse" title="On-page scores (mobile)" />
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
            On-page SEO health from Google Lighthouse (0–100) — structure, meta, crawlability. <strong>Pages indexed</strong> and
            organic keyword/impression/click data require <strong>Google Search Console</strong>, which isn&apos;t connected yet.
          </Takeaway>
        </div>
      </Card>

      {/* Organic search · Search Console */}
      <Card>
        <SectionHeader
          tag="D1b"
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

      {/* Channels */}
      <Card>
        <SectionHeader tag="D2" eyebrow="Acquisition" title="Traffic by channel (organic, paid & more)" />
        <div className="px-5 pb-5 pt-4">
          {d.channels.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-[12.5px]">
                <thead>
                  <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                    <th className="py-2 pr-3">Channel</th>
                    <th className="py-2 pr-3 text-right">Sessions</th>
                    <th className="py-2 pr-3 text-right">Users</th>
                    <th className="py-2 pl-3 text-right">Leads</th>
                  </tr>
                </thead>
                <tbody>
                  {d.channels.map((c) => (
                    <tr key={c.label} className="border-b border-line/60">
                      <td className="py-2 pr-3 font-medium text-ink">{c.label}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-ink">{int(c.sessions)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{int(c.users)}</td>
                      <td className="py-2 pl-3 text-right tabular-nums text-ink">{int(c.leads)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <DataGapInline detail={d.ga4Note ?? 'no GA4 channel data'} owner={ownerFor('channel')} />
          )}
        </div>
      </Card>

      {/* Booking funnel */}
      <Card>
        <SectionHeader tag="D3" eyebrow="Booking widget" title="Viewed → opened → submitted" />
        <div className="px-5 pb-5 pt-4">
          <div className="grid grid-cols-3 gap-3">
            <Funnel label="Widget viewed" value={int(d.funnel.viewed)} note="scrolled into view" />
            <Funnel label="Booking opened" value={int(d.funnel.opened)} note="started a booking" />
            <Funnel label="Submitted" value={int(d.funnel.submitted)} note="lead events" strong />
          </div>
          <Takeaway>Website booking-widget engagement across the five lanes (GA4 events). Opened = clicked a booking-flow card; submitted = on-site lead events.</Takeaway>
        </div>
      </Card>

      {/* Geography + demographics */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionHeader tag="D4" eyebrow="Geography" title="Traffic by UAE emirate" />
          <div className="px-5 pb-5 pt-4">
            {d.byEmirate.length ? (
              <HBarChart data={d.byEmirate.map((e) => ({ label: e.label, value: e.sessions })) as BarDatum[]} valueFormat="int" />
            ) : (
              <DataGapInline detail="no emirate-level GA4 traffic" owner={ownerFor('channel')} />
            )}
            <p className="mt-2 text-[11px] text-ink-faint">Landing-page traffic by GA4 region (UAE emirates).</p>
          </div>
        </Card>
        <Card>
          <SectionHeader tag="D5" eyebrow="Audience" title="Demographics" />
          <div className="grid grid-cols-1 gap-5 px-5 pb-5 pt-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Gender</p>
              <Donut data={d.gender.map((g) => ({ label: g.label, value: g.sessions })) as BarDatum[]} valueFormat="int" centerLabel="sessions" height={170} />
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Age</p>
              <HBarChart data={d.age.map((a) => ({ label: a.label, value: a.sessions })) as BarDatum[]} valueFormat="int" />
            </div>
          </div>
        </Card>
      </div>

      {/* Social */}
      <Card>
        <SectionHeader tag="D6" eyebrow="Social" title="Social media snapshot" />
        <div className="px-5 pb-5 pt-4">
          {d.social.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-[12.5px]">
                <thead>
                  <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                    <th className="py-2 pr-3">Channel</th>
                    <th className="py-2 pr-3 text-right">Followers</th>
                    <th className="py-2 pr-3 text-right">Reach</th>
                    <th className="py-2 pl-3 text-right">Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {d.social.map((s) => (
                    <tr key={s.channel} className="border-b border-line/60">
                      <td className="py-2 pr-3 font-medium text-ink">{s.label}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-ink">{int(s.followers)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{int(s.reach)}</td>
                      <td className="py-2 pl-3 text-right tabular-nums text-ink-soft">{int(s.engagement)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <DataGapInline detail="no social signals synced yet" owner={ownerFor('content')} />
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

function Funnel({ label, value, note, strong }: { label: string; value: string; note?: string; strong?: boolean }) {
  return (
    <div className={`rounded-card border p-4 text-center ${strong ? 'border-good/40 bg-good/5' : 'border-line'}`}>
      <p className="text-[10.5px] uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={`mt-1 text-[22px] font-semibold tabular-nums ${strong ? 'text-good' : 'text-ink'}`}>{value}</p>
      {note ? <p className="mt-0.5 text-[10.5px] text-ink-faint">{note}</p> : null}
    </div>
  );
}
