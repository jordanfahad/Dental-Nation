import type { analyticsdata_v1beta } from 'googleapis';
import { getAnalyticsClient } from '../google-auth';
import {
  GA4_EVENTS,
  GA4_LEAD_CHANNEL_DIMENSION,
  GA4_LEAD_EVENT,
  GA4_LOOKBACK_DAYS,
  GA4_MARKETING_LEAD_EVENTS,
  GA4_PROPERTY_ID,
  ONSITE_FUNNEL,
} from '@/config/ga4';
import type { Ga4Channel, Ga4FunnelStage, Ga4RangeReport, Ga4Summary, MetricDelta } from '@/lib/types';

/**
 * GA4 Data API adapter (§17 — same `fetch`-shaped contract as the Sheets
 * adapter, but a single summary instead of rows). Produces the current
 * "Website — last 28 days" summary the dashboard renders as its own section.
 *
 * Three runReport calls on the property:
 *   1. Totals   — sessions / users / new users / conversions / engaged sessions.
 *   2. Channels — sessionDefaultChannelGroup × (sessions, conversions).
 *   3. Events   — eventName × eventCount, filtered to the funnel events.
 *
 * Any GA4 failure throws a clear Error; the sync catches it and records a data
 * gap rather than aborting the sheet sync.
 */

type Row = analyticsdata_v1beta.Schema$Row;

const START_DATE = `${GA4_LOOKBACK_DAYS}daysAgo`;
const END_DATE = 'today';

/** Number() a metric/dimension value defensively (missing → 0). */
function num(v: string | null | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Read the i-th metric value off a runReport row. */
function metric(row: Row | undefined, i: number): number {
  return num(row?.metricValues?.[i]?.value);
}

/** Compute the period as concrete YYYY-MM-DD dates for the summary row. */
function resolvePeriod(): { period_start: string; period_end: string } {
  const end = new Date();
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - GA4_LOOKBACK_DAYS);
  return {
    period_start: start.toISOString().slice(0, 10),
    period_end: end.toISOString().slice(0, 10),
  };
}

export async function fetchGa4Summary(): Promise<Ga4Summary> {
  const analytics = getAnalyticsClient();
  const property = `properties/${GA4_PROPERTY_ID}`;
  const dateRanges = [{ startDate: START_DATE, endDate: END_DATE }];

  try {
    // 1 — Totals (no dimensions, one row).
    const totalsRes = await analytics.properties.runReport({
      property,
      requestBody: {
        dateRanges,
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'newUsers' },
          { name: 'conversions' },
          { name: 'engagedSessions' },
        ],
      },
    });
    const totalsRow = totalsRes.data.rows?.[0];
    const sessions = metric(totalsRow, 0);
    const users = metric(totalsRow, 1);
    const new_users = metric(totalsRow, 2);
    const conversions = metric(totalsRow, 3);
    const engaged_sessions = metric(totalsRow, 4);

    // 2 — Channels by sessionDefaultChannelGroup.
    const channelsRes = await analytics.properties.runReport({
      property,
      requestBody: {
        dateRanges,
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }, { name: 'conversions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: '12',
      },
    });
    const channels: Ga4Channel[] = (channelsRes.data.rows ?? []).map((r) => ({
      channel: r.dimensionValues?.[0]?.value || 'Unassigned',
      sessions: metric(r, 0),
      conversions: metric(r, 1),
    }));

    // 3 — Funnel events: eventName × eventCount, restricted to our funnel events.
    const eventsRes = await analytics.properties.runReport({
      property,
      requestBody: {
        dateRanges,
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            inListFilter: { values: GA4_EVENTS },
          },
        },
        limit: '50',
      },
    });
    const eventCounts = new Map<string, number>();
    for (const r of eventsRes.data.rows ?? []) {
      const name = r.dimensionValues?.[0]?.value;
      if (name) eventCounts.set(name, metric(r, 0));
    }

    // Build the NESTED booking funnel (widget → visit type → treatment).
    const onsite_funnel: Ga4FunnelStage[] = [];
    let prev: number | null = null;
    for (const stage of ONSITE_FUNNEL) {
      const count = eventCounts.get(stage.event) ?? 0;
      const conversionFromPrev = prev != null && prev > 0 ? count / prev : null;
      onsite_funnel.push({ key: stage.key, label: stage.label, count, conversionFromPrev });
      prev = count;
    }
    // generate_lead is the on-site lead conversion — a KPI, not a funnel stage.
    const leads = eventCounts.get(GA4_LEAD_EVENT) ?? 0;

    const { period_start, period_end } = resolvePeriod();

    return {
      period_start,
      period_end,
      sessions,
      users,
      new_users,
      conversions,
      engaged_sessions,
      leads,
      channels,
      onsite_funnel,
    };
  } catch (err) {
    throw new Error(`GA4 fetch failed (property ${GA4_PROPERTY_ID}): ${(err as Error).message}`);
  }
}

