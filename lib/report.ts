import 'server-only';
import { format, parseISO, subDays } from 'date-fns';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { dubaiToday } from '@/lib/dates';
import { buildRangeMeta, inRange } from '@/lib/range';
import { aggregateBookings, aggregateLeads, aggregatePaid } from '@/lib/aggregate';
import { fetchGa4Range } from '@/lib/sync/adapters/ga4-adapter';
import { isGoogleConfigured } from '@/lib/sync/google-auth';
import { normalizePerformance, type PerfRow } from '@/lib/sync/normalize';
import { sheetMapping } from '@/config/sheet-mapping';
import { mockRangeReport } from '@/lib/mock/report';
import { weeklyDecisionRules } from '@/config/decision-rules';
import type {
  ChannelStatus,
  ContentItem,
  Blocker,
  DailyPoint,
  DailySnapshot,
  Ga4RangeReport,
  Ga4Summary,
  IngestionStatus,
  MetricDelta,
  RangeMeta,
  RangePreset,
  RangeReport,
} from '@/lib/types';

/**
 * Range-aware read path (Step 2 + 3). Aggregates at query time across the four
 * live sources — paid (raw_raw_social), leads, bookings, GA4 (live) — for a
 * selected range plus an optional equal-length comparison window. Each source
 * stays a DISTINCT population (never fused into one cross-source funnel).
 *
 * Falls back to mock for the whole report when Supabase isn't configured, when
 * there's no data, or on any read failure (the page NEVER crashes). GA4 has its
 * own narrower fallback: a live failure degrades to the stored ga4_summary +
 * a data-gap note rather than dropping the whole report to mock.
 */

export interface RangeQuery {
  from?: string;
  to?: string;
  preset?: string;
  compare?: string;
  /**
   * Skip the LIVE GA4 Data-API fetch (resolveGa4). The dashboard shell — the
   * header date control, the sync footer and the Website Bookings tab — never
   * reads `report.ga4`, yet resolveGa4 makes a live Google API call on every
   * request that can take several seconds (and occasionally times out). Passing
   * `skipGa4` for those consumers keeps tab navigation snappy; the tabs that
   * actually show GA4 (Executive / Weekly / Analytics) call without it.
   */
  skipGa4?: boolean;
}

// ---------------------------------------------------------------------------
// Supabase row → domain mappers (mirrors lib/data.ts for the snapshot + tables).
// ---------------------------------------------------------------------------

function snapshotFromRow(row: Record<string, unknown>): DailySnapshot {
  const founder = (row.founder_decision as string) ?? 'No';
  return {
    report_date: row.report_date as string,
    decision: (row.decision as DailySnapshot['decision']) ?? 'Hold',
    decision_reason: (row.decision_reason as string) ?? '',
    best_channel: (row.best_channel as string) ?? null,
    worst_channel: (row.worst_channel as string) ?? null,
    main_bottleneck: (row.main_bottleneck as string) ?? null,
    founder_decision: founder,
    founder_decision_needed: Boolean(founder) && founder.trim().toLowerCase() !== 'no',
    funnel: (row.funnel as DailySnapshot['funnel']) ?? [],
    inquiries_by_channel: (row.inquiries_by_channel as Record<string, number>) ?? {},
    bookings_by_channel: (row.bookings_by_channel as Record<string, number>) ?? {},
    qualified_by_channel: (row.qualified_by_channel as Record<string, number>) ?? {},
    lead_to_booking_rate: (row.lead_to_booking_rate as number) ?? null,
    cost_per_inquiry: (row.cost_per_inquiry as number) ?? null,
    cost_per_booking: (row.cost_per_booking as number) ?? null,
    show_rate: (row.show_rate as number) ?? null,
    unattributed_leads: (row.unattributed_leads as number) ?? 0,
    data_gaps: (row.data_gaps as DailySnapshot['data_gaps']) ?? [],
    computed_at: (row.computed_at as string) ?? new Date().toISOString(),
  };
}

function ga4SummaryFromRow(row: Record<string, unknown> | null | undefined): Ga4Summary | null {
  if (!row) return null;
  return {
    period_start: (row.period_start as string) ?? '',
    period_end: (row.period_end as string) ?? '',
    sessions: (row.sessions as number) ?? 0,
    users: (row.users as number) ?? 0,
    new_users: (row.new_users as number) ?? 0,
    conversions: (row.conversions as number) ?? 0,
    engaged_sessions: (row.engaged_sessions as number) ?? 0,
    leads: (row.leads as number) ?? 0,
    channels: (row.channels as Ga4Summary['channels']) ?? [],
    onsite_funnel: (row.onsite_funnel as Ga4Summary['onsite_funnel']) ?? [],
  };
}

