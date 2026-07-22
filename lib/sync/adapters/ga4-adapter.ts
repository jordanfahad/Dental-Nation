import type { analyticsdata_v1beta } from 'googleapis';
import { getAnalyticsClient } from '../google-auth';
import {
  BOOKING_FUNNEL_EVENTS,
  BOOKING_OFFERS,
  GA4_BOOKING_COMPLETED_EVENT,
  GA4_BOOKING_INTENT_EVENT,
  GA4_CALL_EVENT,
  GA4_EVENTS,
  GA4_LANES,
  GA4_LEAD_CHANNEL_DIMENSION,
  GA4_LEAD_EVENT,
  geoBucketOf,
  GA4_LOOKBACK_DAYS,
  GA4_MARKETING_LEAD_EVENTS,
  GA4_PROPERTY_ID,
  GA4_QUALIFIED_LEAD_EVENTS,
  GA4_VALUE_METRIC,
  GA4_WHATSAPP_EVENT,
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
// Landing-page traffic by LANE (Glow-Up / SOS / Scan / Restore / First-look).
// One traffic report (sessions/users/new users by landing page) + one on-site
// event report (generate_lead + booking widget events by landing page), mapped
// to lanes by the slug in the path.
// ============================================================================
export interface LaneGeoMetrics {
  sessions: number;
  users: number; // unique users (GA4 totalUsers)
  newUsers: number;
  leads: number; // on-site generate_lead events
  widgetViews: number; // booking widget viewed
  bookingIntent: number; // treatment selected in the widget
  qualified: number; // qualify_lead events (OTP verified + booking completed)
  value: number; // treatment fee (AED) — eventValue on booking_completed (realized)
}
export interface Ga4LaneRow {
  key: string;
  label: string;
  path: string;
  /** Metrics keyed by geo bucket: an emirate key, 'uaeother', or 'nonuae'. The
   *  client rolls these up per the selected geo filter (All / UAE / emirate / VPN). */
  geo: Record<string, LaneGeoMetrics>;
}

const emptyGeo = (): LaneGeoMetrics => ({ sessions: 0, users: 0, newUsers: 0, leads: 0, widgetViews: 0, bookingIntent: 0, qualified: 0, value: 0 });

export async function fetchGa4Lanes(from: string, to: string): Promise<Ga4LaneRow[]> {
  const analytics = getAnalyticsClient();
  const property = `properties/${GA4_PROPERTY_ID}`;
  const dateRanges = [{ startDate: from, endDate: to }];
  const LEAD = GA4_LEAD_EVENT;
  const WIDGET = 'booking_widget_viewed';
  const TREAT = GA4_BOOKING_INTENT_EVENT;
  const QUAL = GA4_QUALIFIED_LEAD_EVENTS; // qualify_lead
  const DONE = GA4_BOOKING_COMPLETED_EVENT; // booking_completed (carries realized fee)

  // Only pull the five lane landing pages (keeps the geo cross-tab small).
  const laneFilter = {
    orGroup: {
      expressions: GA4_LANES.map((l) => ({
        filter: { fieldName: 'landingPagePlusQueryString', stringFilter: { matchType: 'CONTAINS' as const, value: l.slug, caseSensitive: false } },
      })),
    },
  };
  const eventNames = [LEAD, WIDGET, TREAT, ...QUAL, DONE];
  const eventFilter = { filter: { fieldName: 'eventName', inListFilter: { values: eventNames } } };

  const [trafficRes, eventRes] = await Promise.all([
    analytics.properties.runReport({
      property,
      requestBody: {
        dateRanges,
        dimensions: [{ name: 'landingPagePlusQueryString' }, { name: 'country' }, { name: 'region' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'newUsers' }],
        dimensionFilter: laneFilter,
        limit: '100000',
      },
    }),
    analytics.properties.runReport({
      property,
      requestBody: {
        dateRanges,
        dimensions: [{ name: 'landingPagePlusQueryString' }, { name: 'country' }, { name: 'region' }, { name: 'eventName' }],
        metrics: [{ name: 'eventCount' }, { name: GA4_VALUE_METRIC }],
        dimensionFilter: { andGroup: { expressions: [laneFilter, eventFilter] } },
        limit: '100000',
      },
    }),
  ]);

  const laneOf = (path: string): string | null => {
    const p = path.toLowerCase();
    for (const l of GA4_LANES) if (p.includes(l.slug)) return l.key;
    return null;
  };
  const acc = new Map<string, Ga4LaneRow>();
  for (const l of GA4_LANES) acc.set(l.key, { key: l.key, label: l.label, path: l.path, geo: {} });
  const bucket = (laneKey: string, geoKey: string): LaneGeoMetrics => {
    const row = acc.get(laneKey)!;
    return (row.geo[geoKey] ??= emptyGeo());
  };

  for (const r of trafficRes.data.rows ?? []) {
    const k = laneOf(r.dimensionValues?.[0]?.value ?? '');
    if (!k) continue;
    const g = geoBucketOf(r.dimensionValues?.[1]?.value ?? '', r.dimensionValues?.[2]?.value ?? '');
    const m = bucket(k, g);
    m.sessions += metric(r, 0);
    m.users += metric(r, 1);
    m.newUsers += metric(r, 2);
  }
  for (const r of eventRes.data.rows ?? []) {
    const k = laneOf(r.dimensionValues?.[0]?.value ?? '');
    if (!k) continue;
    const g = geoBucketOf(r.dimensionValues?.[1]?.value ?? '', r.dimensionValues?.[2]?.value ?? '');
    const ev = r.dimensionValues?.[3]?.value ?? '';
    const n = metric(r, 0); // eventCount
    const v = metric(r, 1); // eventValue (AED)
    const m = bucket(k, g);
    if (ev === LEAD) m.leads += n;
    else if (ev === WIDGET) m.widgetViews += n;
    else if (ev === TREAT) m.bookingIntent += n;
    else if (QUAL.includes(ev)) m.qualified += n;
    if (ev === DONE) m.value += v; // realized treatment fee on completed bookings
  }
  return GA4_LANES.map((l) => acc.get(l.key)!);
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

// ============================================================================
// Araby Ads campaign lens: overall daily traffic + channel mix for the window,
// plus the ArabyAds-attributed slice (campaign / landing page / daily) filtered
// to the campaign UTMs. One property, a handful of runReport calls. Throws on
// hard GA4 failure so the caller can degrade to a data gap (never crash).
// ============================================================================

export interface Ga4ArabyAds {
  totalSessions: number;
  dailyAll: { date: string; sessions: number }[];
  byChannel: { channel: string; sessions: number }[];
  araby: {
    sessions: number;
    conversions: number;
    byCampaign: { campaign: string; sessions: number; conversions: number }[];
    byLandingPage: { page: string; sessions: number }[];
    /** How the ArabyAds visitors actually arrived — source / medium (direct vs referral vs the DSP source). */
    bySourceMedium: { sourceMedium: string; sessions: number }[];
    daily: { date: string; sessions: number }[];
    /** Behavioural quality of traffic hitting the ArabyAds landing pages — the
     *  independent "is this grey/bot inventory?" signal (near-zero engagement,
     *  instant bounce, odd geo/device = junk). Scoped by landing page, so it
     *  works even when the DSP doesn't tag utm_source. */
    quality: {
      sessions: number;
      engagementRate: number | null; // 0–1
      bounceRate: number | null; // 0–1
      avgSessionDuration: number | null; // seconds
      byDevice: { device: string; sessions: number; engagementRate: number | null }[];
      byCountry: { country: string; sessions: number }[];
    } | null;
  };
  period: { from: string; to: string };
}

/** GA4 `date` dimension is 'YYYYMMDD' → 'YYYY-MM-DD'. */
function ga4DateToIso(v: string | null | undefined): string | null {
  if (!v || v.length !== 8) return null;
  return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
}

export async function fetchGa4ArabyAds(from: string, to: string, campaigns: string[]): Promise<Ga4ArabyAds> {
  const analytics = getAnalyticsClient();
  const property = `properties/${GA4_PROPERTY_ID}`;
  const dateRanges = [{ startDate: from, endDate: to }];
  // Attribute to the campaign either by the exact UTM campaign names or a
  // source that starts with "arabyads" (covers casing / minor UTM drift).
  const campaignFilter = {
    orGroup: {
      expressions: [
        { filter: { fieldName: 'sessionCampaignName', inListFilter: { values: campaigns } } },
        { filter: { fieldName: 'sessionSource', stringFilter: { matchType: 'CONTAINS', value: 'arabyads', caseSensitive: false } } },
      ],
    },
  };
  // The ArabyAds landing pages (Glow-Up / SOS / Scan). Filtering the quality
  // signals by landing page — not by source — means we still measure the traffic
  // even when the DSP fails to tag utm_source (which is exactly the case here).
  const arabyPages = GA4_LANES.filter((l) => l.widgetSource);
  const landingFilter = {
    orGroup: {
      expressions: arabyPages.map((l) => ({
        filter: { fieldName: 'landingPagePlusQueryString', stringFilter: { matchType: 'CONTAINS' as const, value: l.slug, caseSensitive: false } },
      })),
    },
  };

  const [dailyAllRes, channelRes, campRes, lpRes, dailyArabyRes, srcMedRes, qTotRes, qDevRes, qGeoRes] = await Promise.all([
    // 1 — overall daily sessions (all channels)
    analytics.properties.runReport({
      property,
      requestBody: {
        dateRanges,
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
        limit: '400',
      },
    }),
    // 2 — channel mix (all channels)
    analytics.properties.runReport({
      property,
      requestBody: {
        dateRanges,
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: '12',
      },
    }),
    // 3 — ArabyAds sessions/conversions by campaign
    analytics.properties.runReport({
      property,
      requestBody: {
        dateRanges,
        dimensions: [{ name: 'sessionCampaignName' }],
        metrics: [{ name: 'sessions' }, { name: 'conversions' }],
        dimensionFilter: campaignFilter,
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: '25',
      },
    }),
    // 4 — ArabyAds sessions by landing page
    analytics.properties.runReport({
      property,
      requestBody: {
        dateRanges,
        dimensions: [{ name: 'landingPagePlusQueryString' }],
        metrics: [{ name: 'sessions' }],
        dimensionFilter: campaignFilter,
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: '25',
      },
    }),
    // 5 — ArabyAds daily sessions
    analytics.properties.runReport({
      property,
      requestBody: {
        dateRanges,
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'sessions' }],
        dimensionFilter: campaignFilter,
        orderBys: [{ dimension: { dimensionName: 'date' } }],
        limit: '400',
      },
    }),
    // 6 — ArabyAds sessions by source / medium (direct vs referral vs DSP source)
    analytics.properties.runReport({
      property,
      requestBody: {
        dateRanges,
        dimensions: [{ name: 'sessionSourceMedium' }],
        metrics: [{ name: 'sessions' }],
        dimensionFilter: campaignFilter,
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: '25',
      },
    }),
    // 7 — quality totals on the ArabyAds landing pages (engagement / bounce / duration)
    analytics.properties.runReport({
      property,
      requestBody: {
        dateRanges,
        metrics: [{ name: 'sessions' }, { name: 'engagementRate' }, { name: 'bounceRate' }, { name: 'averageSessionDuration' }],
        dimensionFilter: landingFilter,
      },
    }),
    // 8 — by device
    analytics.properties.runReport({
      property,
      requestBody: {
        dateRanges,
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'sessions' }, { name: 'engagementRate' }],
        dimensionFilter: landingFilter,
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: '10',
      },
    }),
    // 9 — by country (geography anomaly check)
    analytics.properties.runReport({
      property,
      requestBody: {
        dateRanges,
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'sessions' }],
        dimensionFilter: landingFilter,
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: '10',
      },
    }),
  ]);

  const dailyAll = (dailyAllRes.data.rows ?? [])
    .map((r) => ({ date: ga4DateToIso(r.dimensionValues?.[0]?.value) ?? '', sessions: metric(r, 0) }))
    .filter((d) => d.date);
  const byChannel = (channelRes.data.rows ?? []).map((r) => ({ channel: r.dimensionValues?.[0]?.value || 'Unassigned', sessions: metric(r, 0) }));
  const byCampaign = (campRes.data.rows ?? []).map((r) => ({ campaign: r.dimensionValues?.[0]?.value || '(not set)', sessions: metric(r, 0), conversions: metric(r, 1) }));
  const byLandingPage = (lpRes.data.rows ?? []).map((r) => ({ page: r.dimensionValues?.[0]?.value || '(not set)', sessions: metric(r, 0) }));
  const bySourceMedium = (srcMedRes.data.rows ?? []).map((r) => ({ sourceMedium: r.dimensionValues?.[0]?.value || '(not set)', sessions: metric(r, 0) }));

  // Quality signals on the ArabyAds landing pages.
  const qRow = qTotRes.data.rows?.[0];
  const qSessions = metric(qRow, 0);
  const quality =
    qSessions > 0
      ? {
          sessions: qSessions,
          engagementRate: metric(qRow, 1),
          bounceRate: metric(qRow, 2),
          avgSessionDuration: metric(qRow, 3),
          byDevice: (qDevRes.data.rows ?? []).map((r) => ({
            device: r.dimensionValues?.[0]?.value || '(other)',
            sessions: metric(r, 0),
            engagementRate: metric(r, 1),
          })),
          byCountry: (qGeoRes.data.rows ?? []).map((r) => ({ country: r.dimensionValues?.[0]?.value || '(not set)', sessions: metric(r, 0) })),
        }
      : null;
  const arabyDaily = (dailyArabyRes.data.rows ?? [])
    .map((r) => ({ date: ga4DateToIso(r.dimensionValues?.[0]?.value) ?? '', sessions: metric(r, 0) }))
    .filter((d) => d.date);

  const totalSessions = dailyAll.reduce((a, d) => a + d.sessions, 0);
  const arabySessions = byCampaign.reduce((a, c) => a + c.sessions, 0);
  const arabyConversions = byCampaign.reduce((a, c) => a + c.conversions, 0);

  return {
    totalSessions,
    dailyAll,
    byChannel,
    araby: {
      sessions: arabySessions,
      conversions: arabyConversions,
      byCampaign,
      byLandingPage,
      bySourceMedium,
      daily: arabyDaily,
      quality,
    },
    period: { from, to },
  };
}

