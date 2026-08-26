import 'server-only';
import type { sheets_v4 } from 'googleapis';
import type { AdminClient } from '@/lib/supabase/server';
import { ARABY_LEADS_SHEET, ALL_LEAD_INFO_GID } from '@/config/arabyads-leads';
import { ARABY_LANES } from '@/lib/arabyads/report';

/**
 * Lead mirror — every lead that lands in the widget workbook's form tabs
 * ("Offer form Leads", "Leads from Incomplete Bookings", and the other
 * watched form tab) is appended to the Araby workbook's `all_lead_info` tab,
 * in the feedback sheet's own format:
 *
 *   Lead ID | Date & Time | Patient Name | Phone Number | Preferred Clinic |
 *   Interested Lane / Service | Lead Status | Reason for Rejection | Notes
 *
 * We write columns A–F and leave Lead Status / Reason / Notes for the team —
 * this sheet IS the feedback loop, so their columns are never touched.
 * Lead IDs auto-increment as DN-#### continuing from the sheet's own maximum.
 *
 * Sources are the already-synced mirrors (ops_form_entries + raw_dn_leads),
 * not a second sheet read — so this can never disagree with the dashboard.
 * Dedupe is by phone + minute, checked against what the target sheet already
 * holds; re-runs append nothing twice. Requires EDITOR access for the sync's
 * service account on the Araby workbook (Viewer is enough for every read).
 */

export interface LeadMirrorResult {
  ok: boolean;
  appended: number;
  skippedExisting: number;
  error?: string;
}

const s = (v: unknown) => String(v ?? '').trim();
const phone9 = (v: string): string => {
  const d = v.replace(/\D/g, '');
  return d.length >= 9 ? d.slice(-9) : d;
};
const isTest = (name: string, email: string): boolean =>
  /test|sagar|zavis/i.test(name) || /zavis|test/i.test(email);

/** "Lane D - SOS" style label, the format the feedback sheet uses. */
function laneService(laneKey: string | null, fallback: string): string {
  const lane = laneKey ? ARABY_LANES.find((l) => l.key === laneKey) : null;
  return lane ? `${lane.laneCode} - ${lane.label}` : fallback;
}

/** Minute-resolution key so the sheet's own rows and ours line up. */
function minuteKey(iso: string | null, raw: string): string {
  if (iso) return iso.slice(0, 16);
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? raw.slice(0, 16) : new Date(ms).toISOString().slice(0, 16);
}

interface Candidate {
  tsIso: string | null;
  tsDisplay: string;
  name: string;
  phone: string;
  clinic: string;
  service: string;
}