/** A no-comparison MetricDelta — for the GA4 stored-summary fallback. */
function plain(value: number | null): MetricDelta {
  return { value, prev: null, deltaPct: null };
}

/** Build the GA4 range report, with a graceful fallback to the stored summary. */
async function resolveGa4(
  range: RangeMeta,
  storedSummary: Ga4Summary | null,
): Promise<Ga4RangeReport | null> {
  if (isGoogleConfigured()) {
    try {
      return await fetchGa4Range({
        from: range.from,
        to: range.to,
        compareFrom: range.compareFrom,
        compareTo: range.compareTo,
      });
    } catch {
      // fall through to the stored-summary fallback below.
    }
  }
  // Fallback: serve the stored ga4_summary (its own period) + a data-gap note.
  if (storedSummary) {
    return {
      sessions: plain(storedSummary.sessions),
      users: plain(storedSummary.users),
      conversions: plain(storedSummary.conversions),
      leads: plain(storedSummary.leads),
      channels: storedSummary.channels,
      onsite_funnel: storedSummary.onsite_funnel,
      period_start: storedSummary.period_start,
      period_end: storedSummary.period_end,
      fellBack: true,
      note: `Live GA4 unavailable — showing the stored ${storedSummary.period_start} → ${storedSummary.period_end} summary (not range-filtered).`,
    };
  }
  return null;
}

/** Minimal lead-date carrier for the series + default-week anchor. */
interface LeadDateLike {
  inquiry_date: string | null;
}
interface BookingDateLike {
  booking_date: string | null;
  status: string | null;
  price: number | string | null;
}

/**
 * Build the per-day activity series across [from, to] (inclusive). Every day in
 * the window is emitted (real zeros where there was no activity), so trend
 * charts read continuously rather than collapsing gaps.
 */
function buildSeries(
  perf: PerfRow[],
  leads: LeadDateLike[],
  bookings: BookingDateLike[],
  from: string,
  to: string,
): DailyPoint[] {
  const map = new Map<string, DailyPoint>();
  const start = parseISO(from);
  const end = parseISO(to);
  // Cap the number of emitted days defensively (a malformed range never loops away).
  for (let d = start, i = 0; d <= end && i < 400; d = subDays(d, -1), i++) {
    const key = iso(d);
    map.set(key, {
      date: key,
      spend: 0,
      impressions: 0,
      clicks: 0,
      paidLeads: 0,
      inquiries: 0,
      bookings: 0,
      revenue: 0,
    });
  }
  for (const r of perf) {
    const p = r.date ? map.get(r.date.slice(0, 10)) : undefined;
    if (!p) continue;
    p.spend += r.spend;
    p.impressions += r.impressions;
    p.clicks += r.clicks;
    p.paidLeads += r.leads;
  }
  for (const l of leads) {
    const p = l.inquiry_date ? map.get(l.inquiry_date.slice(0, 10)) : undefined;
    if (p) p.inquiries += 1;
  }
  for (const b of bookings) {
    if ((b.status ?? '') !== 'booked') continue;
    const p = b.booking_date ? map.get(b.booking_date.slice(0, 10)) : undefined;
    if (!p) continue;
    p.bookings += 1;
    p.revenue += Number(b.price) || 0;
  }
  return [...map.values()];
}

/**
 * Pick the smart default week-end for the Weekly Review. The weekly review judges
 * PAID volume (spend / qualified inquiries / channel decisions), so we prefer the
 * most recent week whose trailing 7 days hold ≥ `minVolume` PAID leads — that
 * gives a substantive, decision-able default rather than the empty live week. If
 * paid volume is never sufficient, fall back to the richest lead-tracker week,
 * then to the latest activity date, then `fallback`.
 */
