import 'server-only';
import type { sheets_v4 } from 'googleapis';
import type { AdminClient } from '@/lib/supabase/server';
import { activationSources } from '@/config/sheet-mapping';
import { cellCount, cellDate, cellNumber, cellText, isMissingTable, labelText, round2 } from './sheet-cells';

/**
 * Dr Luvi's "Revenue AMC" spreadsheet → lane_e.amc_daily_report (one row per
 * report date). One tab per day, titled "Report dd.mm.yyyy", each a hand-laid
 * daily report: a DATE line, a summary block (Total appointments, A) Total
 * Consulted, B.1) Invoiced, B.2) Non-Invoiced, B) Cancelled appointments,
 * C) Patient Type Old / New, Prepared by) and, beside it, an APPOINTMENT
 * DETAILS table (Sl., File No, Patient Name, Doctor, Invoice No, Invoice
 * Amount, insurance, co-payment, By Cash, By CC / Chq., In advance, Balance)
 * followed by a CANCELLED APPOINTMENTS table.
 *
 * Everything is found by label text, never by fixed cell. Patient names and
 * file numbers are NEVER read into the output: only per-doctor invoice counts
 * and amounts and the column totals. A tab that cannot be parsed is a data
 * gap, never a crash, and never blocks the other tabs.
 */

export interface AmcDoctorTotals { invoices: number; amount: number }

export interface AmcDailyRow {
  report_date: string;
  /** The DATE cell inside the tab (null when absent/unreadable). */
  sheet_date: string | null;
  total_appointments: number | null;
  consulted: number | null;
  invoiced: number | null;
  non_invoiced: number | null;
  cancelled: number | null;
  patients_old: number | null;
  patients_new: number | null;
  invoice_amount_total: number | null;
  insurance_total: number | null;
  copay_total: number | null;
  cash_total: number | null;
  card_total: number | null;
  advance_total: number | null;
  balance_total: number | null;
  /** Detail rows with an invoice number or amount; null when the details table is missing. */
  invoice_count: number | null;
  doctors: Record<string, AmcDoctorTotals>;
  /** Staff first name as the sheet gives it. */
  prepared_by: string | null;
  source_tab: string;
}

export type AmcParse =
  | { ok: true; row: AmcDailyRow; warnings: string[] }
  | { ok: false; reason: string };

/** "Report 28.10.2026" → 2026-10-28; null for any other tab title. */
export function amcReportDate(title: string): string | null {
  const m = title.match(activationSources.amcRevenue.tabPattern);
  return m ? cellDate(`${m[1]}.${m[2]}.${m[3]}`) : null;
}

/** Strip a leading enumerator: "A).", "B.1)", "C)", "b." → "". */
const stripEnum = (s: string) => s.replace(/^\(?[a-z](?:\.\d+)?(?:\)\.?|\.)\s*/, '').trim();

type SummaryKey = 'total_appointments' | 'consulted' | 'invoiced' | 'non_invoiced' | 'cancelled' | 'patients_old' | 'patients_new';
const SUMMARY: Record<SummaryKey, RegExp> = {
  total_appointments: /^total (no\.? of )?appointments?\b/,
  consulted: /^total consulted\b/,
  invoiced: /^invoiced\b/,
  non_invoiced: /^non[\s-]?invoiced\b/,
  cancelled: /^cancell?ed appointments?\b/,
  patients_old: /^old( patients?)?$/,
  patients_new: /^new( patients?)?$/,
};

