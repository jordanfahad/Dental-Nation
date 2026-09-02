import 'server-only';
import { unstable_cache } from 'next/cache';
import { getSheetsClient } from '@/lib/sync/google-auth';
import { ARABY_LEADS_SHEET, ARABY_LANES } from '@/config/arabyads-leads';

/**
 * Reads the manually-maintained Araby Ads lead sheet (the booking-flow export
 * the team keeps up to date with Lead Status + Reason for Rejection) and shapes
 * it into the two tables the ads team asked for: a per-lead detail list, and a
 * lane summary (total / valid / invalid / validation rate / booked).
 *
 * The sheet's real columns (revised 26 Aug 2026): Timestamp, Full Name, Email,
 * Phone Number, Title, Lead Status, "Reason for Rejection (If Invalid) - FU 1",
 * FU 1 Remarks, FU 2 Remarks, FU 3 Remarks, Treatment, Type of Treatment, Date,
 * Time, Clinic Name, Price, Insurance Number, Additional Details, Doctor Name,
 * Booking Reference, Condition, Payment Method, Source. We map:
 *   - Lead ID          ← Booking Reference
 *   - Date & Time      ← Timestamp (submission)
 *   - Lane / Service   ← parsed from Source ("arabyads_sos" new style, or the
 *                        legacy "ArabyAds / dental_nation_sos (PID:…)")
 *   - Notes / Appt.    ← the requested appointment Date (+ Time)
 *   - Follow-ups       ← FU 1 / FU 2 / FU 3 Remarks (the call-centre's 3-touch
 *                        follow-up trail; the Reason column records the verdict
 *                        from the FIRST follow-up)
 *
 * Definitions (agreed with the client):
 *   - Valid  = accurate, reachable patient data (regardless of whether reception
 *     finally booked it); the team sets Lead Status by hand.
 *   - Pending = still in the follow-up cycle (e.g. "Unresponsive" after FU 1) —
 *     the Reason column is filled for these too, it is NOT an invalid verdict yet.
 *   - Validation Rate = Valid / (Valid + Invalid)  — Pending excluded.
 *   - Booked = a Valid lead that carries a real PMS booking reference (BK…) or a
 *     "booked" note in Notes / FU remarks.
 *   - Test leads (status "Test Lead", or test/zavis/sagar/owner emails) excluded.
 *   - Only ArabyAds-sourced leads (a recognised lane) are included.
 *
 * Never throws — a missing / unshared sheet degrades to available:false + note.
 */

export type LeadStatus = 'Valid' | 'Invalid' | 'Pending';

export interface LeadRow {
  leadId: string;
  dateTime: string;
  patient: string;
  phone: string;
  clinic: string;
  service: string;
  laneKey: string | null;
  status: LeadStatus;
  reason: string;
  notes: string;
  /** FU 1 / FU 2 / FU 3 Remarks — the call-centre's follow-up trail, in order. */
  followUps: [string, string, string];
  booked: boolean;
}

/** One row of the rejection / follow-up reason breakdown. */
export interface ReasonCount {
  reason: string;
  invalid: number;
  pending: number;
  total: number;
}

export interface LaneSummary {
  key: string;
  label: string;
  total: number;
  valid: number;
  invalid: number;
  pending: number;
  validationRate: number | null;
  booked: number;
}

export interface LeadStatusReport {
  available: boolean;
  note: string | null;
  leads: LeadRow[];
  lanes: LaneSummary[];
  totals: LaneSummary;
  /** Rows scanned vs shown, so "sheet has 111, report shows N" explains
   *  itself: excluded = test entries + rows with no campaign source/offer. */
  excluded: { test: number; noCampaign: number };
  /** Why leads are rejected / stuck — counts by the sheet's reason taxonomy
   *  (Wrong Contact, Unresponsive, International Number, Duplicate Lead,
   *  Out of Target Location, …), split by whether the verdict is final
   *  (Invalid) or the lead is still in follow-up (Pending). */
  reasons: ReasonCount[];
}

