/**
 * Sheet → canonical mapping config (§8).
 *
 * ALL column references live HERE, not scattered through the code. Ingestion
 * reads only via this config (lib/sync). Until Phase 0 introspection is run
 * against the real spreadsheets, the `columns` maps below are HYPOTHESES marked
 * `PHASE0` — replace the header strings with the exact sheet headers once
 * sheet-introspection.md is produced and the mapping is confirmed.
 *
 * Rule: a canonical field whose header is absent in a sheet → that field is
 * null AND an entry is added to the sync's data_gaps. Never throw on a missing
 * column (see lib/sync/normalize.ts).
 */

/** Which canonical (silver) table a source feeds. */
export type CanonicalTarget =
  | 'leads'
  | 'channel_status'
  | 'content_items'
  | 'pac_feedback'
  | 'blockers'
  | 'performance' // aggregated paid-acquisition spend/funnel rows → daily_snapshot engine
  | 'none'; // supporting source, mirrored to bronze only for now

export interface SourceMapping {
  /** Stable key used for bronze table + logging. */
  key: string;
  label: string;
  spreadsheetId: string;
  /** Specific worksheet gid, when known from §5. Phase 0 confirms the tab name. */
  gid?: number;
  /** Tab (worksheet) name. PHASE0: confirm against real tabs. */
  tab?: string;
  headerRow: number;
  target: CanonicalTarget;
  /** Bronze mirror table name (see supabase migration). */
  rawTable: string;
  priority: 'high' | 'medium' | 'low';
  /** canonicalField → exact sheet header text. PHASE0: fill from introspection. */
  columns: Record<string, string>;
  /** Value normalisers for messy human input, keyed by canonical field. */
  transforms?: Record<string, (v: string) => unknown>;
  notes?: string;
}

// ---- reusable transforms ---------------------------------------------------
const truthy = (v: string) => /^(y|yes|true|1|done|✓|x)$/i.test(String(v ?? '').trim());
const lower = (v: string) => String(v ?? '').trim().toLowerCase();
const trimmed = (v: string) => String(v ?? '').trim();
/** Parse a date cell (sheet may give ISO, DD/MM/YYYY, or a serial). Returns
 *  YYYY-MM-DD or null. Defensive — bad dates become null, not crashes. */
const asDate = (v: string): string | null => {
  const s = String(v ?? '').trim();
  if (!s) return null;
  // ISO already
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // DD/MM/YYYY or DD-MM-YYYY
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const parsed = Date.parse(s);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString().slice(0, 10);
};

export const sharedTransforms = { truthy, lower, trimmed, asDate };

