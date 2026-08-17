import 'server-only';
import { cache } from 'react';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getBoardCrm, getManualMetrics, getLastIngestion, delta } from '@/lib/board/metrics';
import { DECK_COMPONENTS, type ComponentKey, type ModuleStatus } from '@/config/command-deck';
import { getSearchConsoleReport } from '@/lib/analytics/search-console';
import { getGmbReviewsReport } from '@/lib/analytics/gmb-reviews';
import { getGmbKeywordsReport } from '@/lib/analytics/gmb-keywords';

/**
 * Command Deck read layer.
 *
 * 🔒 THE PII BOUNDARY. This module reads ONLY aggregate-only views:
 *   lane_e.board_deck_daily          — journey stages + per-platform spend/leads
 *   lane_e.board_component_revenue   — billed revenue per acquisition route
 *   lane_e.board_deck_uptime         — availability monitor counts
 *   lane_e.deck_modules              — the instrument registry (config)
 * plus lib/board/metrics.ts, which is itself views-only.
 *
 * It must never import the growth read layer or query an underlying table: the
 * deck renders on a public, tokenized URL and those tables carry patient names,
 * phone numbers and mr_no. If a new number is needed, add it to a VIEW first —
 * that keeps the guarantee structural instead of a habit.
 *
 * Second rule, inherited from the board report: a number with no source is
 * null and renders as "pending", never as a zero. A zero is a result.
 */

const num = (v: unknown): number | null => {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

export interface DeckDay {
  day: string;
  impressions: number | null;
  clicks: number | null;
  spendTotal: number | null;
  spendMeta: number | null;
  spendGoogle: number | null;
  impressionsMeta: number | null;
  impressionsGoogle: number | null;
  clicksMeta: number | null;
  clicksGoogle: number | null;
  metaLeads: number | null;
  googleConversions: number | null;
  widgetEnquiries: number | null;
  enquiriesTotal: number | null;
  booked: number | null;
  showed: number | null;
  noshow: number | null;
  cancelled: number | null;
  treatments: number | null;
  revenue: number | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const mapDay = (r: any): DeckDay => ({
  day: String(r.day),
  impressions: num(r.impressions),
  clicks: num(r.clicks),
  spendTotal: num(r.spend_total),
  spendMeta: num(r.spend_meta),
  spendGoogle: num(r.spend_google),
  impressionsMeta: num(r.impressions_meta),
  impressionsGoogle: num(r.impressions_google),
  clicksMeta: num(r.clicks_meta),
  clicksGoogle: num(r.clicks_google),
  metaLeads: num(r.meta_leads),
  googleConversions: num(r.google_conversions),
  widgetEnquiries: num(r.widget_enquiries),
  enquiriesTotal: num(r.enquiries_total),
  booked: num(r.booked),
  showed: num(r.showed),
  noshow: num(r.noshow),
  cancelled: num(r.cancelled),
  treatments: num(r.treatments),
  revenue: num(r.revenue),
});
/* eslint-enable @typescript-eslint/no-explicit-any */

export const getDeckDaily = cache(async (): Promise<DeckDay[]> => {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data, error } = await db
    .from('board_deck_daily')
    .select('*')
    .order('day', { ascending: true })
    .limit(2000);
  if (error || !data) return [];
  return data.map(mapDay);
});

export interface ComponentDayRow {
  day: string;
  component: string;
  bills: number | null;
  revenue: number | null;
}

export const getComponentRevenue = cache(async (): Promise<ComponentDayRow[]> => {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data, error } = await db.from('board_component_revenue').select('*').limit(5000);
  if (error || !data) return [];
  return data.map((r) => ({
    day: String(r.day),
    component: String(r.component),
    bills: num(r.bills),
    revenue: num(r.revenue),
  }));
});

export interface VisibilityRow {
  day: string;
  channel: string;
  metric: string;
  value: number | null;
}

export const getDeckVisibility = cache(async (): Promise<VisibilityRow[]> => {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data, error } = await db.from('board_deck_visibility').select('*').limit(5000);
  if (error || !data) return [];
  return data.map((r) => ({
    day: String(r.day),
    channel: String(r.channel),
    metric: String(r.metric),
    value: num(r.value),
  }));
});

/** Daily Business Profile metrics (calls, directions, clicks, map views) —
    straight from social_insights channel='gmb', windowed by the caller. */
interface GmbDayRow {
  day: string;
  metric: string;
  value: number | null;
}
const getDeckGmbDays = cache(async (): Promise<GmbDayRow[]> => {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data, error } = await db
    .from('social_insights')
    .select('day, metric, value')
    .eq('channel', 'gmb')
    .limit(5000);
  if (error || !data) return [];
  return data.map((r) => ({ day: String(r.day), metric: String(r.metric), value: num(r.value) }));
});

/**
 * Build / platform / vendor fees from the Marketing OS cost line. Returns a
 * null total when nothing has been entered — an investment figure that quietly
 * omits what the build cost would flatter every return number on the page.
 */
export const getDeckCosts = cache(
  async (): Promise<{ rows: number; total: number | null; byMonth: Map<string, number> }> => {
    const db = getSupabaseAdmin();
    if (!db) return { rows: 0, total: null, byMonth: new Map() };
    const { data, error } = await db
      .from('mos_costs')
      .select('month, zavis_fee_aed, azure_cost_aed, other_aed')
      .limit(500);
    if (error || !data || data.length === 0) return { rows: 0, total: null, byMonth: new Map() };
    const byMonth = new Map<string, number>();
    let total = 0;
    for (const r of data) {
      const amount = (num(r.zavis_fee_aed) ?? 0) + (num(r.azure_cost_aed) ?? 0) + (num(r.other_aed) ?? 0);
      total += amount;
      const key = String(r.month ?? '').slice(0, 7);
      if (key) byMonth.set(key, (byMonth.get(key) ?? 0) + amount);
    }
    return { rows: data.length, total, byMonth };
  },
);

export interface Ga4Event {
  key: string;
  label: string;
  count: number | null;
  /** Conversion from the previous step, 0..1. */
  fromPrev: number | null;
}

export interface Ga4Channel {
  channel: string;
  sessions: number | null;
  conversions: number | null;
}

export interface Ga4Snapshot {
  periodStart: string | null;
  periodEnd: string | null;
  sessions: number | null;
  users: number | null;
  newUsers: number | null;
  engagedSessions: number | null;
  conversions: number | null;
  channels: Ga4Channel[];
  events: Ga4Event[];
}

/**
 * The GA4 snapshot. One row, covering a rolling ~28-day window rather than a
 * daily history, so every figure taken from it is labelled with its own period
 * and never silently presented as answering the page's date filter.
 */
export const getDeckGa4 = cache(async (): Promise<Ga4Snapshot | null> => {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data, error } = await db.from('board_deck_ga4').select('*').maybeSingle();
  if (error || !data) return null;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const chRaw = Array.isArray(data.channels) ? (data.channels as any[]) : [];
  const evRaw = Array.isArray(data.onsite_funnel) ? (data.onsite_funnel as any[]) : [];
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return {
    periodStart: data.period_start ? String(data.period_start) : null,
    periodEnd: data.period_end ? String(data.period_end) : null,
    sessions: num(data.sessions),
    users: num(data.users),
    newUsers: num(data.new_users),
    engagedSessions: num(data.engaged_sessions),
    conversions: num(data.conversions),
    channels: chRaw
      .map((c) => ({
        channel: String(c?.channel ?? 'Unknown'),
        sessions: num(c?.sessions),
        conversions: num(c?.conversions),
      }))
      .sort((a, b) => (b.sessions ?? 0) - (a.sessions ?? 0)),
    events: evRaw.map((e) => ({
      key: String(e?.key ?? ''),
      label: String(e?.label ?? e?.key ?? ''),
      count: num(e?.count),
      fromPrev: num(e?.conversionFromPrev),
    })),
  };
});

export interface Ga4DailyRow {
  day: string;
  channel: string;
  sessions: number | null;
  users: number | null;
  newUsers: number | null;
  engagedSessions: number | null;
  conversions: number | null;
}

/** Daily GA4 — the windowed source that replaced the rolling snapshot. */
export const getGa4Daily = cache(async (): Promise<Ga4DailyRow[]> => {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data, error } = await db.from('board_deck_ga4_daily').select('*').limit(50000);
  if (error || !data) return [];
  return data.map((r) => ({
    day: String(r.day),
    channel: String(r.channel),
    sessions: num(r.sessions),
    users: num(r.users),
    newUsers: num(r.new_users),
    engagedSessions: num(r.engaged_sessions),
    conversions: num(r.conversions),
  }));
});

