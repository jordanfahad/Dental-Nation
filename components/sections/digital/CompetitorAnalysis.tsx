import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import { TrendChart } from '@/components/charts/Charts';
import { ownerFor } from '@/config/data-gap-owners';
import { COMPETITORS, OWN, type CompetitorDef } from '@/config/competitors';
import { getCompetitorSnapshots, hasData, type CompetitorSnapshot } from '@/lib/analytics/competitor';
import { dubaiDateLabel } from '@/lib/dates';

const int = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toLocaleString('en-US'));
const pct = (n: number | null) => (n == null ? '—' : `${Math.round(n * 100)}%`);
const sum = (xs: (number | null)[]) => xs.reduce<number>((a, x) => a + (x ?? 0), 0);
const USD_AED = 3.6725;

function totals(s: CompetitorSnapshot) {
  const m = s.markets;
  const organic = sum(m.map((x) => x.organicVisits));
  const paid = sum(m.map((x) => x.paidVisits));
  const brandVisits = sum(m.map((x) => x.brandVisits));
  return {
    organic, paid, search: organic + paid,
    keywords: sum(m.map((x) => x.organicKeywords)),
    adSpendAed: sum(m.map((x) => x.paidCostUsd)) * USD_AED,
    brandSearches: sum(m.map((x) => x.brandSearches)),
    brandShare: organic > 0 ? brandVisits / organic : null,
  };
}

/**
 * Digital & SEO › Competitor analysis (Mr Akbar, 2 Oct 2026): a competitor's
 * Google traffic by market, brand affinity, authority and an honest monthly
 * leads range, beside Dental Nation's own figures. Live data is DataForSEO,
 * refreshed weekly by the sync cron (lib/analytics/competitor.ts); public
 * claims and their sources sit in config/competitors.ts.
 */
export async function CompetitorAnalysis() {
  const snaps = await getCompetitorSnapshots().catch(() => new Map<string, CompetitorSnapshot>());
  const ownSnap = snaps.get(OWN.domain) ?? null;
  const own = hasData(ownSnap) ? ownSnap : null;
  return (
    <div className="space-y-4">
      {COMPETITORS.map((c) => (
        <CompetitorBlock key={c.domain} c={c} s={snaps.get(c.domain) ?? null} own={own} />
      ))}
    </div>
  );
}

