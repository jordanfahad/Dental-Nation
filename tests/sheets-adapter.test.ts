import { strict as assert } from 'node:assert';
import { test, type TestContext } from 'node:test';
import type { sheets_v4 } from 'googleapis';
import * as XLSX from 'xlsx';
import type { SourceMapping } from '../config/sheet-mapping';
import { SheetsAdapter } from '../lib/sync/adapters/sheets-adapter';
import type { getDriveClient } from '../lib/sync/google-auth';

const source: SourceMapping = {
  key: 'fixture', label: 'Fixture spreadsheet', spreadsheetId: 'fixture-sheet',
  headerRow: 1, target: 'none', rawTable: 'raw_fixture', priority: 'low', columns: {},
};
const officeError = new Error('This operation is not supported for this document. The document must not be an Office file.');
const noDrive: typeof getDriveClient = () => { throw new Error('Unexpected Drive client creation'); };
const headers = ['Contact Number', 'Inquiry Platform'];
const limit = 10 * 1024 * 1024;

/** Google API doubles are injected; no auth, environment, or network is used. */
function mockSheets(t: TestContext, options: {
  titles?: string[]; grids?: Record<string, unknown[][] | Error>; metadataError?: Error;
} = {}) {
  const metadata = t.mock.fn(async (_params: unknown) => {
    if (options.metadataError) throw options.metadataError;
    return { data: { sheets: (options.titles ?? []).map((title, sheetId) => ({ properties: { title, sheetId } })) } };
  });
  const values = t.mock.fn(async (params: { spreadsheetId: string; range: string }) => {
    assert.equal(params.spreadsheetId, source.spreadsheetId);
    assert.ok(Object.hasOwn(options.grids ?? {}, params.range), `Unexpected range: ${params.range}`);
    const grid = options.grids![params.range];
    if (grid instanceof Error) throw grid;
    return { data: { values: grid } };
  });
  const client = { spreadsheets: { get: metadata, values: { get: values } } } as unknown as sheets_v4.Sheets;
  return { client, metadata, values };
}

function mockDrive(t: TestContext, media: Buffer | Error, metadata: { mimeType?: string; size?: string } | Error = {}) {
  const get = t.mock.fn(async (params: { fileId: string; supportsAllDrives: boolean; alt?: string; fields?: string }, options?: unknown) => {
    assert.equal(params.fileId, source.spreadsheetId);
    assert.equal(params.supportsAllDrives, true);
    if (params.alt === 'media') {
      assert.deepEqual(options, { responseType: 'arraybuffer', maxContentLength: limit });
      if (media instanceof Error) throw media;
      return { data: media };
    }
    assert.equal(params.fields, 'mimeType,size');
    if (metadata instanceof Error) throw metadata;
    return { data: metadata };
  });
  const factory = t.mock.fn(() => ({ files: { get } } as unknown as ReturnType<typeof getDriveClient>));
  return { get, factory };
}

function workbook(tabs: Record<string, unknown[][]>): Buffer {
  const book = XLSX.utils.book_new();
  for (const [title, values] of Object.entries(tabs)) {
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(values), title);
  }
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

for (const [title, range] of [
  ['Branch with spaces', "'Branch with spaces'"],
  ['Lane "E"', "'Lane \"E\"'"],
  ["O'Brien", "'O''Brien'"],
  ['Branch ❤ ⭐ 🦷', "'Branch ❤ ⭐ 🦷'"],
  ['Lane "E" DR. TOSUN Branch ❤', "'Lane \"E\" DR. TOSUN Branch ❤'"],
]) {
  test(`fetch quotes the A1 range for ${title}`, async (t) => {
    const api = mockSheets(t, { grids: { [range]: [['Name'], ['Example']] } });
    const result = await new SheetsAdapter(api.client, { ...source, tab: title }, noDrive).fetch();
    assert.deepEqual(api.values.mock.calls[0].arguments[0], {
      spreadsheetId: source.spreadsheetId, range,
      valueRenderOption: 'UNFORMATTED_VALUE', dateTimeRenderOption: 'FORMATTED_STRING',
    });
    assert.deepEqual(result.rows, [{ rowIndex: 2, data: { Name: 'Example' }, tabTitle: title }]);
    assert.deepEqual(result.warnings, []);
  });
}