export const getGa4DailyEvents = cache(async (): Promise<{ day: string; event: string; count: number | null }[]> => {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data, error } = await db.from('board_deck_ga4_events').select('*').limit(50000);
  if (error || !data) return [];
  return data.map((r) => ({ day: String(r.day), event: String(r.event_name), count: num(r.event_count) }));
});

/**
 * GA4 for the SELECTED window.
 *
 * Everything else on this page obeys the date filter, and until the daily
 * tables existed the analytics figures quietly did not — they described a
 * rolling four-week snapshot whatever the reader picked. This assembles the
 * daily rows for the chosen window and only falls back to the snapshot while
 * the daily backfill has not yet landed, saying so when it does.
 */
export interface Ga4WindowView {
  /** True when the figures cover exactly the window the reader selected. */
  windowed: boolean;
  periodStart: string | null;
  periodEnd: string | null;
  sessions: number | null;
  users: number | null;
  newUsers: number | null;
  engagedSessions: number | null;
  conversions: number | null;
  channels: Ga4Channel[];
  events: { label: string; count: number | null; fromPrev: number | null }[];
  available: boolean;
}

export function buildGa4Window(
  daily: Ga4DailyRow[],
  dailyEvents: { day: string; event: string; count: number | null }[],
  snapshot: Ga4Snapshot | null,
  from: string,
  to: string,
): Ga4WindowView {
  const rows = daily.filter((r) => r.day >= from && r.day <= to);

  if (rows.length === 0) {
    // No daily coverage yet — use the snapshot, clearly flagged as off-window.
    if (!snapshot) {
      return {
        windowed: false,
        periodStart: null,
        periodEnd: null,
        sessions: null,
        users: null,
        newUsers: null,
        engagedSessions: null,
        conversions: null,
        channels: [],
        events: [],
        available: false,
      };
    }
    return {
      windowed: false,
      periodStart: snapshot.periodStart,
      periodEnd: snapshot.periodEnd,
      sessions: snapshot.sessions,
      users: snapshot.users,
      newUsers: snapshot.newUsers,
      engagedSessions: snapshot.engagedSessions,
      conversions: snapshot.conversions,
      channels: snapshot.channels,
      events: snapshot.events.map((e) => ({ label: e.label, count: e.count, fromPrev: e.fromPrev })),
      available: true,
    };
  }

  // Day totals are stored as channel 'ALL' precisely so the header figures
  // never depend on the channel rows summing correctly — GA4's channel
  // groupings can leave sessions unassigned.
  const totalRows = rows.filter((r) => r.channel === 'ALL');
  const chRows = rows.filter((r) => r.channel !== 'ALL');
  const src = totalRows.length > 0 ? totalRows : chRows;
  const sum = (pick: (r: Ga4DailyRow) => number | null): number =>
    src.reduce((a, r) => a + (pick(r) ?? 0), 0);

  const byChannel = new Map<string, { sessions: number; conversions: number }>();
  for (const r of chRows) {
    const cur = byChannel.get(r.channel) ?? { sessions: 0, conversions: 0 };
    cur.sessions += r.sessions ?? 0;
    cur.conversions += r.conversions ?? 0;
    byChannel.set(r.channel, cur);
  }

  const byEvent = new Map<string, number>();
  for (const e of dailyEvents) {
    if (e.day < from || e.day > to) continue;
    byEvent.set(e.event, (byEvent.get(e.event) ?? 0) + (e.count ?? 0));
  }

  const days = [...new Set(rows.map((r) => r.day))].sort();

  return {
    windowed: true,
    periodStart: days[0] ?? from,
    periodEnd: days[days.length - 1] ?? to,
    sessions: sum((r) => r.sessions),
    users: sum((r) => r.users),
    newUsers: sum((r) => r.newUsers),
    engagedSessions: sum((r) => r.engagedSessions),
    conversions: sum((r) => r.conversions),
    channels: [...byChannel.entries()]
      .map(([channel, v]) => ({ channel, sessions: v.sessions, conversions: v.conversions }))
      .sort((a, b) => (b.sessions ?? 0) - (a.sessions ?? 0)),
    events: [...byEvent.entries()]
      .map(([label, count]) => ({ label, count, fromPrev: null as number | null }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 24),
    available: true,
  };
}

export interface GoogleCampaignRow {
  day: string;
  campaignName: string;
  campaignType: string;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  conversions: number | null;
}

export const getGoogleCampaigns = cache(async (): Promise<GoogleCampaignRow[]> => {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data, error } = await db.from('board_deck_google_campaigns').select('*').limit(20000);
  if (error || !data) return [];
  return data.map((r) => ({
    day: String(r.day),
    campaignName: String(r.campaign_name),
    campaignType: String(r.campaign_type),
    spend: num(r.spend),
    impressions: num(r.impressions),
    clicks: num(r.clicks),
    conversions: num(r.conversions),
  }));
});

export interface ClickTypeRow {
  day: string;
  clickType: string;
  clicks: number | null;
}

export const getGoogleClickTypes = cache(async (): Promise<ClickTypeRow[]> => {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data, error } = await db.from('board_deck_google_clicktypes').select('*').limit(20000);
  if (error || !data) return [];
  return data.map((r) => ({ day: String(r.day), clickType: String(r.click_type), clicks: num(r.clicks) }));
});

/** A cascade row for a drill-down rendered in waterfall style. */
export interface CascadeRow {
  label: string;
  sublabel: string | null;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  conversions: number | null;
  /** Share of the parent total, 0..1 — drives the bar width. */
  share: number | null;
}

export interface GoogleDetail {
  byType: CascadeRow[];
  byCampaign: CascadeRow[];
  clickTypes: { label: string; clicks: number; share: number }[];
  totalSpend: number | null;
  totalConversions: number | null;
  typeNote: string;
}

export interface UptimeDay {
  day: string;
  checks: number;
  okChecks: number;
  siteChecks: number;
  siteOkChecks: number;
}

export const getDeckUptime = cache(async (): Promise<UptimeDay[]> => {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data, error } = await db.from('board_deck_uptime').select('*').limit(1000);
  if (error || !data) return [];
  return data.map((r) => ({
    day: String(r.day),
    checks: num(r.checks) ?? 0,
    okChecks: num(r.ok_checks) ?? 0,
    siteChecks: num(r.site_checks) ?? 0,
    siteOkChecks: num(r.site_ok_checks) ?? 0,
  }));
});

export interface DeckModuleRow {
  key: string;
  title: string;
  status: ModuleStatus;
  sort: number;
  enabled: boolean;
  sourceNote: string | null;
}

export const getDeckModules = cache(async (): Promise<DeckModuleRow[]> => {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data, error } = await db.from('deck_modules').select('*').order('sort', { ascending: true });
  if (error || !data) return [];
  return data
    .filter((r) => r.enabled !== false)
    .map((r) => ({
      key: String(r.key),
      title: String(r.title),
      status: (['LIVE', 'PENDING_DATA', 'RD'].includes(String(r.status)) ? r.status : 'PENDING_DATA') as ModuleStatus,
      sort: num(r.sort) ?? 0,
      enabled: r.enabled !== false,
      sourceNote: r.source_note ? String(r.source_note) : null,
    }));
});

/* ─────────────────────────────────────────────────────────── windowed sums ── */

/** Sum a field across a window; null unless at least one day reported it. */
function add(rows: DeckDay[], pick: (r: DeckDay) => number | null): number | null {
  let seen = false;
  let total = 0;
  for (const r of rows) {
    const v = pick(r);
    if (v != null) {
      seen = true;
      total += v;
    }
  }
  return seen ? total : null;
}

export interface JourneyTotals {
  viewed: number | null;
  inquired: number | null;
  booked: number | null;
  showed: number | null;
  treated: number | null;
  revenue: number | null;
}

export interface DeckWindow {
  from: string;
  to: string;
  journey: JourneyTotals;
  /** Same six stages for the comparison window — null when not comparing. */
  priorJourney: JourneyTotals | null;
  spend: number | null;
  spendMeta: number | null;
  spendGoogle: number | null;
  clicks: number | null;
  clicksMeta: number | null;
  clicksGoogle: number | null;
  impressionsMeta: number | null;
  impressionsGoogle: number | null;
  metaLeads: number | null;
  googleConversions: number | null;
  widgetEnquiries: number | null;
  noshow: number | null;
  cancelled: number | null;
}

function journeyOf(rows: DeckDay[]): JourneyTotals {
  return {
    viewed: add(rows, (r) => r.impressions),
    inquired: add(rows, (r) => r.enquiriesTotal),
    booked: add(rows, (r) => r.booked),
    showed: add(rows, (r) => r.showed),
    treated: add(rows, (r) => r.treatments),
    revenue: add(rows, (r) => r.revenue),
  };
}