// ============================================================================
// Range query (Step 2): the SAME report shape but for an explicit [from,to]
// range with an optional comparison range, in ONE runReport call per query.
//
// GA4 runReport accepts multiple `dateRanges`; when more than one is supplied,
// rows carry one metricValue per (dateRange × metric) — i.e. metricValues is
// laid out [range0:metric0..N, range1:metric0..N, ...]. A `dateRange` dimension
// value tags each row with `date_range_0` / `date_range_1` so a single row is
// returned per range when there are no other dimensions. We read both ranges
// off whichever rows GA4 returns, defensively.
// ============================================================================

/** Build a {value, prev, deltaPct} metric, null-guarding the % delta. */
function delta(value: number | null, prev: number | null): MetricDelta {
  const deltaPct =
    value != null && prev != null && prev !== 0 ? (value - prev) / prev : null;
  return { value, prev, deltaPct };
}

/** From a single-range totals run, read the metric for that range (index 0). */
function totalsForRange(
  rows: Row[] | undefined,
  rangeTag: string,
  metricIndex: number,
): number {
  // With a dateRanges array + no other dimension, GA4 returns one row per range,
  // tagged by the implicit `dateRange` dimension value (date_range_0/1). When a
  // single range is requested there is no tag and the row is index 0.
  if (!rows || rows.length === 0) return 0;
  const tagged = rows.find((r) => r.dimensionValues?.some((d) => d.value === rangeTag));
  const row = tagged ?? (rangeTag === 'date_range_0' ? rows[0] : rows[1]) ?? rows[0];
  return metric(row, metricIndex);
}

export interface Ga4RangeArgs {
  from: string;
  to: string;
  compareFrom: string | null;
  compareTo: string | null;
}

/**
 * Fetch sessions/users/conversions/leads + channels + on-site funnel for an
 * explicit range, plus the comparison range when supplied — both returned as
 * {value, prev, deltaPct}. The current range is always dateRange index 0; the
 * comparison is index 1 (when present). Throws on hard GA4 failure so the
 * caller can fall back to the stored summary + a data-gap note (never crash).
 */