const s = (v: unknown): string => String(v ?? '').trim();

function normStatus(raw: string): LeadStatus {
  const t = raw.toLowerCase();
  if (t.includes('invalid')) return 'Invalid'; // check first — "invalid" contains "valid"
  if (t.includes('valid')) return 'Valid';
  return 'Pending'; // pending / blank / anything else awaiting review
}

function isTestLead(name: string, email: string, status: string): boolean {
  if (/test/i.test(status)) return true; // "Test Lead"
  const hay = `${name} ${email}`.toLowerCase();
  if (/test|zavis|sagar/.test(hay)) return true;
  if (email.toLowerCase() === 'jordan.fahad@gmail.com') return true;
  return false;
}

function laneKeyOf(source: string): string | null {
  const t = source.toLowerCase();
  for (const l of ARABY_LANES) if (t.includes(l.match)) return l.key;
  return null;
}
const laneLabel = (key: string | null): string => ARABY_LANES.find((l) => l.key === key)?.label ?? '—';

/** A real PMS booking reference (BK…) — distinguishes a genuine booking. */
const hasBooking = (ref: string): boolean => /^bk/i.test(ref);

/** "07/17/2026, 11:06:52" OR "2026-08-21 21:07" (both appear in the revised
 *  sheet) → epoch ms for sorting (newest first); 0 if unparseable. */
function tsMs(v: string): number {
  const m = v.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) return Date.UTC(+m[3], +m[1] - 1, +m[2], +m[4], +m[5], m[6] ? +m[6] : 0);
  const iso = v.match(/(\d{4})-(\d{2})-(\d{2})[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (iso) return Date.UTC(+iso[1], +iso[2] - 1, +iso[3], +iso[4], +iso[5], iso[6] ? +iso[6] : 0);
  return 0;
}

function buildColumnMap(header: string[]): Record<string, number> {
  const find = (re: RegExp) => header.findIndex((h) => re.test(h));
  return {
    timestamp: find(/timestamp|date\s*&|date\s*and\s*time/i),
    fullName: find(/full\s*name/i) >= 0 ? find(/full\s*name/i) : find(/patient/i),
    email: find(/email/i),
    phone: find(/phone/i),
    status: find(/lead\s*status/i) >= 0 ? find(/lead\s*status/i) : find(/\bstatus\b/i),
    reason: find(/reason|rejection/i),
    date: find(/^date$/i),
    time: find(/^time$/i),
    clinic: find(/clinic/i),
    additional: find(/additional/i),
    // Revised sheet (Aug 2026): "Notes / Appointment Date" replaces the old
    // Date/Additional pair, "Lead ID" (DN-####) replaces Booking Reference,
    // and "Interested Lane / Service" replaces the raw Source string.
    notes: find(/notes|appointment\s*date/i),
    bookingRef: find(/booking\s*ref|lead\s*id/i),
    source: find(/interested|lane\s*\/?\s*service/i) >= 0 ? find(/interested|lane\s*\/?\s*service/i) : find(/source/i),
    // The offer name ("DN SOS – Same-Day Emergency", "The DN Scan – AED 499")
    // carries the lane too — the fallback when the call-centre adds a row by
    // hand and leaves Source blank (found live 2 Sep: Valid rows vanishing).
    treatment: find(/^treatment$/i) >= 0 ? find(/^treatment$/i) : find(/treatment/i),
    // Revised feedback sheet (26 Aug 2026): the call-centre's 3-touch trail.
    // /fu\s*1\s*remarks/ deliberately requires "remarks" so it can never grab
    // "Reason for Rejection (If Invalid) - FU 1", which also contains "FU 1".
    fu1: find(/fu\s*1\s*remarks/i),
    fu2: find(/fu\s*2\s*remarks/i),
    fu3: find(/fu\s*3\s*remarks/i),
  };
}

async function resolveTabTitle(sheets: ReturnType<typeof getSheetsClient>, spreadsheetId: string): Promise<string | null> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets(properties(sheetId,title))' });
  const tabs = (meta.data.sheets ?? []).map((sh) => sh.properties).filter(Boolean) as { sheetId?: number; title?: string }[];
  if (!tabs.length) return null;
  if (ARABY_LEADS_SHEET.sheetTab) {
    const byTitle = tabs.find((t) => (t.title ?? '').toLowerCase() === ARABY_LEADS_SHEET.sheetTab.toLowerCase());
    if (byTitle?.title) return byTitle.title;
  }
  const byGid = tabs.find((t) => t.sheetId === ARABY_LEADS_SHEET.sheetGid);
  if (byGid?.title) return byGid.title;
  return tabs[0].title ?? null;
}