function pickDefaultWeekTo(
  perfPoints: { date: string | null; leads: number }[],
  inquiryDates: string[],
  minVolume: number,
  fallback: string,
): string {
  const trailingSum = (dates: string[], values: number[], end: string): number => {
    const start = iso(subDays(parseISO(end), 6));
    let s = 0;
    for (let i = 0; i < dates.length; i++) if (dates[i] >= start && dates[i] <= end) s += values[i];
    return s;
  };

  // 1) Most recent week with enough PAID leads.
  const perfDated = perfPoints
    .filter((p) => p.date)
    .map((p) => ({ d: p.date!.slice(0, 10), leads: p.leads }));
  const perfDates = perfDated.map((p) => p.d);
  const perfLeads = perfDated.map((p) => p.leads);
  const perfEnds = [...new Set(perfDates)].sort((a, b) => (a < b ? 1 : -1)); // newest first
  for (const end of perfEnds) {
    if (trailingSum(perfDates, perfLeads, end) >= minVolume) return end;
  }

  // 2) Else the most recent week with enough lead-tracker inquiries.
  const inqDated = inquiryDates.filter(Boolean).map((d) => d.slice(0, 10)).sort();
  const inqOnes = inqDated.map(() => 1);
  const inqEnds = [...new Set(inqDated)].sort((a, b) => (a < b ? 1 : -1));
  for (const end of inqEnds) {
    if (trailingSum(inqDated, inqOnes, end) >= minVolume) return end;
  }

  // 3) Else the latest activity date anywhere.
  const allDates = [...perfDates, ...inqDated].sort();
  return allDates.length ? allDates[allDates.length - 1] : fallback;
}

/**
 * The main range-aware read. `availableFrom/To` define the full data span; the
 * default range (preset 'all') is that whole span. Comparison is the prior
 * equal-length window.
 */
