import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import { TrendChart } from '@/components/charts/Charts';
import { ownerFor } from '@/config/data-gap-owners';
import { COMPETITORS, GAP_DIMENSIONS, GBP_AED, OWN, type CompetitorDef } from '@/config/competitors';
import { DENTISTS } from '@/lib/smileclub/scripts';
import { getCompetitorSnapshots, hasData, type CompetitorSnapshot } from '@/lib/analytics/competitor';
import { getChannelPerformance } from '@/lib/growth/channelPerformance';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { dubaiDateLabel } from '@/lib/dates';

/** Dental Nation's own side of the comparison: enquiries by channel (last 90 days) and social followers. */
interface OwnSide {
  from: string;
  to: string;
  enquiries: Record<string, number>;
  total: number;
  followers: Record<string, number>;
  /** Last 30 days: ad spend (AED) and Meta leads counted as people. */
  metaSpend30: number;
  googleSpend30: number;
  metaGross30: number;
  metaNet30: number;
  googleConv30: number;
  /** Enquiries logged in the In-House Lead Tracker in the last 30 days. */
  tracker30: number;
  reviews: number;
  rating: number | null;
}

async function ownSide(): Promise<OwnSide> {
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10);
  const out: OwnSide = { from, to, enquiries: {}, total: 0, followers: {}, metaSpend30: 0, googleSpend30: 0, metaGross30: 0, metaNet30: 0, googleConv30: 0, tracker30: 0, reviews: 0, rating: null };
  try {
    const perf = await getChannelPerformance({ from, to });
    for (const ch of perf.channels) { out.enquiries[ch.key] = ch.enquiries; out.total += ch.enquiries; }
  } catch { /* the mapping card says so */ }
  const db = getSupabaseAdmin();
  if (db) {
    const { data } = await db.from('social_insights').select('channel, value, day').eq('metric', 'followers').order('day', { ascending: false }).limit(20);
    for (const r of (data ?? []) as { channel: string; value: number | string }[]) if (!(r.channel in out.followers)) out.followers[r.channel] = Number(r.value) || 0;
    const d30 = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
    const act = (actions: unknown, t: string) => (Array.isArray(actions) ? (actions as { action_type: string; value: string }[]).filter((x) => x.action_type === t).reduce((n, x) => n + (Number(x.value) || 0), 0) : 0);
    const [meta, gads, rev, trk] = await Promise.all([
      db.from('meta_insights_raw').select('spend, data').gte('date', d30),
      db.from('google_ads_insights_raw').select('spend, conversions').gte('date', d30),
      db.from('gmb_reviews').select('rating'),
      db.from('raw_lead_tracker').select('data'),
    ]);
    for (const r of (meta.data ?? []) as { spend: number | null; data: { actions?: unknown } | null }[]) {
      out.metaSpend30 += Number(r.spend ?? 0);
      const a = r.data?.actions;
      out.metaGross30 += Math.max(act(a, 'lead'), act(a, 'onsite_conversion.messaging_conversation_started_7d'));
      out.metaNet30 += act(a, 'onsite_conversion.messaging_user_depth_2_message_send');
    }
    for (const r of (gads.data ?? []) as { spend: number | null; conversions: number | null }[]) { out.googleSpend30 += Number(r.spend ?? 0); out.googleConv30 += Number(r.conversions ?? 0); }
    const ratings = ((rev.data ?? []) as { rating: number | null }[]).map((r) => Number(r.rating)).filter((n) => Number.isFinite(n) && n > 0);
    out.reviews = (rev.data ?? []).length;
    out.rating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    for (const r of (trk.data ?? []) as { data: Record<string, unknown> }[]) {
      const m = String(r.data?.['Date'] ?? '').trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
      if (m && `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` >= d30) out.tracker30 += 1;
    }
  }
  return out;
}

const int = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toLocaleString('en-US'));
const pct = (n: number | null) => (n == null ? '—' : `${Math.round(n * 100)}%`);
const sum = (xs: (number | null)[]) => xs.reduce<number>((a, x) => a + (x ?? 0), 0);
const USD_AED = 3.6725;

/**
 * Totals across markets. DataForSEO's paid figures come from its keyword
 * sample and miss most ad placements, so when it finds no paid clicks the
 * Google Ads figures use the benchmark for a brand of this size (upper end,
 * split across the markets the campaigns run in by organic traffic).
 */