export async function fetchGa4Range({
  from,
  to,
  compareFrom,
  compareTo,
}: Ga4RangeArgs): Promise<Ga4RangeReport> {
  const analytics = getAnalyticsClient();
  const property = `properties/${GA4_PROPERTY_ID}`;
  const hasCompare = Boolean(compareFrom && compareTo);
  const dateRanges = [
    { startDate: from, endDate: to },
    ...(hasCompare ? [{ startDate: compareFrom as string, endDate: compareTo as string }] : []),
  ];

  try {
    // 1 — Totals for both ranges (one runReport, multiple dateRanges).
    const totalsRes = await analytics.properties.runReport({
      property,
      requestBody: {
        dateRanges,
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'conversions' },
        ],
      },
    });
    const totalsRows = totalsRes.data.rows;
    const sessionsCur = totalsForRange(totalsRows, 'date_range_0', 0);
    const usersCur = totalsForRange(totalsRows, 'date_range_0', 1);
    const convCur = totalsForRange(totalsRows, 'date_range_0', 2);
    const sessionsPrev = hasCompare ? totalsForRange(totalsRows, 'date_range_1', 0) : null;
    const usersPrev = hasCompare ? totalsForRange(totalsRows, 'date_range_1', 1) : null;
    const convPrev = hasCompare ? totalsForRange(totalsRows, 'date_range_1', 2) : null;

    // 2 — Channels by sessionDefaultChannelGroup (CURRENT range — index 0 only,
    //     so channel slices reflect the selected period). Comparison range mix
    //     is out of scope for the donut (the KPI deltas already cover trend).
    const channelsRes = await analytics.properties.runReport({
      property,
      requestBody: {
        dateRanges: [{ startDate: from, endDate: to }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }, { name: 'conversions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: '12',
      },
    });
    const channels: Ga4Channel[] = (channelsRes.data.rows ?? []).map((r) => ({
      channel: r.dimensionValues?.[0]?.value || 'Unassigned',
      sessions: metric(r, 0),
      conversions: metric(r, 1),
    }));

    // 3 — Funnel events + generate_lead (CURRENT range).
    const eventsRes = await analytics.properties.runReport({
      property,
      requestBody: {
        dateRanges: [{ startDate: from, endDate: to }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: { fieldName: 'eventName', inListFilter: { values: GA4_EVENTS } },
        },
        limit: '50',
      },
    });
    const eventCounts = new Map<string, number>();
    for (const r of eventsRes.data.rows ?? []) {
      const name = r.dimensionValues?.[0]?.value;
      if (name) eventCounts.set(name, metric(r, 0));
    }
    const onsite_funnel: Ga4FunnelStage[] = [];
    let prev: number | null = null;
    for (const stage of ONSITE_FUNNEL) {
      const count = eventCounts.get(stage.event) ?? 0;
      const conversionFromPrev = prev != null && prev > 0 ? count / prev : null;
      onsite_funnel.push({ key: stage.key, label: stage.label, count, conversionFromPrev });
      prev = count;
    }
    const leadsCur = eventCounts.get(GA4_LEAD_EVENT) ?? 0;

    // Lead count for the comparison range (separate single-range run — keeps the
    // event filter clean and avoids ambiguous multi-range event attribution).
    let leadsPrev: number | null = null;
    if (hasCompare) {
      const prevLeadRes = await analytics.properties.runReport({
        property,
        requestBody: {
          dateRanges: [{ startDate: compareFrom as string, endDate: compareTo as string }],
          dimensions: [{ name: 'eventName' }],
          metrics: [{ name: 'eventCount' }],
          dimensionFilter: {
            filter: { fieldName: 'eventName', inListFilter: { values: [GA4_LEAD_EVENT] } },
          },
          limit: '5',
        },
      });
      leadsPrev = 0;
      for (const r of prevLeadRes.data.rows ?? []) {
        if (r.dimensionValues?.[0]?.value === GA4_LEAD_EVENT) leadsPrev = metric(r, 0);
      }
    }

    return {
      sessions: delta(sessionsCur, sessionsPrev),
      users: delta(usersCur, usersPrev),
      conversions: delta(convCur, convPrev),
      leads: delta(leadsCur, leadsPrev),
      channels,
      onsite_funnel,
      period_start: from,
      period_end: to,
      fellBack: false,
      note: null,
    };
  } catch (err) {
    throw new Error(`GA4 range fetch failed (property ${GA4_PROPERTY_ID}): ${(err as Error).message}`);
  }
}

// ============================================================================
// Gross-lead lens (Marketing tab): GA4 as an INDEPENDENT measure of where leads
// come from, sitting between the ad platforms' self-reported conversions and the
// in-house tracker. Used to sanity-check Google Ads' own conversion tracking
// (e.g. Paid Search leads in GA4 vs conversions Google Ads claims). Counts only
// the configured lead-intent events (default: generate_lead) so the number is a
// true gross-lead count, not an inflated sum of every event.
// ============================================================================

export interface Ga4LeadByChannel {
  channel: string;
  leads: number;
}
export interface Ga4LeadMonth {
  month: string; // YYYY-MM
  leads: number;
}
export interface Ga4LeadLens {
  totalLeads: number;
  byChannel: Ga4LeadByChannel[];
  monthly: Ga4LeadMonth[];
  events: string[];
  channelDimension: string;
  period: { from: string; to: string };
}

