import 'server-only';
import { getSheetsClient } from '@/lib/sync/google-auth';
import { ARABY_LEADS_SHEET, ARABY_LANES } from '@/config/arabyads-leads';

/**
 * Reads the manually-maintained Araby Ads lead sheet (the booking-flow export
 * the team keeps up to date with Lead Status + Reason for Rejection) and shapes
 * it into the two tables the ads team asked for: a per-lead detail list, and a
 * lane summary (total / valid / invalid / validation rate / booked).
 *
 * The sheet's real columns are: Timestamp, Full Name, Email, Phone, Title,
 * Lead Status, Reason for Rejection, Condition, Treatment, Type, Date, Time,
 * Clinic Name, Price, Insurance, Additional Details, Doctor, Booking Reference,
 * Payment Method, Source. We map:
 *   - Lead ID          ← Booking Reference
 *   - Date & Time      ← Timestamp (submission)
 *   - Lane / Service   ← parsed from Source (dental_nation_sos/scan/glowup)
 *   - Notes / Appt.    ← the requested appointment Date (+ Time)
 *
 * Definitions (agreed with the client):
 *   - Valid  = accurate, reachable patient data (regardless of whether reception
 *     finally booked it); the team sets Lead Status by hand.
 *   - Validation Rate = Valid / (Valid + Invalid)  — Pending excluded.
 *   - Booked = a Valid lead that carries a real PMS booking reference (BK…).
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
  booked: boolean;
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

/** "07/17/2026, 11:06:52" → epoch ms for sorting (newest first); 0 if unparseable. */
function tsMs(v: string): number {
  const m = v.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return 0;
  return Date.UTC(+m[3], +m[1] - 1, +m[2], +m[4], +m[5], m[6] ? +m[6] : 0);
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
    bookingRef: find(/booking\s*ref/i),
    source: find(/source/i),
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

export async function getArabyLeadStatus(): Promise<LeadStatusReport> {
  const empty = (note: string): LeadStatusReport => ({
    available: false,
    note,
    leads: [],
    lanes: ARABY_LANES.map((l) => emptySummary(l.key, l.label)),
    totals: emptySummary('total', 'Total'),
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
      const laneKey = laneKeyOf(source);
      if (!laneKey) {
        excludedNonAraby += 1;
        continue; // Araby report → only their campaign lanes
      }
      const apptDate = at(row, col.date);
      const notes = apptDate || at(row, col.additional);
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
        booked: normStatus(statusRaw) === 'Valid' && hasBooking(ref),
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
    return { available: true, note: null, leads, lanes, totals };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/permission|not found|403|404/i.test(msg)) {
      return empty('Cannot read the sheet — share it (Viewer) with the service account, and check the sheet id.');
    }
    return empty('Could not read the lead sheet.');
  }
}
