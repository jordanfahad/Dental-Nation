import type { sheets_v4 } from 'googleapis';
import type { SourceMapping } from '@/config/sheet-mapping';
import type { FetchResult, RawRow, SourceAdapter } from './types';

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
        if (h) data[h] = String(cells[c] ?? '').trim();
      });
      rows.push({ rowIndex: i + 1, data, tabTitle }); // 1-based sheet row
    }
    return rows;
  }

  private async readTab(title: string): Promise<unknown[][]> {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.source.spreadsheetId,
      range: title,
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING',
    });
    return (res.data.values ?? []) as unknown[][];
  }

  /** Multi-tab read: each tab is read, header-detected, parsed, then concat. */
  private async fetchTabs(tabs: string[]): Promise<FetchResult> {
    const warnings: string[] = [];
    const rows: RawRow[] = [];
    for (const title of tabs) {
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
}
