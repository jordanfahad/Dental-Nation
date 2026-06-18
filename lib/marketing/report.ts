import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';

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
  metaPeriod: { from: string | null; to: string | null };
  googlePeriod: { from: string | null; to: string | null };
}

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
      const row = months.get(m) ?? { month: m, label: monthLabel(m), metaSpend: 0, googleSpend: 0, spend: 0, reportedLeads: 0, trackedLeads: 0 };
      row.metaSpend += patch.metaSpend ?? 0;
      row.googleSpend += patch.googleSpend ?? 0;
      row.spend += (patch.metaSpend ?? 0) + (patch.googleSpend ?? 0);
      row.reportedLeads += patch.reportedLeads ?? 0;
      row.trackedLeads += patch.trackedLeads ?? 0;
      months.set(m, row);
    };
    for (const r of meta) bump(ym(r.date), { metaSpend: Number(r.spend) || 0, reportedLeads: Number(r.leads) || 0 });
    for (const r of gads) bump(ym(r.date), { googleSpend: Number(r.spend) || 0, reportedLeads: Number(r.conversions) || 0 });
    for (const l of leads) bump(ym(l.inquiry_date), { trackedLeads: 1 });
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
      metaPeriod: { from: metaDates[0] ?? null, to: metaDates[metaDates.length - 1] ?? null },
      googlePeriod: { from: gadsDates[0] ?? null, to: gadsDates[gadsDates.length - 1] ?? null },
    };
  } catch {
    return emptyReport;
  }
}