function totals(s: CompetitorSnapshot, c: CompetitorDef) {
  const m = s.markets;
  const organic = sum(m.map((x) => x.organicVisits));
  const measuredPaid = sum(m.map((x) => x.paidVisits));
  const brandVisits = sum(m.map((x) => x.brandVisits));
  const ga = c.googleAds;
  const gaSpendGbp = ga.spendPerMarketGbp[1] * ga.marketsRunning;
  const gaClicks = Math.round(gaSpendGbp / ga.cpcGbp[0]);
  const paidEstimated = measuredPaid === 0;
  const adMarkets = m.filter((x) => ga.markets.includes(x.market));
  const adOrganic = sum(adMarkets.map((x) => x.organicVisits)) || 1;
  const share = (x: MarketRowLike) => (ga.markets.includes(x.market) ? (x.organicVisits ?? 0) / adOrganic : 0);
  const paidByMarket = new Map(m.map((x) => [x.market, paidEstimated ? Math.round(gaClicks * share(x)) : (x.paidVisits ?? 0)]));
  const spendByMarketAed = new Map(m.map((x) => [x.market, paidEstimated ? gaSpendGbp * GBP_AED * share(x) : (x.paidCostUsd ?? 0) * USD_AED]));
  const paid = paidEstimated ? gaClicks : measuredPaid;
  return {
    organic, paid, search: organic + paid, paidEstimated, paidByMarket, spendByMarketAed,
    keywords: sum(m.map((x) => x.organicKeywords)),
    adSpendAed: paidEstimated ? gaSpendGbp * GBP_AED : sum(m.map((x) => x.paidCostUsd)) * USD_AED,
    brandSearches: sum(m.map((x) => x.brandSearches)),
    brandShare: organic > 0 ? brandVisits / organic : null,
  };
}
type MarketRowLike = { market: string; organicVisits: number | null };

/**
 * Digital & SEO › Competitor analysis (Mr Akbar, 2 Oct 2026): a competitor's
 * Google traffic by market, brand affinity, authority and an honest monthly
 * leads range, beside Dental Nation's own figures. Live data is DataForSEO,
 * refreshed weekly by the sync cron (lib/analytics/competitor.ts); public
 * claims and their sources sit in config/competitors.ts.
 */
export async function CompetitorAnalysis() {
  const [snaps, mine] = await Promise.all([
    getCompetitorSnapshots().catch(() => new Map<string, CompetitorSnapshot>()),
    ownSide(),
  ]);
  const ownSnap = snaps.get(OWN.domain) ?? null;
  const own = hasData(ownSnap) ? ownSnap : null;
  return (
    <div className="space-y-4">
      {COMPETITORS.map((c) => (
        <CompetitorBlock key={c.domain} c={c} s={snaps.get(c.domain) ?? null} own={own} mine={mine} />
      ))}
    </div>
  );
}

const mid = (r: [number, number]) => (r[0] + r[1]) / 2;
const range = (r: [number, number]) => `${int(r[0])}–${int(r[1])}`;