export async function getRangeReport(query: RangeQuery): Promise<RangeReport> {
  const today = dubaiToday();
  const supabase = getSupabaseAdmin();
  const preset = (query.preset as RangePreset) || 'all';
  const compare: 'prev' | 'none' = query.compare === 'none' ? 'none' : 'prev';

  if (!supabase) {
    return mockRangeReport({ today, preset, compare, from: query.from, to: query.to });
  }

  try {
    // Read all four sources at query time (data is small). Paid perf comes from
    // the bronze raw_raw_social jsonb rows, parsed via normalizePerformance.
    const [
      { data: rawPerfRows },
      { data: leadRows },
      { data: bookingRows },
      { data: snapRows },
      { data: channels },
      { data: content },
      { data: blockers },
      { data: logRow },
      { data: ga4Row },
    ] = await Promise.all([
      supabase.from('raw_raw_social').select('row_index, data').order('row_index', { ascending: true }),
      supabase.from('leads').select('id, inquiry_date, channel_source, clinic, utm_campaign'),
      supabase.from('bookings').select('booking_date, status, price, clinic, treatment, doctor'),
      supabase.from('daily_snapshot').select('*').order('report_date', { ascending: false }).limit(120),
      supabase.from('channel_status').select('*'),
      supabase.from('content_items').select('*'),
      supabase.from('blockers').select('*'),
      supabase.from('ingestion_log').select('*').order('finished_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('ga4_summary').select('*').eq('id', 1).maybeSingle(),
    ]);

    // Parse paid perf rows from bronze jsonb (header→value) via normalizePerformance.
    const bronze = ((rawPerfRows as { row_index: number; data: Record<string, string> }[]) ?? []).map(
      (r) => ({ rowIndex: r.row_index, data: r.data ?? {} }),
    );
    const { rows: perf } = normalizePerformance(sheetMapping.rawSocial, bronze);

    const leadList = (leadRows as Record<string, unknown>[]) ?? [];
    const bookingList = (bookingRows as Record<string, unknown>[]) ?? [];
    const snapshots = ((snapRows as Record<string, unknown>[]) ?? []).map(snapshotFromRow);

    // Determine the FULL available span across paid/leads/bookings → today.
    const minDates = [
      ...perf.map((r) => r.date),
      ...leadList.map((r) => r.inquiry_date as string | null),
      ...bookingList.map((r) => r.booking_date as string | null),
    ].filter((d): d is string => Boolean(d));
    if (minDates.length === 0) {
      // No real dated data anywhere → degrade to mock (clearly labelled).
      return mockRangeReport({ today, preset, compare, from: query.from, to: query.to });
    }
    const availableFrom = minDates.reduce((a, b) => (b < a ? b : a));
    const availableTo = today;

    const range = buildRangeMeta(preset, compare, availableFrom, availableTo, query.from, query.to);

    const paid = aggregatePaid(perf, range);
    const leads = aggregateLeads(
      leadList.map((r) => ({
        id: r.id as string | number | null,
        inquiry_date: (r.inquiry_date as string) ?? null,
        channel_source: (r.channel_source as string) ?? null,
        clinic: (r.clinic as string) ?? null,
        utm_campaign: (r.utm_campaign as string) ?? null,
      })),
      range,
    );
    const bookings = aggregateBookings(
      bookingList.map((r) => ({
        booking_date: (r.booking_date as string) ?? null,
        status: (r.status as string) ?? null,
        price: (r.price as number | string | null) ?? null,
        clinic: (r.clinic as string) ?? null,
        treatment: (r.treatment as string) ?? null,
        doctor: (r.doctor as string) ?? null,
      })),
      range,
    );

    // Per-day series for the trend charts (over the resolved range).
    const bookingDates = bookingList.map((r) => ({
      booking_date: (r.booking_date as string) ?? null,
      status: (r.status as string) ?? null,
      price: (r.price as number | string | null) ?? null,
    }));
    const series = buildSeries(
      perf,
      leadList.map((r) => ({ inquiry_date: (r.inquiry_date as string) ?? null })),
      bookingDates,
      range.from,
      range.to,
    );

    // Smart default week-end (most recent substantive week of acquisition).
    const defaultWeekTo = pickDefaultWeekTo(
      perf.map((r) => ({ date: r.date, leads: r.leads })),
      leadList.map((r) => (r.inquiry_date as string) ?? '').filter(Boolean),
      weeklyDecisionRules.minQualifiedToJudge,
      availableTo,
    );

    const storedGa4 = ga4SummaryFromRow(ga4Row as Record<string, unknown> | null);
    // Skip the live GA4 call entirely for shell/bookings consumers (they don't
    // read report.ga4) — that live Google fetch is the main tab-switch stall.
    const ga4 = query.skipGa4 ? null : await resolveGa4(range, storedGa4);

    // Latest in-range snapshot for the Executive decision pill.
    const snapshot =
      snapshots.find((s) => inRange(s.report_date, range.from, range.to)) ?? snapshots[0] ?? null;

    const ingestion: IngestionStatus | null = logRow
      ? {
          status: (logRow.status as IngestionStatus['status']) ?? 'success',
          finished_at: (logRow.finished_at as string) ?? null,
          sheets_ok: (logRow.sheets_ok as string[]) ?? [],
          sheets_failed: (logRow.sheets_failed as string[]) ?? [],
          rows_ingested: (logRow.rows_ingested as number) ?? null,
        }
      : null;

    return {
      range,
      paid,
      leads,
      bookings,
      ga4,
      snapshot,
      channels: (channels as ChannelStatus[]) ?? [],
      content: (content as ContentItem[]) ?? [],
      pac: null, // PAC has no real source — surfaced as a data gap in the UI.
      blockers: (blockers as Blocker[]) ?? [],
      ingestion,
      availableFrom,
      availableTo,
      series,
      defaultWeekTo,
      source: 'live',
    };
  } catch {
    return mockRangeReport({ today, preset, compare, from: query.from, to: query.to });
  }
}

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

/**
 * Weekly read for the Weekly All Lanes Performance Review (§A–E). Reuses
 * getRangeReport internally over a 7-day window with compare='prev' (the prior
 * 7 days). The window defaults to the last 7 days ending at the latest data date;
 * pass `weekOf` (any YYYY-MM-DD in the desired week's end) to anchor `to`.
 *
 * To find the latest data date we resolve the full span once (preset 'all'), then
 * re-read the same sources for the concrete 7-day window. Data is small so the
 * extra read is cheap, and reusing getRangeReport keeps a single aggregation path.
 */
export async function getWeeklyReport(weekOf?: string): Promise<RangeReport> {
  // 1) Resolve the available span (also the mock/live decision + GA4 path).
  const span = await getRangeReport({ preset: 'all', compare: 'none' });

  // 2) Anchor the week end at `weekOf` (clamped into the span) or — by default —
  //    the most recent week that actually has acquisition volume (defaultWeekTo),
  //    NOT the empty live week. This is what makes the Weekly tab show real data.
  let to = span.defaultWeekTo || span.availableTo;
  if (weekOf && /^\d{4}-\d{2}-\d{2}$/.test(weekOf)) {
    to = weekOf < span.availableFrom ? span.availableFrom : weekOf > span.availableTo ? span.availableTo : weekOf;
  }
  let from = iso(subDays(parseISO(to), 6)); // inclusive 7-day window
  if (from < span.availableFrom) from = span.availableFrom;

  // 3) Re-read the same sources for the concrete week + prior-week comparison.
  return getRangeReport({ from, to, compare: 'prev' });
}
