import type { sheets_v4 } from 'googleapis';
import { WEBSITE_HEADERS, WEBSITE_ENQUIRIES_TAB, WEBSITE_VALIDITY, WEBSITE_OUTCOMES, WEBSITE_CONVERSIONS } from '@/config/website-enquiries';
import { GMB_CLINICS } from '@/config/gmb-clinics';
import { quoteTab } from './mirrorHelpers';

export const sheetDay = (day: string) => Math.round((Date.parse(`${day}T00:00:00Z`) - Date.UTC(1899, 11, 30)) / 86_400_000);
export function dayFromSheet(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86_400_000).toISOString().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? String(value) : '';
}

const cell = (value: string | number, formulas: boolean): sheets_v4.Schema$CellData => ({ userEnteredValue:
  typeof value === 'number' ? { numberValue: value } : formulas && value.startsWith('=') ? { formulaValue: value } : { stringValue: value },
});
const initialCells = (sheetId: number, rows: (string | number)[][], formulas = false): sheets_v4.Schema$Request => ({
  updateCells: { start: { sheetId, rowIndex: 0, columnIndex: 0 }, rows: rows.map((row) => ({ values: row.map((v) => cell(v, formulas)) })), fields: 'userEnteredValue' },
});

export function mirrorInitialization(sheetId: number): sheets_v4.Schema$Request[] {
  return [
    initialCells(sheetId, [[...WEBSITE_HEADERS]]),
    { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } },
    { repeatCell: { range: { sheetId, startRowIndex: 1, startColumnIndex: 1, endColumnIndex: 2 }, cell: { userEnteredFormat: { numberFormat: { type: 'DATE', pattern: 'yyyy-mm-dd' } } }, fields: 'userEnteredFormat.numberFormat' } },
    ...([[10, WEBSITE_VALIDITY], [15, WEBSITE_OUTCOMES], [16, WEBSITE_CONVERSIONS]] as const).map(([column, values]) => ({
      setDataValidation: { range: { sheetId, startRowIndex: 1, startColumnIndex: column, endColumnIndex: column + 1 }, rule: { condition: { type: 'ONE_OF_LIST', values: values.map((value) => ({ userEnteredValue: value })) }, strict: true, showCustomUi: true } },
    })),
  ];
}

export function websiteSummaryRows(): string[][] {
  const tab = quoteTab(WEBSITE_ENQUIRIES_TAB);
  const col = (letter: string) => `${tab}!$${letter}$2:$${letter}`;
  const rows = [
    ['Website enquiries'],
    ['From', '=DATE(YEAR(TODAY()),MONTH(TODAY()),1)', 'To', '=TODAY()'],
    ['Actual = Yes only. Not yet reviewed is separate. Outcomes are cumulative since enquiry; dates filter enquiry date. Revenue uses team Revenue when filled, otherwise dashboard billing.'],
    ['Branch', 'Gross enquiries', 'Actual enquiries', 'Not yet reviewed', 'Spam', 'Vendor', 'Job', 'Duplicate', 'Existing patient admin', 'Wrong number', 'Contacted', 'Booked', 'Attended', 'Converted', 'Revenue AED', 'Actual / gross', 'Booked / actual', 'Converted / actual'],
  ];
  [...GMB_CLINICS.map((b) => b.label), 'Unassigned', 'Total'].forEach((label, i) => {
    const r = i + 5;
    const criteria = [`--(${col('A')}<>"")`, `--(${col('B')}>=$B$2)`, `--(${col('B')}<=$D$2)`, ...(label === 'Total' ? [] : [`--(${col('F')}=$A${r})`])];
    const count = (...extra: string[]) => `=SUMPRODUCT(${[...criteria, ...extra].join(',')})`;
    rows.push([
      label, count(), count(`--(${col('K')}="Yes")`), count(`--(${col('K')}="")`),
      ...WEBSITE_VALIDITY.slice(1).map((value) => count(`--(${col('K')}="${value}")`)),
      count(`--(((${col('L')}<>"")+(${col('M')}<>"")+(${col('N')}<>""))>0)`),
      count(`--(((${col('P')}="Booked")+(${col('I')}="booked")+(${col('I')}="attended"))>0)`),
      count(`--(${col('I')}="attended")`),
      count(`--(((${col('Q')}="Converted")+(${col('I')}="billed"))>0)`),
      count(`IF(${col('R')}<>"",IFERROR(1*${col('R')},0),IFERROR(1*${col('J')},0))`),
      `=IFERROR(C${r}/B${r},0)`, `=IFERROR(L${r}/C${r},0)`, `=IFERROR(N${r}/C${r},0)`,
    ]);
  });
  return rows;
}

export function summaryInitialization(sheetId: number): sheets_v4.Schema$Request[] {
  return [
    initialCells(sheetId, websiteSummaryRows(), true),
    { repeatCell: { range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 1, endColumnIndex: 4 }, cell: { userEnteredFormat: { numberFormat: { type: 'DATE', pattern: 'yyyy-mm-dd' } } }, fields: 'userEnteredFormat.numberFormat' } },
    { repeatCell: { range: { sheetId, startRowIndex: 4, endRowIndex: 9, startColumnIndex: 15, endColumnIndex: 18 }, cell: { userEnteredFormat: { numberFormat: { type: 'PERCENT', pattern: '0.0%' } } }, fields: 'userEnteredFormat.numberFormat' } },
  ];
}