export function windowFrom(all: DeckDay[], from: string, to: string, priorFrom: string | null, priorTo: string | null): DeckWindow {
  const rows = all.filter((r) => r.day >= from && r.day <= to);
  const prior = priorFrom && priorTo ? all.filter((r) => r.day >= priorFrom && r.day <= priorTo) : null;
  return {
    from,
    to,
    journey: journeyOf(rows),
    priorJourney: prior ? journeyOf(prior) : null,
    spend: add(rows, (r) => r.spendTotal),
    spendMeta: add(rows, (r) => r.spendMeta),
    spendGoogle: add(rows, (r) => r.spendGoogle),
    clicks: add(rows, (r) => r.clicks),
    clicksMeta: add(rows, (r) => r.clicksMeta),
    clicksGoogle: add(rows, (r) => r.clicksGoogle),
    impressionsMeta: add(rows, (r) => r.impressionsMeta),
    impressionsGoogle: add(rows, (r) => r.impressionsGoogle),
    metaLeads: add(rows, (r) => r.metaLeads),
    googleConversions: add(rows, (r) => r.googleConversions),
    widgetEnquiries: add(rows, (r) => r.widgetEnquiries),
    noshow: add(rows, (r) => r.noshow),
    cancelled: add(rows, (r) => r.cancelled),
  };
}

/* ────────────────────────────────────────────────────────────── waterfall ── */

export interface WaterfallBar {
  key: ComponentKey;
  label: string;
  detail: string;
  attribution: 'measured' | 'pending' | 'residual';
  /** Measured billed revenue in the window; null when attribution is pending. */
  revenue: number | null;
  bills: number | null;
  pendingNote: string | null;
  /** What this component CAN prove when revenue is pending (leads / spend). */
  provenLabel: string | null;
  /** Exactly how this component's figure is derived. */
  source: string;
  /** The component's own live dashboard, opened in place. */
  breakdown: Breakdown[];
  /**
   * The three numbers the single chart is built from.
   * traced       — revenue this route can prove patient by patient, kept here.
   * allocated    — its modelled share of the revenue nobody could trace.
   * contribution — traced + allocated; the height of this bar.
   * Across all bars, contribution sums to total billed revenue exactly.
   */
  traced: number | null;
  allocated: number;
  contribution: number;
  /** Which analytics channels drove the allocation, or why there was none. */
  allocationBasis: string;
  /** False when no web analytics channel can observe this route at all. */
  observable: boolean;
}

export interface AllocationInfo {
  /** True when there was both an untraced pool and an analytics key to split it by. */
  available: boolean;
  /** The revenue being shared out — direct/walk-in plus unattributed. */
  pool: number;
  /** Whether the allocation key covers the selected window or a rolling snapshot. */
  windowed: boolean;
  method: string;
  /** What would make a reader over-trust the pale bars. Never hidden. */
  confidence: string | null;
  /** Routes no web analytics can observe — named, never silently scored zero. */
  invisible: string[];
}

export interface Waterfall {
  bars: WaterfallBar[];
  /** Sum of traced revenue only — what the platform can prove. */
  total: number | null;
  /** Sum of every bar's contribution — equals total billed revenue by construction. */
  contributionTotal: number;
  /** True when the bars reconcile to the journey's revenue figure. */
  reconciles: boolean;
  allocation: AllocationInfo;
}

/**
 * Map GA4's channel-grouping names onto deck components. A grouping not listed
 * here falls to 'unattributed' rather than being dropped, so the allocation
 * always sums back to the untraced pool.
 */
const GA4_TO_COMPONENT: { match: RegExp; key: ComponentKey }[] = [
  { match: /paid search|cross-network/i, key: 'google_ads' },
  { match: /paid social|paid other|display|paid video/i, key: 'meta' },
  { match: /ai assistant|generative|chatgpt|perplexity|copilot/i, key: 'ai_seo' },
  { match: /organic search/i, key: 'seo' },
  { match: /organic social/i, key: 'social_organic' },
  { match: /referral/i, key: 'partner' },
  { match: /email/i, key: 'crm' },
  { match: /direct/i, key: 'direct' },
];

