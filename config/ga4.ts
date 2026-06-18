/**
 * GA4 integration config. The website analytics section is a single, current
 * "last 28 days" summary, decoupled from the per-date paid daily_snapshot (the
 * paid sheet is stale while GA4 is current through today — mixing them per-date
 * would mislead). All GA4 references (property, lookback, the on-site funnel
 * definition) live HERE so the adapter and the UI read from one source of truth.
 */

/** GA4 property id. Env-overridable so no new Vercel env is required to ship. */
export const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID || '517988735';

/** Trailing window for the "Website — last N days" summary. */
export const GA4_LOOKBACK_DAYS = 28;

/** One stage of the on-site booking funnel — each stage is a GA4 eventName. */
export interface OnsiteFunnelDef {
  key: string;
  label: string;
  event: string;
}

/**
 * The on-site booking funnel — a GENUINELY NESTED sequence so stage-to-stage
 * conversion is meaningful and monotonic (never >100%): of those who open the
 * booking widget, how many select a visit type, then a treatment. Other GA4
 * events (sessions, service-page views, generate_lead) are NOT strictly nested
 * under these, so they're surfaced as KPIs instead of being forced into the
 * funnel (which would show a later stage larger than an earlier one).
 */
export const ONSITE_FUNNEL: OnsiteFunnelDef[] = [
  { key: 'booking_widget_viewed', label: 'Booking widget viewed', event: 'booking_widget_viewed' },
  { key: 'booking_visit_type_selected', label: 'Visit type selected', event: 'booking_visit_type_selected' },
  { key: 'booking_treatment_selected', label: 'Treatment selected', event: 'booking_treatment_selected' },
];

/** The on-site lead conversion event — surfaced as a KPI, not a funnel stage. */
export const GA4_LEAD_EVENT = 'generate_lead';

/** Every GA4 event we count (funnel stages + the lead event) for the dimensionFilter. */
export const GA4_EVENTS = [...ONSITE_FUNNEL.map((s) => s.event), GA4_LEAD_EVENT];
