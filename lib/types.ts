/**
 * Shared domain types for the Lane E Daily Control Report.
 * These mirror the Supabase silver/gold tables (see supabase/migrations) but
 * are the shapes the UI actually consumes.
 */

export type Decision = 'Continue' | 'Fix' | 'Hold' | 'Stop';

/** A typed, owned data gap — the spine of the "never a silent zero" rule (§15). */
export interface DataGap {
  area: string;
  detail: string;
  owner: string;
}

/** One stage of the daily funnel (§D). Values are null when unmeasured. */
export interface FunnelStage {
  key: string;
  label: string;
  /** True for top-of-funnel volume stages sourced from channels (reach/impr/clicks),
   *  which are data gaps in Sheets-v1 until a spend/reach source is mapped. */
  upstream?: boolean;
  today: number | null;
  yesterday: number | null;
  total: number | null;
  /** Stage-to-stage conversion vs. the previous measured stage (0–1), or null. */
  conversionFromPrev: number | null;
}

/** Trailing series + delta for a single KPI in the §A strip. */
export interface KpiTrend {
  /** Trailing values, oldest → newest (newest = today). */
  series: number[];
  today: number | null;
  yesterday: number | null;
  /** today - yesterday (absolute). null if either side missing. */
  delta: number | null;
}

export interface KpiTrends {
  qualified_inquiries: KpiTrend;
  glow_up_bookings: KpiTrend;
  lead_to_booking_rate: KpiTrend;
  show_rate: KpiTrend;
  unattributed_leads: KpiTrend;
}

/** The precomputed gold snapshot the UI reads (daily_snapshot). */
export interface DailySnapshot {
  report_date: string; // YYYY-MM-DD (Dubai)
  decision: Decision;
  /** Transparent one-line reasoning, e.g. "Fix — lead→booking 7% below 10% floor". */
  decision_reason: string;
  best_channel: string | null;
  worst_channel: string | null;
  main_bottleneck: string | null;
  /** "No" or the specific founder decision required. */
  founder_decision: string;
  founder_decision_needed: boolean;
  funnel: FunnelStage[];
  inquiries_by_channel: Record<string, number>;
  bookings_by_channel: Record<string, number>;
  qualified_by_channel: Record<string, number>;
  lead_to_booking_rate: number | null;
  cost_per_inquiry: number | null;
  cost_per_booking: number | null;
  show_rate: number | null;
  unattributed_leads: number;
  data_gaps: DataGap[];
  computed_at: string;
}

/** Channel activation status (§B) — one row per canonical channel. */
export interface ChannelStatus {
  channel: string;
  is_live: boolean | null;
  content_populated: boolean | null;
  cta_correct: boolean | null;
  destination_correct: boolean | null;
  tracking_active: boolean | null;
  owner: string | null;
  blocker: string | null;
}

/** Content / creative performance (§E). */
export interface ContentItem {
  id: string;
  title: string | null;
  channel: string | null;
  link: string | null;
  objective: ContentObjective | null;
  content_type: string | null;
  audience: string | null;
  cta: string | null;
  perf_note: string | null;
  issue_note: string | null;
  status: string | null;
}

export type ContentObjective = 'awareness' | 'proof' | 'conversion' | 'retargeting';

/** PAC / WhatsApp / call feedback (§F). */
export interface PacFeedback {
  report_date: string;
  whatsapp_inquiries: number | null;
  calls: number | null;
  avg_response_minutes: number | null;
  missed_inquiries: number | null;
  bookings_created: number | null;
  top_questions: string[];
  top_objections: string[];
  main_no_booking_reason: string | null;
  script_issue: string | null;
  content_needed: string | null;
}

/** Blockers & fixes (§G). */
export interface Blocker {
  id: string;
  blocker: string | null;
  type: BlockerType | null;
  impact: BlockerImpact | null;
  owner: string | null;
  fix: string | null;
  due_time: string | null;
  status: BlockerStatus | null;
}