// ============================================================================
// Booking funnel & events BY OFFER (Website Bookings tab). Each paid offer
// (Glow-Up / SOS / Scan) has its own landing page; clicking "Book appointment"
// opens the widget on /en?offer=<key>… . We attribute:
//   • traffic  → landing-page sessions whose landingPagePlusQueryString matches
//                the offer landing OR carries offer=<key>
//   • events   → GA4 events on pages whose pagePathPlusQueryString carries
//                offer=<key> (widget viewed → visit type → treatment → lead →
//                qualified → booking confirmed), plus every other event fired.
// URL-based, so an event that fires on a page without the offer param can't be
// attributed per offer — those still show in the site-wide events total. Throws
// on hard GA4 failure so the caller degrades to a data gap.
// ============================================================================

export interface Ga4OfferFunnel {
  key: string;
  label: string;
  laneCode: string;
  sessions: number;
  users: number;
  /** eventName → count, for events fired on this offer's pages. */
  events: Record<string, number>;
  /** Every event on this offer's pages, desc — so nothing is hidden. */
  allEvents: { event: string; count: number }[];
}

export interface Ga4BookingByOffer {
  offers: Ga4OfferFunnel[];
  /** Site-wide count for each booking-funnel event (attribution-independent). */
  siteEvents: { event: string; count: number }[];
  period: { from: string; to: string };
}

