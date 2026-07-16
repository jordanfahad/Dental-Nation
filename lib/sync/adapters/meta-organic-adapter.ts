import 'server-only';
import type { AdminClient } from '@/lib/supabase/server';
import {
  getMetaOrganicConfig,
  IG_METRICS,
  FB_METRICS,
  type MetaOrganicConfig,
  type MetaMetricDef,
} from '@/config/meta-organic';

/**
 * Meta ORGANIC adapter — pulls Instagram + Facebook Page insights into
 * lane_e.social_insights (channel='instagram' / 'facebook'). Mirrors the other
 * adapters: best-effort, never throws — each metric is fetched independently and
 * a metric that errors (version-specific deprecations happen on Meta) is skipped
 * rather than failing the whole run.
 *
 *   field  metrics (followers_count / fan_count): GET /{id}?fields=…   (a stock)
 *   insight metrics (reach / page_impressions / …): GET /{id}/insights?metric=…
 *           &period=day&since=&until=   (a daily time series)
 */

export interface MetaOrganicResult {
  ok: boolean;
  stored: number;
  channels: string[];
  notes: string[];
  error?: string;
}
export interface MetaOrganicOpts {
  days?: number; // trailing window (default 30)
  from?: string;
  to?: string;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const unix = (d: string) => Math.floor(new Date(`${d}T00:00:00Z`).getTime() / 1000);
const CLINIC = 'dental-nation';

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

/** Resolve the IG business account id from the Page when only a Page id is set. */
async function deriveIgUserId(cfg: MetaOrganicConfig): Promise<string | null> {
  if (cfg.igUserId || !cfg.fbPageId) return cfg.igUserId;
  try {
    const res = await fetch(base(cfg, cfg.fbPageId, { fields: 'instagram_business_account' }), { cache: 'no-store' });
    const j = (await res.json()) as { instagram_business_account?: { id?: string } };
    return j.instagram_business_account?.id ?? null;
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
    const res = await fetch(base(cfg, id, { fields: def.api }), { cache: 'no-store' });
    const j = (await res.json()) as Record<string, unknown> & { error?: { message?: string } };
    if (j.error) return void notes.push(`${channel}/${def.api}: ${j.error.message}`);
    const raw = j[def.api];
    const value = typeof raw === 'number' ? raw : Number(raw ?? NaN);
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
    const res = await fetch(
      base(cfg, `${id}/insights`, {
        metric: def.api,
        period: 'day',
        since: String(unix(from)),
        until: String(unix(to)),
      }),
      { cache: 'no-store' },
    );
    const j = (await res.json()) as { data?: { values?: InsightValue[] }[]; error?: { message?: string } };
    if (j.error) return void notes.push(`${channel}/${def.api}: ${j.error.message}`);
    const values = j.data?.[0]?.values ?? [];
    for (const v of values) {
      const day = v.end_time?.slice(0, 10);
      if (!day) continue;
      const raw = typeof v.value === 'object' && v.value ? Object.values(v.value).reduce((s, n) => s + Number(n || 0), 0) : v.value;
      const value = Number(raw ?? 0) || 0;
      rows.push({ clinic: CLINIC, channel, integration: id, metric: def.key, metric_label: def.label, day, value });
    }
  } catch (e) {
    notes.push(`${channel}/${def.api}: ${(e as Error).message}`);
  }
}

export async function syncMetaOrganic(supabase: AdminClient, opts: MetaOrganicOpts = {}): Promise<MetaOrganicResult> {
  const cfg = getMetaOrganicConfig();
  if (!cfg) return { ok: false, stored: 0, channels: [], notes: [], error: 'Meta organic not configured' };

  const to = opts.to ?? iso(new Date());
  const from = opts.from ?? iso(new Date(Date.now() - (opts.days ?? 30) * 86400_000));
  const today = iso(new Date());

  const rows: Row[] = [];
  const notes: string[] = [];
  const channels: string[] = [];

  // Instagram
  const igId = await deriveIgUserId(cfg);
  if (igId) {
    channels.push('instagram');
    for (const def of IG_METRICS) {
      if (def.kind === 'field') await fetchField(cfg, igId, def, 'instagram', today, rows, notes);
      else await fetchInsight(cfg, igId, def, 'instagram', from, to, rows, notes);
    }
  }

  // Facebook Page
  if (cfg.fbPageId) {
    channels.push('facebook');
    for (const def of FB_METRICS) {
      if (def.kind === 'field') await fetchField(cfg, cfg.fbPageId, def, 'facebook', today, rows, notes);
      else await fetchInsight(cfg, cfg.fbPageId, def, 'facebook', from, to, rows, notes);
    }
  }

  if (rows.length === 0) {
    return { ok: notes.length === 0, stored: 0, channels, notes, error: notes[0] };
  }

  let stored = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500).map((r) => ({ ...r, synced_at: new Date().toISOString() }));
    const { error } = await supabase.from('social_insights').upsert(chunk, { onConflict: 'clinic,channel,metric,day' });
    if (error) return { ok: false, stored, channels, notes, error: error.message };
    stored += chunk.length;
  }

  return { ok: true, stored, channels, notes };
}
