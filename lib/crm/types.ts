/**
 * CRM — Zavis domain types. Mirrors the lane_e.crm_* tables but is the shape the
 * CRM tab UI actually consumes. Every computed metric is honest: null (never a
 * fabricated 0) when its source row is absent.
 */

/** A {label, value} breakdown row used across source / department / doctor mixes. */
export interface CrmMixRow {
  label: string;
  value: number;
}

/** One day of appointments-created activity across the range (trend chart). */
export interface CrmDailyPoint {
  date: string; // YYYY-MM-DD
  appointments: number;
}

/** Appointment funnel + totals, all null when no appointment rows are present. */
export interface CrmAppointmentStats {
  /** True when there are zero real (non-test) appointment rows. */
  empty: boolean;
  /** Funnel counts by status (null when no appointment data at all). */
  requested: number | null;
  booked: number | null;
  confirmed: number | null;
  completed: number | null;
  cancel: number | null;
  /** Total real (non-test) appointments. */
  total: number | null;
  /** cancel / total, as a fraction. null when total is 0. */
  cancellationRate: number | null;
  /** completed / (completed + cancel), as a fraction. null when denom is 0. */
  completionRate: number | null;
  /** Appointments with source='aiAgent'. */
  aiAgentBookings: number | null;
  bySource: CrmMixRow[];
  byDepartment: CrmMixRow[];
  byDoctor: CrmMixRow[];
  series: CrmDailyPoint[];
}

/** Conversation summary singleton (null when the row is absent). */
export interface CrmConversationSummary {
  periodStart: string | null;
  periodEnd: string | null;
  conversations: number | null;
  messagesReceived: number | null;
  messagesSent: number | null;
  resolutionCount: number | null;
  avgFirstResponseHours: number | null;
  avgFirstResponseText: string | null;
  avgResolutionHours: number | null;
  avgResolutionText: string | null;
  avgWaitingHours: number | null;
  avgWaitingText: string | null;
}

/** Conversation traffic aggregates for the heatmap + peak-hour read. */
export interface CrmTraffic {
  /** True when there are zero traffic rows. */
  empty: boolean;
  /** Totals by hour-of-day 0–23 (each entry guaranteed present, value≥0). */
  byHour: { hour: number; conversations: number }[];
  /**
   * hour×weekday matrix: matrix[hour][weekday] = conversations. weekday is
   * 0=Mon … 6=Sun. Always a full 24×7 grid (zeros are real for the heatmap).
   */
  matrix: number[][];
  /** Peak (hour, weekday, value) cell for the takeaway. null when empty. */
  peak: { hour: number; weekday: number; conversations: number } | null;
}

/** One recent CSAT comment for the "voice of the patient" list. */
export interface CrmCsatComment {
  rating: number;
  feedback: string;
  agent: string | null;
  recordedAt: string | null; // ISO
  url: string | null;
}

/** Patient-satisfaction (CSAT) rollup. Metrics are null when no rated rows exist. */
export interface CrmCsat {
  /** True when there are zero rated conversations in the window. */
  empty: boolean;
  /** Number of rated conversations. */
  responses: number;
  /** Mean rating (1–5). null when no responses. */
  average: number | null;
  /** Share of 4–5 ratings (satisfied), as a fraction. null when no responses. */
  satisfaction: number | null;
  /** Count by rating; always five entries, rating 1…5. */
  distribution: { rating: number; count: number }[];
  /** Most-recent non-empty feedback comments, newest first (capped). */
  comments: CrmCsatComment[];
  /** Window covered by the rated rows (Dubai-day min/max recorded date). */
  periodStart: string | null;
  periodEnd: string | null;
}

/** The assembled CRM report the tab renders. */
export interface CrmReport {
  appointments: CrmAppointmentStats;
  conversation: CrmConversationSummary | null;
  traffic: CrmTraffic;
  csat: CrmCsat;
  /** 'live' when at least one table returned rows; 'empty' otherwise / on failure. */
  source: 'live' | 'empty';
}

/** Optional date range to scope appointment reads (YYYY-MM-DD inclusive). */
export interface CrmRange {
  from?: string;
  to?: string;
}
