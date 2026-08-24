import 'server-only';
import type { sheets_v4 } from 'googleapis';
import type { AdminClient } from '@/lib/supabase/server';
import { OPS_WATCHED_TABS } from '@/config/ops';
import { sheetMapping } from '@/config/sheet-mapping';
import { ARABY_LANES, parseArabySource } from '@/lib/arabyads/report';

/**
 * Watched-form ingestion — mirrors the rows of every OPS_WATCHED_TABS tab into
 * lane_e.ops_form_entries, so Clinical Operations can WORK the entries (and
 * the ArabyAds views can count them per lane), not just be emailed about them.
 *
 * Header-agnostic like the tab alerts: row 1 is the header, the fields the UI
 * needs (name / phone / email / treatment / source / submitted) are extracted
 * by header pattern, and the FULL label→value row is kept in `data` so nothing
 * typed into a form is lost when a tab adds a column.
 *
 * No duplicates, by construction:
 *   · entry_id = gid | phone9 (or name) | submitted (or row index) — upserted,
 *     so re-syncing the same sheet rows can never insert twice, and the same
 *     person double-submitting the same form at the same time collapses.
 *   · tabs that already flow into the dashboard via other paths (the widget's
 *     Bookings / Cancellations / Leads tabs) are skipped entirely here, so an
 *     entry can never arrive through two pipelines.
 *
 * ArabyAds mapping: the row's Source/Campaign cell goes through the SAME
 * parseArabySource() the bookings + drop-off panels use; when a form has no
 * source column, the tab title is matched against the lane names — so a lane
 * tag here always means what it means everywhere else on the dashboard.
 */

export interface OpsFormsSyncResult {
  ok: boolean;
  tabs: number;
  fetched: number;
  stored: number;
  notes: string[];
  error?: string;
}

const s = (v: unknown) => String(v ?? '').trim();
const phone9 = (v: string): string => {
  const d = v.replace(/\D/g, '');
  return d.length >= 9 ? d.slice(-9) : '';
};

function isTestRow(header: string[], row: string[]): boolean {
  for (let i = 0; i < header.length; i++) {
    const h = header[i] ?? '';
    const v = s(row[i]);
    if (!v) continue;
    if (/name/i.test(h) && /test|sagar|zavis/i.test(v)) return true;
    if (/email/i.test(h) && /zavis|test/i.test(v)) return true;
  }
  return false;
}

/** First non-empty cell whose header matches, in header order. */
function byRe(header: string[], row: string[], re: RegExp, not?: RegExp): string {
  for (let i = 0; i < header.length; i++) {
    const h = header[i] ?? '';
    if (!re.test(h) || (not && not.test(h))) continue;
    const v = s(row[i]);
    if (v) return v;
  }
  return '';
}

function parseWhen(raw: string): string | null {
  if (!raw) return null;
  const ms = Date.parse(raw);
  if (!Number.isNaN(ms)) return new Date(ms).toISOString();
  // DD/MM/YYYY [HH:MM[:SS]] — common sheet locale format Date.parse misreads.
  const m = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  const [, d, mo, y, hh, mm, ss] = m;
  const year = y.length === 2 ? `20${y}` : y;
  const iso = `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T${(hh ?? '0').padStart(2, '0')}:${(mm ?? '00').padStart(2, '0')}:${(ss ?? '00').padStart(2, '0')}Z`;
  const ms2 = Date.parse(iso);
  return Number.isNaN(ms2) ? null : new Date(ms2).toISOString();
}

/** Lane from the row's source (canonical parser) or, failing that, the tab title. */
function laneKeyOf(source: string, tabTitle: string): string | null {
  const parsed = parseArabySource(source);
  if (parsed?.lane) return parsed.lane.key;
  const hay = `${source} ${tabTitle}`.toLowerCase();
  if (!/araby|glow|sos|scan/i.test(hay)) return null;
  for (const l of ARABY_LANES) {
    if (hay.includes(l.key) || hay.includes(l.label.toLowerCase())) return l.key;
  }
  return null;
}

