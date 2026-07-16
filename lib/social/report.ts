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

// ---------------------------------------------------------------------------
// Per-media performance (posts / reels / stories)
// ---------------------------------------------------------------------------
export interface SocialPost {
  mediaId: string;
  channel: string;
  mediaType: string | null;
  isStory: boolean;
  caption: string | null;
  permalink: string | null;
  thumbnailUrl: string | null;
  postedAt: string | null;
  reach: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  videoViews: number;
  engagement: number;
  replies: number;
  tapsForward: number;
  tapsBack: number;
  exits: number;
  engagementRate: number; // engagement / reach
}

interface PostDbRow {
  media_id: string;
  channel: string;
  media_type: string | null;
  is_story: boolean;
  caption: string | null;
  permalink: string | null;
  thumbnail_url: string | null;
  posted_at: string | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  shares: number | null;
  video_views: number | null;
  engagement: number | null;
  replies: number | null;
  taps_forward: number | null;
  taps_back: number | null;
  exits: number | null;
}

export interface SocialPostsResult {
  posts: SocialPost[];
  stories: SocialPost[];
}

const n = (v: number | null | undefined) => Number(v ?? 0) || 0;

export async function getSocialPosts(opts: { clinic?: string; limit?: number } = {}): Promise<SocialPostsResult> {
  const db = getSupabaseAdmin();
  if (!db) return { posts: [], stories: [] };
  let rows: PostDbRow[] = [];
  try {
    let q = db
      .from('social_posts')
      .select(
        'media_id, channel, media_type, is_story, caption, permalink, thumbnail_url, posted_at, reach, likes, comments, saves, shares, video_views, engagement, replies, taps_forward, taps_back, exits',
      )
      .order('posted_at', { ascending: false })
      .limit(opts.limit ?? 60);
    if (opts.clinic && opts.clinic !== 'all') q = q.eq('clinic', opts.clinic);
    const { data } = await q;
    rows = (data as PostDbRow[] | null) ?? [];
  } catch {
    return { posts: [], stories: [] };
  }

  const map = (r: PostDbRow): SocialPost => {
    const reach = n(r.reach);
    const engagement = n(r.engagement) || n(r.likes) + n(r.comments) + n(r.saves) + n(r.shares);
    return {
      mediaId: r.media_id,
      channel: r.channel,
      mediaType: r.media_type,
      isStory: !!r.is_story,
      caption: r.caption,
      permalink: r.permalink,
      thumbnailUrl: r.thumbnail_url,
      postedAt: r.posted_at,
      reach,
      likes: n(r.likes),
      comments: n(r.comments),
      saves: n(r.saves),
      shares: n(r.shares),
      videoViews: n(r.video_views),
      engagement,
      replies: n(r.replies),
      tapsForward: n(r.taps_forward),
      tapsBack: n(r.taps_back),
      exits: n(r.exits),
      engagementRate: reach > 0 ? engagement / reach : 0,
    };
  };

  const posts = rows.filter((r) => !r.is_story).map(map);
  const stories = rows.filter((r) => r.is_story).map(map);
  return { posts, stories };
}

// ---------------------------------------------------------------------------
// Audience demographics
// ---------------------------------------------------------------------------
export interface DemographicBucket {
  bucket: string;
  value: number;
  share: number; // 0..1 within the dimension
}
export interface DemographicDimension {
  dimension: string;
  label: string;
  total: number;
  buckets: DemographicBucket[];
}
export interface SocialDemographics {
  channel: string;
  asOf: string | null;
  dimensions: DemographicDimension[];
}

interface DemoDbRow {
  channel: string;
  dimension: string;
  bucket: string;
  value: number | null;
  as_of: string | null;
}

const DIM_LABEL: Record<string, string> = {
  gender: 'Gender',
  age: 'Age',
  city: 'Top cities',
  country: 'Top countries',
};
const GENDER_LABEL: Record<string, string> = { F: 'Female', M: 'Male', U: 'Unknown' };

export async function getSocialDemographics(opts: { clinic?: string; channel?: string } = {}): Promise<SocialDemographics | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;
  let rows: DemoDbRow[] = [];
  try {
    let q = db.from('social_demographics').select('channel, dimension, bucket, value, as_of');
    if (opts.clinic && opts.clinic !== 'all') q = q.eq('clinic', opts.clinic);
    q = q.eq('channel', opts.channel ?? 'instagram');
    const { data } = await q;
    rows = (data as DemoDbRow[] | null) ?? [];
  } catch {
    return null;
  }
  if (rows.length === 0) return null;

  const byDim = new Map<string, DemoDbRow[]>();
  let asOf: string | null = null;
  for (const r of rows) {
    if (r.as_of && (!asOf || r.as_of > asOf)) asOf = r.as_of;
    const arr = byDim.get(r.dimension) ?? [];
    arr.push(r);
    byDim.set(r.dimension, arr);
  }

  const order = ['gender', 'age', 'country', 'city'];
  const dimensions: DemographicDimension[] = [];
  for (const dim of [...byDim.keys()].sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99))) {
    const drows = byDim.get(dim)!;
    const total = drows.reduce((s, r) => s + n(r.value), 0) || 1;
    let buckets = drows
      .map((r) => ({
        bucket: dim === 'gender' ? GENDER_LABEL[r.bucket] ?? r.bucket : r.bucket,
        value: n(r.value),
        share: n(r.value) / total,
      }))
      .sort((a, b) => (dim === 'age' ? a.bucket.localeCompare(b.bucket) : b.value - a.value));
    if (dim === 'city' || dim === 'country') buckets = buckets.slice(0, 6);
    dimensions.push({ dimension: dim, label: DIM_LABEL[dim] ?? titleCase(dim), total, buckets });
  }

  return { channel: opts.channel ?? 'instagram', asOf, dimensions };
}