export function buildWaterfall(
  componentRows: ComponentDayRow[],
  win: DeckWindow,
  from: string,
  to: string,
  ga4Channels: Ga4Channel[],
  ga4Windowed: boolean,
): Waterfall {
  const inWindow = componentRows.filter((r) => r.day >= from && r.day <= to);
  const byComponent = new Map<string, { revenue: number; bills: number }>();
  for (const r of inWindow) {
    const cur = byComponent.get(r.component) ?? { revenue: 0, bills: 0 };
    cur.revenue += r.revenue ?? 0;
    cur.bills += r.bills ?? 0;
    byComponent.set(r.component, cur);
  }

  const int = (n: number | null): string => (n == null ? '—' : Math.round(n).toLocaleString('en-US'));
  const aed = (n: number | null): string => (n == null ? '—' : `AED ${Math.round(n).toLocaleString('en-US')}`);

  /* ── Allocation: how every channel gets onto the one chart ──────────────
   * Revenue traced patient by patient stays exactly where it was traced. The
   * revenue nobody could trace — patients booked at reception or by phone,
   * plus bills with no CRM record — is then shared out across channels in
   * proportion to each channel's share of the conversions analytics recorded.
   * That is an allocation, not a measurement, and each bar carries both halves
   * separately so a reader can always see which is which. */
  const pool =
    (byComponent.get('direct')?.revenue ?? 0) + (byComponent.get('unattributed')?.revenue ?? 0);

  /* THE KEY, and why it is what it is.
   *
   * Not conversions: conversion events are tagged inconsistently across the
   * site, with recorded rates by channel running from about 11% to over 80%.
   * That is an instrumentation difference, not a behavioural one, and
   * splitting half a million dirhams on it would hand the biggest share of
   * group revenue to whichever channel happens to fire the most events.
   *
   * Website sessions, therefore — counted identically for every channel. But
   * sessions alone are blind in one specific and material way: Meta's
   * click-to-WhatsApp campaigns send people to a conversation, not to the
   * site, so only a few percent of Meta's clicks ever appear as a session
   * while nearly all of Google's do. Keying on sessions alone would read that
   * measurement blind spot as a performance gap and under-credit Meta by an
   * order of magnitude. So each channel's key is the demand the platform can
   * count FOR THAT CHANNEL: website sessions, plus off-site lead events for
   * the channels whose demand deliberately never reaches the website.
   *
   * That mixes two counting systems in one denominator, which is a real
   * weakness and is stated on the page rather than buried here. */
  const convByComponent = new Map<string, { conv: number; names: string[] }>();
  let convTotal = 0;
  const addKey = (key: string, amount: number, name: string) => {
    if (amount <= 0) return;
    const cur = convByComponent.get(key) ?? { conv: 0, names: [] };
    cur.conv += amount;
    cur.names.push(name);
    convByComponent.set(key, cur);
    convTotal += amount;
  };

  for (const ch of ga4Channels) {
    const key = GA4_TO_COMPONENT.find((m) => m.match.test(ch.channel))?.key ?? 'unattributed';
    addKey(key, ch.sessions ?? 0, `${Math.round(ch.sessions ?? 0).toLocaleString('en-US')} ${ch.channel} sessions`);
  }
  // Off-site demand: enquiries that by design never land on the website.
  addKey(
    'meta',
    win.metaLeads ?? 0,
    `${Math.round(win.metaLeads ?? 0).toLocaleString('en-US')} click-to-WhatsApp lead events Meta reported (these never reach the website, so analytics cannot see them)`,
  );

  const allocationAvailable = convTotal > 0 && pool > 0;

  const bars: WaterfallBar[] = DECK_COMPONENTS.map((c) => {
    const hit = byComponent.get(c.key);
    // What a pending component can honestly prove for this window.
    let provenLabel: string | null = null;
    if (c.key === 'google_ads') {
      provenLabel = `${aed(win.spendGoogle)} spend · ${int(win.googleConversions)} conversions reported`;
    } else if (c.key === 'meta') {
      provenLabel = `${aed(win.spendMeta)} spend · ${int(win.metaLeads)} lead events reported`;
    } else if (c.key === 'seo') {
      provenLabel = 'Search Console feed pending';
    } else if (c.key === 'smile_club') {
      provenLabel = 'Membership feed pending';
    } else if (c.key === 'partner') {
      provenLabel = 'Reconciliation feed pending';
    }

    const revenue = c.attribution === 'pending' ? null : hit ? hit.revenue : null;
    const bills = hit ? hit.bills : null;

    const TRACED =
      'Traced patient by patient: each bill carries the patient file number, the file gives the phone number, and the CRM records which route booked that patient. One bill, one route — nothing is shared out or estimated.';

    const HANDED_OVER =
      ' Because these patients cannot be tied to any channel, this revenue is the pool that gets shared out across the routes above, so this row shows only what came back to it rather than the full amount traced. The full traced figure is in the panel below.';

    const source =
      c.attribution === 'pending'
        ? 'Nothing can be TRACED from this channel to a named billed patient yet — the identity chain (a click or enquiry carrying a phone number the practice system can match) does not exist. That is why the Traced column shows a dash. The channel still appears on the chart through its modelled share below, and the figures here are what the platform itself reports.'
        : c.key === 'unattributed'
          ? 'Bills whose patient has no booking record in the CRM at all — shown rather than folded into another route, so the bars still add up to the total.' +
            (allocationAvailable ? HANDED_OVER : '')
          : c.key === 'direct'
            ? TRACED + (allocationAvailable ? HANDED_OVER : '')
            : TRACED;

    const breakdown: Breakdown[] =
      c.attribution === 'pending'
        ? c.key === 'google_ads'
          ? [
              { label: 'Spend', value: win.spendGoogle, unit: 'aed' },
              { label: 'Clicks', value: win.clicksGoogle, unit: 'count' },
              { label: 'Conversions reported by Google', value: win.googleConversions, unit: 'count' },
              {
                label: 'Cost per click',
                value: win.spendGoogle != null && win.clicksGoogle ? win.spendGoogle / win.clicksGoogle : null,
                unit: 'aed',
              },
            ]
          : c.key === 'meta'
            ? [
                { label: 'Spend', value: win.spendMeta, unit: 'aed' },
                { label: 'Clicks', value: win.clicksMeta, unit: 'count' },
                { label: 'Lead events reported by Meta', value: win.metaLeads, unit: 'count' },
                {
                  label: 'Cost per click',
                  value: win.spendMeta != null && win.clicksMeta ? win.spendMeta / win.clicksMeta : null,
                  unit: 'aed',
                },
              ]
            : []
        : [
            { label: 'Billed revenue', value: revenue, unit: 'aed' },
            { label: 'Treatments billed', value: bills, unit: 'count' },
            {
              label: 'Average bill',
              value: revenue != null && bills ? revenue / bills : null,
              unit: 'aed',
            },
            {
              label: 'Share of total billed',
              value: revenue != null && win.journey.revenue ? revenue / win.journey.revenue : null,
              unit: 'count',
              note: 'shown as a share on the chart',
            },
          ];

    // The two routes that make up the pool hand their revenue to the
    // allocation; everything else keeps what it traced and adds its share.
    const isPool = c.key === 'direct' || c.key === 'unattributed';
    const convHit = convByComponent.get(c.key);
    const allocated = allocationAvailable && convHit ? (convHit.conv / convTotal) * pool : 0;
    const kept = allocationAvailable && isPool ? 0 : (revenue ?? 0);

    const allocationBasis = !allocationAvailable
      ? 'No allocation applied in this window.'
      : convHit
        ? `Allocated on ${convHit.names.join(' + ')} — ${Math.round(convHit.conv).toLocaleString('en-US')} of ${Math.round(convTotal).toLocaleString('en-US')} countable demand events in this window, or ${((convHit.conv / convTotal) * 100).toFixed(1)}%.`
        : c.key === 'ooh'
          ? 'No web analytics channel can observe this route: someone who passes a billboard and later telephones or walks in leaves no digital trace anywhere. Its effect is real and currently sits inside the routes above.'
          : c.key === 'gmb'
            ? 'Maps and local-search visitors reach the website as organic search or direct traffic, so analytics cannot separate them out — this route receives no share of its own, and its effect sits inside those two.'
            : 'No analytics channel maps to this route in this window, so it receives no allocated share.';

    return {
      key: c.key,
      label: c.label,
      detail: c.detail,
      attribution: c.attribution,
      revenue,
      bills,
      pendingNote: c.pendingNote ?? null,
      provenLabel,
      source,
      breakdown,
      traced: allocationAvailable && isPool ? null : revenue,
      allocated,
      contribution: kept + allocated,
      allocationBasis,
      observable: c.key !== 'ooh' && convHit != null,
    };
  });

  const total = bars.reduce<number | null>((acc, b) => (b.revenue == null ? acc : (acc ?? 0) + b.revenue), null);
  const contributionTotal = bars.reduce((a, b) => a + b.contribution, 0);
  const revenue = win.journey.revenue;
  const reconciles = total != null && revenue != null && Math.abs(total - revenue) < 1;

  return {
    bars,
    total,
    contributionTotal,
    reconciles,
    allocation: {
      available: allocationAvailable,
      pool,
      windowed: ga4Windowed,
      invisible: allocationAvailable ? DECK_COMPONENTS.filter((c) => c.key === 'ooh').map((c) => c.label) : [],
      method: allocationAvailable
        ? `Solid bar = revenue traced to a named billed patient. Pale bar = that route's modelled share of the ${aed(pool)} nobody could trace, split by each channel's share of the demand the platform can actually count for it${ga4Windowed ? ' in this same window' : ' in a rolling four-week snapshot'} — website sessions, plus the off-site lead events for channels whose enquiries deliberately never reach the website. The pale half is an allocation, not a measurement: it answers "what did each channel probably contribute", not "which patients came from where".`
        : 'Every bar here is traced revenue — no allocation was applied, because there was no countable demand to split the untraced revenue by.',
      confidence: allocationAvailable
        ? 'READ THE PALE BARS WITH CARE. Three things limit them. Website sessions and platform lead events are counted by different systems, so adding them into one denominator is approximate by construction. The revenue being shared out is mostly patients who walked into a clinic or telephoned, and it is being split by a measure of WEBSITE demand — that assumes the two behave alike, which is an assumption rather than a finding. And any channel the web cannot see at all, above all out-of-home, gets nothing, so the channels that can be seen absorb its share. One cheap instrument replaces all of this with measurement: ask every new patient at reception how they heard of us, and record the answer.'
        : null,
    },
  };
}

/* ──────────────────────────────────────────────────────────────── modules ── */

export interface ModuleStat {
  label: string;
  value: number | null;
  format: 'int' | 'aed' | 'pct';
  /** Fractional change vs. the comparison window, when one exists. */
  delta?: number | null;
  /** Lower is better (cost metrics) — the UI flips the delta colour. */
  downGood?: boolean;
}

export interface ModuleCard {
  key: string;
  title: string;
  status: ModuleStatus;
  sourceNote: string | null;
  stats: ModuleStat[];
  /** Revenue (or lead) contribution line for this system. */
  contribution: string;
  /** Detail rows revealed in the drawer. */
  detail: { label: string; value: string }[];
  /** Shown when the module has no live feed — what it needs. */
  pendingNote: string | null;
}

/**
 * The wide funnel from Mr. Akbar's sketch — nine stages from brand visibility
 * through to revenue. Wider than the six-gauge strip because it separates the
 * two things that behave completely differently at the top (owned audience vs
 * paid reach) and at the lead stage (an indirect lead event vs a qualified
 * booking request that names a treatment, clinic and date).
 */
export interface Breakdown {
  label: string;
  value: number | null;
  unit: 'count' | 'aed';
  note?: string;
}

export interface FunnelStage {
  key: string;
  label: string;
  /** What the number literally counts. */
  basis: string;
  value: number | null;
  /** 'aed' renders as currency; 'count' as an integer. */
  unit: 'count' | 'aed';
  /** Conversion from the previous stage, when the two are comparable. */
  rate: string | null;
  /** Set when the stage has no feed yet — never a zero standing in for a gap. */
  pending: string | null;
  /** Exactly which system and record type this figure is counted from. */
  source: string;
  /** The stage's own live dashboard — what the number is made of. */
  breakdown: Breakdown[];
  /**
   * Anything that would make a reader misread the number or the conversion
   * into it. Shown in the drawer, never buried.
   */
  caveat: string | null;
}

export interface InvestmentSummary {
  /** Systems delivered (the module registry) and how many are wired to a feed. */
  projectsDelivered: number;
  projectsLive: number;
  revenue: number | null;
  /** Media spend in the window — known. */
  mediaSpend: number | null;
  /** Build/platform/vendor fees — null until entered in Marketing OS. */
  buildCost: number | null;
  /** mediaSpend + buildCost, or null when buildCost is unknown. */
  totalInvestment: number | null;
  /** revenue ÷ total investment; null while any cost component is missing. */
  returnMultiple: number | null;
  /** revenue ÷ media spend — always computable, and labelled as partial. */
  returnOnMedia: number | null;
  costNote: string;
}

