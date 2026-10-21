import type { sheets_v4 } from 'googleapis';

export const quoteTab = (title: string) => `'${title.replace(/'/g, "''")}'`;
export const mirrorPhone = (value: string) => value.replace(/\D/g, '').slice(-9);

/** Preserve the source's calendar day and wall-clock minute, like Growth. */
export function minuteKey(iso: string | null, raw: string): string {
  if (iso) return iso.slice(0, 16);
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? raw.slice(0, 16) : new Date(ms).toISOString().slice(0, 16);
}

export function maxMirrorId(grid: unknown[][], prefix: string, floor = 0): number {
  return grid.reduce((max, row) => {
    const value = String(row[0] ?? '');
    const suffix = value.slice(prefix.length);
    return value.toUpperCase().startsWith(prefix.toUpperCase()) && /^\d+$/.test(suffix) ? Math.max(max, Number(suffix)) : max;
  }, floor);
}

/** Creation and initial content are atomic, so an interrupted run is retryable. */
export async function ensureMirrorTab(
  sheets: sheets_v4.Sheets, spreadsheetId: string, allSheets: sheets_v4.Schema$Sheet[],
  title: string, initialize: (sheetId: number) => sheets_v4.Schema$Request[] = () => [],
): Promise<number> {
  const existing = allSheets.find((sh) => sh.properties?.title?.toLowerCase() === title.toLowerCase())?.properties?.sheetId;
  if (existing != null) return existing;
  const sheetId = Math.max(0, ...allSheets.map((sh) => sh.properties?.sheetId ?? 0)) + 1;
  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [
    { addSheet: { properties: { title, sheetId } } }, ...initialize(sheetId),
  ] } });
  allSheets.push({ properties: { title, sheetId } });
  return sheetId;
}
