import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { dubaiToday, trailingDates } from '@/lib/dates';
import { mockReportView } from '@/lib/mock/report';
import { ownerFor } from '@/config/data-gap-owners';
import type {
  Blocker,
  BookingsSummary,
  ChannelStatus,
  ContentItem,
  DailySnapshot,
  Ga4Summary,
  IngestionStatus,
  KpiTrend,
  KpiTrends,
  PacFeedback,
  ReportView,
  TrackingHealth,
} from '@/lib/types';

/**
 * The single read path the dashboard uses. Reads the precomputed gold snapshot +
 * silver tables from Supabase. Falls back to mock data when Supabase isn't
 * configured (scaffold mode) or when no snapshot exists yet (pre-first-sync), so
 * the page NEVER crashes — it degrades to a clearly-labelled mock.
 */
export interface ReportViewResult extends ReportView {
  source: 'live' | 'mock';
}

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

/** Map the ga4_summary singleton row → the Ga4Summary the UI consumes. */
function ga4FromRow(row: Record<string, unknown> | null | undefined): Ga4Summary | null {
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

/**
 * Build the website-booking-widget summary from the real `bookings` table rows.
 * Booked rows count toward total + revenue; cancelled rows are counted
 * separately. This is its OWN honest lens — never folded into the paid funnel.
 */
function buildBookingsSummary(rows: Record<string, unknown>[]): BookingsSummary | null {
  if (rows.length === 0) return null;
  const booked = rows.filter((r) => (r.status as string) === 'booked');
  const cancelled = rows.filter((r) => (r.status as string) === 'cancelled');

  const revenue = booked.reduce((a, r) => a + (Number(r.price) || 0), 0);

  const recent = [...booked]
    .sort((a, b) => String(b.booking_date ?? '').localeCompare(String(a.booking_date ?? '')))
    .slice(0, 6)
    .map((r) => ({
      date: (r.booking_date as string) ?? null,
      treatment: (r.treatment as string) ?? null,
      clinic: (r.clinic as string) ?? null,
      doctor: (r.doctor as string) ?? null,
      price: r.price != null ? Number(r.price) : null,
    }));

  const clinicCounts = new Map<string, number>();
  for (const r of booked) {
    const clinic = ((r.clinic as string) ?? '').trim() || 'Unknown clinic';
    clinicCounts.set(clinic, (clinicCounts.get(clinic) ?? 0) + 1);
  }
  const byClinic = [...clinicCounts.entries()]
    .map(([clinic, count]) => ({ clinic, count }))
    .sort((a, b) => b.count - a.count);

  return { total: booked.length, revenue, cancellations: cancelled.length, recent, byClinic };
}

function buildKpiTrends(snapshots: DailySnapshot[]): KpiTrends {
  // snapshots oldest → newest
  const series = (pick: (s: DailySnapshot) => number | null): KpiTrend => {
    const vals = snapshots.map((s) => pick(s) ?? 0);
    const today = snapshots.length ? pick(snapshots[snapshots.length - 1]) : null;
    const yesterday = snapshots.length > 1 ? pick(snapshots[snapshots.length - 2]) : null;
    return {
      series: vals,
      today,
      yesterday,
      delta: today != null && yesterday != null ? today - yesterday : null,
    };
  };
  const qualifiedOf = (s: DailySnapshot) =>
    s.funnel.find((f) => f.key === 'qualified_inquiries')?.today ?? null;
  const bookingsOf = (s: DailySnapshot) =>
    s.funnel.find((f) => f.key === 'glow_up_bookings')?.today ?? null;
  return {
    qualified_inquiries: series(qualifiedOf),
    glow_up_bookings: series(bookingsOf),
    lead_to_booking_rate: series((s) => s.lead_to_booking_rate),
    show_rate: series((s) => s.show_rate),
    unattributed_leads: series((s) => s.unattributed_leads),
  };
}

/** Compute §C tracking health from the day's leads. When the `leads` table is
 *  empty (paid-acquisition mode — attribution is channel-level), fall back to
 *  the snapshot's channel mix so §C shows real attribution instead of zeros. */
function buildTracking(
  leads: Record<string, unknown>[],
  snapshot?: DailySnapshot,
): TrackingHealth {
  if (leads.length === 0 && snapshot) {
    const attributed = Object.values(snapshot.inquiries_by_channel).reduce((a, b) => a + b, 0);
    return {
      attributed,
      unattributed: snapshot.unattributed_leads ?? 0,
      missing: [
        {
          label: 'Lead-level UTM/creative detail',
          count: attributed,
          owner: ownerFor('utm'),
        },
      ],
      flagged: [
        {
          ref: 'channel-level',
          detail:
            'Attribution is channel-level only — lead-level UTM/creative detail is a data gap',
          owner: ownerFor('attribution'),
        },
      ],
    };
  }

  const missingCount = (pred: (l: Record<string, unknown>) => boolean) =>
    leads.filter(pred).length;
  const empty = (v: unknown) => v == null || String(v).trim() === '';

  const unattributed = missingCount((l) => empty(l.channel_source));
  const attributed = leads.length - unattributed;
  const flagged = leads
    .filter((l) => empty(l.channel_source) || empty(l.utm_campaign))
    .slice(0, 8)
    .map((l) => ({
      ref: String(l.id ?? '—'),
      detail: empty(l.channel_source) ? 'No channel source' : 'No UTM campaign',
      owner: ownerFor('attribution'),
    }));

  return {
    attributed,
    unattributed,
    missing: [
      { label: 'UTM campaign', count: missingCount((l) => empty(l.utm_campaign)), owner: ownerFor('utm') },
      { label: 'Campaign name', count: missingCount((l) => empty(l.campaign_name)), owner: ownerFor('attribution') },
      { label: 'Creative id', count: missingCount((l) => empty(l.creative_id)), owner: ownerFor('creative') },
      { label: 'PAC owner', count: missingCount((l) => empty(l.pac_owner)), owner: ownerFor('pac') },
      { label: 'Booking status', count: missingCount((l) => empty(l.booking_status)), owner: ownerFor('clinic') },
    ],
    flagged,
  };
}

export async function getReportView(reportDate?: string): Promise<ReportViewResult> {
  const today = dubaiToday();
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return { ...mockReportView(today, reportDate), source: 'mock' };
  }

  try {
    // Available report dates (newest first) for the picker.
    const { data: dateRows } = await supabase
      .from('daily_snapshot')
      .select('report_date')
      .order('report_date', { ascending: false })
      .limit(60);
    const availableDates = (dateRows ?? []).map((r) => r.report_date as string);
    if (availableDates.length === 0) {
      return { ...mockReportView(today, reportDate), source: 'mock' };
    }

    const date = reportDate && availableDates.includes(reportDate) ? reportDate : availableDates[0];

    const { data: snapRow } = await supabase
      .from('daily_snapshot')
      .select('*')
      .eq('report_date', date)
      .maybeSingle();
    if (!snapRow) return { ...mockReportView(today, reportDate), source: 'mock' };
    const snapshot = snapshotFromRow(snapRow);

    // Trailing snapshots for KPI sparklines.
    const wantDates = trailingDates(date, 7);
    const { data: trailRows } = await supabase
      .from('daily_snapshot')
      .select('*')
      .in('report_date', wantDates)
      .order('report_date', { ascending: true });
    const kpiTrends = buildKpiTrends((trailRows ?? []).map(snapshotFromRow));

    const [
      { data: channels },
      { data: content },
      { data: pacRow },
      { data: blockers },
      { data: logRow },
      { data: leadRows },
      { data: ga4Row },
      { data: bookingRows },
    ] = await Promise.all([
      supabase.from('channel_status').select('*'),
      supabase.from('content_items').select('*'),
      supabase.from('pac_feedback').select('*').eq('report_date', date).maybeSingle(),
      supabase.from('blockers').select('*'),
      supabase
        .from('ingestion_log')
        .select('*')
        .order('finished_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('leads').select('*').eq('inquiry_date', date),
      supabase.from('ga4_summary').select('*').eq('id', 1).maybeSingle(),
      // Bookings are a current cross-period lens (not per-date) — read all rows.
      supabase.from('bookings').select('*'),
    ]);

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
      snapshot,
      kpiTrends,
      channels: (channels as ChannelStatus[]) ?? [],
      content: (content as ContentItem[]) ?? [],
      pac: (pacRow as PacFeedback) ?? null,
      blockers: (blockers as Blocker[]) ?? [],
      tracking: buildTracking((leadRows as Record<string, unknown>[]) ?? [], snapshot),
      ingestion,
      availableDates,
      ga4: ga4FromRow(ga4Row as Record<string, unknown> | null),
      bookings: buildBookingsSummary((bookingRows as Record<string, unknown>[]) ?? []),
      source: 'live',
    };
  } catch {
    // Any read failure degrades to mock rather than crashing the report.
    return { ...mockReportView(today, reportDate), source: 'mock' };
  }
}