const emptySummary = (key: string, label: string): LaneSummary => ({
  key,
  label,
  total: 0,
  valid: 0,
  invalid: 0,
  pending: 0,
  validationRate: null,
  booked: 0,
});

/** The sheet's reason taxonomy varies in casing/spelling ("international
 *  number" vs "International Number") — fold to a canonical display label. */
function reasonBreakdown(rows: LeadRow[]): ReasonCount[] {
  const byKey = new Map<string, ReasonCount>();
  for (const r of rows) {
    if (!r.reason || r.status === 'Valid') continue;
    const key = r.reason.toLowerCase().replace(/\s+/g, ' ');
    let entry = byKey.get(key);
    if (!entry) {
      entry = { reason: r.reason, invalid: 0, pending: 0, total: 0 };
      byKey.set(key, entry);
    }
    if (r.status === 'Invalid') entry.invalid += 1;
    else entry.pending += 1;
    entry.total += 1;
  }
  return [...byKey.values()].sort((a, b) => b.total - a.total);
}

function summarise(rows: LeadRow[]): { lanes: LaneSummary[]; totals: LaneSummary } {
  const known = new Map(ARABY_LANES.map((l) => [l.key, emptySummary(l.key, l.label)]));
  const totals = emptySummary('total', 'Total');

  const bump = (sum: LaneSummary, r: LeadRow) => {
    sum.total += 1;
    if (r.status === 'Valid') sum.valid += 1;
    else if (r.status === 'Invalid') sum.invalid += 1;
    else sum.pending += 1;
    if (r.booked) sum.booked += 1;
  };
  for (const r of rows) {
    const sum = r.laneKey ? known.get(r.laneKey) : undefined;
    if (sum) bump(sum, r);
    bump(totals, r);
  }
  const finalize = (sum: LaneSummary) => {
    const denom = sum.valid + sum.invalid;
    sum.validationRate = denom > 0 ? sum.valid / denom : null;
    return sum;
  };
  return { lanes: [...known.values()].map(finalize), totals: finalize(totals) };
}

/**
 * Cached for 5 minutes. This does two live Google Sheets round-trips and is
 * rendered by the Board Report, the internal ArabyAds tab AND the external
 * report — all of which are dynamic, so before caching every single page view
 * paid for the sheet read again. The sheet is maintained by hand, so five
 * minutes of staleness costs nothing.
 */
export async function getArabyLeadStatus(): Promise<LeadStatusReport> {
  return loadLeadStatus();
}