type DetailKey = 'doctor' | 'invoiceNo' | 'amount' | 'insurance' | 'copay' | 'cash' | 'card' | 'advance' | 'balance';
const DETAIL: Record<DetailKey, RegExp> = {
  doctor: /^doctor\b/,
  invoiceNo: /^invoice (no|number|#)/,
  amount: /^invoice amount|^amount$/,
  insurance: /^insurance/,
  copay: /^co[\s-]?pay/,
  cash: /^(by )?cash/,
  card: /^(by )?(cc|card|credit)|chq|cheque/,
  advance: /advance/,
  balance: /^balance/,
};

/** Pure: parse one "Report dd.mm.yyyy" tab grid. Never throws. */
export function parseAmcReport(title: string, values: unknown[][]): AmcParse {
  const reportDate = amcReportDate(title);
  if (!reportDate) return { ok: false, reason: 'tab title is not "Report dd.mm.yyyy"' };
  const grid = values.map((r) => (Array.isArray(r) ? r : []));
  if (!grid.some((r) => r.some((c) => cellText(c)))) return { ok: false, reason: 'tab is empty' };
  const warnings: string[] = [];
  const lab = (r: number, c: number) => labelText(grid[r]?.[c]);

  // ---- details table: the header row with "Sl." AND "Invoice Amount".
  let hdr = -1;
  let slCol = -1;
  for (let r = 0; r < grid.length && hdr < 0; r++) {
    const row = grid[r].map(labelText);
    const sl = row.findIndex((h) => /^(sl|s\.? ?no|sr)\.?$/.test(h));
    if (sl >= 0 && row.some((h) => DETAIL.amount.test(h))) { hdr = r; slCol = sl; }
  }

  // ---- summary labels: a label cell whose next non-empty cell to the right
  // (within 6 cells, and left of the details table when the label is) is a
  // number. Headings such as "A). TOTAL CONSULTED" over the details table have
  // nothing to their right, so they never match.
  const found: Partial<Record<SummaryKey, number | null>> = {};
  for (const key of Object.keys(SUMMARY) as SummaryKey[]) {
    let best: number | null | undefined;
    for (let r = 0; r < grid.length && best == null; r++) {
      for (let c = 0; c < grid[r].length && best == null; c++) {
        if (!SUMMARY[key].test(stripEnum(lab(r, c)))) continue;
        const limit = Math.min(c + 7, slCol > c ? slCol : Math.max(grid[r].length, c + 7));
        let value: number | null = null;
        let text = '';
        for (let k = c + 1; k < limit; k++) {
          const t = cellText(grid[r][k]);
          if (!t) continue;
          text = t;
          value = cellCount(grid[r][k]);
          break;
        }
        if (value != null) best = value;
        else if (!text && best === undefined) best = null; // label present, value empty
        else if (text) warnings.push(`"${cellText(grid[r][c])}" value "${text}" is not a count`);
      }
    }
    if (best !== undefined) found[key] = best;
  }

  // ---- DATE and Prepared by.
  let sheetDate: string | null = null;
  let preparedBy: string | null = null;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const l = lab(r, c);
      if (sheetDate == null && /^date$/.test(l)) {
        for (let k = c + 1; k < Math.min(c + 6, grid[r].length); k++) {
          const t = grid[r][k];
          if (cellText(t)) { sheetDate = cellDate(t); break; }
        }
      }
      if (preparedBy == null && /^prepared by\b/.test(l)) {
        const inline = cellText(cellText(grid[r][c]).replace(/^prepared by\s*:?/i, ''));
        const right = grid[r].slice(c + 1, Math.min(c + 4, slCol > c ? slCol : c + 4)).map(cellText).find(Boolean);
        const below = [1, 2].map((d) => cellText(grid[r + d]?.[c])).find(Boolean);
        preparedBy = (inline || right || below || '').split(' ')[0] || null;
      }
    }
  }

  // ---- details rows (patient name and file number are never read).
  const sums: Partial<Record<DetailKey, number>> = {};
  const doctors: Record<string, AmcDoctorTotals> = {};
  let invoiceCount: number | null = null;
  const col: Partial<Record<DetailKey, number>> = {};
  if (hdr >= 0) {
    const head = grid[hdr].map(labelText);
    for (const key of Object.keys(DETAIL) as DetailKey[]) {
      const i = head.findIndex((h, j) => j > slCol && DETAIL[key].test(h));
      if (i >= 0) { col[key] = i; if (key !== 'doctor' && key !== 'invoiceNo') sums[key] = 0; }
      else warnings.push(`details column for ${key} not found`);
    }
    invoiceCount = 0;
    for (let r = hdr + 1; r < grid.length; r++) {
      const right = grid[r].slice(slCol).map(labelText);
      if (right.some((t) => /cancell?ed/.test(t)) || right.some((t) => /^(grand )?total$/.test(t))) break;
      const amount = col.amount != null ? cellNumber(grid[r][col.amount]) : null;
      const invNo = col.invoiceNo != null ? cellText(grid[r][col.invoiceNo]) : '';
      if (amount == null && !invNo) continue;
      invoiceCount += 1;
      for (const key of ['amount', 'insurance', 'copay', 'cash', 'card', 'advance', 'balance'] as const) {
        if (col[key] == null) continue;
        const raw = grid[r][col[key]!];
        const n = cellNumber(raw);
        if (n != null) sums[key] = (sums[key] ?? 0) + n;
        else if (cellText(raw)) warnings.push(`row ${r + 1}: ${key} "${cellText(raw)}" is not a number`);
      }
      const doctor = (col.doctor != null ? cellText(grid[r][col.doctor]) : '') || 'Unspecified';
      const d = doctors[doctor] ?? { invoices: 0, amount: 0 };
      d.invoices += 1;
      d.amount = round2(d.amount + (amount ?? 0));
      doctors[doctor] = d;
    }
  }

  if (hdr < 0 && Object.keys(found).length === 0) {
    return { ok: false, reason: 'neither the summary labels nor the APPOINTMENT DETAILS table were found' };
  }
  if (hdr < 0) warnings.push('APPOINTMENT DETAILS table not found');
  if (sheetDate && sheetDate !== reportDate) warnings.push(`DATE cell ${sheetDate} differs from the tab title; the title date is used`);
  if (found.invoiced != null && invoiceCount != null && found.invoiced !== invoiceCount) {
    warnings.push(`summary says ${found.invoiced} invoiced, details table has ${invoiceCount} invoice rows`);
  }

  const total = (k: DetailKey) => (sums[k] == null ? null : round2(sums[k]!));
  return {
    ok: true,
    warnings,
    row: {
      report_date: reportDate,
      sheet_date: sheetDate,
      total_appointments: found.total_appointments ?? null,
      consulted: found.consulted ?? null,
      invoiced: found.invoiced ?? null,
      non_invoiced: found.non_invoiced ?? null,
      cancelled: found.cancelled ?? null,
      patients_old: found.patients_old ?? null,
      patients_new: found.patients_new ?? null,
      invoice_amount_total: total('amount'),
      insurance_total: total('insurance'),
      copay_total: total('copay'),
      cash_total: total('cash'),
      card_total: total('card'),
      advance_total: total('advance'),
      balance_total: total('balance'),
      invoice_count: invoiceCount,
      doctors,
      prepared_by: preparedBy,
      source_tab: title,
    },
  };
}

