import 'server-only';
import { randomUUID } from 'node:crypto';
import type { sheets_v4 } from 'googleapis';
import type { AdminClient } from '@/lib/supabase/server';
import { sheetMapping } from '@/config/sheet-mapping';
import { WEBSITE_BACKFILL_FROM, WEBSITE_ENQUIRIES_TAB, WEBSITE_SUMMARY_TAB, WEBSITE_HEADERS, WEBSITE_ORPHAN_STATUS as ORPHAN_STATUS } from '@/config/website-enquiries';
import { getWebsiteEnquiries } from '@/lib/growth/channelPerformance';
import { websiteIdentity, type WebsiteEnquiry } from '@/lib/growth/websiteEnquiries';
import { emptyWebsiteReview, type WebsiteReviewDay, type WebsiteReviewSnapshot } from '@/lib/growth/websiteReview';
import { phone9 } from '@/lib/growth/attribution';
import { getSheetsWriteClient } from './google-auth';
import { ensureMirrorTab, maxMirrorId, quoteTab } from './mirrorHelpers';
import { dayFromSheet, sheetDay, mirrorInitialization, summaryInitialization } from './websiteMirrorLayout';

export interface WebsiteMirrorResult {
  ok: boolean; appended: number; refreshed: number; summaryTab: boolean; reviewRead: boolean; skipped?: boolean; error?: string;
  /** Mirrored rows no longer in the website population: kept, marked, never deleted. */
  orphaned?: number;
  /** Rows without a WEB- Lead ID or a valid date (e.g. typed by hand): ignored. */
  ignoredRows?: number;
}
const s = (value: unknown) => String(value ?? '').trim();
/** Header positions the sync relies on: machine columns A:J and the review columns K, P, Q. */
const CHECKED_HEADERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 16];
const machineCells = (row: WebsiteEnquiry, id: string) => [id, sheetDay(row.date), row.time, row.name, row.phone, row.branch, row.service, row.source, row.status, row.billed ?? ''];
const identityFromCells = (row: unknown[]) => websiteIdentity({ p9: phone9(s(row[4])), date: dayFromSheet(row[1]), name: s(row[3]), branch: s(row[5]), service: s(row[6]) });
const isMirrorRow = (row: unknown[]) => /^WEB-\d+$/.test(s(row[0])) && !!dayFromSheet(row[1]);
const teamCells = (row: unknown[]) => JSON.stringify(Array.from({ length: 9 }, (_, i) => s(row[10 + i])));

export function validateWebsiteGrid(grid: unknown[][]): { ignoredRows: number } {
  if (CHECKED_HEADERS.some((i) => grid[0]?.[i] !== WEBSITE_HEADERS[i])) throw new Error('Website mirror headers changed; no cells written');
  const ids = new Set<string>();
  let ignoredRows = 0;
  for (const row of grid.slice(1)) {
    if (row.every((c) => !s(c))) continue;
    if (!isMirrorRow(row)) { ignoredRows++; continue; }
    if (ids.has(s(row[0]))) throw new Error('Website mirror has a duplicate Lead ID; no cells written');
    ids.add(s(row[0]));
  }
  return { ignoredRows };
}

/** Row positions come from this run's read. Only machine cells (A:J) that
 * actually differ are written, so most runs write nothing. A mirrored row that
 * drops out of the population is never deleted: only its status cell (I) is
 * set to ORPHAN_STATUS, and it is excluded from the counts.
 */
