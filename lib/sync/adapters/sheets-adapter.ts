import type { sheets_v4 } from 'googleapis';
import type { SourceMapping } from '@/config/sheet-mapping';
import type { FetchResult, RawRow, SourceAdapter } from './types';
import * as XLSX from 'xlsx';
import { getDriveClient } from '../google-auth';

/**
 * Google Sheets adapter. Reads one source (a tab of a spreadsheet) and returns
 * rows keyed by header. Resolves the tab name from a gid when only a gid is
 * known. Paging is handled by the Sheets API returning the full used range; if a
 * single sheet is enormous, swap `values.get` for a ranged read here.
 */
export class SheetsAdapter implements SourceAdapter {
  key: string;
  label: string;

  constructor(
    private sheets: sheets_v4.Sheets,
    private source: SourceMapping,
  ) {
    this.key = source.key;
    this.label = source.label;
  }

  private async resolveTabTitle(): Promise<{ title: string | null; warning?: string }> {
    if (this.source.tab) return { title: this.source.tab };
    // Resolve a gid → tab title.
    const meta = await this.sheets.spreadsheets.get({
      spreadsheetId: this.source.spreadsheetId,
      fields: 'sheets(properties(sheetId,title))',
    });
    const tabs = meta.data.sheets ?? [];
    if (this.source.gid != null) {
      const match = tabs.find((s) => s.properties?.sheetId === this.source.gid);
      if (match?.properties?.title) return { title: match.properties.title };
      return {
        title: tabs[0]?.properties?.title ?? null,
        warning: `gid ${this.source.gid} not found; fell back to first tab`,
      };
    }
    return { title: tabs[0]?.properties?.title ?? null };
  }

  /**
   * Detect the header row index for a tab. Some lead-tracker tabs have junk in
   * row 1, so we scan the first 6 rows for the row that has BOTH `contact
   * number` AND `inquiry platform` (case-insensitive). Returns null when no such
   * row is found, so the caller can fall back to the configured headerRow.
   */
  private static detectHeaderIdx(values: unknown[][]): number | null {
    const limit = Math.min(6, values.length);
    for (let i = 0; i < limit; i++) {
      const joined = (values[i] ?? []).map((c) => String(c ?? '').toLowerCase()).join(' | ');
      if (joined.includes('contact number') && joined.includes('inquiry platform')) return i;
    }
    return null;
  }

  /** Parse a value grid into RawRows given a header row index. */
  private rowsFromValues(
    values: unknown[][],
    headerIdx: number,
    tabTitle: string,
  ): RawRow[] {
    const headers = (values[headerIdx] ?? []).map((h) => String(h ?? '').trim());
    const rows: RawRow[] = [];
    for (let i = headerIdx + 1; i < values.length; i++) {
      const cells = values[i] ?? [];
      if (cells.every((c) => String(c ?? '').trim() === '')) continue; // skip blank rows
      const data: Record<string, string> = {};
      headers.forEach((h, c) => {
        // Repeated headers (the tracker has three "Contact Number" columns): keep the first non-empty value.
        if (h && !data[h]) data[h] = String(cells[c] ?? '').trim();
      });
      rows.push({ rowIndex: i + 1, data, tabTitle }); // 1-based sheet row
    }
    return rows;
  }

  /** A1 range for a whole tab; quoted so titles with spaces, quotes or emoji parse. */
  private static rangeOf(title: string): string {
    return `'${title.replace(/'/g, "''")}'`;
  }

