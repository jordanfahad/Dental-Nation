import 'server-only';
import { randomUUID } from 'node:crypto';
import type { sheets_v4 } from 'googleapis';
import type { AdminClient } from '@/lib/supabase/server';
import { sheetMapping } from '@/config/sheet-mapping';
import { WEBSITE_BACKFILL_FROM, WEBSITE_ENQUIRIES_TAB, WEBSITE_SUMMARY_TAB, WEBSITE_HEADERS } from '@/config/website-enquiries';
import { getWebsiteEnquiries } from '@/lib/growth/channelPerformance';
import { websiteIdentity, type WebsiteEnquiry } from '@/lib/growth/websiteEnquiries';
import { emptyWebsiteReview, type WebsiteReviewDay, type WebsiteReviewSnapshot } from '@/lib/growth/websiteReview';
import { phone9 } from '@/lib/growth/attribution';
import { getSheetsWriteClient } from './google-auth';
import { ensureMirrorTab, maxMirrorId, quoteTab } from './mirrorHelpers';
import { dayFromSheet, sheetDay, mirrorInitialization, summaryInitialization } from './websiteMirrorLayout';

export interface WebsiteMirrorResult {
  ok: boolean; appended: number; refreshed: number; summaryTab: boolean; reviewRead: boolean; skipped?: boolean; error?: string;
}
const s = (value: unknown) => String(value ?? '').trim();
const machineCells = (row: WebsiteEnquiry, id: string) => [id, sheetDay(row.date), row.time, row.name, row.phone, row.branch, row.service, row.source, row.status, row.billed ?? ''];
const identityFromCells = (row: unknown[]) => websiteIdentity({ p9: phone9(s(row[4])), date: dayFromSheet(row[1]), time: s(row[2]), name: s(row[3]), branch: s(row[5]), service: s(row[6]) });

export function validateWebsiteGrid(grid: unknown[][]): void {
  if (WEBSITE_HEADERS.some((header, i) => grid[0]?.[i] !== header)) throw new Error('Website mirror headers changed; no cells written');
  const ids = new Set<string>();
  for (const row of grid.slice(1)) {
    if (row.every((c) => !s(c))) continue;
    if (!/^WEB-\d+$/.test(s(row[0])) || !dayFromSheet(row[1]) || ids.has(s(row[0]))) throw new Error('Website mirror has an invalid or duplicate row; no cells written');
    ids.add(s(row[0]));
  }
}

/** Row positions come from this run's read. Existing rows only receive A:J. */
export function planWebsiteMirror(rows: WebsiteEnquiry[], grid: unknown[][]) {
  validateWebsiteGrid(grid);
  let maxId = maxMirrorId(grid, 'WEB-');
  const existing = new Map<string, number[]>();
  grid.slice(1).forEach((row, index) => {
    if (!s(row[0])) return;
    const key = identityFromCells(row);
    existing.set(key, [...(existing.get(key) ?? []), index + 1]);
  });
  const updates: { range: string; values: (string | number)[][] }[] = [];
  const append: (string | number)[][] = [];
  for (const row of rows) {
    const index = existing.get(websiteIdentity(row))?.shift();
    if (index != null) updates.push({ range: `${quoteTab(WEBSITE_ENQUIRIES_TAB)}!A${index + 1}:J${index + 1}`, values: [machineCells(row, s(grid[index][0]))] });
    else append.push(machineCells(row, `WEB-${String(++maxId).padStart(4, '0')}`));
  }
  if ([...existing.values()].some((indices) => indices.length)) throw new Error('Website population changed; retained team rows need reconciliation');
  return { updates, append };
}

export function websiteReviewDays(grid: unknown[][]): WebsiteReviewDay[] {
  validateWebsiteGrid(grid);
  const days = new Map<string, WebsiteReviewDay>();
  for (const row of grid.slice(1)) {
    if (!s(row[0])) continue;
    const date = dayFromSheet(row[1]);
    const day = days.get(date) ?? { date, ...emptyWebsiteReview() };
    day.gross++;
    if (s(row[10]).toLowerCase() === 'yes') day.actual++;
    if (!s(row[10])) day.notYetReviewed++;
    if (s(row[15]).toLowerCase() === 'booked' || ['booked', 'attended'].includes(s(row[8]).toLowerCase())) day.booked++;
    if (s(row[16]).toLowerCase() === 'converted' || s(row[8]).toLowerCase() === 'billed') day.converted++;
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
    'Website mirror has an invalid or duplicate row; no cells written',
    'Website population changed; retained team rows need reconciliation',
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
    const plan = planWebsiteMirror(rows, await read());
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
    const grid = await read();
    const verified = planWebsiteMirror(rows, grid);
    const incomplete = verified.updates.some((update) => {
      const rowIndex = Number(update.range.match(/!A(\d+):/)![1]) - 1;
      return update.values[0].some((value, column) => s(grid[rowIndex][column]) !== s(value));
    });
    if (verified.append.length || incomplete) throw new Error('Website mirror readback incomplete');
    const days = websiteReviewDays(grid);
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