test('discovery reads existing configured tabs, warns for missing tabs, and admits matching extras', async (t) => {
  const api = mockSheets(t, {
    titles: ['Configured', 'New branch', 'Contact only', 'Platform only', 'Split rows', 'Empty', 'Unavailable'],
    grids: {
      "'Configured'": [headers, ['111', 'Search']],
      "'New branch'": [['Monthly tracker'], [], ['CONTACT NUMBER', 'Inquiry Platform'], ['222', 'Social']],
      "'Contact only'": [['Contact Number', 'Notes'], ['333', 'Unrelated']],
      "'Platform only'": [['Name', 'Inquiry Platform'], ['Example', 'Unrelated']],
      "'Split rows'": [['Contact Number'], ['Inquiry Platform'], ['Not a header']],
      "'Empty'": [], "'Unavailable'": new Error('Simulated tab read failure'),
    },
  });
  const result = await new SheetsAdapter(api.client, {
    ...source, tabs: ['Configured', 'Old branch'], discoverTabs: true,
  }, noDrive).fetch();
  assert.deepEqual(result, {
    key: source.key,
    rows: [
      { rowIndex: 4, data: { 'CONTACT NUMBER': '222', 'Inquiry Platform': 'Social' }, tabTitle: 'New branch' },
      { rowIndex: 2, data: { 'Contact Number': '111', 'Inquiry Platform': 'Search' }, tabTitle: 'Configured' },
    ],
    warnings: ['tabs not found (renamed?): Old branch', 'tab "New branch" picked up automatically'],
  });
  assert.deepEqual(api.metadata.mock.calls[0].arguments[0], {
    spreadsheetId: source.spreadsheetId, fields: 'sheets(properties(title))',
  });
  assert.equal(api.metadata.mock.callCount(), 1);
  assert.equal(api.values.mock.callCount(), 7);
  assert.ok(api.values.mock.calls.every((call) => call.arguments[0].range !== "'Old branch'"));
});

test('discovery accepts a header in row six and ignores one below the scan window', async (t) => {
  const api = mockSheets(t, {
    titles: ['Row six', 'Row seven'],
    grids: {
      "'Row six'": [[], [], [], [], [], headers, ['111', 'Search']],
      "'Row seven'": [[], [], [], [], [], [], headers, ['222', 'Social']],
    },
  });
  const result = await new SheetsAdapter(api.client, { ...source, tabs: ['Missing'], discoverTabs: true }, noDrive).fetch();
  assert.deepEqual(result.rows, [{ rowIndex: 7, data: { 'Contact Number': '111', 'Inquiry Platform': 'Search' }, tabTitle: 'Row six' }]);
  assert.deepEqual(result.warnings, ['tabs not found (renamed?): Missing', 'tab "Row six" picked up automatically']);
});

test('failed tab discovery preserves configured reads and surfaces the failure', async (t) => {
  const api = mockSheets(t, {
    metadataError: new Error('Simulated metadata failure'),
    grids: { "'Configured'": [['Banner'], ['Name'], ['Example']], "'Empty'": [], "'Broken'": new Error('Simulated read failure') },
  });
  const result = await new SheetsAdapter(api.client, {
    ...source, tabs: ['Configured', 'Empty', 'Broken'], discoverTabs: true, headerRow: 2,
  }, noDrive).fetch();
  assert.deepEqual(result.rows, [{ rowIndex: 3, data: { Name: 'Example' }, tabTitle: 'Configured' }]);
  assert.deepEqual(result.warnings, [
    'could not list tabs: Simulated metadata failure', 'tab "Empty" is empty', 'tab "Broken" unreadable: Simulated read failure',
  ]);
});

test('discovery remains opt-in for multi-tab sources', async (t) => {
  const api = mockSheets(t, { grids: { "'Configured'": [headers, ['111', 'Search']] } });
  const result = await new SheetsAdapter(api.client, { ...source, tabs: ['Configured'] }, noDrive).fetch();
  assert.equal(result.rows.length, 1);
  assert.equal(api.metadata.mock.callCount(), 0);
  assert.equal(api.values.mock.callCount(), 1);
});

test('three Contact Number columns retain the first non-empty value and skip blank rows', async (t) => {
  const api = mockSheets(t, { grids: { "'Leads'": [
    ['Contact Number', 'Contact Number', 'Contact Number', 'Inquiry Platform'],
    ['111', '222', '333', 'Search'], [' ', '222', '333', 'Social'],
    [null, undefined, ' 333 ', 'Referral'], ['', '', '', 'Walk-in'],
    [0, '222', '333', 'Zero'], [' ', null, ''],
  ] } });
  const result = await new SheetsAdapter(api.client, { ...source, tab: 'Leads' }, noDrive).fetch();
  assert.deepEqual(result.rows.map((row) => [row.rowIndex, row.data['Contact Number']]), [
    [2, '111'], [3, '222'], [4, '333'], [5, ''], [6, '0'],
  ]);
});

test('fetchAny parses the first Excel worksheet when Sheets refuses an Office file', async (t) => {
  const api = mockSheets(t, { metadataError: officeError });
  const drive = mockDrive(t, workbook({ First: [['Name', 'Total'], ['Example', 12]], Second: [['Name'], ['Other']] }));
  const result = await new SheetsAdapter(api.client, source, drive.factory).fetchAny();
  assert.deepEqual(result, {
    key: source.key, rows: [{ rowIndex: 2, data: { Name: 'Example', Total: '12' }, tabTitle: 'First' }],
    warnings: ['read as an Excel file from Drive'],
  });
  assert.equal(drive.factory.mock.callCount(), 1);
  assert.equal(drive.get.mock.callCount(), 2);
});

