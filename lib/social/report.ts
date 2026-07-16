import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Organic social + Google Business Profile signals for the Social tab, read from
 * lane_e.social_insights (synced from salestrig-studio / Postiz analytics()).
 * This is the ORGANIC / local-search lens — distinct from paid ad spend
 * (meta_insights_raw / google_ads_insights_raw) and GA4 website analytics.
 *
 * Honest by construction: empty table → an "awaiting sync" data gap, never a
 * fabricated zero. Flow metrics (reach, views, calls, directions…) are summed
 * over the window; stock metrics (followers) take the latest value in range.
 */

// Metrics that are a running total (a "stock") → show the LATEST value, not a sum.
const STOCK = new Set(['followers', 'following', 'subscribers', 'follower_count']);

interface ChannelDef {
  key: string;
  label: string;
}
// Display order; unknown channels are appended.
const CHANNEL_ORDER: ChannelDef[] = [
  { key: 'gmb', label: 'Google Business Profile' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'threads', label: 'Threads' },
  { key: 'pinterest', label: 'Pinterest' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'x', label: 'X' },
];
const LABEL_OF = new Map(CHANNEL_ORDER.map((c) => [c.key, c.label] as const));
const ORDER_OF = new Map(CHANNEL_ORDER.map((c, i) => [c.key, i] as const));

export interface SocialMetric {
  key: string;
  label: string;
  value: number;
  isStock: boolean;
  trend: { date: string; value: number }[];
}

export interface SocialChannel {
  channel: string;
  label: string;
  integration: string | null;
  lastDay: string | null;
  metrics: SocialMetric[];
}

export interface SocialReport {
  source: 'live' | 'empty';
  from: string;
  to: string;
  channels: SocialChannel[];
  lastSyncedAt: string | null;
}

interface Row {
  channel: string;
  integration: string | null;
  metric: string;
  metric_label: string | null;
  day: string;
  value: number | null;
  synced_at: string | null;
}

const titleCase = (s: string) =>
  s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export async function getSocialReport(opts: { from: string; to: string; clinic?: string }): Promise<SocialReport> {
  const { from, to } = opts;
  const empty: SocialReport = { source: 'empty', from, to, channels: [], lastSyncedAt: null };

  const db = getSupabaseAdmin();
  if (!db) return empty;

  let rows: Row[] = [];
  try {
    let q = db
      .from('social_insights')
      .select('channel, integration, metric, metric_label, day, value, synced_at');
    if (opts.clinic && opts.clinic !== 'all') q = q.eq('clinic', opts.clinic);
    if (from) q = q.gte('day', from);
    if (to) q = q.lte('day', to);
    const { data } = await q;
    rows = (data as Row[] | null) ?? [];
  } catch {
    return empty;
  }
  if (rows.length === 0) return empty;

  // channel → metric → rows
  const byChannel = new Map<string, Map<string, Row[]>>();
  let lastSyncedAt: string | null = null;
  for (const r of rows) {
    if (r.synced_at && (!lastSyncedAt || r.synced_at > lastSyncedAt)) lastSyncedAt = r.synced_at;
    const mm = byChannel.get(r.channel) ?? new Map<string, Row[]>();
    const arr = mm.get(r.metric) ?? [];
    arr.push(r);
    mm.set(r.metric, arr);
    byChannel.set(r.channel, mm);
  }

  const channels: SocialChannel[] = [];
  for (const [channel, metricMap] of byChannel) {
    const metrics: SocialMetric[] = [];
    let integration: string | null = null;
    let lastDay: string | null = null;

    for (const [metric, mrows] of metricMap) {
      mrows.sort((a, b) => a.day.localeCompare(b.day));
      const isStock = STOCK.has(metric.toLowerCase());
      const trend = mrows.map((r) => ({ date: r.day, value: Number(r.value ?? 0) }));
      const value = isStock
        ? trend[trend.length - 1]?.value ?? 0
        : trend.reduce((s, t) => s + t.value, 0);
      const label = mrows.find((r) => r.metric_label)?.metric_label ?? titleCase(metric);
      metrics.push({ key: metric, label, value, isStock, trend });
      const mLast = mrows[mrows.length - 1];
      if (mLast) {
        if (!integration && mLast.integration) integration = mLast.integration;
        if (!lastDay || mLast.day > lastDay) lastDay = mLast.day;
      }
    }

    // Stable metric order: flow metrics by value desc, then stock (followers) last.
    metrics.sort((a, b) => Number(a.isStock) - Number(b.isStock) || b.value - a.value);
    channels.push({ channel, label: LABEL_OF.get(channel) ?? titleCase(channel), integration, lastDay, metrics });
  }

  channels.sort(
    (a, b) => (ORDER_OF.get(a.channel) ?? 99) - (ORDER_OF.get(b.channel) ?? 99) || a.label.localeCompare(b.label),
  );

  return { source: 'live', from, to, channels, lastSyncedAt };
}
