import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { fetchGa4LeadLens, type Ga4LeadByChannel } from '@/lib/sync/adapters/ga4-adapter';

/**
 * Marketing reconciliation: ties LIVE ad spend (Meta + Google) to platform-
 * reported conversions and to the in-house lead tracker — surfacing the leakage
 * between what the platforms claim and what's actually logged.
 *
 * Honesty: these are DISTINCT populations. "Platform-reported" = Meta lead
 * actions (incl. click-to-WhatsApp) + Google conversions (incl. calls). "Tracked"
 * = leads logged in the in-house tracker. They are not 1:1 (no campaign-level
 * attribution yet), so the comparison is directional and labelled as such.
 */

/**
 * Live ad spend (Meta + Google insight tables) summed over an inclusive
 * [from,to] window, with a per-day series and per-platform split. This is the
 * range-scoped spend the Executive headline needs; over the full span it equals
 * the all-time total shown on the Marketing tab. metaLatest/googleLatest expose
 * each feed's freshness so a stale sync (e.g. Meta) can be surfaced honestly.
 */
export interface AdSpendRange {
  meta: number;
  google: number;
  total: number;
  rows: number; // insight rows in the window (0 → no ad data at all)
  daily: { date: string; spend: number }[];
  metaLatest: string | null;
  googleLatest: string | null;
}

export async function getAdSpendForRange(from: string, to: string): Promise<AdSpendRange> {
  const supabase = getSupabaseAdmin();
  const emptyRange: AdSpendRange = { meta: 0, google: 0, total: 0, rows: 0, daily: [], metaLatest: null, googleLatest: null };
  if (!supabase) return emptyRange;
  try {
    const [{ data: m }, { data: g }] = await Promise.all([
      supabase.from('meta_insights_raw').select('date, spend').gte('date', from).lte('date', to),
      supabase.from('google_ads_insights_raw').select('date, spend').gte('date', from).lte('date', to),
    ]);
    const metaRows = (m as { date: string | null; spend: number | null }[]) ?? [];
    const gadsRows = (g as { date: string | null; spend: number | null }[]) ?? [];
    const daily = new Map<string, number>();
    let meta = 0;
    let google = 0;
    let metaLatest: string | null = null;
    let googleLatest: string | null = null;
    for (const r of metaRows) {
      const s = Number(r.spend) || 0;
      meta += s;
      if (r.date) {
        daily.set(r.date, (daily.get(r.date) ?? 0) + s);
        if (!metaLatest || r.date > metaLatest) metaLatest = r.date;
      }
    }
    for (const r of gadsRows) {
      const s = Number(r.spend) || 0;
      google += s;
      if (r.date) {
        daily.set(r.date, (daily.get(r.date) ?? 0) + s);
        if (!googleLatest || r.date > googleLatest) googleLatest = r.date;
      }
    }
    return {
      meta,
      google,
      total: meta + google,
      rows: metaRows.length + gadsRows.length,
      daily: [...daily.entries()].map(([date, spend]) => ({ date, spend })).sort((a, b) => a.date.localeCompare(b.date)),
      metaLatest,
      googleLatest,
    };
  } catch {
    return emptyRange;
  }
}

/** All-time latest insight date per ad feed — for a "last synced / reconnect"
 *  freshness check (independent of any selected window). */
export async function getAdFeedFreshness(): Promise<{ metaLatest: string | null; googleLatest: string | null }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { metaLatest: null, googleLatest: null };
  try {
    const [{ data: m }, { data: g }] = await Promise.all([
      supabase.from('meta_insights_raw').select('date').order('date', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('google_ads_insights_raw').select('date').order('date', { ascending: false }).limit(1).maybeSingle(),
    ]);
    return {
      metaLatest: (m as { date: string | null } | null)?.date ?? null,
      googleLatest: (g as { date: string | null } | null)?.date ?? null,
    };
  } catch {
    return { metaLatest: null, googleLatest: null };
  }
}

export interface MktPlatform {
  platform: 'Meta' | 'Google';
  spend: number;
  reportedLeads: number;
  costPerReported: number | null;
}
export interface MktMonth {
  month: string; // YYYY-MM
  label: string;
  metaSpend: number;
  googleSpend: number;
  spend: number;
  reportedLeads: number;
  trackedLeads: number;
  /** GA4 site-tagged gross leads (independent measure). */
  ga4Leads: number;
}
/**
 * GA4 gross-lead lens — an INDEPENDENT, site-tagged measure of where leads come
 * from, sitting between the ad platforms' self-reported conversions and the
 * in-house tracker. Added to triangulate the picture WITHOUT contaminating the
 * platform/tracker reconciliation: GA4 is a third population, shown side-by-side.
 */
