import 'server-only';
import { cache } from 'react';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getBoardCrm, getManualMetrics, getLastIngestion, delta } from '@/lib/board/metrics';
import { DECK_COMPONENTS, type ComponentKey, type ModuleStatus } from '@/config/command-deck';

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

/**
 * Build / platform / vendor fees from the Marketing OS cost line. Returns a
 * null total when nothing has been entered — an investment figure that quietly
 * omits what the build cost would flatter every return number on the page.
 */
export const getDeckCosts = cache(async (): Promise<{ rows: number; total: number | null }> => {
  const db = getSupabaseAdmin();
  if (!db) return { rows: 0, total: null };
  const { data, error } = await db.from('mos_costs').select('zavis_fee_aed, azure_cost_aed, other_aed').limit(500);
  if (error || !data || data.length === 0) return { rows: 0, total: null };
  const total = data.reduce(
    (a, r) => a + (num(r.zavis_fee_aed) ?? 0) + (num(r.azure_cost_aed) ?? 0) + (num(r.other_aed) ?? 0),
    0,
  );
  return { rows: data.length, total };
});

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
}

export interface Waterfall {
  bars: WaterfallBar[];
  /** Sum of measured + residual bars — equals total billed revenue by construction. */
  total: number | null;
  /** True when the bars reconcile to the journey's revenue figure. */
  reconciles: boolean;
}

export function buildWaterfall(
  componentRows: ComponentDayRow[],
  win: DeckWindow,
  from: string,
  to: string,
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

    return {
      key: c.key,
      label: c.label,
      detail: c.detail,
      attribution: c.attribution,
      revenue: c.attribution === 'pending' ? null : hit ? hit.revenue : null,
      bills: hit ? hit.bills : null,
      pendingNote: c.pendingNote ?? null,
      provenLabel,
    };
  });

  const total = bars.reduce<number | null>((acc, b) => (b.revenue == null ? acc : (acc ?? 0) + b.revenue), null);
  const revenue = win.journey.revenue;
  const reconciles = total != null && revenue != null && Math.abs(total - revenue) < 1;

  return { bars, total, reconciles };
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

export interface DeckReport {
  from: string;
  to: string;
  window: DeckWindow;
  waterfall: Waterfall;
  funnel: FunnelStage[];
  investment: InvestmentSummary;
  modules: ModuleCard[];
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
    getDeckCosts().catch(() => ({ rows: 0, total: null as number | null })),
  ]);

  const win = windowFrom(daily, from, to, priorFrom, priorTo);
  const waterfall = buildWaterfall(componentRows, win, from, to);

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
        { label: 'Widget enquiries', value: win.widgetEnquiries, format: 'int', delta: null },
        { label: 'Appointments booked', value: win.journey.booked, format: 'int', delta: d(win.journey.booked, pj?.booked ?? null) },
        { label: 'Availability uptime', value: pctOrNull(okChecks, checks), format: 'pct' },
      ],
      contribution: `${aed(compRev('widget'))} billed from patients who booked on the website`,
      detail: [
        { label: 'Booking-widget submissions (non-test)', value: int(win.widgetEnquiries) },
        { label: 'Site reachable', value: siteChecks ? `${((siteOk / siteChecks) * 100).toFixed(1)}% of ${siteChecks} checks` : 'pending' },
        { label: 'Booking availability', value: checks ? `${((okChecks / checks) * 100).toFixed(1)}% of ${checks} checks` : 'pending' },
        { label: 'Monitoring', value: 'Automated check every 15 minutes against the booking system' },
      ],
      pendingNote: null,
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
        { label: 'Search impressions', value: num(manual.get('gsc_impressions')?.value ?? null), format: 'int' },
        { label: 'Search clicks', value: num(manual.get('gsc_clicks')?.value ?? null), format: 'int' },
      ],
      contribution: 'Revenue attribution pending — no identity chain from an organic visit to a bill',
      detail: [
        { label: 'Search Console access', value: 'Pending from the vendor' },
        { label: 'Why revenue is not shown', value: 'An organic visitor who later phones or walks in leaves no identifier to match against billing.' },
      ],
      pendingNote: 'Search Console access is the single dependency; impressions, clicks, position and indexed pages all arrive with it.',
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

  const funnel: FunnelStage[] = [
    {
      key: 'visibility',
      label: 'Visibility',
      basis: 'Brand audience — followers now, plus profile visits in the window',
      value: followers,
      unit: 'count',
      rate: null,
      pending: followers == null ? 'Social audience feed covers recent weeks only' : null,
    },
    {
      key: 'reach',
      label: 'Reach',
      basis: 'Ad impressions across Meta and Google',
      value: win.journey.viewed,
      unit: 'count',
      rate: null,
      pending: null,
    },
    {
      key: 'indirect',
      label: 'Indirect leads',
      basis: 'Platform-reported lead events — interest, not yet an appointment request',
      value: indirectLeads,
      unit: 'count',
      rate: rate(win.journey.viewed, indirectLeads),
      pending: null,
    },
    {
      key: 'instant',
      label: 'Instant qualified leads',
      basis: 'Website booking requests naming a treatment, clinic and date',
      value: instantLeads,
      unit: 'count',
      rate: null,
      pending: null,
    },
    {
      key: 'booked',
      label: 'Booking',
      basis: 'Appointments in Practo, all sources including walk-in',
      value: win.journey.booked,
      unit: 'count',
      rate: rate(win.journey.inquired, win.journey.booked),
      pending: null,
    },
    {
      key: 'showed',
      label: 'Showed up',
      basis: 'Arrived or completed',
      value: win.journey.showed,
      unit: 'count',
      rate: rate(win.journey.booked, win.journey.showed),
      pending: null,
    },
    {
      key: 'treated',
      label: 'Treatment',
      basis: 'Bills raised for treatment delivered',
      value: win.journey.treated,
      unit: 'count',
      rate: rate(win.journey.showed, win.journey.treated),
      pending: null,
    },
    {
      key: 'revenue',
      label: 'Revenue',
      basis: 'Billed revenue',
      value: win.journey.revenue,
      unit: 'aed',
      rate: null,
      pending: null,
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
        ? 'Build, platform and vendor fees have not been entered yet, so total investment and the return multiple cannot be stated. The figure shown is media spend only — a return calculated against it alone flatters the picture and is labelled as partial.'
        : 'Total investment is media spend plus build, platform and vendor fees recorded in the Marketing OS cost line.',
  };

  return {
    from,
    to,
    window: win,
    waterfall,
    funnel,
    investment,
    modules: cards,
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