export interface AmcSyncResult {
  ok: boolean;
  tabs: number;
  stored: number;
  /** Per-tab problems: unparseable tabs and parse warnings (→ data gaps). */
  gaps: string[];
  missingTable?: boolean;
  error?: string;
}

const BATCH = 40;

/** Read every "Report dd.mm.yyyy" tab and upsert one row per date. Never throws. */
export async function syncAmcDailyReports(supabase: AdminClient, sheets: sheets_v4.Sheets): Promise<AmcSyncResult> {
  const src = activationSources.amcRevenue;
  const gaps: string[] = [];
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: src.spreadsheetId, fields: 'sheets(properties(title))' });
    const titles = (meta.data.sheets ?? []).map((s) => s.properties?.title ?? '').filter(Boolean);
    const reportTabs = titles.filter((t) => amcReportDate(t));
    for (const t of titles) if (/^\s*report\b/i.test(t) && !amcReportDate(t)) gaps.push(`tab "${t}": title date unreadable, skipped`);
    if (reportTabs.length === 0) return { ok: false, tabs: 0, stored: 0, gaps, error: 'no "Report dd.mm.yyyy" tabs found' };

    const rows = new Map<string, AmcDailyRow>();
    for (let i = 0; i < reportTabs.length; i += BATCH) {
      const chunk = reportTabs.slice(i, i + BATCH);
      let ranges: sheets_v4.Schema$ValueRange[] = [];
      try {
        const res = await sheets.spreadsheets.values.batchGet({
          spreadsheetId: src.spreadsheetId,
          ranges: chunk.map((t) => `'${t.replace(/'/g, "''")}'`),
          valueRenderOption: 'UNFORMATTED_VALUE',
          dateTimeRenderOption: 'FORMATTED_STRING',
        });
        ranges = res.data.valueRanges ?? [];
      } catch (err) {
        gaps.push(`${chunk.length} tab(s) from "${chunk[0]}" unreadable: ${(err as Error).message}`);
        continue;
      }
      chunk.forEach((title, j) => {
        const parsed = parseAmcReport(title, (ranges[j]?.values ?? []) as unknown[][]);
        if (!parsed.ok) { gaps.push(`tab "${title}": ${parsed.reason}`); return; }
        for (const w of parsed.warnings) gaps.push(`tab "${title}": ${w}`);
        if (rows.has(parsed.row.report_date)) gaps.push(`tab "${title}": a second tab for ${parsed.row.report_date}; the later tab wins`);
        rows.set(parsed.row.report_date, parsed.row);
      });
    }
    if (rows.size === 0) return { ok: false, tabs: reportTabs.length, stored: 0, gaps, error: 'no report tab could be parsed' };

    const syncedAt = new Date().toISOString();
    const payload = [...rows.values()].map((r) => ({ ...r, synced_at: syncedAt }));
    for (let i = 0; i < payload.length; i += 500) {
      const { error } = await supabase.from(src.table).upsert(payload.slice(i, i + 500), { onConflict: 'report_date' });
      if (error) return { ok: false, tabs: reportTabs.length, stored: i, gaps, missingTable: isMissingTable(error), error: `upsert failed: ${error.message}` };
    }
    return { ok: true, tabs: reportTabs.length, stored: payload.length, gaps };
  } catch (err) {
    return { ok: false, tabs: 0, stored: 0, gaps, error: (err as Error).message };
  }
}
