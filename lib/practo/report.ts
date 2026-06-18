import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { isPractoConfigured } from '@/config/practo';

/**
 * Read layer for Practo Insta bills (bronze: lane_e.practo_bills_raw). Honest by
 * construction: amount/date are best-effort until the response shape is confirmed
 * via /api/practo/probe, so we always report whether Practo is configured + how
 * many bills carry a parseable amount vs. not (a data gap, never a fabricated 0).
 */
export interface PractoDayPoint {
  date: string;
  bills: number;
  revenue: number;
}
export interface PractoSummary {
  configured: boolean;
  /** 'live' = read bills, 'empty' = none/unreachable. */
  source: 'live' | 'empty';
  billCount: number;
  /** Bills with a parseable amount (the rest are an amount data gap). */
  amountKnown: number;
  revenue: number;
  periodStart: string | null;
  periodEnd: string | null;
  byDay: PractoDayPoint[];
}

const empty = (configured: boolean): PractoSummary => ({
  configured,
  source: 'empty',
  billCount: 0,
  amountKnown: 0,
  revenue: 0,
  periodStart: null,
  periodEnd: null,
  byDay: [],
});

export async function getPractoSummary(range?: { from?: string; to?: string }): Promise<PractoSummary> {
  const configured = isPractoConfigured();
  const supabase = getSupabaseAdmin();
  if (!supabase) return empty(configured);
  try {
    let q = supabase.from('practo_bills_raw').select('bill_date, amount');
    if (range?.from) q = q.gte('bill_date', range.from);
    if (range?.to) q = q.lte('bill_date', range.to);
    const { data, error } = await q;
    if (error) return empty(configured);
    const rows = (data as { bill_date: string | null; amount: number | null }[]) ?? [];
    if (rows.length === 0) return empty(configured);

    let revenue = 0;
    let amountKnown = 0;
    const days = new Map<string, PractoDayPoint>();
    const dates: string[] = [];
    for (const r of rows) {
      if (r.amount != null) {
        revenue += Number(r.amount) || 0;
        amountKnown += 1;
      }
      if (r.bill_date) {
        dates.push(r.bill_date);
        const d = days.get(r.bill_date) ?? { date: r.bill_date, bills: 0, revenue: 0 };
        d.bills += 1;
        d.revenue += Number(r.amount) || 0;
        days.set(r.bill_date, d);
      }
    }
    dates.sort();
    const min = dates.length ? dates[0] : null;
    const max = dates.length ? dates[dates.length - 1] : null;
    return {
      configured,
      source: 'live',
      billCount: rows.length,
      amountKnown,
      revenue,
      periodStart: min,
      periodEnd: max,
      byDay: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
    };
  } catch {
    return empty(configured);
  }
}