export interface MktGa4 {
  available: boolean;
  totalLeads: number;
  byChannel: Ga4LeadByChannel[];
  /** Leads GA4 attributes to PAID channels — the apples-to-apples check vs ad-platform conversions. */
  paidLeads: number;
  events: string[];
  channelDimension: string;
  period: { from: string; to: string } | null;
  note: string | null;
}
export interface MktCampaign {
  platform: 'Meta' | 'Google';
  campaign: string;
  spend: number;
  reportedLeads: number;
  costPerReported: number | null;
}
export interface MarketingReport {
  source: 'live' | 'empty';
  platforms: MktPlatform[];
  totals: {
    adSpend: number;
    reportedLeads: number;
    trackedLeads: number;
    /** tracked − reported (negative = platforms claim more than tracked). */
    leakageAbs: number | null;
    /** tracked / reported (0–1): share of platform-claimed leads that show in the tracker. */
    trackedShare: number | null;
    costPerReported: number | null;
    costPerTracked: number | null;
  };
  monthly: MktMonth[];
  topCampaigns: MktCampaign[];
  /** In-house tracker leads by channel (context for attribution). */
  trackedByChannel: { label: string; value: number }[];
  /** GA4 site-tagged gross-lead lens (independent triangulation). */
  ga4: MktGa4;
  metaPeriod: { from: string | null; to: string | null };
  googlePeriod: { from: string | null; to: string | null };
}

/** GA4 default-channel-grouping buckets that are PAID (ad-driven). */
const GA4_PAID_CHANNELS = /paid|cross-network|display|shopping/i;
const emptyGa4: MktGa4 = {
  available: false,
  totalLeads: 0,
  byChannel: [],
  paidLeads: 0,
  events: [],
  channelDimension: '',
  period: null,
  note: null,
};

const monthLabel = (m: string): string => {
  try {
    const d = new Date(`${m}-01T00:00:00Z`);
    return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  } catch {
    return m;
  }
};
const ym = (d: string | null): string | null => (d ? d.slice(0, 7) : null);
const rate = (a: number, b: number): number | null => (b > 0 ? a / b : null);

const emptyReport: MarketingReport = {
  source: 'empty',
  platforms: [],
  totals: { adSpend: 0, reportedLeads: 0, trackedLeads: 0, leakageAbs: null, trackedShare: null, costPerReported: null, costPerTracked: null },
  monthly: [],
  topCampaigns: [],
  trackedByChannel: [],
  ga4: emptyGa4,
  metaPeriod: { from: null, to: null },
  googlePeriod: { from: null, to: null },
};

