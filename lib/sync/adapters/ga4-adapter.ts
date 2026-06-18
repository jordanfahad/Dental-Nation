import type { analyticsdata_v1beta } from 'googleapis';
import { getAnalyticsClient } from '../google-auth';
import {
  GA4_EVENTS,
  GA4_LEAD_EVENT,
  GA4_LOOKBACK_DAYS,
  GA4_PROPERTY_ID,
  ONSITE_FUNNEL,
} from '@/config/ga4';
import type { Ga4Channel, Ga4FunnelStage, Ga4Summary } from '@/lib/types';

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
