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

/**
 * The five marketing LANES, each a dedicated landing page. GA4 landing-page
 * traffic is matched to a lane by the `slug` appearing in the landing-page path
 * (so /en/glow-up, /en/glow-up?utm=…, /ar/glow-up all count). The widget booking
 * Source column carries `dental_nation_<wid>` for the three ArabyAds lanes.
 */
export interface LaneDef {
  key: string;
  label: string;
  path: string;
  slug: string; // matched (contains) in the GA4 landing-page path
  widgetSource: string | null; // dental_nation_<x> token in the widget Source, when campaign-driven
}
export const GA4_LANES: LaneDef[] = [
  { key: 'E', label: 'Lane E · Glow-Up', path: '/en/glow-up', slug: 'glow-up', widgetSource: 'glowup' },
  { key: 'D', label: 'Lane D · SOS', path: '/en/sos', slug: '/sos', widgetSource: 'sos' },
  { key: 'J', label: 'Lane J · Scan', path: '/en/scan', slug: '/scan', widgetSource: 'scan' },
  { key: 'C', label: 'Lane C · Restore', path: '/en/care-journeys/restore', slug: 'restore', widgetSource: null },
  { key: 'B', label: 'Lane B · First Look', path: '/en/first-look', slug: 'first-look', widgetSource: null },
];

/**
 * UAE emirates for the GA4 geography filter (matched against the GA4 `region`
 * dimension for country = United Arab Emirates). `key='nonuae'` is the catch-all
 * for traffic outside the UAE — a proxy for VPN / international visitors (GA4
 * cannot flag a VPN directly, so we surface non-UAE traffic as that signal).
 */
export interface EmirateDef {
  key: string;
  label: string;
  aliases: string[]; // normalised (lowercased, alphanumeric-only) region names
}
export const GA4_UAE_COUNTRY = 'United Arab Emirates';
export const GA4_EMIRATES: EmirateDef[] = [
  { key: 'dubai', label: 'Dubai', aliases: ['dubai'] },
  { key: 'abudhabi', label: 'Abu Dhabi', aliases: ['abudhabi', 'abudhabiemirate'] },
  { key: 'sharjah', label: 'Sharjah', aliases: ['sharjah'] },
  { key: 'ajman', label: 'Ajman', aliases: ['ajman'] },
  { key: 'uaq', label: 'Umm Al Quwain', aliases: ['ummalquwain', 'ummulquwain', 'ummalqaywayn'] },
  { key: 'rak', label: 'Ras Al Khaimah', aliases: ['rasalkhaimah', 'rasalkhaymah'] },
  { key: 'fujairah', label: 'Fujairah', aliases: ['fujairah', 'alfujairah'] },
];
export const GA4_NON_UAE_KEY = 'nonuae';

/** Normalise a GA4 region/country string for matching (lowercase, a–z0–9 only). */
export const normGeo = (s: string): string => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Map a GA4 (country, region) to an emirate key, 'uaeother', or 'nonuae'. */
export function geoBucketOf(country: string, region: string): string {
  if (normGeo(country) !== normGeo(GA4_UAE_COUNTRY)) return GA4_NON_UAE_KEY;
  const r = normGeo(region);
  for (const e of GA4_EMIRATES) if (e.aliases.some((a) => r === a || r.includes(a))) return e.key;
  return 'uaeother';
}

/**
 * GROSS marketing-lead lens (the "where do leads actually come from" view shown
 * on the Marketing tab, independent of the ad platforms' own conversion
 * tracking). GA4 carries MANY events (qualify_lead, close_convert_lead,
 * booking_completed, whatsapp_click, newsletter_subscribed, …) — most are
 * downstream funnel stages or non-lead actions, so counting them all would
 * INFLATE the lead number. We therefore count an explicit, tunable set of
 * lead-intent events. Default: the canonical `generate_lead` (matches GA's
 * "New leads" objective). Override with GA4_MARKETING_LEAD_EVENTS (CSV) without
 * a redeploy if ops marks additional events as leads.
 */