function CompetitorBlock({ c, s, own, mine }: { c: CompetitorDef; s: CompetitorSnapshot | null; own: CompetitorSnapshot | null; mine: OwnSide }) {
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
  const t = totals(s, c);
  // Markets report different lengths of history; the last 24 months is where all of them have data.
  const trend = s.brandTrend.slice(-24);
  const o = own ? totals(own, OWN) : null;
  const uae = s.markets.find((m) => m.market === 'UAE') ?? null;
  const ksa = s.markets.find((m) => m.market === 'Saudi Arabia') ?? null;
  const searchLeads: [number, number] = [t.search * 0.01, t.search * 0.03];
  const implied = c.claimedPatientsPerYear
    ? ([c.claimedPatientsPerYear / 12 / c.leadToPatient[1], c.claimedPatientsPerYear / 12 / c.leadToPatient[0]] as [number, number])
    : null;
  const byRevenue = c.revenueCheck
    ? ([c.revenueCheck.patientsPerYear / 12 / c.leadToPatient[1], c.revenueCheck.patientsPerYear / 12 / c.leadToPatient[0]] as [number, number])
    : null;
  // Leads by channel: the brand's total (revenue-based, else their claim, else Google scaled up by its typical share),
  // split by the channel model; the two Google rows use the measured figures instead of the typical share.
  const totalLeads: [number, number] = byRevenue ?? implied ?? [searchLeads[0] / 0.25, searchLeads[1] / 0.15];
  // Google Ads leads: measured clicks × 2–5%, or the benchmark leads when the clicks are the benchmark.
  const ga = c.googleAds;
  const gaLeads: [number, number] = [ga.leadsPerMarket[0] * ga.marketsRunning, ga.leadsPerMarket[1] * ga.marketsRunning];
  const paidOff = t.paidEstimated;
  const paidLeads: [number, number] = paidOff ? gaLeads : [t.paid * 0.02, t.paid * 0.05];
  // Headline figures sit at the upper end of each estimate (Mr Akbar's ask); the ranges stay in the detail.
  const netLeads = Math.round(totalLeads[1]);
  const grossLeads: [number, number] = [netLeads / c.netOfGross[1], netLeads / c.netOfGross[0]];
  const patients = Math.round(netLeads * c.leadToPatient[0]);
  // Total site traffic: organic search is usually 14–20% of all visits for a brand like this.
  const totalVisits: [number, number] = [t.organic / c.traffic.organicShare[1], t.organic / c.traffic.organicShare[0]];
  const trafficRows = c.traffic.sources.map((src) => ({
    src,
    visits: src.key === 'organic-search' ? ([t.organic, t.organic] as [number, number])
      : src.key === 'paid-search' ? ([t.paid, t.paid] as [number, number])
      : ([totalVisits[0] * src.share[0], totalVisits[1] * src.share[1]] as [number, number]),
    measured: src.key === 'organic-search' || (src.key === 'paid-search' && !paidOff),
  }));
  const channelRows = c.channels.map((ch) => {
    const modelled: [number, number] = [totalLeads[0] * ch.share[0], totalLeads[1] * ch.share[1]];
    const measured: [number, number] | null = ch.key === 'google-organic' ? searchLeads : ch.key === 'google-paid' ? paidLeads : null;
    const leads = measured ?? modelled;
    const evidence =
      ch.key === 'meta-paid' && s.metaAds
        ? s.metaAds.error
          ? `Ad Library could not be read (${s.metaAds.error})`
          : `${s.metaAds.activeAds} ads live in ${s.metaAds.countries.join('/')} right now${s.metaAds.euReach ? `, reaching ${int(s.metaAds.euReach)} people in the EU` : ''}${Object.keys(s.metaAds.platforms).length ? ` (${Object.entries(s.metaAds.platforms).map(([k, v]) => `${k} ${v}`).join(', ')})` : ''}`
        : ch.key === 'google-organic' ? `measured: ${int(t.organic)} organic Google visits a month`
        : ch.key === 'google-paid' ? (paidOff ? `benchmark for a brand of this size: about ${int(t.paid)} clicks for AED ${int(t.adSpendAed)} a month across ${ga.marketsRunning} markets` : `measured: ${int(t.paid)} paid Google clicks a month`)
        : ch.key === 'social-organic' ? `${int(sum(c.social.map((x) => x.followers)))} followers across ${c.social.map((x) => x.platform).join(', ')}`
        : null;
    return { ch, leads, measured: !!measured, evidence };
  });
  const bestChannel = [...channelRows].sort((a, b) => mid(b.leads) - mid(a.leads))[0];
  const modelTotal = channelRows.reduce((n, r) => n + mid(r.leads), 0);
  const ownBuckets = c.channels.map((ch) => ({ ch, enquiries: ch.own.reduce((n, k) => n + (mine.enquiries[k] ?? 0), 0) }));
  const ownBest = [...ownBuckets].sort((a, b) => b.enquiries - a.enquiries)[0];
  const sortedMarkets = [...s.markets].sort((a, b) => (b.organicVisits ?? 0) + (b.paidVisits ?? 0) - (a.organicVisits ?? 0) - (a.paidVisits ?? 0));
  const top = sortedMarkets[0];
  const trendLast = trend.at(-1)?.searches ?? null;
  const trendYearAgo = trend.length >= 13 ? trend.at(-13)!.searches : null;
  const brandGrowth = trendLast != null && trendYearAgo ? trendLast / trendYearAgo - 1 : null;

  const kpis: KpiItem[] = [
    { label: 'Google visits / month', value: int(t.search), gapDetail: 'no search data' },
    { label: 'All site visits / month (est.)', value: `${int(totalVisits[0])}–${int(totalVisits[1])}` },
    { label: `Google Ads visits / month${paidOff ? ' (est.)' : ''}`, value: int(t.paid) },
    { label: `Google Ads spend / month${paidOff ? ' (est.)' : ''}`, value: `AED ${int(t.adSpendAed)}` },
    { label: 'Brand searches / month', value: int(t.brandSearches), deltaPct: brandGrowth, spark: trend.map((x) => x.searches) },
    { label: 'Google traffic from brand searches', value: pct(t.brandShare) },
    { label: 'Net leads / month (est.)', value: int(netLeads) },
    { label: 'Gross enquiries / month (est.)', value: int(mid(grossLeads)) },
    { label: 'Best lead channel (est.)', value: bestChannel ? bestChannel.ch.label.replace(/ \(.*\)$/, '') : '—' },
  ];
  const peerMarkets = s.peers.filter((p) => p.rows.length);
  const standing = peerMarkets.map((p) => {
    const me = s.markets.find((m) => m.market === p.market);
    const all = [...p.rows.map((r) => ({ domain: r.domain, brand: r.brandSearches ?? 0, visits: r.organicVisits ?? 0, me: false })), { domain: c.domain, brand: me?.brandSearches ?? 0, visits: me?.organicVisits ?? 0, me: true }];
    const byBrand = [...all].sort((a, b) => b.brand - a.brand);
    const byVisits = [...all].sort((a, b) => b.visits - a.visits);
    return { market: p.market, n: all.length, brandRank: byBrand.findIndex((x) => x.me) + 1, visitRank: byVisits.findIndex((x) => x.me) + 1, rows: byBrand };
  });

  // The fact-finding frame: where we stand on each measure, what is missing, what it takes.
  const ownMetaSpend = mine.metaSpend30 + mine.googleSpend30;
  const ownNetLeads = mine.metaNet30 + Math.round(mine.googleConv30);
  const theirPaid = 20_000 * GBP_AED * 0.5 + t.adSpendAed; // Meta midpoint of GBP 10k–25k plus the Google figure
  const gapRows = GAP_DIMENSIONS.map((g) => {
    const v = {
      leads: { theirs: netLeads, ours: ownNetLeads, fmtT: `${int(netLeads)} (est.)`, fmtO: `${int(ownNetLeads)} (Meta net + Google, last 30 days; ${int(mine.tracker30)} enquiries logged)` },
      paid: { theirs: theirPaid, ours: ownMetaSpend, fmtT: `AED ${int(theirPaid)} (est.)`, fmtO: `AED ${int(ownMetaSpend)} (last 30 days)` },
      brand: { theirs: t.brandSearches, ours: o?.brandSearches ?? 0, fmtT: int(t.brandSearches), fmtO: int(o?.brandSearches) },
      organic: { theirs: t.organic, ours: o?.organic ?? 0, fmtT: int(t.organic), fmtO: int(o?.organic) },
      keywords: { theirs: t.keywords, ours: o?.keywords ?? 0, fmtT: int(t.keywords), fmtO: int(o?.keywords) },
      authority: { theirs: s.backlinks?.referringDomains ?? 0, ours: own?.backlinks?.referringDomains ?? 0, fmtT: int(s.backlinks?.referringDomains), fmtO: int(own?.backlinks?.referringDomains) },
      social: { theirs: sum(c.social.map((x) => x.followers)), ours: sum(Object.values(mine.followers)), fmtT: int(sum(c.social.map((x) => x.followers))), fmtO: int(sum(Object.values(mine.followers))) },
      reviews: { theirs: 1080, ours: mine.reviews, fmtT: '1,080 on Trustpilot (4.3)', fmtO: `${int(mine.reviews)} on Google${mine.rating ? ` (${mine.rating.toFixed(1)})` : ''}` },
      footprint: { theirs: 60, ours: DENTISTS.length, fmtT: '7 clinics in Turkey, Riyadh, London office; 60 dentists', fmtO: `3 clinics in Dubai; ${DENTISTS.length} dentists` },
      languages: { theirs: 11, ours: 1, fmtT: '5 languages, 11 countries', fmtO: '2 languages, 1 city' },
    }[g.key];
    const ratio = v.ours > 0 ? v.theirs / v.ours : null;
    return { g, ...v, ratio };
  });

  return (
    <>
      <Card highlight>
        <SectionHeader
          tag="C0"
          eyebrow="Fact finding"
          title={`Where Dental Nation stands against ${c.name}, what is missing, and what it takes`}
          right={<span className="text-[11px] text-ink-faint">our figures: live from the dashboard</span>}
        />
        <div className="overflow-x-auto px-5 pb-5 pt-4">
          <table className="w-full min-w-[900px] text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                <th className="py-2 pr-3">Measure</th>
                <th className="py-2 pr-3 text-right">{c.name}</th>
                <th className="py-2 pr-3 text-right">Dental Nation</th>
                <th className="py-2 pr-3 text-right">Gap</th>
                <th className="py-2 pr-3">What is missing on our side</th>
                <th className="py-2 pr-3">What it takes</th>
                <th className="py-2 pl-3">Effort</th>
              </tr>
            </thead>
            <tbody>
              {gapRows.map((r) => (
                <tr key={r.g.key} className="border-b border-line/60 align-top">
                  <td className="py-2 pr-3 font-medium text-ink">{r.g.label}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{r.fmtT}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink">{r.fmtO}</td>
                  <td className="py-2 pr-3 text-right tabular-nums font-semibold text-watch">{r.ratio == null ? '—' : r.ratio < 1 ? 'we lead' : `${r.ratio >= 10 ? Math.round(r.ratio) : r.ratio.toFixed(1)}×`}</td>
                  <td className="py-2 pr-3 text-[11.5px] text-ink-soft">{r.g.missing}</td>
                  <td className="py-2 pr-3 text-[11.5px] text-ink-soft">{r.g.effort}</td>
                  <td className="py-2 pl-3"><span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${r.g.level === 'High' ? 'bg-watch/10 text-watch' : r.g.level === 'Medium' ? 'bg-accent/10 text-accent' : 'bg-good/10 text-good'}`}>{r.g.level}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Takeaway>
            In one line: {c.name} is a 15-year brand spending roughly {int(theirPaid / Math.max(ownMetaSpend, 1))} times our media budget, with a content and video engine in five
            languages. The gap is not one thing: it is budget (paid media), production (content and video) and operations (lead handling and
            capacity), built over years. The roadmap below sequences it; the first three months cost little and fix the leaks before the budget goes up.
          </Takeaway>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {[
              ['Months 0 to 3: fix the leaks', 'Reply to every lead within minutes; reviews after every visit; the doctor video programme at three videos a week; Arabic Instagram account; Meta budget to AED 25k a month. Roughly AED 40k a month in all.'],
              ['Months 3 to 12: build the engines', 'Content engine (SEO lead plus two writers), YouTube channel, PR and partner links, treatment coordinators at each clinic, Meta to AED 60k and Google to AED 20k a month. Roughly AED 120k a month by month 12.'],
              ['Months 12 to 36: scale', 'Paid media at AED 100k or more a month as cost per lead holds; 10,000 organic visits; 25,000 to 100,000 followers; 1,000 reviews; brand searches at 5,000 a month. Capacity (DN Elite DIFC) decides how far this goes.'],
            ].map(([h, body]) => (
              <div key={h} className="rounded-card border border-line bg-panel/30 p-3">
                <p className="text-[12px] font-semibold text-ink">{h}</p>
                <p className="mt-1 text-[11.5px] leading-snug text-ink-soft">{body}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-ink-faint">
            Dentakay figures are the estimates on this page; ours are live from the dashboard (DataForSEO for search, Meta and Google Ads for spend
            and leads, Google Business Profile for reviews). Budgets and timelines are planning estimates to be costed per line before commitment.
          </p>
        </div>
      </Card>

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
            {c.name} gets about <b>{int(t.search)}</b> visits a month from Google search across {s.markets.length} markets, which points to
            <b> {int(totalVisits[0])}–{int(totalVisits[1])}</b> visits a month in all (organic search is usually {pct(c.traffic.organicShare[0])}–{pct(c.traffic.organicShare[1])} of a site like this)
            {top ? <> (largest: <b>{top.market}</b>, {int((top.organicVisits ?? 0) + (top.paidVisits ?? 0))})</> : null}.
            {' '}<b>{pct(t.brandShare)}</b> of its Google visits come from people already searching “{c.brandKeyword}”, and
            {' '}<b>{int(t.brandSearches)}</b> people search the brand by name each month
            {brandGrowth != null ? <> ({brandGrowth >= 0 ? 'up' : 'down'} {pct(Math.abs(brandGrowth))} on a year ago)</> : null}.
            {uae ? <> In the UAE it gets about <b>{int((uae.organicVisits ?? 0) + (uae.paidVisits ?? 0))}</b> Google visits a month{ksa ? <>, and <b>{int((ksa.organicVisits ?? 0) + (ksa.paidVisits ?? 0))}</b> in Saudi Arabia (Riyadh clinic)</> : null}.</> : null}
          </Takeaway>
          <p className="mt-2 text-[11px] text-ink-faint">
            Headline figures are the upper end of each estimate. Gross enquiries are everyone who contacts the clinic; net leads are the
            {' '}{pct(c.netOfGross[0])}–{pct(c.netOfGross[1])} of them who are real prospects; about {int(patients)} a month become patients at {pct(c.leadToPatient[0])}.
            {paidOff ? ` Google Ads figures are the benchmark for a brand of this size: DataForSEO's keyword sample found no paid clicks this month, and that sample misses most ad placements.` : ''}
          </p>
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
                <th className="py-2 pr-3 text-right">Paid visits{t.paidEstimated ? ' (est.)' : ''}</th>
                <th className="py-2 pr-3 text-right">Ad spend (AED{t.paidEstimated ? ', est.' : ''})</th>
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
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{int(t.paidByMarket.get(m.market) ?? 0)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{int(t.spendByMarketAed.get(m.market) ?? 0)}</td>
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
            Organic figures are DataForSEO estimates from rankings and search volumes.{paidOff ? ` Google Ads visits and spend are the benchmark for a brand of this size, split across the markets the campaigns run in by organic traffic (${c.googleAds.source}); DataForSEO's keyword sample found no paid clicks this month, and that sample misses most ad placements.` : ' Ad spend is what the paid clicks would cost at Google prices (USD converted at 3.67).'}
          </p>
          <h4 className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">All site traffic by source (estimate)</h4>
          <table className="w-full min-w-[560px] text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                <th className="py-2 pr-3">Source</th>
                <th className="py-2 pr-3 text-right">Typical share</th>
                <th className="py-2 pr-3 text-right">Visits / month</th>
                <th className="py-2 pl-3">Basis</th>
              </tr>
            </thead>
            <tbody>
              {trafficRows.map((r) => (
                <tr key={r.src.key} className="border-b border-line/60">
                  <td className="py-2 pr-3 text-ink">{r.src.label}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{pct(r.src.share[0])}–{pct(r.src.share[1])}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink">{r.visits[0] === r.visits[1] ? int(r.visits[0]) : range(r.visits)}{r.measured ? ' *' : ''}</td>
                  <td className="py-2 pl-3 text-[11px] text-ink-faint">{r.measured ? 'measured (DataForSEO)' : r.src.key === 'paid-search' ? 'benchmark for a brand of this size' : 'typical share × estimated total'}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-2 pr-3 text-ink">All sources</td>
                <td className="py-2 pr-3 text-right">100%</td>
                <td className="py-2 pr-3 text-right tabular-nums">{range(totalVisits)}</td>
                <td className="py-2 pl-3 text-[11px] font-normal text-ink-faint">organic ÷ {pct(c.traffic.organicShare[1])} to organic ÷ {pct(c.traffic.organicShare[0])}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-ink-faint">* measured. Other rows apply the typical traffic mix of a dental tourism brand to the estimated total; no outside tool can see a competitor's non-Google traffic.</p>
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
            <p className="text-ink"><b>About {int(mid(grossLeads))} gross enquiries a month, {int(netLeads)} net leads, {int(patients)} new patients.</b> Their real numbers are private, so the net figure is estimated three ways and the upper end is used:</p>
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

      <Card>
        <SectionHeader tag="C5" eyebrow="Brand affinity" title="Where the brand stands among similar clinics" />
        <div className="px-5 pb-5 pt-4">
          {standing.length ? (
            <>
              <p className="text-[12.5px] leading-snug text-ink-soft">
                Peers are the clinics that rank for the same searches as {c.name} in each market (DataForSEO). Brand searches are how many
                people look for each clinic by name every month: the clearest outside measure of brand affinity.
                {' '}{standing.map((st, i) => <span key={st.market}>{i ? ' · ' : ''}<b className="text-ink">{st.market}</b>: #{st.brandRank} of {st.n} by brand searches, #{st.visitRank} by Google traffic</span>)}.
              </p>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {standing.map((st) => (
                  <div key={st.market} className="overflow-x-auto">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{st.market}</p>
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                          <th className="py-1.5 pr-2">Clinic</th>
                          <th className="py-1.5 pr-2 text-right">Brand searches / mo</th>
                          <th className="py-1.5 pl-2 text-right">Google visits / mo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {st.rows.map((r) => (
                          <tr key={r.domain} className={`border-b border-line/60 ${r.me ? 'bg-accent/5 font-semibold' : ''}`}>
                            <td className="py-1.5 pr-2 text-ink">{r.domain}</td>
                            <td className="py-1.5 pr-2 text-right tabular-nums">{int(r.brand)}</td>
                            <td className="py-1.5 pl-2 text-right tabular-nums text-ink-soft">{int(r.visits)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-ink-faint">
                A peer's brand searches are measured on its domain name (for example “verasmile” for verasmile.com), so a brand searched
                under a different spelling can read low. Platforms, publishers and retailers are left out.
              </p>
            </>
          ) : (
            <DataGapInline detail="Peer set not read yet: it fills on the next weekly refresh" owner={ownerFor('tracking')} />
          )}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <SectionHeader tag="C6" eyebrow="Social profile" title="Audience on social media" />
          <div className="px-5 pb-5 pt-4">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                  <th className="py-2 pr-3">Platform</th>
                  <th className="py-2 pr-3 text-right">{c.name}</th>
                  <th className="py-2 pl-3 text-right">Dental Nation</th>
                </tr>
              </thead>
              <tbody>
                {c.social.map((x) => (
                  <tr key={x.platform} className="border-b border-line/60">
                    <td className="py-2 pr-3 text-ink">{x.platform} <span className="text-[11px] text-ink-faint">{x.handle}</span></td>
                    <td className="py-2 pr-3 text-right tabular-nums text-ink">{int(x.followers)}</td>
                    <td className="py-2 pl-3 text-right tabular-nums text-ink-soft">{x.platform.toLowerCase() in mine.followers ? int(mine.followers[x.platform.toLowerCase()]) : '—'}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-2 pr-3 text-ink">All platforms</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{int(sum(c.social.map((x) => x.followers)))}</td>
                  <td className="py-2 pl-3 text-right tabular-nums">{int(sum(Object.values(mine.followers)))}</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-2 text-[11px] text-ink-faint">
              {c.name} runs separate accounts per language (English, French, Arabic, Spanish); the Instagram figure adds them up. Dental Nation
              figures are the live counts the dashboard syncs from Meta. Sources: {c.social[0]?.source ?? ''}.
            </p>
          </div>
        </Card>

        <Card>
          <SectionHeader tag="C7" eyebrow="Leads by channel" title="Where their leads come from (estimate)" />
          <div className="overflow-x-auto px-5 pb-5 pt-4">
            <table className="w-full min-w-[420px] text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                  <th className="py-2 pr-3">Channel</th>
                  <th className="py-2 pr-3 text-right">Typical share</th>
                  <th className="py-2 pr-3 text-right">Leads / mo</th>
                  <th className="py-2 pl-3">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {channelRows.map((r) => (
                  <tr key={r.ch.key} className={`border-b border-line/60 align-top ${r === bestChannel ? 'bg-accent/5 font-semibold' : ''}`}>
                    <td className="py-2 pr-3 text-ink">{r.ch.label}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{pct(r.ch.share[0])}–{pct(r.ch.share[1])}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-ink">{range(r.leads)}{r.measured ? ' *' : ''}</td>
                    <td className="py-2 pl-3 text-[11px] font-normal text-ink-faint">{r.evidence ?? r.ch.basis}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-2 pr-3 text-ink">All channels</td>
                  <td className="py-2 pr-3 text-right">100%</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{range(totalLeads)}</td>
                  <td className="py-2 pl-3 text-[11px] font-normal text-ink-faint">model midpoint {int(modelTotal)}</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-2 text-[12.5px] leading-snug text-ink-soft">
              <b className="text-ink">Best channel: {bestChannel?.ch.label ?? '—'}</b>, about {bestChannel ? range(bestChannel.leads) : '—'} leads a month.
              {' '}{s.metaAds && !s.metaAds.error && s.metaAds.activeAds === 0 ? 'No Meta ads were live in the EU on the day of the read, so the Meta figure leans on the benchmark share rather than live evidence.' : ''}
            </p>
            <p className="mt-2 text-[11px] text-ink-faint">
              * measured from Google data on this page (visits × 1–3% enquiry rate; paid clicks × 2–5%). Other rows are the typical share for
              a dental tourism brand of this size (agency benchmarks, 2026) applied to the total. Ranges, not facts: no outside tool can
              see a competitor's leads.
            </p>
          </div>
        </Card>
      </div>

      <Card>
        <SectionHeader tag="C8" eyebrow="Mapped to Dental Nation" title={`Channel mix: ${c.name} (estimate) vs Dental Nation (actual, ${dubaiDateLabel(mine.from)} to ${dubaiDateLabel(mine.to)})`} />
        <div className="overflow-x-auto px-5 pb-5 pt-4">
          {mine.total ? (
            <>
              <table className="w-full min-w-[560px] text-[12.5px]">
                <thead>
                  <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                    <th className="py-2 pr-3">Channel</th>
                    <th className="py-2 pr-3 text-right">{c.name} share (est.)</th>
                    <th className="py-2 pr-3 text-right">Dental Nation enquiries</th>
                    <th className="py-2 pr-3 text-right">Dental Nation share</th>
                    <th className="py-2 pl-3">Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {ownBuckets.map((b) => {
                    const theirs = modelTotal ? mid(channelRows.find((r) => r.ch.key === b.ch.key)!.leads) / modelTotal : 0;
                    const ours = b.enquiries / mine.total;
                    const diff = ours - theirs;
                    return (
                      <tr key={b.ch.key} className={`border-b border-line/60 ${b === ownBest ? 'bg-good/5 font-semibold' : ''}`}>
                        <td className="py-2 pr-3 text-ink">{b.ch.label}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{pct(theirs)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-ink">{int(b.enquiries)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-ink">{pct(ours)}</td>
                        <td className={`py-2 pl-3 text-[11px] font-normal ${Math.abs(diff) < 0.05 ? 'text-ink-faint' : diff > 0 ? 'text-good' : 'text-watch'}`}>
                          {Math.abs(diff) < 0.05 ? 'in line' : diff > 0 ? `we lean on this ${pct(diff)} more` : `we are ${pct(-diff)} lighter here`}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="font-semibold">
                    <td className="py-2 pr-3 text-ink">All channels</td>
                    <td className="py-2 pr-3 text-right">100%</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{int(mine.total)}</td>
                    <td className="py-2 pr-3 text-right">100%</td>
                    <td className="py-2 pl-3" />
                  </tr>
                </tbody>
              </table>
              <Takeaway>
                Our best channel is <b>{ownBest?.ch.label ?? '—'}</b> ({ownBest ? pct(ownBest.enquiries / mine.total) : '—'} of enquiries); theirs is{' '}
                <b>{bestChannel?.ch.label ?? '—'}</b>. The rows marked lighter are where a brand like {c.name} gets leads that we do not yet:
                those are the channels to build, in the order of their share.
              </Takeaway>
              <p className="mt-2 text-[11px] text-ink-faint">
                Dental Nation enquiries are the Growth Platform's attributed enquiries for the last 90 days, grouped into the same channels.
                Shares compare mix, not volume: {c.name} sells trips from Europe, we sell visits in Dubai.
              </p>
            </>
          ) : (
            <DataGapInline detail="Dental Nation's channel enquiries for the last 90 days could not be read" owner={ownerFor('tracking')} />
          )}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <SectionHeader tag="C9" eyebrow="Search" title={`What they win on Google${s.topKeywords ? ` (${s.topKeywords.market})` : ''}`} />
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
          <SectionHeader tag="C10" eyebrow="Profile" title={`About ${c.name} (their public claims)`} />
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
