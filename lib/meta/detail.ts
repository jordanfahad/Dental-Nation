import 'server-only';
import { getMetaConfig, META_LEAD_ACTION_TYPES, type MetaConfig } from '@/config/meta';

/**
 * Meta Ads detail (Meta Ads Performance sub-tab): the campaign → ad set → ad
 * hierarchy with budgets, ad-set targeting, creative assets, and spend /
 * impressions / clicks / leads. Entities (names, status, budgets, targeting,
 * creatives) come from the object edges; metrics come from /insights at each
 * level over [from,to] and are joined by id. Live, paginated, never throws.
 */

const iso = (d: Date) => d.toISOString().slice(0, 10);
const N = (v: unknown) => Number(v ?? 0) || 0;
/** Meta budgets are returned in the account-currency MINOR unit (e.g. fils). */
const minor = (v: unknown) => (v == null ? null : N(v) / 100);

export interface MetaMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
}
export interface MetaCampaignDetail extends MetaMetrics {
  id: string;
  name: string;
  objective: string;
  status: string;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
}
export interface MetaAdSetDetail extends MetaMetrics {
  id: string;
  name: string;
  campaign: string;
  status: string;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  optimizationGoal: string;
  targeting: string;
}
export interface MetaAdDetail extends MetaMetrics {
  id: string;
  name: string;
  adSet: string;
  campaign: string;
  status: string;
  creativeTitle: string | null;
  creativeBody: string | null;
  thumbnailUrl: string | null;
  cta: string | null;
}
export interface MetaAdsDetailReport {
  available: boolean;
  note: string | null;
  period: { from: string; to: string } | null;
  totals: MetaMetrics;
  campaigns: MetaCampaignDetail[];
  adSets: MetaAdSetDetail[];
  ads: MetaAdDetail[];
}

type Obj = Record<string, unknown>;

const emptyReport: MetaAdsDetailReport = {
  available: false,
  note: null,
  period: null,
  totals: { spend: 0, impressions: 0, clicks: 0, leads: 0 },
  campaigns: [],
  adSets: [],
  ads: [],
};

/** Paginate a Graph edge, following paging.next until exhausted. */
async function graphAll(cfg: MetaConfig, path: string, params: Record<string, string>): Promise<Obj[]> {
  const qs = new URLSearchParams({ ...params, access_token: cfg.token, limit: '500' }).toString();
  let url: string | null = `https://graph.facebook.com/${cfg.version}/${path}?${qs}`;
  const out: Obj[] = [];
  for (let guard = 0; url && guard < 100; guard++) {
    const res: Response = await fetch(url, { cache: 'no-store' });
    const body = (await res.json().catch(() => null)) as { data?: Obj[]; paging?: { next?: string }; error?: { message?: string } } | null;
    if (!body) break;
    if (body.error) throw new Error(`Meta API: ${body.error.message ?? 'unknown error'}`);
    if (Array.isArray(body.data)) out.push(...body.data);
    url = body.paging?.next ?? null;
  }
  return out;
}

function leadsFromActions(actions: unknown): number {
  if (!Array.isArray(actions)) return 0;
  let n = 0;
  for (const a of actions as { action_type?: string; value?: string }[]) {
    if (a.action_type && META_LEAD_ACTION_TYPES.includes(a.action_type)) n += N(a.value);
  }
  return n;
}

/** A compact human summary of an ad set's targeting spec. */
function targetingSummary(t: unknown): string {
  if (!t || typeof t !== 'object') return '—';
  const o = t as Obj;
  const parts: string[] = [];
  const ageMin = o.age_min ?? 18;
  const ageMax = o.age_max ?? 65;
  parts.push(`Age ${ageMin}–${ageMax}`);
  const genders = o.genders as number[] | undefined;
  parts.push(!genders || genders.length === 0 ? 'All genders' : genders.includes(1) && genders.includes(2) ? 'All genders' : genders.includes(1) ? 'Men' : 'Women');
  const geo = o.geo_locations as Obj | undefined;
  if (geo) {
    const countries = (geo.countries as string[]) ?? [];
    const cities = ((geo.cities as Obj[]) ?? []).map((c) => String(c.name ?? '')).filter(Boolean);
    const regions = ((geo.regions as Obj[]) ?? []).map((r) => String(r.name ?? '')).filter(Boolean);
    const locs = [...cities, ...regions, ...countries].slice(0, 4);
    if (locs.length) parts.push(locs.join(', '));
  }
  const interests: string[] = [];
  for (const spec of (o.flexible_spec as Obj[]) ?? []) {
    for (const i of (spec.interests as Obj[]) ?? []) {
      const name = String(i.name ?? '');
      if (name) interests.push(name);
    }
  }
  for (const i of (o.interests as Obj[]) ?? []) {
    const name = String(i.name ?? '');
    if (name) interests.push(name);
  }
  if (interests.length) parts.push(`Interests: ${interests.slice(0, 5).join(', ')}`);
  const platforms = o.publisher_platforms as string[] | undefined;
  if (platforms?.length) parts.push(platforms.join(', '));
  return parts.join(' · ');
}

