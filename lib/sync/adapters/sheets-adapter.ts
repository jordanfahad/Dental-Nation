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

  async fetch(): Promise<FetchResult> {
    const warnings: string[] = [];
    const { title, warning } = await this.resolveTabTitle();
    if (warning) warnings.push(warning);
    if (!title) {
      return { key: this.key, rows: [], warnings: [...warnings, 'no readable tab found'] };
    }

    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.source.spreadsheetId,
      range: title,
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING',
    });

    const values = (res.data.values ?? []) as unknown[][];
    if (values.length === 0) {
      return { key: this.key, rows: [], warnings: [...warnings, 'tab is empty'] };
    }

    const headerIdx = Math.max(0, this.source.headerRow - 1);
    const headers = (values[headerIdx] ?? []).map((h) => String(h ?? '').trim());
    const rows: RawRow[] = [];
    for (let i = headerIdx + 1; i < values.length; i++) {
      const cells = values[i] ?? [];
      if (cells.every((c) => String(c ?? '').trim() === '')) continue; // skip blank rows
      const data: Record<string, string> = {};
      headers.forEach((h, c) => {
        if (h) data[h] = String(cells[c] ?? '').trim();
      });
      rows.push({ rowIndex: i + 1, data }); // 1-based sheet row
    }
    return { key: this.key, rows, warnings };
  }
}