test('Excel fallback selects the configured worksheet and respects headerRow', async (t) => {
  const api = mockSheets(t, { grids: { "'Chosen'": officeError } });
  const drive = mockDrive(t, workbook({
    First: [['Name'], ['Other']], Chosen: [['Banner'], ['Name', 'Name'], ['', 'Chosen row'], []],
  }));
  const result = await new SheetsAdapter(api.client, { ...source, tab: 'Chosen', headerRow: 2 }, drive.factory).fetchAny();
  assert.deepEqual(result.rows, [{ rowIndex: 3, data: { Name: 'Chosen row' }, tabTitle: 'Chosen' }]);
  assert.deepEqual(result.warnings, ['read as an Excel file from Drive']);
});

test('a missing configured Excel worksheet preserves the first-sheet fallback', async (t) => {
  const api = mockSheets(t, { grids: { "'Missing'": officeError } });
  const drive = mockDrive(t, workbook({ First: [['Name'], ['Example']] }));
  const result = await new SheetsAdapter(api.client, { ...source, tab: 'Missing' }, drive.factory).fetchAny();
  assert.deepEqual(result.rows, [{ rowIndex: 2, data: { Name: 'Example' }, tabTitle: 'First' }]);
});

test('Excel fallback reports an empty worksheet', async (t) => {
  const api = mockSheets(t, { metadataError: officeError });
  const drive = mockDrive(t, workbook({ Empty: [] }));
  assert.deepEqual(await new SheetsAdapter(api.client, source, drive.factory).fetchAny(), {
    key: source.key, rows: [], warnings: ['Excel file is empty'],
  });
});

test('fetchAny uses Sheets for an ordinary spreadsheet without creating a Drive client', async (t) => {
  const api = mockSheets(t, { titles: ['First'], grids: { "'First'": [['Name'], ['Example']] } });
  const result = await new SheetsAdapter(api.client, source, noDrive).fetchAny();
  assert.equal(result.rows.length, 1);
  assert.deepEqual(result.warnings, []);
});

test('fetchAny preserves non-Office errors without trying Drive', async (t) => {
  const failure = new Error('The caller does not have permission');
  const api = mockSheets(t, { metadataError: failure });
  await assert.rejects(new SheetsAdapter(api.client, source, noDrive).fetchAny(), (err) => err === failure);
});

for (const [mimeType, message] of [
  ['application/vnd.google-apps.shortcut', /Drive shortcut; configure the target spreadsheet file ID/],
  ['application/vnd.google-apps.spreadsheet', /native Google Sheet; read it with the Sheets API/],
] as const) {
  test(`Excel fallback explains unsupported ${mimeType} before download`, async (t) => {
    const api = mockSheets(t, { metadataError: officeError });
    const drive = mockDrive(t, new Error('Unexpected download'), { mimeType });
    await assert.rejects(new SheetsAdapter(api.client, source, drive.factory).fetchAny(), message);
    assert.equal(drive.get.mock.callCount(), 1);
  });
}

test('oversized Excel metadata stops the download with an explicit limit', async (t) => {
  const api = mockSheets(t, { metadataError: officeError });
  const drive = mockDrive(t, new Error('Unexpected download'), { size: String(limit + 1) });
  await assert.rejects(new SheetsAdapter(api.client, source, drive.factory).fetchAny(), /exceeds the 10 MiB download limit/);
  assert.equal(drive.get.mock.callCount(), 1);
});

test('Excel metadata at the size limit still permits a valid workbook', async (t) => {
  const api = mockSheets(t, { metadataError: officeError });
  const drive = mockDrive(t, workbook({ First: [['Name'], ['Example']] }), { size: String(limit) });
  assert.equal((await new SheetsAdapter(api.client, source, drive.factory).fetchAny()).rows.length, 1);
});

test('missing metadata cannot bypass the downloaded Excel byte limit', async (t) => {
  const api = mockSheets(t, { metadataError: officeError });
  const drive = mockDrive(t, Buffer.alloc(limit + 1));
  await assert.rejects(new SheetsAdapter(api.client, source, drive.factory).fetchAny(), /exceeds the 10 MiB download limit/);
});

for (const wrapped of [false, true]) {
  test(`Excel transport size failure has a clear message (wrapped: ${wrapped})`, async (t) => {
    const api = mockSheets(t, { metadataError: officeError });
    const failure = Object.assign(new Error('Simulated transport size failure'), wrapped ? { error: { type: 'max-size' } } : { type: 'max-size' });
    const drive = mockDrive(t, failure);
    await assert.rejects(new SheetsAdapter(api.client, source, drive.factory).fetchAny(), (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, 'Excel file exceeds the 10 MiB download limit');
      assert.equal(err.cause, failure);
      return true;
    });
  });
}

for (const phase of ['metadata', 'download'] as const) {
  test(`Excel ${phase} errors keep the original cause`, async (t) => {
    const api = mockSheets(t, { metadataError: officeError });
    const failure = new Error('Simulated Drive permission failure');
    const drive = mockDrive(t, failure, phase === 'metadata' ? failure : {});
    await assert.rejects(new SheetsAdapter(api.client, source, drive.factory).fetchAny(), (err) => err === failure);
  });
}