export type BlockerType =
  | 'channel'
  | 'creative'
  | 'tracking'
  | 'PAC'
  | 'clinic'
  | 'CRM'
  | 'website';
export type BlockerImpact = 'high' | 'medium' | 'low';
export type BlockerStatus = 'open' | 'in-progress' | 'done';

/** Sync health (ingestion_log) surfaced in the footer. */
export interface IngestionStatus {
  status: 'success' | 'partial' | 'failed';
  finished_at: string | null;
  sheets_ok: string[];
  sheets_failed: string[];
  rows_ingested: number | null;
}

/** Tracking integrity health (§C) — attribution + critical-identifier coverage. */
export interface TrackingHealth {
  attributed: number;
  unattributed: number;
  /** Count of leads missing each critical identifier, with the owning team. */
  missing: { label: string; count: number; owner: string }[];
  /** A flagged list of unattributed/incomplete leads with the data-gap owner. */
  flagged: { ref: string; detail: string; owner: string }[];
}

/** One traffic source in the GA4 channel mix (sessionDefaultChannelGroup). */
export interface Ga4Channel {
  channel: string;
  sessions: number;
  conversions: number;
}

/** One stage of the GA4 on-site booking funnel (see config/ga4.ts). */
export interface Ga4FunnelStage {
  key: string;
  label: string;
  count: number;
  /** Conversion vs. the previous stage (0–1), or null when prev is 0/missing. */
  conversionFromPrev: number | null;
}

/**
 * The current "Website — last 28 days" GA4 summary (ga4_summary singleton).
 * Decoupled from the per-date paid snapshot: GA4 is current through today.
 */
export interface Ga4Summary {
  period_start: string; // YYYY-MM-DD
  period_end: string; // YYYY-MM-DD
  sessions: number;
  users: number;
  new_users: number;
  conversions: number;
  engaged_sessions: number;
  /** On-site lead conversions (GA4 `generate_lead` event). */
  leads: number;
  channels: Ga4Channel[];
  onsite_funnel: Ga4FunnelStage[];
}

/** One recent booking row for the §Bookings recent table. */
export interface BookingRecent {
  date: string | null;
  treatment: string | null;
  clinic: string | null;
  doctor: string | null;
  price: number | null;
}

/**
 * Website booking-widget summary (its OWN honest lens — distinct from the paid
 * funnel + GA4 populations). Sourced from the real `bookings` table.
 */
export interface BookingsSummary {
  total: number;
  /** Sum of parsed prices across booked rows (AED). */
  revenue: number;
  cancellations: number;
  /** Top ~6 bookings by date desc. */
  recent: BookingRecent[];
  byClinic: { clinic: string; count: number }[];
}

// ============================================================================
// Range report (Step 2 + 3): a date-range-aware, period-comparison view across
// ALL sources. Aggregated at query time (the data is small). Each source stays
// a DISTINCT population — never fused into one cross-source funnel.
// ============================================================================

/** A single metric carrying its current value, the comparison-period value, and
 *  the % delta between them. `deltaPct` is null when prev is 0/missing (never a
 *  divide-by-zero or a fabricated 0). `value`/`prev` are null for a data gap. */
export interface MetricDelta {
  value: number | null;
  prev: number | null;
  /** (value - prev) / prev, as a fraction. null when prev is 0/null/missing. */
  deltaPct: number | null;
}

/** A {label, value} channel-mix row used across paid/leads/GA4 breakdowns. */
export interface MixRow {
  label: string;
  value: number;
}

/** The selected date range + its comparison range (resolved to concrete dates). */
export interface RangeMeta {
  from: string; // YYYY-MM-DD inclusive
  to: string; // YYYY-MM-DD inclusive
  preset: RangePreset;
  compare: 'prev' | 'none';
  /** Concrete comparison range, or null when compare='none'. */
  compareFrom: string | null;
  compareTo: string | null;
  /** Inclusive day-count of the selected range. */
  days: number;
}

export type RangePreset = 'all' | 'last30' | 'last90' | 'thisMonth' | 'lastMonth' | 'custom';