const loadLeadStatus = unstable_cache(
  async (): Promise<LeadStatusReport> => {
  const empty = (note: string): LeadStatusReport => ({
    available: false,
    note,
    leads: [],
    lanes: ARABY_LANES.map((l) => emptySummary(l.key, l.label)),
    totals: emptySummary('total', 'Total'),
    excluded: { test: 0, noCampaign: 0 },
    reasons: [],
  });

  if (!ARABY_LEADS_SHEET.spreadsheetId) return empty('Lead sheet not configured.');

  let sheets: ReturnType<typeof getSheetsClient>;
  try {
    sheets = getSheetsClient();
  } catch {
    return empty('Google service account not configured.');
  }

  try {
    const title = await resolveTabTitle(sheets, ARABY_LEADS_SHEET.spreadsheetId);
    if (!title) return empty('No tabs found in the lead sheet.');
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: ARABY_LEADS_SHEET.spreadsheetId,
      range: `'${title.replace(/'/g, "''")}'!A1:Z5000`,
    });
    const grid = (res.data.values ?? []) as string[][];
    if (grid.length < 2) return empty('The lead sheet has no rows yet.');

    let headerIdx = grid.findIndex((row) => row.some((c) => /lead\s*status/i.test(s(c))));
    if (headerIdx < 0) headerIdx = 0;
    const col = buildColumnMap(grid[headerIdx].map(s));
    if (col.source < 0 && col.status < 0) return empty('Could not find the Lead Status / Source columns in the sheet.');

    const at = (row: string[], i: number) => (i >= 0 ? s(row[i]) : '');
    const leads: LeadRow[] = [];
    let excludedTest = 0;
    let excludedNonAraby = 0;

    for (let i = headerIdx + 1; i < grid.length; i++) {
      const row = grid[i];
      const name = at(row, col.fullName);
      const email = at(row, col.email);
      const statusRaw = at(row, col.status);
      // A row is "real" if it has a name or a booking ref; skip fully blank rows.
      const ref = at(row, col.bookingRef);
      if (!name && !ref && !statusRaw) continue;
      if (isTestLead(name, email, statusRaw)) {
        excludedTest += 1;
        continue;
      }
      const source = at(row, col.source);
      const laneKey = laneKeyOf(source) ?? laneKeyOf(at(row, col.treatment));
      if (!laneKey) {
        excludedNonAraby += 1;
        continue; // Araby report → only rows tied to a campaign lane
      }
      const apptDate = at(row, col.date);
      const notes = at(row, col.notes) || apptDate || at(row, col.additional);
      const followUps: [string, string, string] = [at(row, col.fu1), at(row, col.fu2), at(row, col.fu3)];
      leads.push({
        leadId: ref || '—',
        dateTime: at(row, col.timestamp),
        patient: name || '—',
        phone: at(row, col.phone),
        clinic: at(row, col.clinic),
        service: laneLabel(laneKey),
        laneKey,
        status: normStatus(statusRaw),
        reason: at(row, col.reason),
        notes,
        followUps,
        // "Booked" also reads the Notes + FU-remark columns ("Booked for
        // July 22") — the revised sheet's Lead ID (DN-####) is not a PMS ref.
        booked:
          normStatus(statusRaw) === 'Valid' &&
          (hasBooking(ref) || /booked/i.test(`${notes} ${followUps.join(' ')}`)),
      });
    }

    if (leads.length === 0) {
      return empty(
        excludedNonAraby + excludedTest > 0
          ? `No ArabyAds leads to show yet (${excludedTest} test, ${excludedNonAraby} non-ArabyAds rows skipped).`
          : 'No leads recorded in the sheet yet.',
      );
    }

    leads.sort((a, b) => tsMs(b.dateTime) - tsMs(a.dateTime));
    const { lanes, totals } = summarise(leads);
    return {
      available: true,
      note: null,
      leads,
      lanes,
      totals,
      excluded: { test: excludedTest, noCampaign: excludedNonAraby },
      reasons: reasonBreakdown(leads),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/permission|not found|403|404/i.test(msg)) {
      return empty('Cannot read the sheet — share it (Viewer) with the service account, and check the sheet id.');
    }
    return empty('Could not read the lead sheet.');
  }
  },
  // v3: lane from Treatment when Source is blank; exclusion counts surfaced.
  ['araby-lead-status-v3'],
  { revalidate: 300 },
);

