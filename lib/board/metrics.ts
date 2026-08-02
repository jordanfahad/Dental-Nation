import 'server-only';
import { cache } from 'react';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { MANUAL_METRIC_KEYS, type ManualMetric } from '@/config/board-metrics';

// Re-exported so server components can keep importing the whole vocabulary
// from one place; the client form imports them from @/config/board-metrics.
export { MANUAL_METRIC_KEYS };
export type { ManualMetric };

/**
 * Board report read layer — Part 1 live metrics.
 *
 * 🔒 THE PII BOUNDARY LIVES HERE.
 *
 * This module reads EXACTLY two aggregate-only views (lane_e.board_daily_kpis,
 * lane_e.board_monthly_kpis — migration 0021) plus the manual-entry table. It
 * must never import the growth read layer (lib/growth/channelPerformance), the
 * CRM modules, or query an underlying table directly: those carry patient
 * names, phone numbers and per-appointment records, and everything this module
 * returns is rendered on a public, no-login URL.
 *
 * If you need a new number on the board report, add it to the VIEW first.
 * That keeps the guarantee structural rather than a habit.
 *
 * Second rule: a number that has no source renders as `null`, and the UI shows
 * "Data pending". Nothing here ever substitutes a zero for a missing feed —
 * a zero is a result, and claiming one we didn't measure would be a lie to
 * the board.
 */

export interface DayRow {
  day: string;
  spendTotal: number | null;
  spendMeta: number | null;
  spendGoogle: number | null;
  impressions: number | null;
  clicks: number | null;
  metaLeads: number | null;
  googleConversions: number | null;
  apptsBooked: number | null;
  apptsShowed: number | null;
  apptsNoshow: number | null;
  apptsCancelled: number | null;
  revenue: number | null;
  billCount: number | null;
}

export interface MonthRow extends Omit<DayRow, 'day'> {
  month: string;
}

/** Windowed totals. Every field is null when the window has no source data. */
export interface WindowTotals {
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  booked: number | null;
  showed: number | null;
  noshow: number | null;
  cancelled: number | null;
  revenue: number | null;
  /** spend ÷ bookings — the cost of a booked appointment. */
  costPerBooking: number | null;
  /** showed ÷ (showed + noshow + cancelled). */
  showRate: number | null;
  /** revenue ÷ spend. */
  roas: number | null;
}

const num = (v: unknown): number | null => {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const mapRow = (r: any) => ({
  spendTotal: num(r.spend_total),
  spendMeta: num(r.spend_meta),
  spendGoogle: num(r.spend_google),
  impressions: num(r.impressions),
  clicks: num(r.clicks),
  metaLeads: num(r.meta_leads),
  googleConversions: num(r.google_conversions),
  apptsBooked: num(r.appts_booked),
  apptsShowed: num(r.appts_showed),
  apptsNoshow: num(r.appts_noshow),
  apptsCancelled: num(r.appts_cancelled),
  revenue: num(r.revenue),
  billCount: num(r.bill_count),
});
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Every day the aggregate view knows about. Request-deduped. */
export const getBoardDaily = cache(async (): Promise<DayRow[]> => {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data, error } = await db
    .from('board_daily_kpis')
    .select('*')
    .order('day', { ascending: true })
    .limit(2000);
  if (error || !data) return [];
  return data.map((r) => ({ day: String(r.day), ...mapRow(r) }));
});

/** Month-by-month appendix rows. Request-deduped. */
export const getBoardMonthly = cache(async (): Promise<MonthRow[]> => {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data, error } = await db
    .from('board_monthly_kpis')
    .select('*')
    .order('month', { ascending: true })
    .limit(240);
  if (error || !data) return [];
  return data.map((r) => ({ month: String(r.month), ...mapRow(r) }));
});

/**
 * Sum a date window. A field stays null unless at least one day in the window
 * actually reported it — so "no Meta spend since April" reads as pending, not
 * as AED 0 of performance.
 */
