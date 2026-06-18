import 'server-only';
import type { AdminClient } from '@/lib/supabase/server';
import { getMetaConfig, META_LEAD_ACTION_TYPES, type MetaConfig } from '@/config/meta';

/**
 * Meta (Facebook/Instagram) Ads adapter — pulls campaign-level DAILY insights
 * from the Marketing API into the bronze table lane_e.meta_insights_raw.
 *
 *   GET /{ver}/act_{id}/insights?level=campaign&time_increment=1
 *       &fields=campaign_id,campaign_name,spend,impressions,clicks,actions
 *       &time_range={since,until}&limit=500&access_token=...
 *
 * Leads are summed best-effort from actions[] (incl. click-to-WhatsApp messaging
 * conversations); the full row is preserved so we can refine after the probe.
 * Paginates via paging.next. Never throws — returns a typed result.
 */

const fields = 'campaign_id,campaign_name,spend,impressions,clicks,actions,date_start,date_stop';

export interface MetaSyncResult {
  ok: boolean;
  fetched: number;
  stored: number;
  accounts: number;
  note?: string;
  error?: string;
}
export interface MetaSyncOpts {
  days?: number; // trailing window when from/to absent (default 30)
  from?: string;
  to?: string;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

function insightsUrl(cfg: MetaConfig, accountId: string, from: string, to: string): string {
  const tr = encodeURIComponent(JSON.stringify({ since: from, until: to }));
  return (
    `https://graph.facebook.com/${cfg.version}/act_${accountId}/insights` +
    `?level=campaign&time_increment=1&fields=${fields}&time_range=${tr}&limit=500` +
    `&access_token=${encodeURIComponent(cfg.token)}`
  );
}

interface MetaRow {
  campaign_id?: string;
  campaign_name?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  actions?: { action_type: string; value: string }[];
  date_start?: string;
  date_stop?: string;
}

/** Sum lead-ish actions for a row (incl. click-to-WhatsApp messaging starts). */
function leadsFromActions(actions: { action_type: string; value: string }[] | undefined): number {
  if (!Array.isArray(actions)) return 0;
  let n = 0;
  for (const a of actions) {
    if (META_LEAD_ACTION_TYPES.includes(a.action_type)) n += Number(a.value) || 0;
  }
  return n;
}

async function fetchAccount(cfg: MetaConfig, accountId: string, from: string, to: string): Promise<MetaRow[]> {
  const rows: MetaRow[] = [];
  let url: string | null = insightsUrl(cfg, accountId, from, to);
  for (let guard = 0; url && guard < 200; guard++) {
    const res: Response = await fetch(url, { cache: 'no-store' });
    const body: unknown = await res.json().catch(() => null);
    if (!body || typeof body !== 'object') break;
    const obj = body as { data?: MetaRow[]; paging?: { next?: string }; error?: { message?: string } };
    if (obj.error) throw new Error(`Meta API: ${obj.error.message ?? 'unknown error'}`);
    if (Array.isArray(obj.data)) rows.push(...obj.data);
    url = obj.paging?.next ?? null;
  }
  return rows;
}

/** Pull Meta insights into the bronze table. Default: trailing `days`; pass
 *  {from,to} to backfill history. Upserts by account|campaign|date. */
export async function syncMeta(supabase: AdminClient, opts: MetaSyncOpts = {}): Promise<MetaSyncResult> {
  const cfg = getMetaConfig();
  if (!cfg) return { ok: false, fetched: 0, stored: 0, accounts: 0, error: 'not_configured' };
  try {
    const days = opts.days ?? 30;
    const to = opts.to ?? iso(new Date());
    const from = opts.from ?? iso(new Date(new Date(to).getTime() - (days - 1) * 86400_000));

    const all: { row: MetaRow; account: string }[] = [];
    for (const account of cfg.accountIds) {
      const rows = await fetchAccount(cfg, account, from, to);
      for (const row of rows) all.push({ row, account });
    }

    const records = all.map(({ row, account }) => {
      const date = row.date_start ?? null;
      return {
        key: `${account}|${row.campaign_id ?? 'acct'}|${date ?? 'na'}`,
        account_id: account,
        campaign_id: row.campaign_id ?? null,
        campaign_name: row.campaign_name ?? null,
        date,
        spend: row.spend != null ? Number(row.spend) || 0 : null,
        impressions: row.impressions != null ? Number(row.impressions) || 0 : null,
        clicks: row.clicks != null ? Number(row.clicks) || 0 : null,
        leads: leadsFromActions(row.actions),
        data: row as unknown as Record<string, unknown>,
        fetched_at: new Date().toISOString(),
      };
    });
    const byKey = new Map(records.map((r) => [r.key, r]));
    const deduped = [...byKey.values()];
    for (let i = 0; i < deduped.length; i += 500) {
      await supabase.from('meta_insights_raw').upsert(deduped.slice(i, i + 500), { onConflict: 'key' });
    }
    return { ok: true, fetched: all.length, stored: deduped.length, accounts: cfg.accountIds.length };
  } catch (err) {
    return { ok: false, fetched: 0, stored: 0, accounts: 0, error: (err as Error).message };
  }
}

/** Shape-discovery probe: fetch a small recent window for the first account and
 *  return a sample row + summary, so we can confirm the actions/lead mapping. */
export async function metaProbe(supabase: AdminClient): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const cfg = getMetaConfig();
  if (!cfg) return { ok: false, error: 'not_configured' };
  try {
    const to = iso(new Date());
    const from = iso(new Date(Date.now() - 6 * 86400_000));
    const rows = await fetchAccount(cfg, cfg.accountIds[0], from, to);
    const sample = rows[0] ?? null;
    return {
      ok: true,
      data: {
        account: cfg.accountIds[0],
        rowCount: rows.length,
        sampleRow: sample,
        sampleActionTypes: sample?.actions?.map((a) => a.action_type) ?? [],
      },
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