export function planWebsiteMirror(rows: WebsiteEnquiry[], grid: unknown[][]) {
  const { ignoredRows } = validateWebsiteGrid(grid);
  let maxId = maxMirrorId(grid, 'WEB-');
  const existing = new Map<string, number[]>();
  grid.slice(1).forEach((row, index) => {
    if (!isMirrorRow(row)) return;
    const key = identityFromCells(row);
    existing.set(key, [...(existing.get(key) ?? []), index + 1]);
  });
  const updates: { range: string; values: (string | number)[][] }[] = [];
  const append: (string | number)[][] = [];
  for (const row of rows) {
    const index = existing.get(websiteIdentity(row))?.shift();
    if (index == null) { append.push(machineCells(row, `WEB-${String(++maxId).padStart(4, '0')}`)); continue; }
    const desired = machineCells(row, s(grid[index][0]));
    if (desired.some((value, column) => s(grid[index][column]) !== s(value))) {
      updates.push({ range: `${quoteTab(WEBSITE_ENQUIRIES_TAB)}!A${index + 1}:J${index + 1}`, values: [desired] });
    }
  }
  const orphanRows = [...existing.values()].flat();
  for (const index of orphanRows) {
    if (s(grid[index][8]) !== ORPHAN_STATUS) updates.push({ range: `${quoteTab(WEBSITE_ENQUIRIES_TAB)}!I${index + 1}`, values: [[ORPHAN_STATUS]] });
  }
  return { updates, append, orphaned: orphanRows.length, ignoredRows };
}

/** Aggregate review counts per enquiry day, for current website rows only.
 * `current` holds how many current enquiries share each identity (identical
 * phoneless enquiries are separate), so gross always equals the selector. */