export const sheetMapping: Record<string, SourceMapping> = {
  // 1 — Lane-E in-house lead tracker. ~3 real leads only — NOT the funnel engine.
  // Mirrored to bronze only (target:none) so it does not pollute §C / the funnel.
  leadTracker: {
    key: 'leadTracker',
    label: 'Inhouse Lead Tracker',
    spreadsheetId: '1FKg7-uh2kGU5ULK9WL71FCkLLljQ6dZkIDdJreIgiKA',
    tab: 'Sheet1', // PHASE0: confirm
    headerRow: 1,
    target: 'none',
    rawTable: 'raw_lead_tracker',
    priority: 'high',
    columns: {
      // PHASE0: replace right-hand strings with exact headers from introspection.
      clinic: 'Clinic',
      doctor: 'Doctor',
      channel_source: 'Source',
      medium: 'Medium',
      campaign_name: 'Campaign',
      creative_id: 'Creative',
      utm_source: 'UTM Source',
      utm_medium: 'UTM Medium',
      utm_campaign: 'UTM Campaign',
      utm_content: 'UTM Content',
      utm_term: 'UTM Term',
      landing_page_url: 'Landing Page',
      whatsapp_ref: 'WhatsApp Ref',
      call_tracking_no: 'Call Tracking',
      inquiry_date: 'Inquiry Date',
      booking_date: 'Booking Date',
      appointment_date: 'Appointment Date',
      pac_owner: 'PAC Owner',
      booking_status: 'Status',
      is_qualified: 'Qualified?',
      treatment_signal: 'Treatment',
      proof_captured: 'Proof',
      review_captured: 'Review',
    },
    transforms: {
      is_qualified: truthy,
      proof_captured: truthy,
      review_captured: truthy,
      booking_status: lower,
      treatment_signal: lower,
      inquiry_date: asDate,
      booking_date: asDate,
      appointment_date: asDate,
    },
    notes: 'Highest priority — prove the spine end-to-end with this sheet first (build step 2).',
  },

  // 2 — Content / creative performance (§E), PR activity.
  socialPr: {
    key: 'socialPr',
    label: 'DN Social PR Report',
    spreadsheetId: '1WwnWcaY-xwba-x676PP3Hsx3mzFZ0NOH6w19O18fOXM',
    headerRow: 1,
    target: 'none',
    rawTable: 'raw_social_pr',
    priority: 'low',
    columns: {},
    notes: 'Mirrored to bronze only; §E content_items is fed by shootCalendar.',
  },

  // 3 — Google Business Profile / Maps lead capture. Mirrored to bronze only.
  gmbForm: {
    key: 'gmbForm',
    label: 'DN on-site GMB Form',
    spreadsheetId: '1MLfZzAhjzbsHlH5DSBjtnWIyT_Bun2cve9JEuWyGf_8',
    headerRow: 1,
    target: 'none',
    rawTable: 'raw_gmb_form',
    priority: 'low',
    columns: {},
    notes: 'Mirrored to bronze only; not part of the paid-acquisition funnel engine.',
  },

  // 4 — Social PR new shoot calendar → content_items (§E).
  shootCalendar: {
    key: 'shootCalendar',
    label: 'Social PR new shoot calendar',
    spreadsheetId: '1RfhHcHCFb_dhXvwOIpz7JZcgV_9kqX75_w9Gw3JCJDc',
    tab: 'Sheet1',
    headerRow: 1,
    target: 'content_items',
    rawTable: 'raw_shoot_calendar',
    priority: 'low',
    columns: {
      title: 'Content Ideation',
      channel: 'Platform Focus',
      objective: 'Objective',
      content_type: 'Type',
      perf_note: 'Caption & Theme',
      status: 'Stage',
    },
    notes: 'Content pipeline → content_items (§E). Only rows with a non-empty title.',
  },

  // 5 — ALL Task detail (Task Summary - BAU tab) → blockers/owners (§G).
  tasks: {
    key: 'tasks',
    label: 'ALL Task detail',
    spreadsheetId: '1nHTrPZNj7u58Qqom7_8Xry6BIkGLtmU6-5kk7AQslJM',
    gid: 2132716641,
    headerRow: 1,
    target: 'blockers',
    rawTable: 'raw_tasks',
    priority: 'medium',
    columns: {
      blocker: 'Task / Deliverable',
      type: 'Category / Platform',
      impact: 'Priority',
      owner: 'Primary Owner (Stage 1)',
      fix: 'Progress Summary / Next Step',
      due_time: 'Estimated completion date',
      status: 'Auto Status',
      _id: 'ID',
      _finalCompletion: 'Final Completion',
    },
    notes: 'Maps to blockers (§G): task → blocker/owner/fix/due/status. Only non-completed rows.',
  },

  // 6 — RAW_Performance Report — THE paid-acquisition funnel/spend engine →
  // `performance` → daily_snapshot. headerRow 3 (rows 1–2 are a banner).
  rawSocial: {
    key: 'rawSocial',
    label: 'RAW_Performance Report',
    spreadsheetId: '1EajDKlNANuz5jJs8fIfABmEBL-Vqgewx-D3gxh4mM3k',
    gid: 362365447,
    headerRow: 3,
    target: 'performance',
    rawTable: 'raw_raw_social',
    priority: 'high',
    columns: {
      date: 'Date',
      clinic: 'Clinic',
      channelGroup: 'Channel_Group',
      channel: 'Channel',
      campaign: 'Campaign',
      objective: 'Objective',
      spend: 'Spend',
      impressions: 'Impressions',
      clicks: 'Clicks',
      leads: 'Leads',
      bookings: 'Bookings',
      showups: 'Show-Ups',
      treatments: 'Treatments',
      revenue: 'Revenue',
    },
    notes:
      'Aggregated paid-acquisition rows (spend/impressions/clicks/leads). THE funnel + spend engine. Bookings/Show-Ups/Treatments are empty → data gaps, not zeros.',
  },

  // 7 — Personal performance log; mirrored to bronze only.
  performance: {
    key: 'performance',
    label: 'DN My performance report',
    spreadsheetId: '1XpowG4ezqQXlu7NXDiUsCR7uWKRFAj5I',
    gid: 748194884,
    headerRow: 1,
    target: 'none',
    rawTable: 'raw_performance',
    priority: 'low',
    columns: {},
    notes: 'Mirrored to bronze only; the funnel/spend engine is RAW_Performance (rawSocial).',
  },

  // 8 — Checklist. Mirrored to bronze only — §B channel_status derived from
  // the paid channels present in RAW_Performance.
  amcChecklist: {
    key: 'amcChecklist',
    label: 'AMC Checklist',
    spreadsheetId: '1wD_L4FqqrP8wmJAk7jBUScjq1meULDYg',
    gid: 983327953,
    headerRow: 1,
    target: 'none',
    rawTable: 'raw_amc_checklist',
    priority: 'low',
    columns: {},
    notes: 'Mirrored to bronze only; §B derived from RAW_Performance paid channels.',
  },

  // 9 + 10 — Zavis / SagR website lead sheet — test data. Bronze only.
  zavis: {
    key: 'zavis',
    label: 'Zavis / SagR website lead sheet',
    spreadsheetId: '1CtfSiGONthczH6YVOLfAZvOdmFfGP26uVBZJoYjxRQQ',
    gid: 119899925,
    headerRow: 1,
    target: 'none',
    rawTable: 'raw_zavis',
    priority: 'low',
    columns: {},
    notes: 'Test data — mirrored to bronze only; not used for the funnel.',
  },

  // 11 — Caption / copy library (supporting content, §E).
  captions: {
    key: 'captions',
    label: 'Lane Captions',
    spreadsheetId: '1CZk7SXBCznfl7kZVMPgpKZ_mZ7CpYVuatnHdZweNDHw',
    headerRow: 1,
    target: 'none',
    rawTable: 'raw_captions',
    priority: 'low',
    columns: {}, // PHASE0
    notes: 'Caption/copy library; supporting content for §E.',
  },
};

export const allSources = Object.values(sheetMapping);
