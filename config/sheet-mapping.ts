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
  // 1 — CORE leads fact table. Highest priority. Drives funnel (§D) + §C.
  leadTracker: {
    key: 'leadTracker',
    label: 'Inhouse Lead Tracker',
    spreadsheetId: '1FKg7-uh2kGU5ULK9WL71FCkLLljQ6dZkIDdJreIgiKA',
    tab: 'Sheet1', // PHASE0: confirm
    headerRow: 1,
    target: 'leads',
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
    target: 'content_items',
    rawTable: 'raw_social_pr',
    priority: 'medium',
    columns: {}, // PHASE0
    notes: 'Maps to content_items (§E). Confirm content_type/objective columns in Phase 0.',
  },

  // 3 — Google Business Profile / Maps lead capture: a channel + a lead source.
  gmbForm: {
    key: 'gmbForm',
    label: 'DN on-site GMB Form',
    spreadsheetId: '1MLfZzAhjzbsHlH5DSBjtnWIyT_Bun2cve9JEuWyGf_8',
    headerRow: 1,
    target: 'leads',
    rawTable: 'raw_gmb_form',
    priority: 'high',
    columns: {}, // PHASE0 — likely a lead source feeding `leads` with channel_source = Maps
    notes: 'Treat as both a channel (GBP/Maps) and a lead source feeding `leads`.',
  },

  // 4 — Content pipeline / shoot schedule (supporting, §E status).
  shootCalendar: {
    key: 'shootCalendar',
    label: 'Social PR new shoot calendar',
    spreadsheetId: '1RfhHcHCFb_dhXvwOIpz7JZcgV_9kqX75_w9Gw3JCJDc',
    headerRow: 1,
    target: 'content_items',
    rawTable: 'raw_shoot_calendar',
    priority: 'low',
    columns: {}, // PHASE0
    notes: 'Content pipeline status; supports §E.',
  },

  // 5 — Task & ownership tracking → blockers/owners (§G).
  tasks: {
    key: 'tasks',
    label: 'ALL Task detail',
    spreadsheetId: '1nHTrPZNj7u58Qqom7_8Xry6BIkGLtmU6-5kk7AQslJM',
    gid: 1243210343,
    headerRow: 1,
    target: 'blockers',
    rawTable: 'raw_tasks',
    priority: 'medium',
    columns: {}, // PHASE0
    notes: 'Maps to blockers (§G): task → blocker/owner/fix/due/status.',
  },

  // 6 — Raw social metrics (reach/impressions/engagement) for §B/§D top-funnel.
  rawSocial: {
    key: 'rawSocial',
    label: 'Social PR - RAW Report',
    spreadsheetId: '1EajDKlNANuz5jJs8fIfABmEBL-Vqgewx-D3gxh4mM3k',
    headerRow: 1,
    target: 'none',
    rawTable: 'raw_raw_social',
    priority: 'medium',
    columns: {}, // PHASE0 — source of reach/impressions/clicks (funnel top stages)
    notes: 'Top-of-funnel volume (reach/impressions/clicks). Until mapped, those funnel stages are data gaps.',
  },

  // 7 — Personal performance log; may contain spend / activity.
  performance: {
    key: 'performance',
    label: 'DN My performance report',
    spreadsheetId: '1XpowG4ezqQXlu7NXDiUsCR7uWKRFAj5I',
    gid: 748194884,
    headerRow: 1,
    target: 'none',
    rawTable: 'raw_performance',
    priority: 'low',
    columns: {}, // PHASE0 — CHECK for a spend column to unlock cost-per-inquiry/booking
    notes: 'If a spend column exists here, map it to unlock cost_per_inquiry / cost_per_booking.',
  },

  // 8 — Checklist → candidate source for channel-activation status (§B).
  amcChecklist: {
    key: 'amcChecklist',
    label: 'AMC Checklist',
    spreadsheetId: '1wD_L4FqqrP8wmJAk7jBUScjq1meULDYg',
    gid: 983327953,
    headerRow: 1,
    target: 'channel_status',
    rawTable: 'raw_amc_checklist',
    priority: 'medium',
    columns: {}, // PHASE0 — maps to channel_status (live/content/cta/destination/tracking)
    notes: 'Candidate source for §B channel activation status.',
  },

  // 9 + 10 — Zavis / SagR website lead sheet (SAME spreadsheet + gid → one source).
  zavis: {
    key: 'zavis',
    label: 'Zavis / SagR website lead sheet',
    spreadsheetId: '1CtfSiGONthczH6YVOLfAZvOdmFfGP26uVBZJoYjxRQQ',
    gid: 119899925,
    headerRow: 1,
    target: 'leads',
    rawTable: 'raw_zavis',
    priority: 'high',
    columns: {}, // PHASE0 — additional lead source feeding `leads`
    notes:
      'Sources #9 and #10 are the same spreadsheet+gid — treated as ONE source unless Phase 0 reveals distinct tabs.',
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