export async function getMarketingReport(): Promise<MarketingReport> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return emptyReport;
  try {
    const [{ data: metaRows }, { data: gadsRows }, { data: leadRows }] = await Promise.all([
      supabase.from('meta_insights_raw').select('campaign_name, date, spend, leads'),
      supabase.from('google_ads_insights_raw').select('campaign_name, date, spend, conversions'),
      supabase.from('leads').select('inquiry_date, channel_source'),
    ]);

    const meta = (metaRows as { campaign_name: string | null; date: string | null; spend: number | null; leads: number | null }[]) ?? [];
    const gads = (gadsRows as { campaign_name: string | null; date: string | null; spend: number | null; conversions: number | null }[]) ?? [];
    const leads = (leadRows as { inquiry_date: string | null; channel_source: string | null }[]) ?? [];

    if (meta.length === 0 && gads.length === 0) return emptyReport;

    // Platform totals.
    const metaSpend = meta.reduce((a, r) => a + (Number(r.spend) || 0), 0);
    const metaLeads = meta.reduce((a, r) => a + (Number(r.leads) || 0), 0);
    const gadsSpend = gads.reduce((a, r) => a + (Number(r.spend) || 0), 0);
    const gadsConv = gads.reduce((a, r) => a + (Number(r.conversions) || 0), 0);

    const platforms: MktPlatform[] = [
      { platform: 'Meta', spend: metaSpend, reportedLeads: metaLeads, costPerReported: rate(metaSpend, metaLeads) },
      { platform: 'Google', spend: gadsSpend, reportedLeads: gadsConv, costPerReported: rate(gadsSpend, gadsConv) },
    ];

    // Monthly roll-up.
    const months = new Map<string, MktMonth>();
    const bump = (m: string | null, patch: Partial<MktMonth>) => {
      if (!m) return;
      const row = months.get(m) ?? { month: m, label: monthLabel(m), metaSpend: 0, googleSpend: 0, spend: 0, reportedLeads: 0, trackedLeads: 0, ga4Leads: 0 };
      row.metaSpend += patch.metaSpend ?? 0;
      row.googleSpend += patch.googleSpend ?? 0;
      row.spend += (patch.metaSpend ?? 0) + (patch.googleSpend ?? 0);
      row.reportedLeads += patch.reportedLeads ?? 0;
      row.trackedLeads += patch.trackedLeads ?? 0;
      row.ga4Leads += patch.ga4Leads ?? 0;
      months.set(m, row);
    };
    for (const r of meta) bump(ym(r.date), { metaSpend: Number(r.spend) || 0, reportedLeads: Number(r.leads) || 0 });
    for (const r of gads) bump(ym(r.date), { googleSpend: Number(r.spend) || 0, reportedLeads: Number(r.conversions) || 0 });
    for (const l of leads) bump(ym(l.inquiry_date), { trackedLeads: 1 });

    // GA4 gross-lead lens — an INDEPENDENT, site-tagged read on where leads come
    // from. Spans the same window as the ad/tracker data; degrades to a data gap
    // (never throws) so a GA4 hiccup can't break the spend reconciliation.
    const allDates = [
      ...meta.map((r) => r.date),
      ...gads.map((r) => r.date),
      ...leads.map((l) => l.inquiry_date),
    ].filter(Boolean).sort() as string[];
    const today = new Date().toISOString().slice(0, 10);
    const ga4From = allDates[0] ?? new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10);
    let ga4: MktGa4 = { ...emptyGa4 };
    try {
      const lens = await fetchGa4LeadLens(ga4From, today);
      const paidLeads = lens.byChannel
        .filter((c) => GA4_PAID_CHANNELS.test(c.channel))
        .reduce((a, c) => a + c.leads, 0);
      ga4 = {
        available: true,
        totalLeads: lens.totalLeads,
        byChannel: lens.byChannel,
        paidLeads,
        events: lens.events,
        channelDimension: lens.channelDimension,
        period: lens.period,
        note: lens.totalLeads === 0 ? 'no GA4 lead events in this window' : null,
      };
      for (const m of lens.monthly) bump(m.month, { ga4Leads: m.leads });
    } catch (err) {
      ga4 = { ...emptyGa4, note: (err as Error).message };
    }

    const monthly = [...months.values()].sort((a, b) => a.month.localeCompare(b.month));

    // Top campaigns by spend across both platforms.
    const campAgg = new Map<string, MktCampaign>();
    const addCamp = (platform: 'Meta' | 'Google', name: string | null, spend: number, rep: number) => {
      const key = `${platform}|${name ?? '(unnamed)'}`;
      const row = campAgg.get(key) ?? { platform, campaign: name ?? '(unnamed)', spend: 0, reportedLeads: 0, costPerReported: null };
      row.spend += spend;
      row.reportedLeads += rep;
      campAgg.set(key, row);
    };
    for (const r of meta) addCamp('Meta', r.campaign_name, Number(r.spend) || 0, Number(r.leads) || 0);
    for (const r of gads) addCamp('Google', r.campaign_name, Number(r.spend) || 0, Number(r.conversions) || 0);
    const topCampaigns = [...campAgg.values()]
      .map((c) => ({ ...c, costPerReported: rate(c.spend, c.reportedLeads) }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 12);

    // Tracker by channel.
    const chan = new Map<string, number>();
    for (const l of leads) {
      const k = (l.channel_source ?? '').trim() || 'Unattributed';
      chan.set(k, (chan.get(k) ?? 0) + 1);
    }
    const trackedByChannel = [...chan.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

    const adSpend = metaSpend + gadsSpend;
    const reportedLeads = metaLeads + gadsConv;
    const trackedLeads = leads.length;

    const metaDates = meta.map((r) => r.date).filter(Boolean).sort() as string[];
    const gadsDates = gads.map((r) => r.date).filter(Boolean).sort() as string[];

    return {
      source: 'live',
      platforms,
      totals: {
        adSpend,
        reportedLeads,
        trackedLeads,
        leakageAbs: trackedLeads - reportedLeads,
        trackedShare: rate(trackedLeads, reportedLeads),
        costPerReported: rate(adSpend, reportedLeads),
        costPerTracked: rate(adSpend, trackedLeads),
      },
      monthly,
      topCampaigns,
      trackedByChannel,
      ga4,
      metaPeriod: { from: metaDates[0] ?? null, to: metaDates[metaDates.length - 1] ?? null },
      googlePeriod: { from: gadsDates[0] ?? null, to: gadsDates[gadsDates.length - 1] ?? null },
    };
  } catch {
    return emptyReport;
  }
}
