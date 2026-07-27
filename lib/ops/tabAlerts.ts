import 'server-only';
import type { sheets_v4 } from 'googleapis';
import type { AdminClient } from '@/lib/supabase/server';
import { sendEmail, emailConfigured } from '@/lib/notify/email';
import { OPS_ALERT_EMAILS, OPS_ALERT_FROM, OPS_ALERT_MAX_PER_RUN, OPS_WATCHED_TABS } from '@/config/ops';
import { sheetMapping } from '@/config/sheet-mapping';

/**
 * Watched-tab alerts: on each sync, any NEW row appearing in one of the
 * OPS_WATCHED_TABS sheet tabs emails its filled-in fields to the ops inbox.
 * Tabs are addressed by gid (rename-proof) and the schema is NOT assumed —
 * row 1 is treated as the header and every non-empty cell is rendered, so a
 * new form/tab works without a code change.
 *
 * New-row detection is positional: the per-tab high-water mark (app_secrets
 * key ops_tab_alert_rows_<gid>) stores the grid length last seen; rows beyond
 * it are new. Form-fed tabs only append, which is what this assumes — if the
 * tab SHRINKS (rows deleted) the mark resets silently, no alerts. The first
 * run seeds the mark to the current length so existing rows are never blasted.
 *
 * Test/seed rows (zavis / sagar / test in a name or email column) are skipped
 * but still advance the mark. Tabs whose resolved title is already covered by
 * the raw_zavis lead alerts (the booking-widget tabs) are skipped entirely.
 */

const markKey = (gid: number) => `ops_tab_alert_rows_${gid}`;

const s = (v: unknown) => String(v ?? '').trim();
const esc = (x: string) => x.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] ?? c);

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

function rowHtml(tabTitle: string, header: string[], row: string[]): string {
  const cells: string[] = [];
  for (let i = 0; i < Math.max(header.length, row.length); i++) {
    const label = s(header[i]) || `Column ${i + 1}`;
    const value = s(row[i]);
    if (!value) continue;
    cells.push(
      `<tr><td style="padding:4px 12px 4px 0;color:#71717a;font:13px sans-serif;vertical-align:top">${esc(label)}</td>` +
        `<td style="padding:4px 0;font:13px sans-serif;color:#111">${esc(value)}</td></tr>`,
    );
  }
  return `
    <div style="font:14px sans-serif;color:#111">
      <p style="margin:0 0 8px"><strong>New entry — ${esc(tabTitle)}</strong></p>
      <table style="border-collapse:collapse">${cells.join('')}</table>
      <p style="margin:12px 0 0;color:#71717a;font:12px sans-serif">Please follow up. This is an automated alert from the Dental Nation dashboard.</p>
    </div>`;
}

/** A short "who" for the subject line — the first name-ish / phone-ish value. */
function rowLabel(header: string[], row: string[]): string {
  const byRe = (re: RegExp) => {
    const i = header.findIndex((h) => re.test(h));
    return i >= 0 ? s(row[i]) : '';
  };
  return byRe(/name/i) || byRe(/phone/i) || byRe(/email/i) || s(row.find((c) => s(c))) || 'new row';
}

export interface TabAlertResult {
  sent: number;
  skipped: boolean;
  /** Informational, surfaced in the sync log (one-off events, not every run). */
  notes: string[];
  /** Things needing attention (missing tab, failed send) → data gaps. */
  problems: string[];
  error?: string;
}

export async function sendWatchedTabAlerts(supabase: AdminClient, sheets: sheets_v4.Sheets): Promise<TabAlertResult> {
  const off = (note: string): TabAlertResult => ({ sent: 0, skipped: true, notes: [note], problems: [] });
  if (OPS_WATCHED_TABS.length === 0) return off('no watched tabs configured');
  if (!emailConfigured()) return off('alerts disabled (no MS_GRAPH_* / SMTP_* / RESEND_API_KEY)');
  if (OPS_ALERT_EMAILS.length === 0) return off('no OPS_ALERT_EMAILS');

  // Tabs the raw_zavis lead alerts already email about — never double-alert.
  const covered = new Set((sheetMapping.bookingWidget?.tabs ?? []).map((t) => t.toLowerCase()));

  const notes: string[] = [];
  const problems: string[] = [];
  let sent = 0;
  try {
    // gid → current title, one metadata call per distinct spreadsheet.
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
        problems.push(`watched tab gid ${w.gid} not found in the sheet`);
        continue;
      }
      if (covered.has(title.toLowerCase())) {
        notes.push(`"${title}": already covered by lead alerts`);
        continue;
      }

      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: w.spreadsheetId,
        range: `'${title.replace(/'/g, "''")}'!A1:Z5000`,
      });
      const grid = (res.data.values ?? []) as string[][];
      const header = (grid[0] ?? []).map(s);
      const length = grid.length; // header + data rows, trailing blanks trimmed by the API

      const { data: markRow } = await supabase.from('app_secrets').select('value').eq('key', markKey(w.gid)).maybeSingle();
      const markRaw = (markRow as { value?: string } | null)?.value;
      if (!markRaw) {
        // First sighting of this tab — remember its size, alert only from now on.
        await supabase.from('app_secrets').upsert({ key: markKey(w.gid), value: String(length) }, { onConflict: 'key' });
        notes.push(`"${title}": watching (${Math.max(0, length - 1)} existing rows; alerts start from the next new row)`);
        continue;
      }
      const mark = Math.max(1, Number(markRaw) || 1); // never treat the header as a new row

      if (length < mark) {
        // Rows were deleted — resync the mark, nothing to alert.
        await supabase.from('app_secrets').upsert({ key: markKey(w.gid), value: String(length) }, { onConflict: 'key' });
        notes.push(`"${title}": rows removed; mark reset`);
        continue;
      }
      if (length === mark) continue;

      let advanced = mark;
      let failed = false;
      for (let i = mark; i < length; i++) {
        const row = (grid[i] ?? []).map(s);
        if (!row.some(Boolean) || isTestRow(header, row)) {
          advanced = i + 1; // blank or test — never alert, but don't re-scan it
          continue;
        }
        if (sent >= OPS_ALERT_MAX_PER_RUN) {
          notes.push(`"${title}": alert cap reached; rest queued for the next run`);
          break;
        }
        const res2 = await sendEmail({
          to: OPS_ALERT_EMAILS,
          subject: `New entry — ${title} · ${rowLabel(header, row)}`,
          html: rowHtml(title, header, row),
          from: OPS_ALERT_FROM,
        });
        if (res2.ok) {
          sent++;
          advanced = i + 1;
        } else {
          // Send failed — stop; don't advance the mark past an undelivered row.
          problems.push(`"${title}": send failed — ${res2.error ?? 'unknown error'}`);
          failed = true;
          break;
        }
      }
      if (advanced > mark) {
        await supabase.from('app_secrets').upsert({ key: markKey(w.gid), value: String(advanced) }, { onConflict: 'key' });
      }
      if (failed) break; // transport is down — later tabs would fail the same way
    }
    return { sent, skipped: false, notes, problems };
  } catch (err) {
    return { sent, skipped: false, notes, problems, error: (err as Error).message };
  }
}
