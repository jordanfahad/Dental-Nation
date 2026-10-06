import 'server-only';
import { getSupabaseAdmin, type AdminClient } from '../supabase/server';
import { aggregateDemandToDesk, emptyDemandInput, numeric, record, type DemandRange, type DemandReport, type Row } from './demandToDesk';
import { DENTAL_MARKET_DOMAIN, parseMarketSnapshot } from './demandMarket';
import { META_LAUNCH_DATE } from '../../config/demand-themes';

interface PageQuery { range(from: number, to: number): PromiseLike<{ data: unknown[] | null; error: unknown }> }
const PAGE_SIZE = 1000;
const MAX_ROWS = 100_000;

/** Stable ordering plus pagination avoids Supabase's default 1,000-row truncation. */
export async function readDemandRows(query: () => PageQuery): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; from <= MAX_ROWS; from += PAGE_SIZE) {
    const result = await query().range(from, from + PAGE_SIZE - 1);
    if (result.error) throw new Error('Source read failed');
    if (!Array.isArray(result.data)) throw new Error('Source response unavailable');
    if (rows.length + result.data.length > MAX_ROWS) throw new Error('Source exceeds 100,000-row report limit');
    rows.push(...result.data as Row[]);
    if (result.data.length < PAGE_SIZE) return rows;
  }
  return rows;
}

export async function getDemandToDesk(range: DemandRange, db: AdminClient | null = getSupabaseAdmin()): Promise<DemandReport> {
  const input = emptyDemandInput();
  input.gaps = [];
  if (!db) {
    input.gaps.push('Synced reporting sources are unavailable.');
    return aggregateDemandToDesk(input, range);
  }
  const from = range.from < META_LAUNCH_DATE ? range.from : META_LAUNCH_DATE;
  const afterEnd = new Date(Date.parse(`${range.to}T00:00:00Z`) + 86400_000).toISOString().slice(0, 10);
  const specs = [
    ['ads', 'Meta ad insights', () => db.from('meta_ad_insights_raw').select('key,account_id,ad_id,ad_name,adset_name,campaign_id,campaign_name,date,spend,impressions,data,fetched_at').gte('date', from).lte('date', range.to).order('key')],
    ['tracker', 'Lead tracker', () => db.from('raw_lead_tracker').select('id,data').order('id')],
    ['canonical', 'Canonical lead counts', () => db.from('leads').select('id,inquiry_date,channel_source').gte('inquiry_date', from).lte('inquiry_date', range.to).order('id')],
    ['appointments', 'Clinic appointments', () => db.from('practo_appointments_raw').select('appt_key,appt_date,status,mr_no,department,data').gte('appt_date', from).lte('appt_date', range.to).ilike('mr_no', 'DN%').order('appt_key')],
    ['calls', 'Call log', () => db.from('lead_call_log').select('id,lead_ref,created_at').gte('created_at', `${from}T00:00:00+04:00`).lt('created_at', `${afterEnd}T00:00:00+04:00`).order('id')],
    ['gmb', 'Google Business Profile keywords', () => db.from('gmb_search_keywords').select('month,keyword,location_path,impressions,is_threshold').gte('month', range.from.slice(0, 7)).lte('month', range.to.slice(0, 7)).order('month').order('keyword').order('location_path')],
  ] as const;
  await Promise.all(specs.map(async ([key, label, query]) => {
    try { input[key] = await readDemandRows(query); }
    catch (err) { input.gaps!.push(`${label}: ${err instanceof Error && err.message.includes('100,000') ? 'over the 100,000-row limit; totals withheld' : 'unavailable; totals withheld'}.`); }
  }));
  await Promise.all([DENTAL_MARKET_DOMAIN, 'dentalnation.com'].map(async (domain) => {
    try {
      const { data, error } = await db.from('competitor_snapshots').select('data,fetched_at').eq('domain', domain).order('fetched_at', { ascending: false }).order('id', { ascending: false }).limit(1).maybeSingle();
      if (error || !data) { input.gaps!.push(domain === DENTAL_MARKET_DOMAIN ? 'UAE keyword cache has no readable snapshot.' : 'Ranked-keyword cache has no readable snapshot.'); return; }
      if (domain === DENTAL_MARKET_DOMAIN) input.market = parseMarketSnapshot(data.data);
      else {
        const top = record(record(data.data).topKeywords);
        if (typeof top.market === 'string' && Array.isArray(top.rows)) input.ranked = {
          market: top.market, fetchedAt: String(data.fetched_at),
          rows: top.rows.map(record).filter((r) => typeof r.keyword === 'string').map((r) => ({ keyword: String(r.keyword), volume: numeric(r.volume) })),
        };
      }
    } catch {
      input.gaps!.push(domain === DENTAL_MARKET_DOMAIN ? 'UAE keyword cache is unavailable.' : 'Ranked-keyword cache is unavailable.');
    }
  }));
  return aggregateDemandToDesk(input, range);
}