/**
 * The GROWTH → P&L bridge (Mr Akbar's third ask): what growth activity does
 * to the financial line, month by month.
 *
 * Everything here is the arithmetic of numbers the platform already holds —
 * billed revenue and media spend from the daily feed, build/vendor cost from
 * the invoice register, patients from the booking chain. Nothing is modelled
 * EXCEPT where a channel's contribution includes its allocated share, and
 * every such figure says so. Months are the unit because the P&L is monthly;
 * the page's date filter deliberately does not slice this section — a
 * forecast-adjacent exhibit that changed with a date picker would be noise.
 */
export interface PnlMonth {
  /** YYYY-MM. */
  month: string;
  /** True for months before the billing feed's first recorded bill — revenue
   *  there is MISSING, not zero, and the UI must not render it as zero. */
  preFeed: boolean;
  revenue: number;
  mediaSpend: number;
  buildCost: number;
  /** mediaSpend + buildCost. */
  investment: number;
  /** revenue − investment. */
  netAfterGrowth: number;
  /** investment ÷ revenue, null when revenue is 0. */
  costRatio: number | null;
  attended: number;
}

export interface ChannelEconomics {
  key: ComponentKey;
  label: string;
  /** Media spend in the window; null when the channel buys no media. */
  spend: number | null;
  traced: number | null;
  allocated: number;
  contribution: number;
  /** contribution ÷ spend — only where spend exists. */
  returnMultiple: number | null;
}

export interface PnlView {
  months: PnlMonth[];
  totals: {
    revenue: number;
    mediaSpend: number;
    buildCost: number;
    investment: number;
    netAfterGrowth: number;
    costRatio: number | null;
    returnMultiple: number | null;
    /** Revenue and acquisition cost per attended patient, full history. */
    revenuePerPatient: number | null;
    investmentPerPatient: number | null;
  };
  channels: ChannelEconomics[];
  note: string;
}

export interface DeckReport {
  from: string;
  to: string;
  window: DeckWindow;
  waterfall: Waterfall;
  pnl: PnlView;
  ga4: Ga4WindowView;
  funnel: FunnelStage[];
  investment: InvestmentSummary;
  modules: ModuleCard[];
  /** Campaign-level Google Ads cascade for its drawer. */
  google: GoogleDetail;
  lastUpdated: string | null;
  liveModules: number;
  totalModules: number;
  uptime: { availability: number | null; site: number | null; checks: number };
}

const pctOrNull = (a: number | null, b: number | null): number | null =>
  a == null || b == null || b === 0 ? null : a / b;