export async function syncOpsForms(supabase: AdminClient, sheets: sheets_v4.Sheets): Promise<OpsFormsSyncResult> {
  if (OPS_WATCHED_TABS.length === 0) return { ok: true, tabs: 0, fetched: 0, stored: 0, notes: ['no watched tabs'] };

  // Tabs already ingested by other pipelines — never a second copy from here.
  const covered = new Set(
    [...(sheetMapping.bookingWidget?.tabs ?? []), ...(sheetMapping.bookingLeads?.tabs ?? [])].map((t) => t.toLowerCase()),
  );

  const notes: string[] = [];
  let fetched = 0;
  let stored = 0;
  let tabs = 0;

  try {
    const bySpreadsheet = new Map<string, Map<number, string>>();
    for (const w of OPS_WATCHED_TABS) {
      if (bySpreadsheet.has(w.spreadsheetId)) continue;
      const meta = await sheets.spreadsheets.get({
        spreadsheetId: w.spreadsheetId,
        fields: 'sheets(properties(sheetId,title))',
      });
      const map = new Map<number, string>();
      for (const sh of meta.data.sheets ?? []) {
        const p = sh.properties;
        if (p?.sheetId != null && p.title) map.set(p.sheetId, p.title);
      }
      bySpreadsheet.set(w.spreadsheetId, map);
    }

    for (const w of OPS_WATCHED_TABS) {
      const title = bySpreadsheet.get(w.spreadsheetId)?.get(w.gid);
      if (!title) {
        notes.push(`gid ${w.gid}: tab not found`);
        continue;
      }
      if (covered.has(title.toLowerCase())) {
        notes.push(`"${title}": already ingested by the widget pipeline — skipped`);
        continue;
      }
      tabs += 1;

      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: w.spreadsheetId,
        range: `'${title.replace(/'/g, "''")}'!A1:Z5000`,
      });
      const grid = (res.data.values ?? []) as string[][];
      const header = (grid[0] ?? []).map(s);
      if (header.length === 0) {
        notes.push(`"${title}": empty tab`);
        continue;
      }

      const rows: Record<string, unknown>[] = [];
      for (let i = 1; i < grid.length; i++) {
        const row = (grid[i] ?? []).map(s);
        if (!row.some(Boolean) || isTestRow(header, row)) continue;
        fetched += 1;

        const name = byRe(header, row, /name/i, /clinic|doctor|campaign|page/i);
        const phone = byRe(header, row, /phone|mobile|contact/i, /email/i);
        const email = byRe(header, row, /e-?mail/i);
        const treatment = byRe(header, row, /treatment|service|condition|interest|procedure/i);
        const source = byRe(header, row, /source|campaign|utm|referr/i);
        const submitted = parseWhen(byRe(header, row, /timestamp|submitted|created|^date/i));
        const p9 = phone9(phone);

        const data: Record<string, string> = {};
        for (let c = 0; c < Math.max(header.length, row.length); c++) {
          const label = s(header[c]) || `Column ${c + 1}`;
          const v = s(row[c]);
          if (v) data[label] = v;
        }

        rows.push({
          entry_id: `${w.gid}|${p9 || name.toLowerCase() || `row${i}`}|${submitted ?? `row${i}`}`,
          gid: w.gid,
          tab_title: title,
          row_index: i,
          submitted_at: submitted,
          name: name || null,
          phone: phone || null,
          phone9: p9 || null,
          email: email || null,
          treatment: treatment || null,
          source: source || null,
          lane_key: laneKeyOf(source, title),
          data,
          synced_at: new Date().toISOString(),
        });
      }

      // Same entry_id appearing twice in one batch (e.g. an identical re-submit
      // in the same tab) collapses to the last occurrence before the upsert.
      const unique = [...new Map(rows.map((r) => [String(r.entry_id), r])).values()];
      for (let i = 0; i < unique.length; i += 500) {
        const { error } = await supabase.from('ops_form_entries').upsert(unique.slice(i, i + 500), { onConflict: 'entry_id' });
        if (error) return { ok: false, tabs, fetched, stored, notes, error: `upsert failed: ${error.message}` };
      }
      stored += unique.length;
    }
  } catch (err) {
    return { ok: false, tabs, fetched, stored, notes, error: (err as Error).message };
  }

  return { ok: true, tabs, fetched, stored, notes };
}
