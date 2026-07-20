import type {
  BookingsRangeReport,
  DailyPoint,
  Ga4RangeReport,
  LeadsRangeReport,
  PaidRangeReport,
  RangeMeta,
} from '@/lib/types';
import type { CrmReport } from '@/lib/crm/types';
import type { PractoSummary } from '@/lib/practo/report';
import type { NewPatientAcquisition } from './acquisition';

/**
 * The Executive Dashboard model — the investor-facing hero. It composes EVERY
 * source (paid acquisition, lead tracker, GA4 website, booking widget, Zavis CRM
 * appointments + conversations, Practo clinic revenue) over each source's full
 * history. Each population stays distinct + honestly labelled; the cross-source
 * KPIs are convenience roll-ups, null wherever a source is absent (never faked).
 */

/** Headline cross-source KPIs. Every field nullable — a missing source is a gap. */
export interface ExecKpis {
  /** Paid media spend (AED) — raw_raw_social perf. */
  marketingSpend: number | null;
  /** Inquiries from the lead tracker. */
  leadsGenerated: number | null;
  /** Paid leads (perf). */
  paidLeads: number | null;
  /** Spend ÷ paid leads (AED). */
  costPerLead: number | null;
  /** Website sessions (GA4). */
  websiteSessions: number | null;
  /** Website conversions (GA4). */
  websiteConversions: number | null;
  /** Total real (non-test) CRM appointments. */
  appointmentsBooked: number | null;
  /** Completed (attended) appointments. */
  appointmentsCompleted: number | null;
  /** completed / (completed + cancel). */
  completionRate: number | null;
  /** cancel / total. */
  cancellationRate: number | null;
  /** Appointments booked by the Zavis AI agent. */
  aiAgentBookings: number | null;
  /** Finalized clinic revenue (AED) — Practo bills. */
  clinicRevenue: number | null;
  /** Average finalized bill value (AED). */
  avgBillValue: number | null;
  /** Conversations handled (Zavis). */
  conversationsHandled: number | null;
  /** Avg first-response time (hours) — the responsiveness signal. */
  avgFirstResponseHours: number | null;
}

/** One month across the business: spend, leads, appointments, clinic revenue. */
export interface ExecMonthPoint {
  month: string; // YYYY-MM
  label: string; // e.g. "Mar 2026"
  spend: number;
  leads: number;
  appointments: number;
  revenue: number;
}

export interface ExecutiveReport {
  range: RangeMeta;
  paid: PaidRangeReport;
  leads: LeadsRangeReport;
  ga4: Ga4RangeReport | null;
  bookings: BookingsRangeReport;
  series: DailyPoint[];
  crm: CrmReport;
  practo: PractoSummary;
  kpis: ExecKpis;
  monthly: ExecMonthPoint[];
  /** New-patient acquisition economics (cost per new patient, ROAS). */
  acquisition: NewPatientAcquisition;
  /** Coverage flags so the UI can narrate which engines are wired/live. */
  coverage: {
    paid: boolean;
    leads: boolean;
    ga4: boolean;
    bookings: boolean;
    crm: boolean;
    practo: boolean;
  };
  /** Ad-feed freshness so a stalled sync (e.g. Meta) is surfaced honestly. */
  adFreshness: {
    metaLatest: string | null;
    googleLatest: string | null;
    /** Meta's latest date lags well behind Google's → the Meta feed is stale. */
    metaStale: boolean;
  };
  source: 'live' | 'mock' | 'empty';
}