  private async readTab(title: string): Promise<unknown[][]> {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.source.spreadsheetId,
      range: SheetsAdapter.rangeOf(title),
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING',
    });
    return (res.data.values ?? []) as unknown[][];
  }

  /** All tab titles in the spreadsheet. */
  private async tabTitles(): Promise<string[]> {
    const meta = await this.sheets.spreadsheets.get({
      spreadsheetId: this.source.spreadsheetId,
      fields: 'sheets(properties(title))',
    });
    return (meta.data.sheets ?? []).map((t) => t.properties?.title ?? '').filter(Boolean);
  }

  /**
   * Excel files in Drive: the Sheets API refuses them, so download the file and
   * read the requested tab (or the first) with the xlsx library.
   */
  private async readExcel(tab?: string): Promise<{ title: string; values: unknown[][] }> {
    const drive = getDriveClient();
    const res = await drive.files.get({ fileId: this.source.spreadsheetId, alt: 'media', supportsAllDrives: true }, { responseType: 'arraybuffer' });
    const wb = XLSX.read(Buffer.from(res.data as ArrayBuffer), { type: 'buffer', cellDates: false });
    const title = tab && wb.SheetNames.includes(tab) ? tab : wb.SheetNames[0];
    const values = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[title], { header: 1, raw: false, defval: '' });
    return { title, values };
  }

  private static isOfficeFile(err: unknown): boolean {
    return /must not be an Office file/i.test((err as Error)?.message ?? '');
  }

  /** Multi-tab read: each tab is read, header-detected, parsed, then concat. */
  private async fetchTabs(tabs: string[]): Promise<FetchResult> {
    const warnings: string[] = [];
    const rows: RawRow[] = [];
    let list = tabs;
    let others: string[] = [];
    if (this.source.discoverTabs) {
      try {
        const all = await this.tabTitles();
        const missing = tabs.filter((t) => !all.includes(t));
        if (missing.length) warnings.push(`tabs not found (renamed?): ${missing.join(', ')}`);
        list = tabs.filter((t) => all.includes(t));
        others = all.filter((t) => !tabs.includes(t));
      } catch (err) {
        warnings.push(`could not list tabs: ${(err as Error).message}`);
      }
    }
    // Other tabs are kept only when their header row matches this source (e.g. a new branch tab).
    for (const title of others) {
      try {
        const values = await this.readTab(title);
        const detected = SheetsAdapter.detectHeaderIdx(values);
        if (detected == null) continue;
        warnings.push(`tab "${title}" picked up automatically`);
        rows.push(...this.rowsFromValues(values, detected, title));
      } catch {
        /* unreadable extra tab: ignore */
      }
    }
    for (const title of list) {
      let values: unknown[][];
      try {
        values = await this.readTab(title);
      } catch (err) {
        warnings.push(`tab "${title}" unreadable: ${(err as Error).message}`);
        continue;
      }
      if (values.length === 0) {
        warnings.push(`tab "${title}" is empty`);
        continue;
      }
      const detected = SheetsAdapter.detectHeaderIdx(values);
      const headerIdx = detected ?? Math.max(0, this.source.headerRow - 1);
      rows.push(...this.rowsFromValues(values, headerIdx, title));
    }
    return { key: this.key, rows, warnings };
  }

  async fetch(): Promise<FetchResult> {
    // Multi-tab sources (lead tracker, booking widget) read every listed tab.
    if (this.source.tabs && this.source.tabs.length > 0) {
      return this.fetchTabs(this.source.tabs);
    }

    const warnings: string[] = [];
    const { title, warning } = await this.resolveTabTitle();
    if (warning) warnings.push(warning);
    if (!title) {
      return { key: this.key, rows: [], warnings: [...warnings, 'no readable tab found'] };
    }

    const values = await this.readTab(title);
    if (values.length === 0) {
      return { key: this.key, rows: [], warnings: [...warnings, 'tab is empty'] };
    }

    const headerIdx = Math.max(0, this.source.headerRow - 1);
    const rows = this.rowsFromValues(values, headerIdx, title);
    return { key: this.key, rows, warnings };
  }

  /** fetch() with the Excel fallback: Office files are downloaded from Drive and read directly. */
  async fetchAny(): Promise<FetchResult> {
    try {
      return await this.fetch();
    } catch (err) {
      if (!SheetsAdapter.isOfficeFile(err)) throw err;
      const { title, values } = await this.readExcel(this.source.tab);
      if (values.length === 0) return { key: this.key, rows: [], warnings: ['Excel file is empty'] };
      const headerIdx = Math.max(0, this.source.headerRow - 1);
      return { key: this.key, rows: this.rowsFromValues(values, headerIdx, title), warnings: ['read as an Excel file from Drive'] };
    }
  }
}
