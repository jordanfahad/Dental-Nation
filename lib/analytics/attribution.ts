import 'server-only';
import { unstable_cache } from 'next/cache';
import { fetchGa4Attribution, finalizeAttribution, type Ga4Attribution, type Ga4ChannelRaw } from '@/lib/sync/adapters/ga4-adapter';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Multi-touch attribution report (channel funnel roles) for the GA tab. Spans
 * 2026-01-01 → today to match the rest of the dashboard. Never throws; any GA4
 * failure degrades to an honest data gap. Cached 30 min (Vercel Data Cache) —
 * three more GA4 reports on an already-heavy tab; GA4 lags hours regardless.
 */
export interface Ga4AttributionReport {
  available: boolean;
  note: string | null;
  data: Ga4Attribution | null;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * GA4 channel-group key that Meta clicks land under once UTM-tagged. We replace
 * this row with a Meta-sourced ESTIMATE because GA4 can't attribute untagged Meta.
 */
const PAID_SOCIAL_KEY = 'Paid Social';

export const getGa4AttributionReport = unstable_cache(
  async (): Promise<Ga4AttributionReport> => {
    try {
      const data = await fetchGa4Attribution('2026-01-01', iso(new Date()));
      const reality = await getPaidSocialReality();

      // Logical Meta estimate (GA4 is blind to untagged Meta). Discovery ≈ Meta
      // link clicks; lower funnel = Meta-reported leads; consideration ≈ clicks ×
      // the site-average (GA4-measured) consideration-to-discovery ratio.
      let merged = data;
      if (reality.available && reality.metaClicks > 0) {
        const ratio = data.totals.discovery > 0 ? data.totals.consideration / data.totals.discovery : 0;
        const estimate: Ga4ChannelRaw = {
          channel: PAID_SOCIAL_KEY,
          discovery: reality.metaClicks,
          consideration: Math.round(reality.metaClicks * ratio),
          conversion: reality.metaLeads,
          estimated: true,
        };
        const raw: Ga4ChannelRaw[] = data.channels
          .filter((c) => c.channel !== PAID_SOCIAL_KEY)
          .map((c) => ({ channel: c.channel, discovery: c.discovery, consideration: c.consideration, conversion: c.conversion }));
        raw.push(estimate);
        merged = finalizeAttribution(raw, data.period);
      }

      const available =
        merged.totals.discovery > 0 || merged.totals.consideration > 0 || merged.totals.conversion > 0;
      return { available, note: available ? null : 'no GA4 channel activity in this window', data: available ? merged : null };
    } catch (err) {
      return { available: false, note: (err as Error).message, data: null };
    }
  },
  ['ga4-attribution-v2'],
  { revalidate: 1800 },
);

/**
 * Meta's own platform-reported spend, leads + clicks (from the hourly-synced
 * meta_insights_raw table — pixel/forms, incl. view-through & click-to-WhatsApp).
 * Used for the "Paid Social reality check" and to seed the Meta funnel estimate,
 * because GA4 systematically under-attributes Meta (untagged clicks land in
 * Direct/Organic Social; on-Facebook Instant-Form leads never reach the site).
 */
export interface PaidSocialReality {
  available: boolean;
  metaSpend: number;
  metaLeads: number;
  metaClicks: number;
}

export async function getPaidSocialReality(): Promise<PaidSocialReality> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { available: false, metaSpend: 0, metaLeads: 0, metaClicks: 0 };
  try {
    const { data } = await supabase.from('meta_insights_raw').select('spend, leads, clicks');
    const rows = (data as { spend: number | null; leads: number | null; clicks: number | null }[]) ?? [];
    if (rows.length === 0) return { available: false, metaSpend: 0, metaLeads: 0, metaClicks: 0 };
    return {
      available: true,
      metaSpend: rows.reduce((a, r) => a + (Number(r.spend) || 0), 0),
      metaLeads: rows.reduce((a, r) => a + (Number(r.leads) || 0), 0),
      metaClicks: rows.reduce((a, r) => a + (Number(r.clicks) || 0), 0),
    };
  } catch {
    return { available: false, metaSpend: 0, metaLeads: 0, metaClicks: 0 };
  }
}