/** Build a metrics map keyed by the level's id field (campaign_id/adset_id/ad_id). */
async function insightsByLevel(cfg: MetaConfig, accountId: string, level: 'campaign' | 'adset' | 'ad', from: string, to: string): Promise<Map<string, MetaMetrics>> {
  const idField = level === 'campaign' ? 'campaign_id' : level === 'adset' ? 'adset_id' : 'ad_id';
  const rows = await graphAll(cfg, `act_${accountId}/insights`, {
    level,
    fields: `${idField},spend,impressions,clicks,actions`,
    time_range: JSON.stringify({ since: from, until: to }),
  });
  const map = new Map<string, MetaMetrics>();
  for (const r of rows) {
    const id = String(r[idField] ?? '');
    if (!id) continue;
    map.set(id, {
      spend: N(r.spend),
      impressions: N(r.impressions),
      clicks: N(r.clicks),
      leads: leadsFromActions(r.actions),
    });
  }
  return map;
}

const zero: MetaMetrics = { spend: 0, impressions: 0, clicks: 0, leads: 0 };

export async function getMetaAdsDetail(opts: { from?: string; to?: string } = {}): Promise<MetaAdsDetailReport> {
  const cfg = getMetaConfig();
  if (!cfg) return { ...emptyReport, note: 'Meta Ads not configured' };
  try {
    const to = opts.to ?? iso(new Date());
    const from = opts.from ?? '2026-01-01';

    const campaigns: MetaCampaignDetail[] = [];
    const adSets: MetaAdSetDetail[] = [];
    const ads: MetaAdDetail[] = [];

    for (const account of cfg.accountIds) {
      const [campObjs, setObjs, adObjs, campIns, setIns, adIns] = await Promise.all([
        graphAll(cfg, `act_${account}/campaigns`, { fields: 'id,name,objective,status,daily_budget,lifetime_budget' }),
        graphAll(cfg, `act_${account}/adsets`, { fields: 'id,name,status,campaign{name},daily_budget,lifetime_budget,optimization_goal,targeting' }),
        graphAll(cfg, `act_${account}/ads`, { fields: 'id,name,status,adset{name},campaign{name},creative{title,body,thumbnail_url,call_to_action_type}' }),
        insightsByLevel(cfg, account, 'campaign', from, to),
        insightsByLevel(cfg, account, 'adset', from, to),
        insightsByLevel(cfg, account, 'ad', from, to),
      ]);

      for (const c of campObjs) {
        const id = String(c.id ?? '');
        const mx = campIns.get(id) ?? zero;
        campaigns.push({
          id, name: String(c.name ?? '(unnamed)'), objective: String(c.objective ?? ''), status: String(c.status ?? ''),
          dailyBudget: minor(c.daily_budget), lifetimeBudget: minor(c.lifetime_budget), ...mx,
        });
      }
      for (const s of setObjs) {
        const id = String(s.id ?? '');
        const mx = setIns.get(id) ?? zero;
        const camp = (s.campaign as Obj | undefined)?.name;
        adSets.push({
          id, name: String(s.name ?? '(unnamed)'), campaign: String(camp ?? ''), status: String(s.status ?? ''),
          dailyBudget: minor(s.daily_budget), lifetimeBudget: minor(s.lifetime_budget),
          optimizationGoal: String(s.optimization_goal ?? ''), targeting: targetingSummary(s.targeting), ...mx,
        });
      }
      for (const a of adObjs) {
        const id = String(a.id ?? '');
        const mx = adIns.get(id) ?? zero;
        const cr = (a.creative as Obj | undefined) ?? {};
        ads.push({
          id, name: String(a.name ?? '(unnamed)'),
          adSet: String((a.adset as Obj | undefined)?.name ?? ''), campaign: String((a.campaign as Obj | undefined)?.name ?? ''),
          status: String(a.status ?? ''),
          creativeTitle: cr.title ? String(cr.title) : null,
          creativeBody: cr.body ? String(cr.body) : null,
          thumbnailUrl: cr.thumbnail_url ? String(cr.thumbnail_url) : null,
          cta: cr.call_to_action_type ? String(cr.call_to_action_type) : null,
          ...mx,
        });
      }
    }

    const totals = campaigns.reduce(
      (t, c) => ({ spend: t.spend + c.spend, impressions: t.impressions + c.impressions, clicks: t.clicks + c.clicks, leads: t.leads + c.leads }),
      { ...zero },
    );
    campaigns.sort((a, b) => b.spend - a.spend);
    adSets.sort((a, b) => b.spend - a.spend);
    ads.sort((a, b) => b.spend - a.spend);

    const available = campaigns.length > 0 || adSets.length > 0 || ads.length > 0;
    return { available, note: available ? null : 'no Meta entities returned', period: { from, to }, totals, campaigns, adSets, ads };
  } catch (err) {
    return { ...emptyReport, note: (err as Error).message };
  }
}