export const GA4_MARKETING_LEAD_EVENTS: string[] = (
  process.env.GA4_MARKETING_LEAD_EVENTS || GA4_LEAD_EVENT
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * Acquisition-channel dimension for the gross-lead lens. `firstUserDefaultChannelGroup`
 * = GA's "First user primary channel group" (the screenshot the CEO sees), so the
 * dashboard reconciles 1:1 with the GA UI's Lead-acquisition report.
 */
export const GA4_LEAD_CHANNEL_DIMENSION =
  process.env.GA4_LEAD_CHANNEL_DIMENSION?.trim() || 'firstUserDefaultChannelGroup';

/**
 * Event names that feed the §D Daily-Funnel live overlay (WhatsApp-click and
 * call-click stages). WhatsApp is a confirmed event on the property; the call
 * event name varies by GTM setup, so it is env-overridable. A stage whose event
 * yields no data across the whole span stays an honest data gap (never a 0).
 */
export const GA4_WHATSAPP_EVENT = process.env.GA4_WHATSAPP_EVENT?.trim() || 'whatsapp_click';
export const GA4_CALL_EVENT = process.env.GA4_CALL_EVENT?.trim() || 'call_click';

// ============================================================================
// Offer landing pages (Website Bookings → "Booking funnel & events by offer").
// Each paid offer drives to its own landing page; clicking "Book appointment"
// opens the widget on /en?offer=<key>… . We attribute traffic by the landing
// page and events by the `offer=<key>` query param, both on GA4's
// landing/page-path-plus-query-string dimensions.
// ============================================================================
export interface OfferDef {
  key: string; // the ?offer=<key> value, e.g. 'glow-up'
  label: string;
  laneCode: string;
  landing: string; // landing page path fragment, e.g. '/glow-up'
}

export const BOOKING_OFFERS: OfferDef[] = [
  { key: 'glow-up', label: 'Glow-Up', laneCode: 'Lane E', landing: '/glow-up' },
  { key: 'sos', label: 'SOS', laneCode: 'Lane D', landing: '/sos' },
  { key: 'scan', label: 'Scan', laneCode: 'Lane J', landing: '/scan' },
];

/** Env-overridable names for the two events whose GTM label can vary. */
const QUALIFIED_LEAD_EVENT = process.env.GA4_QUALIFIED_LEAD_EVENT?.trim() || 'qualify_lead';
const BOOKING_CONFIRMED_EVENT = process.env.GA4_BOOKING_CONFIRMED_EVENT?.trim() || 'booking_completed';

// ============================================================================
// ANALYTICS EVENT DEFINITIONS — authoritative (product team, 2026-07-19).
// This is the CONTRACT for what each on-site metric on the Google Analytics tab
// counts; the UI copy mirrors these definitions. Event NAMES are env-overridable
// so a GTM rename never needs a redeploy. NOTE: the names below are best-guess
// defaults — confirm against the live GA4 event list before relying on the
// Qualified-lead / Value columns (the in-widget funnel was renamed).
//
//   • Widget opened  — booking widget scrolled INTO VIEW (a view, not a click);
//                      fires once per page load.            → booking_widget_viewed
//   • Booking intent — user clicked a booking-flow card in the FIRST widget step
//                      to begin (browsing → intending).      → GA4_BOOKING_INTENT_EVENT
//   • On-site leads  — catch-all lead event at EVERY lead touchpoint, tagged with
//                      where: booking start, personal-info step (name/email/phone),
//                      phone + WhatsApp clicks (top strip + WhatsApp widget), and
//                      footer newsletter sign-up.            → generate_lead
//   • Qualified lead — higher intent; fires at BOTH (a) successful OTP verification
//                      (phone confirmed / contactable) and (b) a completed booking.
//                      Both firings are intentional.         → GA4_QUALIFIED_LEAD_EVENTS
//   • Value (AED)    — lead/conversion events carry the treatment fee as GA4 `value`
//                      (AED) when known, so revenue flows into reporting.
//
// Fuller in-widget funnel (reference): service selected → doctor/slot selected →
// OTP requested → OTP verified → personal info submitted → payment method
// selected → booking completed.
// ============================================================================

/** "Booking intent" = the first booking-flow card click that starts the flow. */
export const GA4_BOOKING_INTENT_EVENT =
  process.env.GA4_BOOKING_INTENT_EVENT?.trim() || 'booking_treatment_selected';

/** OTP-verified event (phone confirmed) — one of the two Qualified-lead signals. */
export const GA4_OTP_VERIFIED_EVENT = process.env.GA4_OTP_VERIFIED_EVENT?.trim() || 'otp_verified';

/** "On-site leads" = the single catch-all lead event fired at every touchpoint. */
export const GA4_ONSITE_LEAD_EVENT = GA4_LEAD_EVENT;

/**
 * "Qualified lead" fires at TWO moments (OTP verified + booking completed) — both
 * intentional — so we count BOTH events. Override with GA4_QUALIFIED_LEAD_EVENTS
 * (CSV) once the live event names are confirmed.
 */
export const GA4_QUALIFIED_LEAD_EVENTS: string[] = (
  process.env.GA4_QUALIFIED_LEAD_EVENTS || [GA4_OTP_VERIFIED_EVENT, BOOKING_CONFIRMED_EVENT].join(',')
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/** The GA4 metric carrying the treatment fee (AED) on lead/conversion events. */
export const GA4_VALUE_METRIC = process.env.GA4_VALUE_METRIC?.trim() || 'eventValue';

/** One stage of the per-offer booking funnel — 'sessions' is the landing-page
 *  traffic; every other stage is a GA4 eventName counted on the offer's pages. */
export interface BookingFunnelStage {
  key: string;
  label: string;
  /** 'sessions' = landing-page sessions; otherwise a GA4 eventName. */
  event: string;
}

export const BOOKING_FUNNEL: BookingFunnelStage[] = [
  { key: 'landing', label: 'Landing-page sessions', event: 'sessions' },
  { key: 'widget', label: 'Booking widget viewed', event: 'booking_widget_viewed' },
  { key: 'visit_type', label: 'Visit type selected', event: 'booking_visit_type_selected' },
  { key: 'treatment', label: 'Treatment selected', event: 'booking_treatment_selected' },
  { key: 'lead', label: 'Lead generated', event: GA4_LEAD_EVENT },
  { key: 'qualified', label: 'Qualified lead', event: QUALIFIED_LEAD_EVENT },
  { key: 'confirmed', label: 'Booking confirmed', event: BOOKING_CONFIRMED_EVENT },
];

/** Every booking-funnel eventName (excludes the synthetic 'sessions' stage). */
export const BOOKING_FUNNEL_EVENTS = BOOKING_FUNNEL.map((s) => s.event).filter((e) => e !== 'sessions');
