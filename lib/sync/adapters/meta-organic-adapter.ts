import 'server-only';
import type { AdminClient } from '@/lib/supabase/server';
import {
  resolveMetaOrganicConfig,
  IG_METRICS,
  FB_METRICS,
  IG_DEMOGRAPHICS,
  type MetaOrganicConfig,
  type MetaMetricDef,
} from '@/config/meta-organic';

/**
 * Meta ORGANIC adapter — pulls Instagram + Facebook Page insights into
 * lane_e.social_insights, plus per-media performance (posts/reels/stories) into
 * lane_e.social_posts and audience demographics into lane_e.social_demographics.
 *
 * Best-effort throughout: each metric / media / breakdown is fetched
 * independently and any error (Meta deprecates metrics between versions) is
 * recorded in `notes` and skipped rather than failing the whole run.
 */

export interface MetaOrganicResult {
  ok: boolean;
  stored: number;
  posts: number;
  demographics: number;
  channels: string[];
  notes: string[];
  error?: string;
}
export interface MetaOrganicOpts {
  days?: number; // trailing window (default 30)
  from?: string;
  to?: string;
  config?: MetaOrganicConfig; // preloaded config (skips resolution)
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const unix = (d: string) => Math.floor(new Date(`${d}T00:00:00Z`).getTime() / 1000);
const CLINIC = 'dental-nation';
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

interface Row {
  clinic: string;
  channel: string;
  integration: string | null;
  metric: string;
  metric_label: string;
  day: string;
  value: number;
}

function base(cfg: MetaOrganicConfig, path: string, params: Record<string, string>): string {
  const p = new URLSearchParams({ ...params, access_token: cfg.token });
  return `https://graph.facebook.com/${cfg.version}/${path}?${p.toString()}`;
}
async function getJson(url: string): Promise<Record<string, unknown> & { error?: { message?: string } }> {
  const res = await fetch(url, { cache: 'no-store' });
  return (await res.json()) as Record<string, unknown> & { error?: { message?: string } };
}

/** Resolve the IG business account id from the Page when only a Page id is set. */
async function deriveIgUserId(cfg: MetaOrganicConfig): Promise<string | null> {
  if (cfg.igUserId || !cfg.fbPageId) return cfg.igUserId;
  try {
    const j = await getJson(base(cfg, cfg.fbPageId, { fields: 'instagram_business_account' }));
    const iga = j.instagram_business_account as { id?: string } | undefined;
    return iga?.id ?? null;
  } catch {
    return null;
  }
}

async function fetchField(
  cfg: MetaOrganicConfig,
  id: string,
  def: MetaMetricDef,
  channel: string,
  today: string,
  rows: Row[],
  notes: string[],
): Promise<void> {
  try {
    const j = await getJson(base(cfg, id, { fields: def.api }));
    if (j.error) return void notes.push(`${channel}/${def.api}: ${j.error.message}`);
    const value = num(j[def.api]);
    if (Number.isFinite(value)) {
      rows.push({ clinic: CLINIC, channel, integration: id, metric: def.key, metric_label: def.label, day: today, value });
    }
  } catch (e) {
    notes.push(`${channel}/${def.api}: ${(e as Error).message}`);
  }
}

interface InsightValue {
  value?: number | Record<string, number>;
  end_time?: string;
}
async function fetchInsight(
  cfg: MetaOrganicConfig,
  id: string,
  def: MetaMetricDef,
  channel: string,
  from: string,
  to: string,
  rows: Row[],
  notes: string[],
): Promise<void> {
  try {
    const j = (await getJson(
      base(cfg, `${id}/insights`, { metric: def.api, period: 'day', since: String(unix(from)), until: String(unix(to)) }),
    )) as { data?: { values?: InsightValue[] }[]; error?: { message?: string } };
    if (j.error) return void notes.push(`${channel}/${def.api}: ${j.error.message}`);
    for (const v of j.data?.[0]?.values ?? []) {
      const day = v.end_time?.slice(0, 10);
      if (!day) continue;
      const raw = typeof v.value === 'object' && v.value ? Object.values(v.value).reduce((s, n) => s + num(n), 0) : v.value;
      rows.push({ clinic: CLINIC, channel, integration: id, metric: def.key, metric_label: def.label, day, value: num(raw) });
    }
  } catch (e) {
    notes.push(`${channel}/${def.api}: ${(e as Error).message}`);
  }
}

// ---------------------------------------------------------------------------
// Per-media performance (posts / reels / stories)
// ---------------------------------------------------------------------------
interface MediaNode {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  permalink?: string;
  thumbnail_url?: string;
  media_url?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
}
interface PostRow {
  clinic: string;
  channel: string;
  media_id: string;
  media_type: string | null;
  is_story: boolean;
  caption: string | null;
  permalink: string | null;
  thumbnail_url: string | null;
  posted_at: string | null;
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  video_views: number;
  engagement: number;
  replies: number;
  exits: number;
  taps_forward: number;
  taps_back: number;
  synced_at: string;
}

/** Try an insights metric list on a media object; returns metric→value, or null on error. */
async function mediaInsights(
  cfg: MetaOrganicConfig,
  mediaId: string,
  metrics: string[],
): Promise<Record<string, number> | null> {
  const j = (await getJson(base(cfg, `${mediaId}/insights`, { metric: metrics.join(',') }))) as {
    data?: { name?: string; values?: { value?: number }[]; total_value?: { value?: number } }[];
    error?: { message?: string };
  };
  if (j.error) return null;
  const out: Record<string, number> = {};
  for (const d of j.data ?? []) {
    const v = d.total_value?.value ?? d.values?.[0]?.value;
    if (d.name) out[d.name] = num(v);
  }
  return out;
}

function mediaRow(m: MediaNode, isStory: boolean, ins: Record<string, number>): PostRow {
  const likes = num(m.like_count ?? ins.likes);
  const comments = num(m.comments_count ?? ins.comments);
  const saves = num(ins.saved ?? ins.saves);
  const shares = num(ins.shares);
  const reach = num(ins.reach);
  const views = num(ins.views ?? ins.video_views ?? ins.plays);
  const engagement = num(ins.total_interactions) || likes + comments + saves + shares;
  return {
    clinic: CLINIC,
    channel: 'instagram',
    media_id: m.id,
    media_type: (m.media_product_type && m.media_product_type !== 'FEED' ? m.media_product_type : m.media_type) ?? null,
    is_story: isStory,
    caption: m.caption ? m.caption.slice(0, 500) : null,
    permalink: m.permalink ?? null,
    thumbnail_url: m.thumbnail_url ?? m.media_url ?? null,
    posted_at: m.timestamp ?? null,
    reach,
    impressions: num(ins.impressions ?? ins.views),
    likes,
    comments,
    saves,
    shares,
    video_views: views,
    engagement,
    replies: num(ins.replies),
    exits: num(ins.exits),
    taps_forward: num(ins.taps_forward),
    taps_back: num(ins.taps_back),
    synced_at: new Date().toISOString(),
  };
}

async function pullMedia(
  cfg: MetaOrganicConfig,
  igId: string,
  supabase: AdminClient,
  notes: string[],
): Promise<number> {
  const posts: PostRow[] = [];

  // Feed posts + reels (historical).
  try {
    const j = (await getJson(
      base(cfg, `${igId}/media`, {
        fields: 'id,caption,media_type,media_product_type,permalink,thumbnail_url,media_url,timestamp,like_count,comments_count',
        limit: '24',
      }),
    )) as { data?: MediaNode[]; error?: { message?: string } };
    if (j.error) notes.push(`media: ${j.error.message}`);
    for (const m of j.data ?? []) {
      // Broad metric set, then fall back to a safe minimum if the version rejects one.
      const ins =
        (await mediaInsights(cfg, m.id, ['reach', 'saved', 'shares', 'total_interactions', 'views'])) ??
        (await mediaInsights(cfg, m.id, ['reach'])) ??
        {};
      posts.push(mediaRow(m, false, ins));
    }
  } catch (e) {
    notes.push(`media: ${(e as Error).message}`);
  }

  // Active stories (only last 24h are retrievable via the API).
  try {
    const j = (await getJson(
      base(cfg, `${igId}/stories`, { fields: 'id,caption,media_type,permalink,thumbnail_url,media_url,timestamp', limit: '30' }),
    )) as { data?: MediaNode[]; error?: { message?: string } };
    if (j.error) notes.push(`stories: ${j.error.message}`);
    for (const m of j.data ?? []) {
      const ins =
        (await mediaInsights(cfg, m.id, ['reach', 'replies', 'taps_forward', 'taps_back', 'exits', 'views'])) ??
        (await mediaInsights(cfg, m.id, ['reach', 'replies'])) ??
        {};
      posts.push(mediaRow({ ...m, media_product_type: 'STORY', media_type: m.media_type ?? 'STORY' }, true, ins));
    }
  } catch (e) {
    notes.push(`stories: ${(e as Error).message}`);
  }

  if (posts.length === 0) return 0;
  let stored = 0;
  for (let i = 0; i < posts.length; i += 200) {
    const { error } = await supabase.from('social_posts').upsert(posts.slice(i, i + 200), { onConflict: 'clinic,channel,media_id' });
    if (error) { notes.push(`social_posts upsert: ${error.message}`); break; }
    stored += Math.min(200, posts.length - i);
  }
  return stored;
}

// ---------------------------------------------------------------------------
// Audience demographics (followers by age / gender / city / country)
// ---------------------------------------------------------------------------
interface DemoRow {
  clinic: string;
  channel: string;
  integration: string;
  dimension: string;
  bucket: string;
  value: number;
  as_of: string;
  synced_at: string;
}
async function pullDemographics(
  cfg: MetaOrganicConfig,
  igId: string,
  supabase: AdminClient,
  today: string,
  notes: string[],
): Promise<number> {
  const out: DemoRow[] = [];
  for (const { breakdown, dimension } of IG_DEMOGRAPHICS) {
    try {
      const j = (await getJson(
        base(cfg, `${igId}/insights`, {
          metric: 'follower_demographics',
          period: 'lifetime',
          metric_type: 'total_value',
          breakdown,
        }),
      )) as {
        data?: { total_value?: { breakdowns?: { results?: { dimension_values?: string[]; value?: number }[] }[] } }[];
        error?: { message?: string };
      };
      if (j.error) { notes.push(`demo/${breakdown}: ${j.error.message}`); continue; }
      const results = j.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [];
      for (const r of results) {
        const bucket = r.dimension_values?.[0];
        if (!bucket) continue;
        out.push({
          clinic: CLINIC, channel: 'instagram', integration: igId,
          dimension, bucket, value: num(r.value), as_of: today, synced_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      notes.push(`demo/${breakdown}: ${(e as Error).message}`);
    }
  }
  if (out.length === 0) return 0;
  // Replace the prior snapshot for these dimensions, then upsert fresh.
  const dims = [...new Set(out.map((r) => r.dimension))];
  await supabase.from('social_demographics').delete().eq('channel', 'instagram').in('dimension', dims);
  let stored = 0;
  for (let i = 0; i < out.length; i += 200) {
    const { error } = await supabase.from('social_demographics').upsert(out.slice(i, i + 200), { onConflict: 'clinic,channel,dimension,bucket' });
    if (error) { notes.push(`social_demographics upsert: ${error.message}`); break; }
    stored += Math.min(200, out.length - i);
  }
  return stored;
}

// ---------------------------------------------------------------------------
export async function syncMetaOrganic(supabase: AdminClient, opts: MetaOrganicOpts = {}): Promise<MetaOrganicResult> {
  const cfg = opts.config ?? (await resolveMetaOrganicConfig(supabase));
  if (!cfg) return { ok: false, stored: 0, posts: 0, demographics: 0, channels: [], notes: [], error: 'Meta organic not configured' };

  const to = opts.to ?? iso(new Date());
  const from = opts.from ?? iso(new Date(Date.now() - (opts.days ?? 30) * 86400_000));
  const today = iso(new Date());

  const rows: Row[] = [];
  const notes: string[] = [];
  const channels: string[] = [];
  let posts = 0;
  let demographics = 0;

  // Instagram — aggregate insights + per-media performance + demographics.
  const igId = await deriveIgUserId(cfg);
  if (igId) {
    channels.push('instagram');
    for (const def of IG_METRICS) {
      if (def.kind === 'field') await fetchField(cfg, igId, def, 'instagram', today, rows, notes);
      else await fetchInsight(cfg, igId, def, 'instagram', from, to, rows, notes);
    }
    posts = await pullMedia(cfg, igId, supabase, notes);
    demographics = await pullDemographics(cfg, igId, supabase, today, notes);
  }

  // Facebook Page — aggregate insights.
  if (cfg.fbPageId) {
    channels.push('facebook');
    for (const def of FB_METRICS) {
      if (def.kind === 'field') await fetchField(cfg, cfg.fbPageId, def, 'facebook', today, rows, notes);
      else await fetchInsight(cfg, cfg.fbPageId, def, 'facebook', from, to, rows, notes);
    }
  }

  let stored = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500).map((r) => ({ ...r, synced_at: new Date().toISOString() }));
    const { error } = await supabase.from('social_insights').upsert(chunk, { onConflict: 'clinic,channel,metric,day' });
    if (error) return { ok: false, stored, posts, demographics, channels, notes, error: error.message };
    stored += chunk.length;
  }

  const ok = (stored > 0 || posts > 0 || demographics > 0) || notes.length === 0;
  return { ok, stored, posts, demographics, channels, notes, error: ok ? undefined : notes[0] };
}