/** Which offer a landing/page path belongs to (by offer= param or landing path). */
function offerOf(path: string): string | null {
  const p = (path ?? '').toLowerCase();
  for (const o of BOOKING_OFFERS) {
    if (p.includes(`offer=${o.key}`) || p.includes(o.landing)) return o.key;
  }
  return null;
}

export async function fetchGa4BookingByOffer(from: string, to: string): Promise<Ga4BookingByOffer> {
  const analytics = getAnalyticsClient();
  const property = `properties/${GA4_PROPERTY_ID}`;
  const dateRanges = [{ startDate: from, endDate: to }];

  const [landingRes, eventsRes, siteEventsRes] = await Promise.all([
    // 1 — landing-page traffic (bucket to an offer in code).
    analytics.properties.runReport({
      property,
      requestBody: {
        dateRanges,
        dimensions: [{ name: 'landingPagePlusQueryString' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: '1000',
      },
    }),
    // 2 — events on offer pages: pagePath carries offer=… → event × path.
    analytics.properties.runReport({
      property,
      requestBody: {
        dateRanges,
        dimensions: [{ name: 'pagePathPlusQueryString' }, { name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'pagePathPlusQueryString',
            stringFilter: { matchType: 'CONTAINS', value: 'offer=', caseSensitive: false },
          },
        },
        limit: '2000',
      },
    }),
    // 3 — site-wide booking-funnel event totals (attribution-independent).
    analytics.properties.runReport({
      property,
      requestBody: {
        dateRanges,
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: { fieldName: 'eventName', inListFilter: { values: BOOKING_FUNNEL_EVENTS } },
        },
        limit: '50',
      },
    }),
  ]);

  const acc = new Map<string, { sessions: number; users: number; events: Map<string, number> }>();
  for (const o of BOOKING_OFFERS) acc.set(o.key, { sessions: 0, users: 0, events: new Map() });

  for (const r of landingRes.data.rows ?? []) {
    const key = offerOf(r.dimensionValues?.[0]?.value ?? '');
    if (!key) continue;
    const a = acc.get(key)!;
    a.sessions += metric(r, 0);
    a.users += metric(r, 1);
  }

  for (const r of eventsRes.data.rows ?? []) {
    const key = offerOf(r.dimensionValues?.[0]?.value ?? '');
    const event = r.dimensionValues?.[1]?.value;
    if (!key || !event) continue;
    const a = acc.get(key)!;
    a.events.set(event, (a.events.get(event) ?? 0) + metric(r, 0));
  }

  const offers: Ga4OfferFunnel[] = BOOKING_OFFERS.map((o) => {
    const a = acc.get(o.key)!;
    return {
      key: o.key,
      label: o.label,
      laneCode: o.laneCode,
      sessions: a.sessions,
      users: a.users,
      events: Object.fromEntries(a.events),
      allEvents: [...a.events.entries()]
        .map(([event, count]) => ({ event, count }))
        .sort((x, y) => y.count - x.count),
    };
  });

  const siteEvents = (siteEventsRes.data.rows ?? [])
    .map((r) => ({ event: r.dimensionValues?.[0]?.value || '(unknown)', count: metric(r, 0) }))
    .sort((a, b) => b.count - a.count);

  return { offers, siteEvents, period: { from, to } };
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

// ===========================================================================
// Daily-funnel overlay source (§D). Per-day sessions ("landing-page visits")
// and per-day counts of the WhatsApp-click and call-click events, over an
// arbitrary span. Buckets by GA4's own `date` dimension (YYYYMMDD) so the
// caller can read today / yesterday / all-time totals off one span fetch.
// ===========================================================================

export interface Ga4FunnelDay {
  date: string; // YYYY-MM-DD
  sessions: number;
  whatsappClicks: number;
  callClicks: number;
}

/** yyyymmdd → yyyy-mm-dd (GA4 `date` dimension is dense, no separators). */
function isoFromGa4Date(v: string | null | undefined): string | null {
  if (!v || v.length !== 8) return null;
  return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
}

/**
 * Fetch the per-day website sessions + WhatsApp/call click events over
 * [from, to]. Two runReports: sessions by date, and eventCount by date×event
 * filtered to the two click events. Throws on any GA4 error (the caller treats
 * a failure as "no GA4 overlay" and leaves those stages as data gaps).
 */
export async function fetchGa4FunnelDaily(from: string, to: string): Promise<Ga4FunnelDay[]> {
  const analytics = getAnalyticsClient();
  const property = `properties/${GA4_PROPERTY_ID}`;
  const dateRanges = [{ startDate: from, endDate: to }];

  const byDate = new Map<string, Ga4FunnelDay>();
  const ensure = (iso: string): Ga4FunnelDay => {
    let row = byDate.get(iso);
    if (!row) {
      row = { date: iso, sessions: 0, whatsappClicks: 0, callClicks: 0 };
      byDate.set(iso, row);
    }
    return row;
  };

  // 1 — Sessions by date (landing-page visits proxy).
  const sessionsRes = await analytics.properties.runReport({
    property,
    requestBody: {
      dateRanges,
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }],
      limit: '400',
    },
  });
  for (const r of sessionsRes.data.rows ?? []) {
    const iso = isoFromGa4Date(r.dimensionValues?.[0]?.value);
    if (iso) ensure(iso).sessions += metric(r, 0);
  }

  // 2 — WhatsApp/call click events by date × eventName.
  const eventsRes = await analytics.properties.runReport({
    property,
    requestBody: {
      dateRanges,
      dimensions: [{ name: 'date' }, { name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          inListFilter: { values: [GA4_WHATSAPP_EVENT, GA4_CALL_EVENT] },
        },
      },
      limit: '800',
    },
  });
  for (const r of eventsRes.data.rows ?? []) {
    const iso = isoFromGa4Date(r.dimensionValues?.[0]?.value);
    const name = r.dimensionValues?.[1]?.value;
    if (!iso || !name) continue;
    const row = ensure(iso);
    if (name === GA4_WHATSAPP_EVENT) row.whatsappClicks += metric(r, 0);
    else if (name === GA4_CALL_EVENT) row.callClicks += metric(r, 0);
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