function CompetitorBlock({ c, s, own }: { c: CompetitorDef; s: CompetitorSnapshot | null; own: CompetitorSnapshot | null }) {
  if (!hasData(s)) {
    const tried = s as CompetitorSnapshot | null;
    const noCredit = tried?.errors.some((e) => /402/.test(e));
    return (
      <Card>
        <SectionHeader tag="C1" eyebrow="Competitor analysis" title={`${c.name} (${c.domain})`} />
        <div className="px-5 pb-5 pt-4">
          <DataGapInline
            detail={
              noCredit && tried
                ? `DataForSEO refused the read on ${dubaiDateLabel(tried.fetchedAt.slice(0, 10))}: the account has no credit left (402 Payment Required). Top up the DataForSEO balance; the sync retries every 6 hours and fills this in`
                : tried
                  ? `DataForSEO returned no figures on ${dubaiDateLabel(tried.fetchedAt.slice(0, 10))} (${tried.errors[0] ?? 'no data'}); the sync retries every 6 hours`
                  : 'First DataForSEO read runs on the next sync (every 15 minutes); figures appear here after it'
            }
            owner={ownerFor('tracking')}
          />
          <Facts c={c} />
        </div>
      </Card>
    );
  }
  const t = totals(s);
  // Markets report different lengths of history; the last 24 months is where all of them have data.
  const trend = s.brandTrend.slice(-24);
  const o = own ? totals(own) : null;
  const uae = s.markets.find((m) => m.market === 'UAE') ?? null;
  const ksa = s.markets.find((m) => m.market === 'Saudi Arabia') ?? null;
  const searchLeads: [number, number] = [t.search * 0.01, t.search * 0.03];
  const implied = c.claimedPatientsPerYear
    ? ([c.claimedPatientsPerYear / 12 / c.leadToPatient[1], c.claimedPatientsPerYear / 12 / c.leadToPatient[0]] as [number, number])
    : null;
  const byRevenue = c.revenueCheck
    ? ([c.revenueCheck.patientsPerYear / 12 / c.leadToPatient[1], c.revenueCheck.patientsPerYear / 12 / c.leadToPatient[0]] as [number, number])
    : null;
  const sortedMarkets = [...s.markets].sort((a, b) => (b.organicVisits ?? 0) + (b.paidVisits ?? 0) - (a.organicVisits ?? 0) - (a.paidVisits ?? 0));
  const top = sortedMarkets[0];
  const trendLast = trend.at(-1)?.searches ?? null;
  const trendYearAgo = trend.length >= 13 ? trend.at(-13)!.searches : null;
  const brandGrowth = trendLast != null && trendYearAgo ? trendLast / trendYearAgo - 1 : null;

  const kpis: KpiItem[] = [
    { label: 'Google visits / month (est.)', value: int(t.search), gapDetail: 'no search data' },
    { label: 'of which paid (Google Ads)', value: int(t.paid) },
    { label: 'Est. Google Ads spend / month', value: t.adSpendAed ? `AED ${int(t.adSpendAed)}` : 'none seen' },
    { label: 'Brand searches / month', value: int(t.brandSearches), deltaPct: brandGrowth, spark: trend.map((x) => x.searches) },
    { label: 'Google traffic from brand searches', value: pct(t.brandShare) },
    { label: 'Leads / month from Google (est.)', value: `${int(searchLeads[0])}–${int(searchLeads[1])}` },
  ];

  return (
    <>
      <Card highlight>
        <SectionHeader
          tag="C1"
          eyebrow="Competitor analysis"
          title={`${c.name} (${c.domain}): traffic, brand and leads`}
          right={<span className="text-[11px] text-ink-faint">DataForSEO · read {dubaiDateLabel(s.fetchedAt.slice(0, 10))} · weekly</span>}
        />
        <div className="px-5 pb-5 pt-4">
          <KpiBand items={kpis} />
          <Takeaway>
            {c.name} gets about <b>{int(t.search)}</b> visits a month from Google across {s.markets.length} markets
            {top ? <> (largest: <b>{top.market}</b>, {int((top.organicVisits ?? 0) + (top.paidVisits ?? 0))})</> : null}.
            {' '}<b>{pct(t.brandShare)}</b> of its Google visits come from people already searching “{c.brandKeyword}”, and
            {' '}<b>{int(t.brandSearches)}</b> people search the brand by name each month
            {brandGrowth != null ? <> ({brandGrowth >= 0 ? 'up' : 'down'} {pct(Math.abs(brandGrowth))} on a year ago)</> : null}.
            {uae ? <> In the UAE it gets about <b>{int((uae.organicVisits ?? 0) + (uae.paidVisits ?? 0))}</b> Google visits a month{ksa ? <>, and <b>{int((ksa.organicVisits ?? 0) + (ksa.paidVisits ?? 0))}</b> in Saudi Arabia (Riyadh clinic)</> : null}.</> : null}
          </Takeaway>
          {s.errors.length ? <p className="mt-2 text-[11px] text-ink-faint">Some figures could not be read this week: {s.errors.slice(0, 4).join(' · ')}</p> : null}
        </div>
      </Card>

      <Card>
        <SectionHeader tag="C2" eyebrow="Traffic" title="Google traffic by market (monthly estimate)" />
        <div className="overflow-x-auto px-5 pb-5 pt-4">
          <table className="w-full min-w-[760px] text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                <th className="py-2 pr-3">Market</th>
                <th className="py-2 pr-3 text-right">Organic visits</th>
                <th className="py-2 pr-3 text-right">Paid visits</th>
                <th className="py-2 pr-3 text-right">Est. ad spend (AED)</th>
                <th className="py-2 pr-3 text-right">Keywords ranked</th>
                <th className="py-2 pr-3 text-right">In top 3</th>
                <th className="py-2 pr-3 text-right">Brand searches</th>
                <th className="py-2 pl-3 text-right">Visits from brand</th>
              </tr>
            </thead>
            <tbody>
              {sortedMarkets.map((m) => (
                <tr key={m.market} className={`border-b border-line/60 ${m.market === 'UAE' || m.market === 'Saudi Arabia' ? 'bg-accent/5' : ''}`}>
                  <td className="py-2 pr-3 font-medium text-ink">{m.market}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink">{int(m.organicVisits)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{int(m.paidVisits)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{m.paidCostUsd == null ? '—' : int(m.paidCostUsd * USD_AED)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{int(m.organicKeywords)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{int(m.top3)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{int(m.brandSearches)}</td>
                  <td className="py-2 pl-3 text-right tabular-nums text-ink-soft">{int(m.brandVisits)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-2 pr-3 text-ink">All markets</td>
                <td className="py-2 pr-3 text-right tabular-nums">{int(t.organic)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{int(t.paid)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{int(t.adSpendAed)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{int(t.keywords)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{int(sum(s.markets.map((m) => m.top3)))}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{int(t.brandSearches)}</td>
                <td className="py-2 pl-3 text-right tabular-nums">{int(sum(s.markets.map((m) => m.brandVisits)))}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-ink-faint">
            Google only (organic results and Google Ads), estimated by DataForSEO from rankings and search volumes. Visits from
            Facebook, Instagram, TikTok, email and direct are not visible to any outside tool; {c.name} runs dedicated
            Facebook/Instagram landing pages, so its total traffic is higher than this. Ad spend is what the paid clicks would
            cost at Google prices (USD converted at 3.67).
          </p>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <SectionHeader tag="C3" eyebrow="Brand affinity" title={`People searching “${c.brandKeyword}” each month`} />
          <div className="px-5 pb-5 pt-4">
            {trend.length ? (
              <TrendChart data={trend} series={[{ key: 'searches', label: 'Brand searches', color: '#B45F53', kind: 'area' }]} xFormat="month" height={200} />
            ) : (
              <DataGapInline detail="no brand search history returned" owner={ownerFor('tracking')} />
            )}
            <table className="mt-3 w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                  <th className="py-2 pr-3">Brand measure</th>
                  <th className="py-2 pr-3 text-right">{c.name}</th>
                  <th className="py-2 pl-3 text-right">Dental Nation (UAE)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-line/60"><td className="py-2 pr-3">Brand searches / month</td><td className="py-2 pr-3 text-right tabular-nums">{int(t.brandSearches)}</td><td className="py-2 pl-3 text-right tabular-nums">{int(o?.brandSearches)}</td></tr>
                <tr className="border-b border-line/60"><td className="py-2 pr-3">Google traffic from brand searches</td><td className="py-2 pr-3 text-right tabular-nums">{pct(t.brandShare)}</td><td className="py-2 pl-3 text-right tabular-nums">{pct(o?.brandShare ?? null)}</td></tr>
                <tr className="border-b border-line/60"><td className="py-2 pr-3">Referring domains</td><td className="py-2 pr-3 text-right tabular-nums">{int(s.backlinks?.referringDomains)}</td><td className="py-2 pl-3 text-right tabular-nums">{int(own?.backlinks?.referringDomains)}</td></tr>
                <tr><td className="py-2 pr-3">Backlinks</td><td className="py-2 pr-3 text-right tabular-nums">{int(s.backlinks?.backlinks)}</td><td className="py-2 pl-3 text-right tabular-nums">{int(own?.backlinks?.backlinks)}</td></tr>
              </tbody>
            </table>
            <p className="mt-2 text-[11px] text-ink-faint">
              Brand searches show how many people already know the name and look for it. A high share of traffic from brand
              searches means patients come because of the brand (reputation, ads, word of mouth), not because the site ranks
              for treatments. Dental Nation is measured in the UAE only.
            </p>
          </div>
        </Card>

        <Card>
          <SectionHeader tag="C4" eyebrow="Leads" title="How many leads a month (estimate)" />
          <div className="px-5 pb-5 pt-4 text-[12.5px] leading-snug text-ink-soft">
            <p className="text-ink">Their real lead numbers are private, so we estimate two ways:</p>
            <p className="mt-2">
              <b className="text-ink">1. From Google traffic:</b> {int(t.search)} Google visits a month × 1–3% who send a form or
              WhatsApp = <b className="text-ink">{int(searchLeads[0])}–{int(searchLeads[1])} leads a month</b> from Google alone.
            </p>
            {implied ? (
              <p className="mt-2">
                <b className="text-ink">2. From their own patient numbers:</b> they say they treat {int(c.claimedPatientsPerYear)} patients
                a year, about {int(c.claimedPatientsPerYear! / 12)} a month. In dental tourism {pct(c.leadToPatient[0])}–{pct(c.leadToPatient[1])} of
                leads travel and get treated, so that needs <b className="text-ink">{int(implied[0])}–{int(implied[1])} leads a month</b> from
                all channels (Google, Facebook, Instagram, agents, referrals).
              </p>
            ) : null}
            {byRevenue && c.revenueCheck ? (
              <p className="mt-2">
                <b className="text-ink">3. From their revenue:</b> {c.revenueCheck.note}, about {int(c.revenueCheck.patientsPerYear / 12)} patients a
                month, which needs <b className="text-ink">{int(byRevenue[0])}–{int(byRevenue[1])} leads a month</b>. Their own patient claim
                looks overstated, so the real figure is most likely nearer this one.
              </p>
            ) : null}
            <p className="mt-2">
              {implied && implied[0] > searchLeads[1]
                ? <>The gap between the two is the share of leads that come from outside Google, mostly paid social and agents. That makes Meta their main lead engine, with Google second.</>
                : <>The two estimates overlap, which suggests Google is a major source of their leads.</>}
            </p>
            <p className="mt-3 text-[11px] text-ink-faint">
              The 1–3% rate is the same one used on the Digital & SEO tab. The lead-to-patient range is a planning assumption, not their data.
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <SectionHeader tag="C5" eyebrow="Search" title={`What they win on Google${s.topKeywords ? ` (${s.topKeywords.market})` : ''}`} />
          <div className="overflow-x-auto px-5 pb-5 pt-4">
            {s.topKeywords?.rows.length ? (
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                    <th className="py-2 pr-3">Search (not their name)</th>
                    <th className="py-2 pr-3 text-right">Searches / mo</th>
                    <th className="py-2 pr-3 text-right">Position</th>
                    <th className="py-2 pl-3 text-right">Visits / mo</th>
                  </tr>
                </thead>
                <tbody>
                  {s.topKeywords.rows.map((k) => (
                    <tr key={k.keyword} className="border-b border-line/60">
                      <td className="py-2 pr-3 text-ink">{k.keyword}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{int(k.volume)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{int(k.position)}</td>
                      <td className="py-2 pl-3 text-right tabular-nums text-ink">{int(k.visits)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <DataGapInline detail="no keyword list returned this week" owner={ownerFor('tracking')} />
            )}
          </div>
        </Card>

        <Card>
          <SectionHeader tag="C6" eyebrow="Profile" title={`About ${c.name} (their public claims)`} />
          <div className="px-5 pb-5 pt-4">
            <Facts c={c} />
          </div>
        </Card>
      </div>
    </>
  );
}

function Facts({ c }: { c: CompetitorDef }) {
  if (!c.facts.length) return null;
  return (
    <dl className="mt-1 space-y-2 text-[12.5px]">
      {c.facts.map((f) => (
        <div key={f.label}>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">{f.label}</dt>
          <dd className="text-ink">{f.value} <span className="text-[11px] text-ink-faint">· {f.source}</span></dd>
        </div>
      ))}
    </dl>
  );
}