export function websiteReviewDays(grid: unknown[][], current: Map<string, number>): WebsiteReviewDay[] {
  validateWebsiteGrid(grid);
  const days = new Map<string, WebsiteReviewDay>();
  const allowance = new Map(current);
  for (const row of grid.slice(1)) {
    if (!isMirrorRow(row) || s(row[8]) === ORPHAN_STATUS) continue;
    const identity = identityFromCells(row);
    const left = allowance.get(identity) ?? 0;
    if (left <= 0) continue;
    allowance.set(identity, left - 1);
    const date = dayFromSheet(row[1]);
    const day = days.get(date) ?? { date, ...emptyWebsiteReview() };
    const status = s(row[8]).toLowerCase();
    day.gross++;
    if (s(row[10]).toLowerCase() === 'yes') day.actual++;
    if (!s(row[10])) day.notYetReviewed++;
    if (s(row[15]).toLowerCase() === 'booked' || ['booked', 'attended', 'billed'].includes(status)) day.booked++;
    if (s(row[16]).toLowerCase() === 'converted' || status === 'billed') day.converted++;
    days.set(date, day);
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function mirrorError(error: unknown): string {
  const err = error as { code?: number; response?: { status?: number }; message?: string };
  if (err?.code === 403 || err?.response?.status === 403 || /permission|forbidden|access denied/i.test(err?.message ?? '')) return 'Inhouse Lead Tracker needs Editor access';
  // Provider errors can echo row contents or credentials. Only our fixed messages leave this boundary.
  const safe = [
    'Website mirror headers changed; no cells written',
    'Website mirror has a duplicate Lead ID; no cells written',
    'Website mirror rows moved during sync; review not saved',
    'Website mirror readback incomplete',
    'Website mirror lease unavailable',
    'Website review storage unavailable',
  ];
  if (safe.includes(err?.message ?? '')) return err.message!;
  return 'Website mirror sync unavailable';
}

export async function syncWebsiteMirror(db: AdminClient, dependencies: {
  sheets?: () => sheets_v4.Sheets;
  candidates?: typeof getWebsiteEnquiries;
  now?: () => Date;
} = {}): Promise<WebsiteMirrorResult> {
  const result: WebsiteMirrorResult = { ok: false, appended: 0, refreshed: 0, summaryTab: false, reviewRead: false };
  const now = (dependencies.now ?? (() => new Date()))();
  const token = randomUUID();
  let claimed = false;
  const save = async (snapshot: WebsiteReviewSnapshot) => {
    const { error } = await db.from('website_review_snapshot').upsert({ id: 'website', ...snapshot }, { onConflict: 'id' });
    if (error) throw new Error('Website review storage unavailable');
  };
  try {
    const claim = await db.rpc('claim_website_mirror', { p_token: token });
    if (claim.error) throw new Error('Website mirror lease unavailable');
    if (claim.data !== true) return { ...result, ok: true, skipped: true };
    claimed = true;
    const rows = await (dependencies.candidates ?? getWebsiteEnquiries)(db, { from: WEBSITE_BACKFILL_FROM, to: now.toLocaleDateString('en-CA', { timeZone: 'Asia/Dubai' }) });
    const sheets = (dependencies.sheets ?? getSheetsWriteClient)();
    const spreadsheetId = sheetMapping.leadTracker.spreadsheetId;
    const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets(properties(sheetId,title))' });
    const tabs = meta.data.sheets ?? [];
    await ensureMirrorTab(sheets, spreadsheetId, tabs, WEBSITE_ENQUIRIES_TAB, mirrorInitialization);
    const range = `${quoteTab(WEBSITE_ENQUIRIES_TAB)}!A:S`;
    const read = async () => (await sheets.spreadsheets.values.get({ spreadsheetId, range, valueRenderOption: 'UNFORMATTED_VALUE' })).data.values ?? [];
    const before = await read();
    const plan = planWebsiteMirror(rows, before);
    result.orphaned = plan.orphaned;
    result.ignoredRows = plan.ignoredRows;
    if (plan.updates.length) {
      // Updates address rows by position. Re-check the Lead IDs at those
      // positions right before writing; if the tab was sorted or rows were
      // inserted since our read, write nothing (the next run re-plans).
      const ids = (await sheets.spreadsheets.values.get({ spreadsheetId, range: `${quoteTab(WEBSITE_ENQUIRIES_TAB)}!A:A`, valueRenderOption: 'UNFORMATTED_VALUE' })).data.values ?? [];
      const shifted = plan.updates.some((update) => {
        const index = Number(update.range.match(/!\w(\d+)/)![1]) - 1;
        return s(ids[index]?.[0]) !== s(before[index]?.[0]);
      });
      if (shifted) throw new Error('Website mirror rows moved during sync; review not saved');
    }
    for (let i = 0; i < plan.updates.length; i += 500) {
      const data = plan.updates.slice(i, i + 500);
      await sheets.spreadsheets.values.batchUpdate({ spreadsheetId, requestBody: { valueInputOption: 'RAW', data } });
      result.refreshed += data.length;
    }
    for (let i = 0; i < plan.append.length; i += 500) {
      const values = plan.append.slice(i, i + 500);
      await sheets.spreadsheets.values.append({ spreadsheetId, range, valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS', requestBody: { values } });
      result.appended += values.length;
    }
    // Read the team's current cells, not an old pre-write copy.
    const grid = plan.updates.length || plan.append.length ? await read() : before;
    const verified = planWebsiteMirror(rows, grid);
    if (verified.append.length || verified.updates.length) throw new Error('Website mirror readback incomplete');
    // Rows were addressed by position: if the tab was sorted while we wrote,
    // team cells (K:S) would now sit next to a different Lead ID. Check every
    // row we wrote kept its own team cells.
    if (plan.updates.length) {
      const teamBefore = new Map(before.slice(1).filter(isMirrorRow).map((row) => [s(row[0]), teamCells(row)]));
      const touched = new Set(plan.updates.map((update) => s(before[Number(update.range.match(/!\w(\d+)/)![1]) - 1]?.[0])));
      const moved = grid.slice(1).filter(isMirrorRow).some((row) => touched.has(s(row[0])) && teamBefore.has(s(row[0])) && teamBefore.get(s(row[0])) !== teamCells(row));
      if (moved) throw new Error('Website mirror rows moved during sync; review not saved');
    }
    const current = new Map<string, number>();
    for (const row of rows) current.set(websiteIdentity(row), (current.get(websiteIdentity(row)) ?? 0) + 1);
    const days = websiteReviewDays(grid, current);
    await save({ available: true, synced_at: now.toISOString(), days });
    result.reviewRead = true;
    await ensureMirrorTab(sheets, spreadsheetId, tabs, WEBSITE_SUMMARY_TAB, summaryInitialization);
    result.summaryTab = true;
    result.ok = true;
  } catch (error) {
    result.error = mirrorError(error);
    result.reviewRead = false;
    if (claimed) try { await save({ available: false, synced_at: now.toISOString(), days: [] }); } catch { /* reader also expires old snapshots */ }
  } finally {
    if (claimed) try { await db.rpc('release_website_mirror', { p_token: token }); } catch { /* lease expires if release fails */ }
  }
  return result;
}
