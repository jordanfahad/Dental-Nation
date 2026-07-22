import 'server-only';
import { getSheetsClient } from '@/lib/sync/google-auth';
import { ARABY_LEADS_SHEET, ARABY_LANES } from '@/config/arabyads-leads';

/**
 * Reads the manually-maintained Araby Ads lead-status sheet and shapes it into
 * the two tables the ads team asked for: a per-lead detail list, and a lane
 * summary (total / valid / invalid / validation rate / booked).
 *
 * Definitions (agreed with the client):
 *   - Lead Status normalises to Valid / Invalid / Pending (Invalid wins if the
 *     cell says "invalid"; blank → Pending).
 *   - Validation Rate = Valid / (Valid + Invalid)  — Pending excluded.
 *   - Booked = the "Notes / Appointment Date" cell carries a booking/date signal.
 *   - Lane = parsed from "Interested Lane / Service" as "Lane <letter>".
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
  validationRate: number | null; // valid / (valid+invalid)
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
  if (t.includes('pending')) return 'Pending';
  return 'Pending';
}

/** A "Notes / Appointment Date" cell that carries a booking/date signal. */
function isBooked(notes: string): boolean {
  if (!notes) return false;
  return /\d|book|appt|appointment|scheduled|confirmed|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(notes);
}

function laneKeyOf(service: string): string | null {
  const m = service.match(/lane\s*([a-z])/i);
  return m ? m[1].toUpperCase() : null;
}

/** Match a header cell to a known column by tolerant keyword search. */
function buildColumnMap(header: string[]): Record<string, number> {
  const find = (re: RegExp) => header.findIndex((h) => re.test(h));
  return {
    leadId: find(/lead\s*id/i),
    dateTime: find(/date/i),
    patient: find(/patient|name/i),
    phone: find(/phone|contact|number/i),
    clinic: find(/clinic/i),
    service: find(/lane|service|interested/i),
    status: find(/status/i),
    reason: find(/reason|rejection|invalid/i),
    notes: find(/notes|appointment/i),
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
  const other = emptySummary('other', 'Other / unmatched');
  const totals = emptySummary('total', 'Total');

  const bump = (sum: LaneSummary, r: LeadRow) => {
    sum.total += 1;
    if (r.status === 'Valid') sum.valid += 1;
    else if (r.status === 'Invalid') sum.invalid += 1;
    else sum.pending += 1;
    if (r.booked) sum.booked += 1;
  };

  for (const r of rows) {
    const sum = (r.laneKey && known.get(r.laneKey)) || other;
    bump(sum, r);
    bump(totals, r);
  }

  const finalize = (sum: LaneSummary) => {
    const denom = sum.valid + sum.invalid;
    sum.validationRate = denom > 0 ? sum.valid / denom : null;
    return sum;
  };

  const lanes = [...known.values()].map(finalize);
  if (other.total > 0) lanes.push(finalize(other));
  return { lanes, totals: finalize(totals) };
}

export async function getArabyLeadStatus(): Promise<LeadStatusReport> {
  const empty = (note: string): LeadStatusReport => ({
    available: false,
    note,
    leads: [],
    lanes: ARABY_LANES.map((l) => emptySummary(l.key, l.label)),
    totals: emptySummary('total', 'Total'),
  });

  if (!ARABY_LEADS_SHEET.spreadsheetId) return empty('Lead-status sheet not configured.');

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

    // Find the header row (the one containing "Lead ID"); default to row 0.
    let headerIdx = grid.findIndex((row) => row.some((c) => /lead\s*id/i.test(s(c))));
    if (headerIdx < 0) headerIdx = 0;
    const col = buildColumnMap(grid[headerIdx].map(s));
    if (col.leadId < 0) return empty('Could not find a "Lead ID" column in the sheet.');

    const leads: LeadRow[] = [];
    for (let i = headerIdx + 1; i < grid.length; i++) {
      const row = grid[i];
      const leadId = s(row[col.leadId]);
      if (!leadId) continue; // skips the reason-option rows (no Lead ID)
      const notes = col.notes >= 0 ? s(row[col.notes]) : '';
      const service = col.service >= 0 ? s(row[col.service]) : '';
      leads.push({
        leadId,
        dateTime: col.dateTime >= 0 ? s(row[col.dateTime]) : '',
        patient: col.patient >= 0 ? s(row[col.patient]) : '',
        phone: col.phone >= 0 ? s(row[col.phone]) : '',
        clinic: col.clinic >= 0 ? s(row[col.clinic]) : '',
        service,
        laneKey: laneKeyOf(service),
        status: normStatus(col.status >= 0 ? s(row[col.status]) : ''),
        reason: col.reason >= 0 ? s(row[col.reason]) : '',
        notes,
        booked: isBooked(notes),
      });
    }

    if (leads.length === 0) return empty('No leads recorded in the sheet yet.');

    // Newest first by Date & Time (string compare works for ISO; falls back to sheet order).
    leads.sort((a, b) => (b.dateTime > a.dateTime ? 1 : b.dateTime < a.dateTime ? -1 : 0));
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