export function sumWindow(rows: DayRow[], from: string, to: string): WindowTotals {
  const inWindow = rows.filter((r) => r.day >= from && r.day <= to);

  const add = (pick: (r: DayRow) => number | null): number | null => {
    let seen = false;
    let total = 0;
    for (const r of inWindow) {
      const v = pick(r);
      if (v != null) {
        seen = true;
        total += v;
      }
    }
    return seen ? total : null;
  };

  const spend = add((r) => r.spendTotal);
  const booked = add((r) => r.apptsBooked);
  const showed = add((r) => r.apptsShowed);
  const noshow = add((r) => r.apptsNoshow);
  const cancelled = add((r) => r.apptsCancelled);
  const revenue = add((r) => r.revenue);

  const outcomes = (showed ?? 0) + (noshow ?? 0) + (cancelled ?? 0);

  return {
    spend,
    impressions: add((r) => r.impressions),
    clicks: add((r) => r.clicks),
    booked,
    showed,
    noshow,
    cancelled,
    revenue,
    costPerBooking: spend != null && booked != null && booked > 0 ? spend / booked : null,
    showRate: showed != null && outcomes > 0 ? showed / outcomes : null,
    roas: revenue != null && spend != null && spend > 0 ? revenue / spend : null,
  };
}

/** Fractional change vs. a prior value. Null when either side is unusable — a
 *  delta against a missing or zero base is noise, not information. */
export function delta(current: number | null, prior: number | null): number | null {
  if (current == null || prior == null || prior === 0) return null;
  return (current - prior) / prior;
}

// ── Manual metrics (spec §7.2) ───────────────────────────────────────────────

/**
 * Numbers with no live feed yet — GSC, Smile Club, WhatsApp. Keyed by
 * metric_key; the newest period wins when several exist. Absent → the card
 * renders "Data pending".
 */
export const getManualMetrics = cache(async (): Promise<Map<string, ManualMetric>> => {
  const db = getSupabaseAdmin();
  const out = new Map<string, ManualMetric>();
  if (!db) return out;
  const { data, error } = await db
    .from('growth_report_metrics')
    .select('*')
    .order('period_end', { ascending: true })
    .limit(500);
  if (error || !data) return out;
  for (const r of data) {
    out.set(String(r.metric_key), {
      metricKey: String(r.metric_key),
      periodStart: String(r.period_start),
      periodEnd: String(r.period_end),
      value: num(r.value),
      unit: r.unit ?? null,
      sourceNote: r.source_note ?? 'Entered manually',
      updatedAt: r.updated_at,
    });
  }
  return out;
});

// ── CRM / WhatsApp (live from Zavis, migration 0022) ────────────────────────

export interface CrmSummary {
  periodStart: string | null;
  periodEnd: string | null;
  totalConversations: number | null;
  messagesReceived: number | null;
  messagesSent: number | null;
  whatsappConversations: number | null;
  instagramConversations: number | null;
  whatsappInboxes: number | null;
  crmOriginatedBookings: number | null;
  aiAgentBookings: number | null;
  widgetBookings: number | null;
  allBookings: number | null;
  /**
   * Average first response, in hours, as the CRM reports it. Deliberately NOT
   * rendered on the board report: only 14 of 3,500+ conversations are marked
   * resolved, so this figure measures how little the resolution workflow is
   * used rather than how fast the clinic replies. Exposed for the internal
   * view and for whoever fixes the workflow.
   */
  avgFirstResponseHours: number | null;
}

export const getBoardCrm = cache(async (): Promise<CrmSummary | null> => {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data, error } = await db.from('board_crm_summary').select('*').maybeSingle();
  if (error || !data) return null;
  return {
    periodStart: data.period_start ? String(data.period_start) : null,
    periodEnd: data.period_end ? String(data.period_end) : null,
    totalConversations: num(data.total_conversations),
    messagesReceived: num(data.messages_received),
    messagesSent: num(data.messages_sent),
    whatsappConversations: num(data.whatsapp_conversations),
    instagramConversations: num(data.instagram_conversations),
    whatsappInboxes: num(data.whatsapp_inboxes),
    crmOriginatedBookings: num(data.crm_originated_bookings),
    aiAgentBookings: num(data.ai_agent_bookings),
    widgetBookings: num(data.widget_bookings),
    allBookings: num(data.all_bookings),
    avgFirstResponseHours: num(data.avg_first_response_hours),
  };
});

/**
 * Last completed ingestion run — the report's "Last updated" stamp.
 *
 * Deliberately NOT filtered to a 'success' status: this pipeline records a
 * healthy 15-minute run as `partial` (some of the twelve sources are expected
 * to be quiet on any given pass), so filtering for 'ok' would return nothing
 * and the board report would permanently claim it had never updated. `skipped`
 * runs did no work, so those are excluded.
 */
export const getLastIngestion = cache(async (): Promise<string | null> => {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data, error } = await db
    .from('ingestion_log')
    .select('finished_at')
    .neq('status', 'skipped')
    .not('finished_at', 'is', null)
    .order('finished_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data?.finished_at) return null;
  return String(data.finished_at);
});