/** "YYYYMM" (GA4 `yearMonth`) → "YYYY-MM". */
function yearMonthToIso(v: string | null | undefined): string | null {
  if (!v || v.length !== 6) return null;
  return `${v.slice(0, 4)}-${v.slice(4, 6)}`;
}

/**
 * Fetch GA4 gross leads for [from,to], broken down by first-user channel group
 * (matching the GA UI's Lead-acquisition report) and rolled up by month for the
 * trend. Throws on hard GA4 failure so the caller can degrade to a data gap.
 */
export async function fetchGa4LeadLens(from: string, to: string): Promise<Ga4LeadLens> {
  const analytics = getAnalyticsClient();
  const property = `properties/${GA4_PROPERTY_ID}`;
  const events = GA4_MARKETING_LEAD_EVENTS;
  const dimension = GA4_LEAD_CHANNEL_DIMENSION;
  const dateRanges = [{ startDate: from, endDate: to }];
  const dimensionFilter = {
    filter: { fieldName: 'eventName', inListFilter: { values: events } },
  };

  // 1 — Leads by acquisition channel (the CEO's "First user primary channel group").
  const channelRes = await analytics.properties.runReport({
    property,
    requestBody: {
      dateRanges,
      dimensions: [{ name: dimension }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter,
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: '25',
    },
  });
  const byChannel: Ga4LeadByChannel[] = (channelRes.data.rows ?? [])
    .map((r) => ({ channel: r.dimensionValues?.[0]?.value || 'Unassigned', leads: metric(r, 0) }))
    .filter((c) => c.leads > 0);

  // 2 — Leads by month for the trend.
  const monthRes = await analytics.properties.runReport({
    property,
    requestBody: {
      dateRanges,
      dimensions: [{ name: 'yearMonth' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter,
      orderBys: [{ dimension: { dimensionName: 'yearMonth' } }],
      limit: '60',
    },
  });
  const monthly: Ga4LeadMonth[] = [];
  for (const r of monthRes.data.rows ?? []) {
    const month = yearMonthToIso(r.dimensionValues?.[0]?.value);
    if (month) monthly.push({ month, leads: metric(r, 0) });
  }

  const totalLeads = byChannel.reduce((a, c) => a + c.leads, 0);
  return { totalLeads, byChannel, monthly, events, channelDimension: dimension, period: { from, to } };
}

// ============================================================================
// Audience report (dedicated Google Analytics tab): demographics (gender, age),
// device and acquisition-channel breakdowns — each with sessions, users and
// lead-event counts — plus per-event lead acquisition. One runReport per slice,
// fired concurrently. Throws on hard GA4 failure so the caller degrades to a gap.
// ============================================================================

export interface Ga4Slice {
  key: string;
  sessions: number;
  users: number;
  leads: number;
}
export interface Ga4EventRow {
  event: string;
  count: number;
  users: number;
  isLead: boolean;
}
export interface Ga4Audience {
  totals: { sessions: number; users: number; leads: number };
  byGender: Ga4Slice[];
  byAge: Ga4Slice[];
  byDevice: Ga4Slice[];
  byChannel: Ga4Slice[];
  events: Ga4EventRow[];
  leadEvents: string[];
  period: { from: string; to: string };
}

const titleCase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export async function fetchGa4Audience(from: string, to: string): Promise<Ga4Audience> {
  const analytics = getAnalyticsClient();
  const property = `properties/${GA4_PROPERTY_ID}`;
  const dateRanges = [{ startDate: from, endDate: to }];
  const leadEvents = GA4_MARKETING_LEAD_EVENTS;
  const leadFilter = { filter: { fieldName: 'eventName', inListFilter: { values: leadEvents } } };

  /** sessions + users for a dimension. */
  const traffic = async (dim: string): Promise<Map<string, { sessions: number; users: number }>> => {
    const res = await analytics.properties.runReport({
      property,
      requestBody: {
        dateRanges,
        dimensions: [{ name: dim }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: '30',
      },
    });
    const map = new Map<string, { sessions: number; users: number }>();
    for (const r of res.data.rows ?? []) {
      const k = r.dimensionValues?.[0]?.value || '(unknown)';
      map.set(k, { sessions: metric(r, 0), users: metric(r, 1) });
    }
    return map;
  };

  /** lead-event count for a dimension. */
  const leadsBy = async (dim: string): Promise<Map<string, number>> => {
    const res = await analytics.properties.runReport({
      property,
      requestBody: {
        dateRanges,
        dimensions: [{ name: dim }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: leadFilter,
        limit: '30',
      },
    });
    const map = new Map<string, number>();
    for (const r of res.data.rows ?? []) map.set(r.dimensionValues?.[0]?.value || '(unknown)', metric(r, 0));
    return map;
  };

  const slice = async (dim: string, label: (s: string) => string): Promise<Ga4Slice[]> => {
    const [tr, ld] = await Promise.all([traffic(dim), leadsBy(dim)]);
    const keys = new Set<string>([...tr.keys(), ...ld.keys()]);
    return [...keys]
      .map((k) => ({ key: label(k), sessions: tr.get(k)?.sessions ?? 0, users: tr.get(k)?.users ?? 0, leads: ld.get(k) ?? 0 }))
      .sort((a, b) => b.sessions - a.sessions);
  };

  const totalsCall = async () => {
    const [t, l] = await Promise.all([
      analytics.properties.runReport({ property, requestBody: { dateRanges, metrics: [{ name: 'sessions' }, { name: 'totalUsers' }] } }),
      analytics.properties.runReport({ property, requestBody: { dateRanges, metrics: [{ name: 'eventCount' }], dimensionFilter: leadFilter } }),
    ]);
    const tr = t.data.rows?.[0];
    return { sessions: metric(tr, 0), users: metric(tr, 1), leads: metric(l.data.rows?.[0], 0) };
  };

  const eventsCall = async (): Promise<Ga4EventRow[]> => {
    const res = await analytics.properties.runReport({
      property,
      requestBody: {
        dateRanges,
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: '100',
      },
    });
    return (res.data.rows ?? []).map((r) => {
      const event = r.dimensionValues?.[0]?.value || '(unknown)';
      return { event, count: metric(r, 0), users: metric(r, 1), isLead: leadEvents.includes(event) };
    });
  };

  const genderLabel = (s: string) => (s === '(unknown)' || !s ? 'Unknown' : titleCase(s));
  const deviceLabel = (s: string) => titleCase(s || 'unknown');
  const ageLabel = (s: string) => (s === '(unknown)' || !s ? 'Unknown' : s);
  const channelLabel = (s: string) => s || 'Unassigned';

  const [totals, byGender, byAge, byDevice, byChannel, events] = await Promise.all([
    totalsCall(),
    slice('userGender', genderLabel),
    slice('userAgeBracket', ageLabel),
    slice('deviceCategory', deviceLabel),
    slice(GA4_LEAD_CHANNEL_DIMENSION, channelLabel),
    eventsCall(),
  ]);

  return { totals, byGender, byAge, byDevice, byChannel, events, leadEvents, period: { from, to } };
}

// ============================================================================
// Multi-touch attribution (channel funnel roles). GA4's Data API does not
// expose full conversion paths, so we model three stages from real channel
// dimensions and let each channel's strongest stage define its role:
//   • Discovery     — first-touch new users   (firstUserDefaultChannelGroup × totalUsers, new)
//   • Consideration — returning engaged visits (sessionDefaultChannelGroup × engagedSessions, returning)
//   • Lower funnel  — last-touch leads         (sessionDefaultChannelGroup × lead events)
// Directional, not a paid MMM — but it answers "who opens vs who closes".
// ============================================================================

export type ChannelStage = 'Discovery' | 'Consideration' | 'Lower funnel' | '—';

export interface Ga4ChannelRole {
  channel: string;
  discovery: number;
  consideration: number;
  conversion: number;
  role: ChannelStage;
  /** True when the row is a logical estimate (e.g. Meta, which GA4 can't attribute). */
  estimated?: boolean;
}

export interface Ga4Attribution {
  channels: Ga4ChannelRole[];
  totals: { discovery: number; consideration: number; conversion: number };
  leaders: { discovery: string | null; consideration: string | null; conversion: string | null };
  period: { from: string; to: string };
}

/** Raw per-channel volumes before role/total/leader derivation. */
export interface Ga4ChannelRaw {
  channel: string;
  discovery: number;
  consideration: number;
  conversion: number;
  estimated?: boolean;
}

/**
 * Derive totals, per-channel roles (the stage a channel over-indexes on) and
 * stage leaders from raw channel volumes. Shared so a merged set (GA4 + an
 * estimated Meta row) is scored exactly like the pure-GA4 set.
 */
export function finalizeAttribution(raw: Ga4ChannelRaw[], period: { from: string; to: string }): Ga4Attribution {
  const totals = { discovery: 0, consideration: 0, conversion: 0 };
  for (const r of raw) {
    totals.discovery += r.discovery;
    totals.consideration += r.consideration;
    totals.conversion += r.conversion;
  }

  const channels: Ga4ChannelRole[] = raw
    .map((r) => {
      const ds = totals.discovery ? r.discovery / totals.discovery : 0;
      const cs = totals.consideration ? r.consideration / totals.consideration : 0;
      const vs = totals.conversion ? r.conversion / totals.conversion : 0;
      const max = Math.max(ds, cs, vs);
      let role: ChannelStage = '—';
      if (max > 0) role = max === vs ? 'Lower funnel' : max === ds ? 'Discovery' : 'Consideration';
      return { channel: r.channel, discovery: r.discovery, consideration: r.consideration, conversion: r.conversion, role, estimated: r.estimated };
    })
    .sort((a, b) => b.discovery + b.consideration + b.conversion - (a.discovery + a.consideration + a.conversion));

  const leaderOf = (sel: (x: Ga4ChannelRole) => number): string | null =>
    channels.reduce<{ n: string | null; v: number }>(
      (acc, ch) => (sel(ch) > acc.v ? { n: ch.channel, v: sel(ch) } : acc),
      { n: null, v: 0 },
    ).n;

  return {
    channels,
    totals,
    leaders: {
      discovery: leaderOf((c) => c.discovery),
      consideration: leaderOf((c) => c.consideration),
      conversion: leaderOf((c) => c.conversion),
    },
    period,
  };
}

export async function fetchGa4Attribution(from: string, to: string): Promise<Ga4Attribution> {
  const analytics = getAnalyticsClient();
  const property = `properties/${GA4_PROPERTY_ID}`;
  const dateRanges = [{ startDate: from, endDate: to }];

  const runMap = async (
    dim: string,
    metricName: string,
    dimensionFilter?: Record<string, unknown>,
  ): Promise<Map<string, number>> => {
    const res = await analytics.properties.runReport({
      property,
      requestBody: {
        dateRanges,
        dimensions: [{ name: dim }],
        metrics: [{ name: metricName }],
        ...(dimensionFilter ? { dimensionFilter } : {}),
        limit: '50',
      },
    });
    const map = new Map<string, number>();
    for (const r of res.data.rows ?? []) map.set(r.dimensionValues?.[0]?.value || 'Unassigned', metric(r, 0));
    return map;
  };

  const [disc, cons, conv] = await Promise.all([
    runMap('firstUserDefaultChannelGroup', 'totalUsers', {
      filter: { fieldName: 'newVsReturning', stringFilter: { value: 'new' } },
    }),
    runMap('sessionDefaultChannelGroup', 'engagedSessions', {
      filter: { fieldName: 'newVsReturning', stringFilter: { value: 'returning' } },
    }),
    runMap('sessionDefaultChannelGroup', 'eventCount', {
      filter: { fieldName: 'eventName', inListFilter: { values: GA4_MARKETING_LEAD_EVENTS } },
    }),
  ]);

  const keys = new Set<string>([...disc.keys(), ...cons.keys(), ...conv.keys()]);
  const raw: Ga4ChannelRaw[] = [...keys].map((channel) => ({
    channel,
    discovery: disc.get(channel) ?? 0,
    consideration: cons.get(channel) ?? 0,
    conversion: conv.get(channel) ?? 0,
  }));

  return finalizeAttribution(raw, { from, to });
}
