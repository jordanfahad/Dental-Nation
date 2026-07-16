// Shared types for the clinic patient-journey funnel. Kept in a plain module
// (no 'server-only') so the client view (ClinicJourneyView) can import them
// while the reader (clinicFunnel.ts, server-only) imports + re-exports them.

export type PatientClass = 'new' | 'existing' | 'upcoming';

export interface ClinicJourneyPatient {
  key: string;
  name: string | null;
  fileNo: string | null;
  phone: string | null;
  doctor: string | null;
  services: string | null;
  patientClass: PatientClass;
  channel: string; // booking channel label
  firstVisit: string | null; // all-time earliest appointment (ISO date)
  bookedDate: string | null; // earliest appointment in the window
  lastApptDate: string | null;
  status: string | null; // most-advanced status seen
  showed: boolean;
  billed: boolean;
  paid: boolean;
  /** Invoiced revenue for this patient = Σ bill_amount of their Practo bills —
   *  the SAME basis as the headline clinic revenue (not patient co-pay). */
  revenue: number;
  nextAppt: string | null; // next future appointment (follow-up), if any
  visits: number; // total appointments (all-time) for this patient
}

export interface ClinicFunnelReport {
  from: string;
  to: string;
  source: 'live' | 'empty';
  enquiries: number;
  enquiryLinkTraceable: boolean;
  booked: number;
  showed: number;
  billed: number;
  paid: number;
  /** Invoiced revenue (Σ bill_amount) for the matched booked patients — the same
   *  basis as the headline clinic revenue, so the two reconcile. */
  revenueAED: number;
  /** Total invoiced across ALL Practo bills in scope (matched or not) — the
   *  headline figure; revenueAED is the share attributable to booked patients. */
  invoicedTotalAED: number;
  billMatchRate: number;
  newCount: number;
  existingCount: number;
  upcomingCount: number;
  patients: ClinicJourneyPatient[];
}
