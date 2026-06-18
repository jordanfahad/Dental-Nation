import type { analyticsdata_v1beta } from 'googleapis';
import { getAnalyticsClient } from '../google-auth';
import {
  GA4_EVENTS,
  GA4_LEAD_EVENT,
  GA4_LOOKBACK_DAYS,
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