export async function syncLeadMirror(supabase: AdminClient, sheets: sheets_v4.Sheets): Promise<LeadMirrorResult> {
  try {
    // ── Resolve the target tab title by gid (rename-proof). ──
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: ARABY_LEADS_SHEET.spreadsheetId,
      fields: 'sheets(properties(sheetId,title))',
    });
    const tab = (meta.data.sheets ?? []).find((sh) => sh.properties?.sheetId === ALL_LEAD_INFO_GID)?.properties?.title;
    if (!tab) return { ok: false, appended: 0, skippedExisting: 0, error: `all_lead_info tab (gid ${ALL_LEAD_INFO_GID}) not found` };
    const range = `'${tab.replace(/'/g, "''")}'!A1:I5000`;

    // ── What the sheet already holds: seen keys + the running DN-#### id. ──
    const existing = await sheets.spreadsheets.values.get({ spreadsheetId: ARABY_LEADS_SHEET.spreadsheetId, range });
    const grid = (existing.data.values ?? []) as string[][];
    const seen = new Set<string>();
    let maxId = 1000; // sheet starts at DN-1001
    for (const row of grid) {
      const idM = s(row[0]).match(/^DN-(\d+)$/i);
      if (idM) maxId = Math.max(maxId, Number(idM[1]));
      const p = phone9(s(row[3]));
      if (p) seen.add(`${p}|${minuteKey(null, s(row[1]))}`);
    }

    // ── Candidates from the already-synced mirrors. ──
    const [forms, dnLeads] = await Promise.all([
      supabase.from('ops_form_entries').select('submitted_at, name, phone, phone9, email, treatment, source, lane_key, tab_title, data'),
      supabase.from('raw_dn_leads').select('data'),
    ]);

    const candidates: Candidate[] = [];
    for (const r of (forms.data as {
      submitted_at: string | null; name: string | null; phone: string | null; phone9: string | null;
      email: string | null; treatment: string | null; source: string | null; lane_key: string | null;
      tab_title: string | null; data: Record<string, string>;
    }[] | null) ?? []) {
      if (isTest(s(r.name), s(r.email))) continue;
      const clinicKey = Object.keys(r.data ?? {}).find((k) => /clinic/i.test(k));
      candidates.push({
        tsIso: r.submitted_at,
        tsDisplay: r.submitted_at ? r.submitted_at.slice(0, 16).replace('T', ' ') : '',
        name: s(r.name),
        phone: s(r.phone),
        clinic: clinicKey ? s(r.data[clinicKey]) : '',
        service: laneService(r.lane_key, s(r.treatment) || s(r.tab_title)),
      });
    }
    for (const r of (dnLeads.data as { data: Record<string, unknown> }[] | null) ?? []) {
      const d = r.data ?? {};
      const name = s(d['Full Name'] ?? d['Name']);
      const email = s(d['Email']);
      if (isTest(name, email)) continue;
      const rawTs = s(d['Timestamp']);
      const ms = Date.parse(rawTs);
      const iso = Number.isNaN(ms) ? null : new Date(ms).toISOString();
      const service = s(d['Service'] ?? d['Treatment']);
      candidates.push({
        tsIso: iso,
        tsDisplay: iso ? iso.slice(0, 16).replace('T', ' ') : rawTs,
        name,
        phone: s(d['Phone'] ?? d['Phone Number']),
        clinic: s(d['Clinic'] ?? d['Clinic Name']),
        service: laneService(null, service ? `${service} (incomplete booking)` : 'Incomplete booking'),
      });
    }

    // ── Dedupe (against the sheet AND within the batch), oldest first. ──
    const fresh: Candidate[] = [];
    let skippedExisting = 0;
    candidates.sort((a, b) => (a.tsIso ?? '').localeCompare(b.tsIso ?? ''));
    for (const c of candidates) {
      const p = phone9(c.phone);
      if (!p && !c.name) continue;
      const key = `${p}|${minuteKey(c.tsIso, c.tsDisplay)}`;
      if (seen.has(key)) {
        skippedExisting += 1;
        continue;
      }
      seen.add(key);
      fresh.push(c);
    }
    if (fresh.length === 0) return { ok: true, appended: 0, skippedExisting };

    // ── Header if the tab is empty, then append (A–F only; G–I are theirs). ──
    const rows: string[][] = [];
    if (grid.length === 0) {
      rows.push(['Lead ID', 'Date & Time', 'Patient Name', 'Phone Number', 'Preferred Clinic', 'Interested Lane / Service', 'Lead Status', 'Reason for Rejection (If Invalid)', 'Notes / Appointment Date']);
    }
    for (const c of fresh.slice(0, 200)) {
      maxId += 1;
      rows.push([`DN-${maxId}`, c.tsDisplay, c.name, c.phone, c.clinic, c.service, '', '', '']);
    }
    await sheets.spreadsheets.values.append({
      spreadsheetId: ARABY_LEADS_SHEET.spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: rows },
    });
    return { ok: true, appended: Math.min(fresh.length, 200), skippedExisting };
  } catch (err) {
    return { ok: false, appended: 0, skippedExisting: 0, error: (err as Error).message };
  }
}