export async function getCommandDeck(
  from: string,
  to: string,
  priorFrom: string | null,
  priorTo: string | null,
): Promise<DeckReport> {
  const [daily, componentRows, uptimeRows, modules, crm, manual, lastUpdated, visibility, costs] = await Promise.all([
    getDeckDaily(),
    getComponentRevenue(),
    getDeckUptime(),
    getDeckModules(),
    getBoardCrm().catch(() => null),
    getManualMetrics().catch(() => new Map()),
    getLastIngestion().catch(() => null),
    getDeckVisibility().catch(() => [] as VisibilityRow[]),
    getDeckCosts().catch(() => ({ rows: 0, total: null as number | null, byMonth: new Map<string, number>() })),
  ]);
  const [gCampaigns, gClickTypes, ga4Snapshot, ga4DailyRows, ga4EventRows, search, gmbDays, gmbReviews, gmbKeywords] = await Promise.all([
    getGoogleCampaigns().catch(() => [] as GoogleCampaignRow[]),
    getGoogleClickTypes().catch(() => [] as ClickTypeRow[]),
    getDeckGa4().catch(() => null),
    getGa4Daily().catch(() => [] as Ga4DailyRow[]),
    getGa4DailyEvents().catch(() => [] as { day: string; event: string; count: number | null }[]),
    getSearchConsoleReport({ from, to }).catch(() => null),
    getDeckGmbDays().catch(() => [] as GmbDayRow[]),
    getGmbReviewsReport().catch(() => null),
    getGmbKeywordsReport().catch(() => null),
  ]);

  // Business Profile sums for the selected window (calls = Call-button taps).
  const gmbInWindow = gmbDays.filter((r) => r.day >= from && r.day <= to);
  const gmbSum = (metric: string): number | null => {
    const rows = gmbInWindow.filter((r) => r.metric === metric);
    return rows.length ? rows.reduce((a, r) => a + (r.value ?? 0), 0) : null;
  };
  const gmbCalls = gmbSum('calls');
  const gmbDirections = gmbSum('directions');
  const gmbSiteClicks = gmbSum('website_clicks');
  const gmbMapViews =
    gmbSum('map_views_mobile') == null && gmbSum('map_views_desktop') == null
      ? null
      : (gmbSum('map_views_mobile') ?? 0) + (gmbSum('map_views_desktop') ?? 0);

  // Analytics for the window the reader actually selected, falling back to the
  // rolling snapshot only while the daily backfill has not landed.
  const ga4 = buildGa4Window(ga4DailyRows, ga4EventRows, ga4Snapshot, from, to);

  const win = windowFrom(daily, from, to, priorFrom, priorTo);
  const waterfall = buildWaterfall(componentRows, win, from, to, ga4.channels, ga4.windowed);

  const up = uptimeRows.filter((r) => r.day >= from && r.day <= to);
  const checks = up.reduce((a, r) => a + r.checks, 0);
  const okChecks = up.reduce((a, r) => a + r.okChecks, 0);
  const siteChecks = up.reduce((a, r) => a + r.siteChecks, 0);
  const siteOk = up.reduce((a, r) => a + r.siteOkChecks, 0);

  const compRev = (key: string): number | null => {
    const bar = waterfall.bars.find((b) => b.key === key);
    return bar?.revenue ?? null;
  };
  const aed = (n: number | null): string => (n == null ? 'pending' : `AED ${Math.round(n).toLocaleString('en-US')}`);
  const int = (n: number | null): string => (n == null ? 'pending' : Math.round(n).toLocaleString('en-US'));

  const d = (cur: number | null, prior: number | null) => delta(cur, prior);
  const pj = win.priorJourney;

  const byKey: Record<string, Omit<ModuleCard, 'key' | 'title' | 'status' | 'sourceNote'>> = {
    website: {
      stats: [
        { label: 'Sessions', value: ga4.sessions, format: 'int' },
        { label: 'Widget enquiries', value: win.widgetEnquiries, format: 'int', delta: null },
        { label: 'Availability uptime', value: pctOrNull(okChecks, checks), format: 'pct' },
      ],
      contribution: `${aed(compRev('widget'))} billed from patients who booked on the website`,
      detail: [
        ...(ga4.available
          ? [
              {
                label: 'Google Analytics window',
                value: ga4.windowed
                  ? `${ga4.periodStart ?? '—'} → ${ga4.periodEnd ?? '—'} — the window selected above, summed from stored daily analytics`
                  : `${ga4.periodStart ?? '—'} → ${ga4.periodEnd ?? '—'} — rolling snapshot, NOT the window above (daily analytics still backfilling)`,
              },
              { label: 'Sessions', value: int(ga4.sessions) },
              { label: 'Users', value: int(ga4.users) },
              { label: 'New users', value: int(ga4.newUsers) },
              { label: 'Engaged sessions', value: int(ga4.engagedSessions) },
              { label: 'Conversion events recorded', value: int(ga4.conversions) },
              // Every on-site event GA4 fired, with its step conversion.
              ...ga4.events.map((e) => ({
                label: `Event · ${e.label}`,
                value:
                  e.fromPrev != null
                    ? `${int(e.count)}  (${(e.fromPrev * 100).toFixed(1)}% of previous step)`
                    : int(e.count),
              })),
              // Traffic by channel grouping.
              ...ga4.channels.slice(0, 10).map((c) => ({
                label: `Traffic · ${c.channel}`,
                value: `${int(c.sessions)} sessions · ${int(c.conversions)} conversions`,
              })),
            ]
          : [{ label: 'Google Analytics', value: 'Snapshot unavailable' }]),
        { label: 'Booking-widget submissions (non-test)', value: int(win.widgetEnquiries) },
        { label: 'Site reachable', value: siteChecks ? `${((siteOk / siteChecks) * 100).toFixed(1)}% of ${siteChecks} checks` : 'pending' },
        { label: 'Booking availability', value: checks ? `${((okChecks / checks) * 100).toFixed(1)}% of ${checks} checks` : 'pending' },
        { label: 'Monitoring', value: 'Automated check every 15 minutes against the booking system' },
      ],
      pendingNote: !ga4.available
        ? 'Google Analytics is not reporting yet.'
        : ga4.windowed
          ? null
          : 'Google Analytics figures come from a rolling four-week snapshot, so they describe that period rather than the window selected at the top of the page. Stored daily analytics take over as soon as the backfill lands.',
    },
    widget: {
      stats: [
        { label: 'Submissions', value: win.widgetEnquiries, format: 'int' },
        { label: 'Availability uptime', value: pctOrNull(okChecks, checks), format: 'pct' },
        { label: 'Billed revenue', value: compRev('widget'), format: 'aed' },
      ],
      contribution: `${aed(compRev('widget'))} billed · ${int(waterfall.bars.find((b) => b.key === 'widget')?.bills ?? null)} treatments`,
      detail: [
        { label: 'Submissions in window', value: int(win.widgetEnquiries) },
        { label: 'Treatments billed to widget patients', value: int(waterfall.bars.find((b) => b.key === 'widget')?.bills ?? null) },
        { label: 'Availability checks', value: checks ? `${okChecks}/${checks} healthy` : 'pending' },
        { label: 'Step-level drop-off', value: 'Pending — widget funnel events not yet instrumented' },
      ],
      pendingNote: null,
    },
    seo: {
      stats: [
        { label: 'Search impressions', value: search?.available ? search.impressions : null, format: 'int' },
        { label: 'Search clicks', value: search?.available ? search.clicks : null, format: 'int' },
      ],
      contribution: 'Revenue attribution pending — no identity chain from an organic visit to a bill',
      detail: [
        ...(search?.available
          ? [
              { label: 'Click-through rate', value: `${(search.ctr * 100).toFixed(1)}%` },
              { label: 'Average position', value: search.position != null ? search.position.toFixed(1) : '—' },
              { label: 'Pages appearing in Google', value: int(search.pagesInSearch) },
              ...search.topQueries.slice(0, 5).map((q) => ({
                label: `Query · ${q.query}`,
                value: `${int(q.clicks)} clicks · ${int(q.impressions)} impressions`,
              })),
            ]
          : [{ label: 'Search Console', value: 'Connected — first figures arrive with the next refresh' }]),
        { label: 'Why revenue is not shown', value: 'An organic visitor who later phones or walks in leaves no identifier to match against billing.' },
      ],
      pendingNote: search?.available
        ? null
        : 'Search Console is connected; this window has no recorded impressions yet (data lags ~2–3 days).',
    },
    gmb: {
      stats: [
        { label: 'Calls tapped', value: gmbCalls, format: 'int' },
        { label: 'Direction requests', value: gmbDirections, format: 'int' },
        { label: 'Website clicks', value: gmbSiteClicks, format: 'int' },
      ],
      contribution: 'Maps visitors arrive on the website as organic or direct traffic — the revenue effect sits inside those routes',
      detail: [
        { label: 'Map views in window', value: int(gmbMapViews) },
        {
          label: 'Google rating',
          value: gmbReviews ? `${gmbReviews.avg.toFixed(2)} ★ across ${int(gmbReviews.total)} reviews` : 'first sync pending',
        },
        {
          label: 'Review response rate',
          value: gmbReviews ? `${(gmbReviews.responseRate * 100).toFixed(0)}% — ${int(gmbReviews.unanswered)} written reviews unanswered` : 'first sync pending',
        },
        ...(gmbKeywords
          ? gmbKeywords.top.slice(0, 3).map((k) => ({
              label: `Local search · ${k.keyword}`,
              value: k.isThreshold ? `<${int(k.impressions)} impressions (${gmbKeywords.month})` : `${int(k.impressions)} impressions (${gmbKeywords.month})`,
            }))
          : []),
      ],
      pendingNote: null,
    },
    google_ads: {
      stats: [
        { label: 'Spend', value: win.spendGoogle, format: 'aed', delta: null },
        { label: 'Clicks', value: win.clicksGoogle, format: 'int' },
        { label: 'Conversions reported', value: win.googleConversions, format: 'int' },
      ],
      contribution: 'Revenue attribution pending — clicks carry no patient identity',
      detail: [
        { label: 'Impressions', value: int(win.impressionsGoogle) },
        { label: 'Clicks', value: int(win.clicksGoogle) },
        { label: 'Cost per click', value: aed(pctOrNull(win.spendGoogle, win.clicksGoogle)) },
        { label: 'Platform-reported conversions', value: int(win.googleConversions) },
        { label: 'Why revenue is not claimed', value: 'UAE campaigns have no call-forwarding numbers, so a patient who clicks then phones reception cannot be matched to a bill.' },
      ],
      pendingNote: null,
    },
    meta: {
      stats: [
        { label: 'Spend', value: win.spendMeta, format: 'aed' },
        { label: 'Clicks', value: win.clicksMeta, format: 'int' },
        { label: 'Lead events', value: win.metaLeads, format: 'int' },
      ],
      contribution: 'Revenue attribution pending — lead events are not written back with a matchable phone number',
      detail: [
        { label: 'Impressions', value: int(win.impressionsMeta) },
        { label: 'Clicks', value: int(win.clicksMeta) },
        { label: 'Cost per click', value: aed(pctOrNull(win.spendMeta, win.clicksMeta)) },
        { label: 'Lead events reported', value: int(win.metaLeads) },
      ],
      pendingNote: null,
    },
    crm: {
      stats: [
        { label: 'Conversations', value: crm?.totalConversations ?? null, format: 'int' },
        { label: 'Bookings made', value: crm?.crmOriginatedBookings ?? null, format: 'int' },
        { label: 'Billed revenue', value: compRev('crm'), format: 'aed' },
      ],
      contribution: `${aed(compRev('crm'))} billed from CRM-booked patients · ${aed(compRev('ai_agent'))} from the AI agent`,
      detail: [
        { label: 'Total conversations', value: int(crm?.totalConversations ?? null) },
        { label: 'WhatsApp conversations', value: int(crm?.whatsappConversations ?? null) },
        { label: 'Messages exchanged', value: int((crm?.messagesReceived ?? 0) + (crm?.messagesSent ?? 0)) },
        { label: 'Bookings via CRM', value: int(crm?.crmOriginatedBookings ?? null) },
        { label: 'Bookings via AI agent', value: int(crm?.aiAgentBookings ?? null) },
      ],
      pendingNote: null,
    },
    smile_club: {
      stats: [{ label: 'Members', value: num(manual.get('smile_club_members')?.value ?? null), format: 'int' }],
      contribution: 'Revenue attribution pending — membership feed not yet wired',
      detail: [
        { label: 'Plan', value: 'AED 69/month · AED 799/year (Essential tier)' },
        { label: 'Status', value: 'Live and priced; enrolment feed pending' },
      ],
      pendingNote: 'Members and monthly recurring revenue are not yet fed into the platform, so no revenue is claimed.',
    },
    voice: {
      stats: [],
      contribution: 'In development — infrastructure live, not yet taking patient calls',
      detail: [
        { label: 'Status', value: 'Infrastructure live; agent in development with the vendor' },
        { label: 'What it unlocks', value: 'Answering and booking the calls reception cannot reach — the largest untracked demand path today.' },
      ],
      pendingNote: null,
    },
    creative: {
      stats: [],
      contribution: 'Output feed pending',
      detail: [
        { label: 'Status', value: 'In-house creative engine producing paid and organic assets' },
        { label: 'Reporting', value: 'Asset counts per campaign lane arrive with the production feed.' },
      ],
      pendingNote: 'Asset output is tracked in the creative desk; the count is not yet piped into this deck.',
    },
    partner: {
      stats: [],
      contribution: 'Revenue attribution pending',
      detail: [
        { label: 'Status', value: 'Affiliate delivery resuming' },
        { label: 'Reporting', value: 'Verified-vs-billed reconciliation arrives with the partner feed.' },
      ],
      pendingNote: null,
    },
  };

  const cards: ModuleCard[] = modules.map((m) => ({
    key: m.key,
    title: m.title,
    status: m.status,
    sourceNote: m.sourceNote,
    ...(byKey[m.key] ?? {
      stats: [],
      contribution: 'Reporting pending',
      detail: [],
      pendingNote: null,
    }),
  }));

  /* ── The wide funnel (Mr. Akbar's sketch) ─────────────────────────────── */

  // Followers is a STOCK: take the newest day in the window, never a sum.
  const visInWindow = visibility.filter((r) => r.day >= from && r.day <= to);
  const latestFollowerDay = visInWindow
    .filter((r) => r.metric === 'followers')
    .reduce<string | null>((acc, r) => (acc == null || r.day > acc ? r.day : acc), null);
  const followers = latestFollowerDay
    ? visInWindow
        .filter((r) => r.metric === 'followers' && r.day === latestFollowerDay)
        .reduce((a, r) => a + (r.value ?? 0), 0)
    : null;
  const sumMetric = (metric: string): number | null => {
    const rows = visInWindow.filter((r) => r.metric === metric);
    return rows.length ? rows.reduce((a, r) => a + (r.value ?? 0), 0) : null;
  };
  const profileViews = sumMetric('profile_views');
  const socialReach = sumMetric('reach');

  const indirectLeads =
    win.metaLeads == null && win.googleConversions == null
      ? null
      : (win.metaLeads ?? 0) + (win.googleConversions ?? 0);
  const instantLeads = win.widgetEnquiries;

  const rate = (a: number | null, b: number | null): string | null => {
    if (a == null || b == null || a === 0) return null;
    const r = b / a;
    return `${(r * 100).toFixed(r < 0.01 ? 2 : r < 10 ? 1 : 0)}%`;
  };

  const igFollowers = latestFollowerDay
    ? visInWindow
        .filter((r) => r.metric === 'followers' && r.channel === 'instagram' && r.day === latestFollowerDay)
        .reduce((a, r) => a + (r.value ?? 0), 0)
    : null;
  const fbFollowers = latestFollowerDay
    ? visInWindow
        .filter((r) => r.metric === 'followers' && r.channel === 'facebook' && r.day === latestFollowerDay)
        .reduce((a, r) => a + (r.value ?? 0), 0)
    : null;

  const compRevOf = (key: string): number | null =>
    waterfall.bars.find((b) => b.key === key)?.revenue ?? null;

  const funnel: FunnelStage[] = [
    {
      key: 'visibility',
      label: 'Visibility',
      basis: 'Brand audience — followers now, plus profile visits in the window',
      value: followers,
      unit: 'count',
      rate: null,
      pending: followers == null ? 'Social audience feed covers recent weeks only' : null,
      source:
        'Meta Graph API via the social feed (lane_e.social_insights → board_deck_visibility). Followers is the audience size on the most recent day in the window, never a sum of daily snapshots.',
      breakdown: [
        { label: 'Instagram followers (latest day)', value: igFollowers, unit: 'count' },
        { label: 'Facebook followers (latest day)', value: fbFollowers, unit: 'count' },
        { label: 'Instagram profile visits (window)', value: profileViews, unit: 'count' },
        { label: 'Organic social reach (window)', value: socialReach, unit: 'count', note: 'Partial — reach reporting began mid-June' },
      ],
      caveat:
        'The social feed starts in mid-June 2026, so a window earlier than that shows no audience. Followers is a stock (size today), while profile visits and reach are flows (activity in the window) — they are not added together.',
    },
    {
      key: 'reach',
      label: 'Reach',
      basis: 'Ad impressions across Meta and Google',
      value: win.journey.viewed,
      unit: 'count',
      rate: null,
      pending: null,
      source: 'Meta Marketing API and Google Ads API daily insights (board_deck_daily.impressions).',
      breakdown: [
        { label: 'Meta impressions', value: win.impressionsMeta, unit: 'count' },
        { label: 'Google impressions', value: win.impressionsGoogle, unit: 'count' },
        { label: 'Meta clicks', value: win.clicksMeta, unit: 'count' },
        { label: 'Google clicks', value: win.clicksGoogle, unit: 'count' },
        { label: 'Media spend', value: win.spend, unit: 'aed' },
      ],
      caveat:
        'Paid reach only. Organic and referral visits are not counted here, so this is what the brand BOUGHT, not everyone who saw it.',
    },
    {
      key: 'indirect',
      label: 'Indirect leads',
      basis: 'Platform-reported lead events — interest, not yet an appointment request',
      value: indirectLeads,
      unit: 'count',
      rate: rate(win.journey.viewed, indirectLeads),
      pending: null,
      source:
        'Lead events as the advertising platforms themselves report them: Meta lead events and Google Ads conversions (board_deck_daily).',
      breakdown: [
        { label: 'Meta lead events', value: win.metaLeads, unit: 'count' },
        { label: 'Google Ads conversions', value: win.googleConversions, unit: 'count' },
      ],
      caveat:
        'These are the platforms\' own counts and carry no patient identity, which is why none of them can be traced to revenue. A single person can also register on both platforms.',
    },
    {
      key: 'instant',
      label: 'Instant qualified leads',
      basis: 'Website booking requests naming a treatment, clinic and date',
      value: instantLeads,
      unit: 'count',
      rate: null,
      pending: null,
      source:
        'Booking-widget submissions on dentalnation.com (board_deck_daily.widget_enquiries), with test rows excluded by the same rules the operations team uses.',
      breakdown: [
        { label: 'Widget submissions (non-test)', value: instantLeads, unit: 'count' },
        { label: 'Revenue later billed to these patients', value: compRevOf('widget'), unit: 'aed' },
      ],
      caveat:
        'Counted separately from indirect leads rather than added to them: a booking request that names a treatment, a clinic and a date is a different quality of demand from a platform lead event.',
    },
    {
      key: 'booked',
      label: 'Booking',
      basis: 'Appointments in Practo, all sources including walk-in',
      value: win.journey.booked,
      unit: 'count',
      rate: rate(win.journey.inquired, win.journey.booked),
      pending: null,
      source: 'Practo Insta, the practice-management system of record (board_deck_daily.booked, dated by appointment date).',
      breakdown: [
        { label: 'Appointments booked', value: win.journey.booked, unit: 'count' },
        { label: 'Of which attended', value: win.journey.showed, unit: 'count' },
        { label: 'No-shows', value: win.noshow, unit: 'count' },
        { label: 'Cancelled', value: win.cancelled, unit: 'count' },
      ],
      caveat:
        'Bookings include walk-in and phone demand that never appeared as a lead, so the conversion shown into this stage is not a pure lead-to-booking rate — it compares two populations that only partly overlap.',
    },
    {
      key: 'showed',
      label: 'Showed up',
      basis: 'Arrived or completed',
      value: win.journey.showed,
      unit: 'count',
      rate: rate(win.journey.booked, win.journey.showed),
      pending: null,
      source: 'Practo appointment status — arrived or completed (board_deck_daily.showed).',
      breakdown: [
        { label: 'Attended', value: win.journey.showed, unit: 'count' },
        { label: 'No-shows', value: win.noshow, unit: 'count' },
        { label: 'Cancelled', value: win.cancelled, unit: 'count' },
      ],
      caveat:
        'Appointments booked for future dates are already counted at the booking stage but cannot have attended yet, so this conversion understates the true show rate on any window that includes forward bookings.',
    },
    {
      key: 'treated',
      label: 'Treatment',
      basis: 'Bills raised for treatment delivered',
      value: win.journey.treated,
      unit: 'count',
      // Deliberately NOT a conversion: bills are not a subset of attended
      // appointments (one visit can raise several, and a bill is dated when it
      // is raised). A percentage here would read as ">100% of patients treated".
      rate: null,
      pending: null,
      source: 'Practo billing records (board_deck_daily.treatments — one row per bill, dated by bill date).',
      breakdown: [
        { label: 'Bills raised', value: win.journey.treated, unit: 'count' },
        { label: 'Billed revenue', value: win.journey.revenue, unit: 'aed' },
        {
          label: 'Average bill',
          value:
            win.journey.revenue != null && win.journey.treated != null && win.journey.treated > 0
              ? win.journey.revenue / win.journey.treated
              : null,
          unit: 'aed',
        },
      ],
      caveat:
        'No conversion is shown into this stage on purpose. A bill is not a subset of an attended appointment — one visit can raise several bills, and a bill is dated when it is raised, so the ratio can exceed 100% and would be meaningless as a funnel step.',
    },
    {
      key: 'revenue',
      label: 'Revenue',
      basis: 'Billed revenue',
      value: win.journey.revenue,
      unit: 'aed',
      rate: null,
      pending: null,
      source: 'Practo billed amounts (board_deck_daily.revenue), split by acquisition route in board_component_revenue.',
      breakdown: [
        { label: 'Website booking widget', value: compRevOf('widget'), unit: 'aed' },
        { label: 'CRM / WhatsApp', value: compRevOf('crm'), unit: 'aed' },
        { label: 'AI booking agent', value: compRevOf('ai_agent'), unit: 'aed' },
        { label: 'Direct, walk-in & referral', value: compRevOf('direct'), unit: 'aed' },
        { label: 'Unattributed', value: compRevOf('unattributed'), unit: 'aed' },
      ],
      caveat:
        'Billed revenue, not collected cash. The split is by the route that booked the patient — see the waterfall below for how each route is traced.',
    },
  ];

  /* ── Projects, investment and return ──────────────────────────────────── */

  const mediaSpend = win.spend;
  const buildCost = costs.total;
  const totalInvestment = mediaSpend != null && buildCost != null ? mediaSpend + buildCost : null;
  const revenueWin = win.journey.revenue;

  const investment: InvestmentSummary = {
    projectsDelivered: modules.length,
    projectsLive: modules.filter((m) => m.status === 'LIVE').length,
    revenue: revenueWin,
    mediaSpend,
    buildCost,
    totalInvestment,
    returnMultiple:
      revenueWin != null && totalInvestment != null && totalInvestment > 0 ? revenueWin / totalInvestment : null,
    returnOnMedia: revenueWin != null && mediaSpend != null && mediaSpend > 0 ? revenueWin / mediaSpend : null,
    costNote:
      buildCost == null
        ? 'Build, platform and vendor fees have not been entered for this window, so total investment and the return multiple cannot be stated. The figure shown is media spend only — a return calculated against it alone flatters the picture and is labelled as partial.'
        : `Build and platform cost is taken from supplier invoices, recorded in the month each was raised: the website build and booking module go-live (AED 6,500, invoice 30 Jan 2026), the Zavis AI Pro subscription for three seats (AED 2,422 per quarter, invoiced 13 Mar 2026) and the continuous-care retainer (AED 3,000 per quarter, invoiced 23 Mar 2026), plus Azure infrastructure at the stated USD 100 per month. Quarterly fees sit in the month they were invoiced rather than spread across the quarter, so a short window can look lumpy — over the whole period the total is exact. Only the invoices supplied so far are recorded; any earlier or later invoice would raise this figure and lower the return.`,
  };

  /* ── Google Ads, campaign by campaign ─────────────────────────────────── */

  const gWin = gCampaigns.filter((r) => r.day >= from && r.day <= to);
  const gTotalSpend = gWin.length ? gWin.reduce((a, r) => a + (r.spend ?? 0), 0) : null;
  const gTotalConv = gWin.length ? gWin.reduce((a, r) => a + (r.conversions ?? 0), 0) : null;

  const roll = (keyOf: (r: GoogleCampaignRow) => string, subOf?: (r: GoogleCampaignRow) => string): CascadeRow[] => {
    const m = new Map<string, { spend: number; impressions: number; clicks: number; conversions: number; sub: string | null }>();
    for (const r of gWin) {
      const k = keyOf(r);
      const cur = m.get(k) ?? { spend: 0, impressions: 0, clicks: 0, conversions: 0, sub: subOf ? subOf(r) : null };
      cur.spend += r.spend ?? 0;
      cur.impressions += r.impressions ?? 0;
      cur.clicks += r.clicks ?? 0;
      cur.conversions += r.conversions ?? 0;
      m.set(k, cur);
    }
    return [...m.entries()]
      .map(([label, v]) => ({
        label,
        sublabel: v.sub,
        spend: v.spend,
        impressions: v.impressions,
        clicks: v.clicks,
        conversions: v.conversions,
        share: gTotalSpend && gTotalSpend > 0 ? v.spend / gTotalSpend : null,
      }))
      .sort((a, b) => (b.spend ?? 0) - (a.spend ?? 0));
  };

  const ctWin = gClickTypes.filter((r) => r.day >= from && r.day <= to);
  const ctTotal = ctWin.reduce((a, r) => a + (r.clicks ?? 0), 0);
  const ctMap = new Map<string, number>();
  for (const r of ctWin) ctMap.set(r.clickType, (ctMap.get(r.clickType) ?? 0) + (r.clicks ?? 0));
  const clickTypes = [...ctMap.entries()]
    .map(([label, clicks]) => ({ label, clicks, share: ctTotal > 0 ? clicks / ctTotal : 0 }))
    .sort((a, b) => b.clicks - a.clicks);

  const google: GoogleDetail = {
    byType: roll((r) => r.campaignType),
    byCampaign: roll(
      (r) => r.campaignName,
      (r) => r.campaignType,
    ).slice(0, 12),
    clickTypes,
    totalSpend: gTotalSpend,
    totalConversions: gTotalConv,
    typeNote:
      'Campaign type is read from the campaign naming convention (Search, Performance Max, Brand, Competitor) because the stored Google Ads export carries no channel-type field. Conversions are what Google itself counts — a conversion is not a booked patient, and one campaign records an order of magnitude more than the rest, which is a tracking-configuration difference rather than performance.',
  };

  /* ── The growth → P&L bridge ──────────────────────────────────────────── */

  const monthMap = new Map<string, { revenue: number; media: number; attended: number }>();
  for (const r of daily) {
    const m = r.day.slice(0, 7);
    const cur = monthMap.get(m) ?? { revenue: 0, media: 0, attended: 0 };
    cur.revenue += r.revenue ?? 0;
    cur.media += r.spendTotal ?? 0;
    cur.attended += r.showed ?? 0;
    monthMap.set(m, cur);
  }
  // Invoice months with no trading rows (an early invoice) still get a row —
  // dropping them would silently flatter the net line.
  for (const m of costs.byMonth.keys()) {
    if (!monthMap.has(m)) monthMap.set(m, { revenue: 0, media: 0, attended: 0 });
  }

  const sortedMonths = [...monthMap.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  // Months before the first recorded bill predate the billing feed: their
  // revenue is unknown, not zero, and a zero would read as five months of
  // spend for nothing. They are flagged and the UI dashes them out.
  const firstRevenueMonth = sortedMonths.find(([, v]) => v.revenue > 0)?.[0] ?? null;

  const pnlMonths: PnlMonth[] = sortedMonths.map(([month, v]) => {
    const buildCost = costs.byMonth.get(month) ?? 0;
    const investment = v.media + buildCost;
    const preFeed = firstRevenueMonth != null && month < firstRevenueMonth;
    return {
      month,
      preFeed,
      revenue: v.revenue,
      mediaSpend: v.media,
      buildCost,
      investment,
      netAfterGrowth: v.revenue - investment,
      costRatio: !preFeed && v.revenue > 0 ? investment / v.revenue : null,
      attended: v.attended,
    };
  });

  const pTot = pnlMonths.reduce(
    (a, m) => ({
      revenue: a.revenue + m.revenue,
      media: a.media + m.mediaSpend,
      build: a.build + m.buildCost,
      attended: a.attended + m.attended,
    }),
    { revenue: 0, media: 0, build: 0, attended: 0 },
  );
  const pInvestment = pTot.media + pTot.build;

  // Channel economics: spend where a channel buys media, against the
  // contribution the waterfall gives it (traced + allocated, labelled as such).
  const spendByChannel: Partial<Record<ComponentKey, number | null>> = {
    google_ads: win.spendGoogle,
    meta: win.spendMeta,
  };
  const pnlChannels: ChannelEconomics[] = waterfall.bars
    .filter((b) => b.contribution > 0 || spendByChannel[b.key] != null)
    .map((b) => {
      const spend = spendByChannel[b.key] ?? null;
      return {
        key: b.key,
        label: b.label,
        spend,
        traced: b.traced,
        allocated: b.allocated,
        contribution: b.contribution,
        returnMultiple: spend != null && spend > 0 ? b.contribution / spend : null,
      };
    })
    .sort((a, b) => b.contribution - a.contribution);

  const pnl: PnlView = {
    months: pnlMonths,
    totals: {
      revenue: pTot.revenue,
      mediaSpend: pTot.media,
      buildCost: pTot.build,
      investment: pInvestment,
      netAfterGrowth: pTot.revenue - pInvestment,
      costRatio: pTot.revenue > 0 ? pInvestment / pTot.revenue : null,
      returnMultiple: pInvestment > 0 ? pTot.revenue / pInvestment : null,
      revenuePerPatient: pTot.attended > 0 ? pTot.revenue / pTot.attended : null,
      investmentPerPatient: pTot.attended > 0 ? pInvestment / pTot.attended : null,
    },
    channels: pnlChannels,
    note:
      'Months marked with a dash predate the billing feed: growth spend is recorded there but billed revenue is not, so revenue is shown as missing rather than zero. This section is monthly across the full trading history and deliberately ignores the date filter — a P&L exhibit that changed with a date picker would be noise. Revenue is billed treatment from the practice system; media spend is what the ad platforms invoiced; build & platform cost is the supplier invoice register, in the month each invoice was raised (quarterly fees therefore land as lumps). Channel contribution combines revenue traced patient-by-patient with that channel\'s modelled share of untraced revenue — the split is shown, and the return multiples inherit that caveat. Clinic-side operating costs (staff, rent, materials) are not in the platform, so the net line is net of GROWTH investment only, not clinic profit.',
  };

  return {
    from,
    to,
    window: win,
    waterfall,
    pnl,
    ga4,
    funnel,
    investment,
    modules: cards,
    google,
    lastUpdated,
    liveModules: modules.filter((m) => m.status === 'LIVE').length,
    totalModules: modules.length,
    uptime: {
      availability: pctOrNull(okChecks, checks),
      site: pctOrNull(siteOk, siteChecks),
      checks,
    },
  };
}
