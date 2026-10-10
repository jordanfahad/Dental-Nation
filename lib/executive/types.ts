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
import type { NewPatientAcquisition } from './acquisitionCore';

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
  /** Enquiries: unique people, deduped by phone across the lead tracker, the
   *  website widget and the AI agent (the Growth Platform total). Falls back
   *  to raw lead-tracker rows only when the Growth Platform read is empty. */
  leadsGenerated: number | null;
  /** True when leadsGenerated is the deduped people count (not tracker rows). */
  enquiriesUnique: boolean;
  /** Paid leads (perf). */
  paidLeads: number | null;
  /** Spend ÷ paid leads (AED). */
  costPerLead: number | null;
  /** Website sessions (GA4). */
  websiteSessions: number | null;
  /** Website conversions (GA4). */
  websiteConversions: number | null;
  /** Practo appointments in the window (every channel; tests and calendar
   *  blocks excluded). Falls back to CRM-DN appointments if Practo is empty. */
  appointmentsBooked: number | null;
  /** Attended (arrived or completed) Practo appointments. */
  appointmentsCompleted: number | null;
  /** attended ÷ (attended + no-show + cancelled). */
  completionRate: number | null;
  /** cancelled ÷ (attended + no-show + cancelled). */
  cancellationRate: number | null;
  /** Appointments booked by the Zavis AI agent. */
  aiAgentBookings: number | null;
  /** Finalized clinic revenue (AED) — Practo bills. */
  clinicRevenue: number | null;
  /** Average value of a paid bill (AED); no-charge bills left out. */
  avgBillValue: number | null;
  /** Conversations handled (Zavis). Only when the CRM-DN conversation export
   *  covers the selected window; null otherwise (never a stale figure). */
  conversationsHandled: number | null;
  /** Avg first-response time (hours), under the same rule as conversations. */
  avgFirstResponseHours: number | null;
  /** The period the CRM-DN conversation export covers, for the label. */
  conversationsPeriod: { start: string | null; end: string | null } | null;
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
