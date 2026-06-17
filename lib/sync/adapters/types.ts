/**
 * Source adapter contract (§17). Every data source — Google Sheets today, a
 * GA4 / Meta / Google Ads API tomorrow — implements the same `fetch` shape so a
 * future API source is a drop-in. Normalisation downstream is identical
 * regardless of where the rows came from.
 */

/** One raw row: header → cell value, plus its 1-based position in the source. */
export interface RawRow {
  rowIndex: number;
  data: Record<string, string>;
}

export interface FetchResult {
  key: string;
  rows: RawRow[];
  /** Non-fatal issues (empty tab, uploaded-xlsx, etc.) surfaced as data gaps. */
  warnings: string[];
}

export interface SourceAdapter {
  key: string;
  label: string;
  /** Read all rows for this source. Throws only on hard failure (auth, 404). */
  fetch(): Promise<FetchResult>;
}