/** Paid-acquisition aggregate for a range (from raw_raw_social via normalizePerformance). */
export interface PaidRangeReport {
  spend: MetricDelta;
  impressions: MetricDelta;
  clicks: MetricDelta;
  leads: MetricDelta;
  /** spend / leads. null when leads is 0 (data gap, not a fabricated 0). */
  costPerLead: MetricDelta;
  /** Channel mix (by `channel`) for the current range — leads share. */
  channelLeads: MixRow[];
  /** Channel mix (by `channel`) for the current range — spend share. */
  channelSpend: MixRow[];
  /** True when no perf rows fell in the range (→ data-gap state). */
  empty: boolean;
}

/** Lead-tracker aggregate for a range (from `leads` by inquiry_date). */
export interface LeadsRangeReport {
  total: MetricDelta;
  /** Attribution health over the range. */
  attributed: MetricDelta;
  unattributed: MetricDelta;
  byChannel: MixRow[];
  byClinic: MixRow[];
  /** A few flagged unattributed/incomplete leads (ref + detail + owner). */
  flagged: { ref: string; detail: string; owner: string }[];
  empty: boolean;
}

/** Bookings aggregate for a range (from `bookings` by booking_date). */
export interface BookingsRangeReport {
  booked: MetricDelta;
  revenue: MetricDelta;
  cancellations: MetricDelta;
  byClinic: MixRow[];
  byTreatment: MixRow[];
  recent: BookingRecent[];
  empty: boolean;
}

/** GA4 aggregate for a range (live runReport with range + comparison dateRanges). */
export interface Ga4RangeReport {
  sessions: MetricDelta;
  users: MetricDelta;
  conversions: MetricDelta;
  leads: MetricDelta;
  channels: Ga4Channel[];
  onsite_funnel: Ga4FunnelStage[];
  period_start: string;
  period_end: string;
  /** True when the live GA4 call failed and we fell back to the stored summary. */
  fellBack: boolean;
  /** Set when GA4 is entirely unavailable (no live + no stored summary). */
  note: string | null;
}

/**
 * The range-aware report assembled by getRangeReport(). Carries the per-source
 * aggregates (each its own population), the resolved range meta, the latest
 * in-range snapshot (for the Executive decision pill), plus the §B/§E/§F/§G
 * supporting tables that are not range-aggregated (current state).
 */
export interface RangeReport {
  range: RangeMeta;
  paid: PaidRangeReport;
  leads: LeadsRangeReport;
  bookings: BookingsRangeReport;
  ga4: Ga4RangeReport | null;
  /** Latest daily_snapshot whose report_date falls in the range (decision pill). */
  snapshot: DailySnapshot | null;
  /** §B channel activation (current). */
  channels: ChannelStatus[];
  /** §E content/creative (current). */
  content: ContentItem[];
  /** §F PAC feedback (mock-only — no real source). */
  pac: PacFeedback | null;
  /** §G blockers (current). */
  blockers: Blocker[];
  ingestion: IngestionStatus | null;
  /** Full available data span, for the "All" preset default + range clamping. */
  availableFrom: string;
  availableTo: string;
  source: 'live' | 'mock';
}

/**
 * The full view-model the dashboard page assembles and passes to sections.
 * Built server-side from the gold snapshot + silver tables + trailing snapshots.
 */
export interface ReportView {
  snapshot: DailySnapshot;
  kpiTrends: KpiTrends;
  channels: ChannelStatus[];
  content: ContentItem[];
  pac: PacFeedback | null;
  blockers: Blocker[];
  tracking: TrackingHealth | null;
  ingestion: IngestionStatus | null;
  /** All report dates available, newest first, for the date picker. */
  availableDates: string[];
  /** Current website analytics (last 28 days). Null when unavailable (data gap). */
  ga4: Ga4Summary | null;
  /** Website booking-widget summary. Null when unavailable (data gap). */
  bookings: BookingsSummary | null;
}