/** The team's hand-set verdict for one enquiry, keyed by phone. */
export interface SheetVerdict {
  /** Marked "Test Lead" in the sheet (or a known test/owner identity). */
  test: boolean;
  status: LeadStatus;
  /** "Wrong Contact", "Not Interested", … — blank when not filled in. */
  reason: string;
  /** The FU 1–3 remark trail, joined ("FU1: Called N/A · FU2: …"); blank when
   *  no follow-up has been recorded. Feeds the mirror's Notes column. */
  followUp: string;
}

/**
 * The same feedback sheet as getArabyLeadStatus(), reduced to a phone → verdict
 * lookup, keyed by the LAST 9 DIGITS (the phone is written inconsistently
 * across systems: with/without 971, spaces, leading zero).
 *
 * Deliberately does NOT apply the ArabyAds lane filter that getArabyLeadStatus()
 * uses. The team marks up every enquiry in this sheet, including ones with a
 * blank Source that belong to no campaign lane — and their "Test Lead" verdict
 * is still authoritative for those. That filter is exactly why a row marked
 * Test Lead here could still surface as a real lead to reception.
 *
 * Never throws: an unreadable sheet returns an empty map, and callers simply
 * fall back to showing everything rather than hiding a real patient.
 */
export async function getLeadVerdictsByPhone(): Promise<Map<string, SheetVerdict>> {
  return new Map(await loadVerdictEntries());
}

/**
 * Cached inner read. Returns ENTRIES, not a Map, on purpose: unstable_cache
 * round-trips its value through the Next.js data cache as JSON, and a Map
 * serialises to `{}` — caching the Map directly would quietly hand back an empty
 * lookup and every test lead would reappear in the worklist.
 *
 * Reception's screen renders often and the team edits this sheet by hand, so a
 * 5-minute window keeps the page quick without making their edits feel stuck.
 */
const loadVerdictEntries = unstable_cache(
  async (): Promise<[string, SheetVerdict][]> => {
    const out = new Map<string, SheetVerdict>();
    if (!ARABY_LEADS_SHEET.spreadsheetId) return [];

    let sheets: ReturnType<typeof getSheetsClient>;
    try {
      sheets = getSheetsClient();
    } catch {
      return [];
    }

    try {
      const title = await resolveTabTitle(sheets, ARABY_LEADS_SHEET.spreadsheetId);
      if (!title) return [];
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: ARABY_LEADS_SHEET.spreadsheetId,
        range: `'${title.replace(/'/g, "''")}'!A1:Z5000`,
      });
      const grid = (res.data.values ?? []) as string[][];
      if (grid.length < 2) return [];

      let headerIdx = grid.findIndex((row) => row.some((c) => /lead\s*status/i.test(s(c))));
      if (headerIdx < 0) headerIdx = 0;
      const col = buildColumnMap(grid[headerIdx].map(s));
      if (col.phone < 0) return []; // no phone column → nothing we can match on

      const at = (row: string[], i: number) => (i >= 0 ? s(row[i]) : '');
      for (let i = headerIdx + 1; i < grid.length; i++) {
        const row = grid[i];
        const digits = at(row, col.phone).replace(/\D/g, '');
        if (digits.length < 9) continue;
        const statusRaw = at(row, col.status);
        // Later rows win: the sheet is append-ordered, so the newest review of a
        // repeat caller is the one that counts.
        const fu = [at(row, col.fu1), at(row, col.fu2), at(row, col.fu3)]
          .map((v, n) => (v ? `FU${n + 1}: ${v}` : ''))
          .filter(Boolean)
          .join(' · ');
        out.set(digits.slice(-9), {
          test: isTestLead(at(row, col.fullName), at(row, col.email), statusRaw),
          status: normStatus(statusRaw),
          reason: at(row, col.reason),
          followUp: fu,
        });
      }
      return [...out.entries()];
    } catch {
      return [];
    }
  },
  // v2: verdicts carry the FU 1–3 trail for the mirror's Notes column.
  ['araby-lead-verdicts-v2'],
  { revalidate: 300 },
);
