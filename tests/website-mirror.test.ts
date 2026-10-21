import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { sheets_v4 } from 'googleapis';
import type { AdminClient } from '../lib/supabase/server';
import { getChannelPerformance, getWebsiteEnquiries } from '../lib/growth/channelPerformance';
import { readWebsiteReview, websiteReviewLine, type WebsiteReviewSnapshot } from '../lib/growth/websiteReview';
import { selectWebsiteEnquiries, type WebsiteEnquiry } from '../lib/growth/websiteEnquiries';
import { planWebsiteMirror, syncWebsiteMirror, websiteReviewDays } from '../lib/sync/websiteMirror';
import { dayFromSheet, sheetDay, websiteSummaryRows } from '../lib/sync/websiteMirrorLayout';
import { WEBSITE_ENQUIRIES_TAB as MIRROR, WEBSITE_SUMMARY_TAB as SUMMARY, WEBSITE_HEADERS, WEBSITE_VALIDITY, WEBSITE_ORPHAN_STATUS } from '../config/website-enquiries';
import { sheetMapping } from '../config/sheet-mapping';
import { SheetsAdapter } from '../lib/sync/adapters/sheets-adapter';
import { normalizeLeads } from '../lib/sync/normalize';
import { fixtureDb } from './fixtures/dn015-db';
import { readFileSync } from 'node:fs';

const now = new Date('2026-10-21T12:00:00Z');
const phone = (i: number) => `000000${String(i).padStart(3, '0')}`; // synthetic, non-dialable
const widget = (i: number, stamp: string, extra: Record<string, unknown> = {}) => ({ data: {
  'Full Name': `Fixture ${i}`, 'Phone Number': phone(i), Timestamp: stamp, 'Clinic Name': 'Al Wasl', Treatment: 'Synthetic service', ...extra,
} });
const tracker = (i: number, date: string, extra: Record<string, unknown> = {}) => ({ inquiry_date: date, raw_row: {
  'Patient Name': `Fixture ${i}`, 'Contact Number': phone(i), 'Source Type': 'Website Inquiry', 'Clinic / Branch': 'Tosun clinic', ...extra,
} });
const candidates = (): WebsiteEnquiry[] => selectWebsiteEnquiries([
  { p9: phone(1), date: '2026-10-01', hasLane: false, paidSearch: false, data: widget(1, '2026-10-01T10:20:30').data },
  { p9: phone(2), date: '2026-10-02', hasLane: false, paidSearch: false, data: widget(2, '2026-10-02T10:20:30', { 'Clinic Name': 'Tosun clinic' }).data },
], []);

/** Complete mutable Sheets double. It rejects any write outside the two new
 * tabs, and rejects updates to team columns. Nothing creates real clients. */
function harness(initial: unknown[][] = [], fail?: 'permission' | 'appendAfterCommit' | 'readback' | 'storage' | 'ignoredRefresh' | 'sortDuringWrite' | 'sortBeforeWrite') {
  const grids: Record<string, unknown[][]> = { Existing: [['untouched']], ...(initial.length ? { [MIRROR]: structuredClone(initial) } : {}) };
  const tabs = Object.keys(grids).map((title, sheetId) => ({ properties: { title, sheetId } }));
  const requests: sheets_v4.Schema$Request[] = [];
  let snapshot: WebsiteReviewSnapshot | null = null;
  let appended = 0, reads = 0, failOnce = true, claimed = false;
  const check = (title: string) => assert.ok([MIRROR, SUMMARY].includes(title), `Unexpected write to ${title}`);
  const titleOf = (range: string) => range.match(/^'([^']+)'/)![1];
  const sheets = { spreadsheets: {
    async get() { return { data: { sheets: structuredClone(tabs) } }; },
    async batchUpdate({ requestBody }: { requestBody: { requests: sheets_v4.Schema$Request[] } }) {
      if (fail === 'permission') throw Object.assign(new Error('Synthetic forbidden'), { code: 403 });
      for (const req of requestBody.requests) {
        requests.push(req);
        if (req.addSheet) {
          const props = req.addSheet.properties!;
          check(props.title!);
          assert.equal(grids[props.title!], undefined);
          grids[props.title!] = [];
          tabs.push({ properties: { title: props.title!, sheetId: props.sheetId! } });
        }
        if (req.updateCells) {
          const title = tabs.find((t) => t.properties.sheetId === req.updateCells!.start!.sheetId)!.properties.title;
          check(title);
          grids[title] = req.updateCells.rows!.map((row) => row.values!.map((c) => c.userEnteredValue?.stringValue ?? c.userEnteredValue?.numberValue ?? c.userEnteredValue?.formulaValue ?? ''));
        }
      }
      return { data: {} };
    },
    values: {
      async get({ range }: { range: string }) {
        // A teammate sorts the tab between our full read and our pre-write ID check.
        if (fail === 'sortBeforeWrite' && range.endsWith('!A:A')) { const [, first, second, ...rest] = grids[MIRROR]; grids[MIRROR] = [grids[MIRROR][0], second, first, ...rest]; }
        if (range.endsWith('!A:A')) return { data: { values: structuredClone(grids[titleOf(range)]).map((row) => [row[0]]) } };
        reads++;
        if (fail === 'readback' && reads > 1) throw new Error('Synthetic readback unavailable');
        return { data: { values: structuredClone(grids[titleOf(range)]) } };
      },
      async batchUpdate({ requestBody }: { requestBody: { valueInputOption: string; data: { range: string; values: unknown[][] }[] } }) {
        if (fail === 'permission') throw { response: { status: 403 } };
        if (fail === 'ignoredRefresh') return { data: {} };
        // A teammate sorts the tab between our read and our write.
        if (fail === 'sortDuringWrite') { const [, first, second, ...rest] = grids[MIRROR]; grids[MIRROR] = [grids[MIRROR][0], second, first, ...rest]; }
        assert.equal(requestBody.valueInputOption, 'RAW');
        for (const update of requestBody.data) {
          check(titleOf(update.range));
          const machine = update.range.match(/!A(\d+):J(\d+)$/);
          const status = update.range.match(/!I(\d+)$/);
          assert.ok(machine || status, 'Only machine cells A:J may be updated');
          const row = grids[MIRROR][Number((machine ?? status)![1]) - 1];
          if (machine) update.values[0].forEach((v, i) => { row[i] = v; });
          else row[8] = update.values[0][0];
        }
        return { data: {} };
      },
      async append({ range, valueInputOption, requestBody }: { range: string; valueInputOption: string; requestBody: { values: unknown[][] } }) {
        check(titleOf(range));
        assert.equal(valueInputOption, 'RAW');
        for (const row of requestBody.values) assert.equal(row.length, 10);
        grids[MIRROR].push(...structuredClone(requestBody.values));
        appended += requestBody.values.length;
        if (fail === 'appendAfterCommit' && failOnce) { failOnce = false; throw new Error('Synthetic lost append response'); }
        return { data: {} };
      },
    },
  } } as unknown as sheets_v4.Sheets;
  const db = { async rpc(name: string) {
    if (name === 'release_website_mirror') { claimed = false; return { error: null }; }
    assert.equal(name, 'claim_website_mirror');
    if (claimed) return { data: false, error: null };
    claimed = true;
    return { data: true, error: null };
  }, from(table: string) {
    assert.equal(table, 'website_review_snapshot');
    return { async upsert(value: WebsiteReviewSnapshot) { if (fail === 'storage') return { error: new Error('Synthetic storage error') }; snapshot = value; return { error: null }; } };
  } } as unknown as AdminClient;
  const run = (rows = candidates()) => syncWebsiteMirror(db, { sheets: () => sheets, candidates: async () => rows, now: () => now });
  return { grids, requests, run, snapshot: () => snapshot, appended: () => appended };
}

test('one selector reconciles sheet gross and Growth across inclusive ranges and repeated phones', async () => {
  const db = fixtureDb({
    raw_zavis: [
      widget(1, '2026-10-01T10:20:01'), widget(1, '2026-10-01T10:20:59'),
      widget(1, '2026-10-02T10:20:00'), widget(2, '2026-10-03T11:00:00', { Source: 'google / fixture' }),
      widget(3, '2026-09-30T10:20:00'), widget(4, '2026-10-21T23:59:00'),
      widget(5, '2026-10-04T10:00:00', { 'Full Name': 'test fixture' }),
      widget(6, '2026-10-04T10:00:00', { 'Booking Reference': 'BK-FIXTURE' }),
    ],
    leads: [tracker(7, '2026-10-03'), tracker(8, '2026-10-03', { 'Source Type': 'lead form' }), tracker(9, '2026-10-04', { 'Lead ID': 'WEB-9999', _source_tab: MIRROR })],
    // These standalone sources are NOT counted by Growth and must not expand the mirror.
    ops_form_entries: [{ submitted_at: '2026-10-04', name: 'Fixture offer' }],
    raw_dn_leads: [{ data: { Timestamp: '2026-10-04', Name: 'Fixture incomplete' } }],
  });
  const all = await getWebsiteEnquiries(db, { from: '2026-10-01', to: '2026-10-21' });
  assert.equal(all.length, 4);
  const h = harness();
  assert.equal((await h.run(all)).ok, true);
  for (const range of [
    { from: '2026-10-01', to: '2026-10-21' }, { from: '2026-10-02', to: '2026-10-03' },
    { from: '2026-10-21', to: '2026-10-21' }, { from: '2026-10-05', to: '2026-10-20' },
  ]) {
    const growth = await getChannelPerformance(range, 'all', db, { strict: true });
    const sheetGross = h.grids[MIRROR].slice(1).filter((r) => dayFromSheet(r[1]) >= range.from && dayFromSheet(r[1]) <= range.to).length;
    assert.equal(sheetGross, growth.channels.find((c) => c.key === 'website')!.enquiries);
    assert.equal(sheetGross, (await getWebsiteEnquiries(db, range)).length);
  }
});

test('idempotent runs continue WEB ids and preserve every team cell during machine refresh', async () => {
  const row = candidates()[0];
  const initial = planWebsiteMirror([row], [[...WEBSITE_HEADERS]]).append[0];
  initial[0] = 'WEB-0042';
  const team = ['Yes', 'Called', 'Again', 'Later', 'Fixture desk', 'Booked', 'Converted', 0, '=Fixture note'];
  const h = harness([[...WEBSITE_HEADERS], [...initial, ...team]]);
  const result = await h.run();
  assert.equal(result.ok, true);
  assert.equal(result.appended, 1);
  assert.equal(h.grids[MIRROR][2][0], 'WEB-0043');
  const changed = candidates();
  changed[0] = { ...changed[0], name: '=Synthetic literal', status: 'billed', billed: 125 };
  assert.equal((await h.run(changed)).appended, 0);
  assert.equal(h.grids[MIRROR].length, 3);
  assert.deepEqual(h.grids[MIRROR][1].slice(10), team);
  assert.deepEqual(h.grids[MIRROR][1].slice(8, 10), ['billed', 125]);
  assert.equal(h.grids[MIRROR][1][3], '=Synthetic literal');
  h.grids[SUMMARY][1][1] = '2026-10-10';
  await h.run(changed);
  assert.equal(h.grids[SUMMARY][1][1], '2026-10-10'); // date controls are never rewritten
  assert.deepEqual(h.grids.Existing, [['untouched']]);
});

test('retry after an append committed but its response was lost never duplicates', async () => {
  const h = harness([], 'appendAfterCommit');
  assert.equal((await h.run()).ok, false);
  assert.equal((await h.run()).ok, true);
  assert.equal(h.appended(), 2);
  assert.equal(h.grids[MIRROR].length, 3);
});

test('overlapping syncs share a lease and only one appends', async () => {
  const h = harness();
  const results = await Promise.all([h.run(), h.run()]);
  assert.equal(results.filter((r) => r.skipped).length, 1);
  assert.equal(h.appended(), 2);
  assert.equal((await h.run()).appended, 0); // lease released
});

test('permission errors report needs Editor access and invalidate review without throwing', async () => {
  for (const initial of [[], [[...WEBSITE_HEADERS], ...planWebsiteMirror(candidates(), [[...WEBSITE_HEADERS]]).append]]) {
    const h = harness(initial, 'permission');
    const result = await h.run();
    assert.equal(result.ok, false);
    assert.equal(result.error, 'Inhouse Lead Tracker needs Editor access');
    assert.equal(h.snapshot()?.available, false);
  }
});

test('failed readback or snapshot storage never reports a successful sync', async () => {
  for (const failure of ['readback', 'storage'] as const) {
    const h = harness([], failure);
    assert.equal((await h.run()).ok, false);
    assert.notEqual(h.snapshot()?.available, true);
  }
});

test('readback verifies refreshed machine values before publishing team totals', async () => {
  const grid = [[...WEBSITE_HEADERS], ...planWebsiteMirror(candidates(), [[...WEBSITE_HEADERS]]).append];
  const h = harness(grid, 'ignoredRefresh');
  const changed = candidates(); changed[0].billed = 75; changed[0].status = 'billed';
  const result = await h.run(changed);
  assert.equal(result.ok, false);
  assert.equal(result.error, 'Website mirror readback incomplete');
  assert.equal(h.snapshot()?.available, false);
});

test('canonical branch fallback, AM/PM minutes and source detail preserve known data without guessing', () => {
  const rows = selectWebsiteEnquiries([], [
    { p9: phone(1), date: '2026-10-01', channel: 'website', text: '', data: { ...tracker(1, '2026-10-01').raw_row, 'Clinic / Branch': '', _source_tab: 'TDC Campaign Leads', Time: '1:05 PM', Source: 'Website offer form' } },
    { p9: phone(2), date: '2026-10-01', channel: 'website', text: '', data: { ...tracker(2, '2026-10-01').raw_row, 'Clinic / Branch': 'unknown address', Time: '1:05 AM', Source: 'Website incomplete booking' } },
  ]);
  assert.deepEqual(rows.map((r) => [r.time, r.branch, r.source]), [['01:05', 'Unassigned', 'incomplete booking'], ['13:05', 'Al Wasl', 'offer form']]);
  // One phone, one day: several website rows are one enquiry, with the earliest known time.
  const same = selectWebsiteEnquiries([], [
    { p9: phone(3), date: '2026-10-02', channel: 'website', text: '', data: { ...tracker(3, '2026-10-02').raw_row } },
    { p9: phone(3), date: '2026-10-02', channel: 'website', text: '', data: { ...tracker(3, '2026-10-02').raw_row, Time: '4:30 PM' } },
    { p9: phone(3), date: '2026-10-02', channel: 'website', text: '', data: { ...tracker(3, '2026-10-02').raw_row, Time: '9:15 AM' } },
  ]);
  assert.deepEqual(same.map((r) => [r.date, r.time, r.key]), [['2026-10-02', '09:15', `${phone(3).slice(-9)}|2026-10-02#0`]]);
});

test('machine tab creation installs the exact dropdowns and never touches existing tabs', async () => {
  const h = harness();
  await h.run();
  const rules = h.requests.flatMap((r) => r.setDataValidation ? [r.setDataValidation] : []);
  assert.deepEqual(rules.map((r) => r.range?.startColumnIndex), [10, 15, 16]);
  assert.deepEqual(rules[0].rule?.condition?.values?.map((v) => v.userEnteredValue), WEBSITE_VALIDITY);
  assert.ok(rules.every((r) => r.rule?.strict && r.rule.showCustomUi));
  assert.deepEqual(h.requests.filter((r) => r.addSheet).map((r) => r.addSheet!.properties!.title), [MIRROR, SUMMARY]);
});

test('summary formulas point to the declared date, team and dashboard columns without double counting ORs', () => {
  const rows = websiteSummaryRows();
  assert.equal(rows.length, 9);
  assert.deepEqual(rows[1], ['From', '=DATE(YEAR(TODAY()),MONTH(TODAY()),1)', 'To', '=TODAY()']);
  assert.deepEqual(rows.slice(4).map((r) => r[0]), ['Al Wasl', 'Dr Tosun', 'Al Maher', 'Unassigned', 'Total']);
  const r = rows[4];
  assert.equal(r.length, 18);
  for (const formula of r.slice(1, 15)) {
    assert.ok(formula.includes(`'${MIRROR}'!$B$2:$B>=$B$2`));
    assert.ok(formula.includes(`'${MIRROR}'!$B$2:$B<=$D$2`));
    assert.ok(formula.includes(`'${MIRROR}'!$F$2:$F=$A5`));
  }
  assert.match(r[2], /\$K\$2:\$K="Yes"/);
  assert.match(r[3], /\$K\$2:\$K=""/);
  WEBSITE_VALIDITY.slice(1).forEach((v, i) => assert.ok(r[i + 4].includes(`$K$2:$K="${v}"`)));
  for (const col of ['L', 'M', 'N']) assert.ok(r[10].includes(`$${col}$2:$${col}<>""`));
  assert.match(r[11], /\$P\$2:\$P="Booked"/);
  assert.match(r[11], /\$I\$2:\$I="attended"/);
  assert.match(r[11], /\$I\$2:\$I="billed"/); // a billed enquiry was also booked
  assert.match(r[12], /\$I\$2:\$I="attended"/);
  assert.match(r[12], /\$I\$2:\$I="billed"/); // and attended
  for (const formula of r.slice(1, 15)) assert.ok(formula.includes(`$I$2:$I<>"no longer counted as website"`));
  for (const formula of r.slice(1, 15)) assert.ok(formula.includes(`LEFT('${MIRROR}'!$A$2:$A,4)="WEB-"`)); // same population rule as the sync
  assert.match(r[13], /\$Q\$2:\$Q="Converted"/);
  assert.match(r[13], /\$I\$2:\$I="billed"/);
  for (const i of [10, 11, 13]) assert.match(r[i], />0\)\)$/);
  assert.match(r[14], /IF\('Website Enquiries \(auto\)'!\$R\$2:\$R<>"",IFERROR\(1\*/);
  assert.match(r[14], /\$J\$2:\$J/);
  assert.equal(r[15], '=IFERROR(C5/B5,0)');
  // Booked / actual and Converted / actual count only Actual rows in the numerator.
  for (const i of [16, 17]) { assert.match(r[i], /^=IFERROR\(SUMPRODUCT\(/); assert.ok(r[i].includes('$K$2:$K="Yes"')); assert.ok(r[i].endsWith('/C5,0)')); }
  assert.ok(r[16].includes('$P$2:$P="Booked"'));
  assert.ok(r[17].includes('$Q$2:$Q="Converted"'));
  assert.ok(!rows[8][1].includes('$F$2:$F'));
  assert.equal(dayFromSheet(sheetDay('2026-10-21')), '2026-10-21');
});

test('both new tabs are excluded even when configured explicitly or changed to tracker headers', async () => {
  const titles = ['Branch', MIRROR, SUMMARY];
  const read: string[] = [];
  const sheets = { spreadsheets: { async get() { return { data: { sheets: titles.map((title) => ({ properties: { title } })) } }; }, values: {
    async get({ range }: { range: string }) { read.push(range); return { data: { values: [['Patient Name', 'Contact Number', 'Inquiry Platform', 'Date'], ['Fixture branch', phone(1), 'Website', '2026-10-01']] } }; },
  } } } as unknown as sheets_v4.Sheets;
  const result = await new SheetsAdapter(sheets, { ...sheetMapping.leadTracker, tabs: titles }).fetch();
  assert.deepEqual(read, ["'Branch'"]);
  assert.equal(result.rows.length, 1);
  const excluded = titles.slice(1).map((tabTitle) => ({ tabTitle, rowIndex: 2, data: { 'Patient Name': 'Fixture', 'Contact Number': phone(2), Date: '2026-10-01', 'Inquiry Platform': 'Website' } }));
  assert.equal(normalizeLeads(sheetMapping.leadTracker, excluded).rows.length, 0);
});

test('team readback counts OR outcomes once and returns unavailable on stale, missing, failed or mismatched snapshots', async () => {
  const h = harness();
  await h.run();
  h.grids[MIRROR][1][10] = 'Yes'; h.grids[MIRROR][1][15] = 'Booked'; h.grids[MIRROR][1][16] = 'Converted';
  const rows = candidates(); rows[0].status = 'booked'; rows[1].status = 'billed'; rows[1].billed = 50;
  await h.run(rows);
  const snapshot = h.snapshot()!;
  const db = (overrides = {}) => fixtureDb({ website_review_snapshot: [{ id: 'website', ...snapshot, ...overrides }] });
  const range = { from: '2026-10-01', to: '2026-10-21' };
  const review = await readWebsiteReview(db(), range, 2, now.getTime());
  assert.deepEqual(review, { gross: 2, actual: 1, notYetReviewed: 1, booked: 2, converted: 2 }); // billed implies booked
  assert.equal(websiteReviewLine(review, { enquiries: 2, booked: 1, treated: 1 }), 'Gross 2 · Actual 1 · Not yet reviewed 1 · Booked 2 · Converted 2');
  assert.match(websiteReviewLine(review, { enquiries: 2, booked: 1, treated: 1 }, true), /Gross 2 · Booked 1 · Converted 1 · team review on the All clinics view/);
  assert.match(websiteReviewLine(null, undefined), /Website figures unavailable · team review unavailable/);
  assert.match(websiteReviewLine(null, { enquiries: 9, booked: 4, treated: 3 }), /Gross 9 · Booked 4 · Converted 3 · team review unavailable/);
  for (const overrides of [{ available: false }, { synced_at: 'invalid' }, { synced_at: '2026-10-20T00:00:00Z' }, { days: null }]) assert.equal(await readWebsiteReview(db(overrides), range, 2, now.getTime()), null);
  assert.equal(await readWebsiteReview(db(), range, 3, now.getTime()), null);
  assert.equal(await readWebsiteReview(db(), { from: '2026-09-01' }, 2, now.getTime()), null);
  assert.equal(await readWebsiteReview(fixtureDb({}, 'website_review_snapshot'), range, 0, now.getTime()), null);
  assert.equal(await readWebsiteReview(fixtureDb({}), range, 0, now.getTime()), null);
  assert.equal(JSON.stringify(snapshot).includes(phone(1)), false);
  assert.equal(JSON.stringify(snapshot).includes('Fixture'), false);
});

test('Growth appointment verdict and file billing joins supply statuses; no widget status guesses', async () => {
  const db = fixtureDb({
    raw_zavis: [widget(1, '2026-10-01T10:00:00'), widget(2, '2026-10-01T10:00:00'), widget(3, '2026-10-01T10:00:00'), widget(4, '2026-10-01T10:00:00')],
    practo_appointments_raw: [1, 2, 3].map((i) => ({ appt_date: '2026-10-02', patient_phone: phone(i), patient_name: `Fixture ${i}`, mr_no: `DN-FIXTURE-${i}`, status: i === 1 ? 'Booked' : 'Completed', doctor: '', data: {} })),
    practo_bills_raw: [{ bill_date: '2026-10-03', amount: 250, data: { mr_no: 'DN-FIXTURE-3' } }, { bill_date: '2026-09-01', amount: 500, data: { mr_no: 'DN-FIXTURE-3' } }],
  });
  const rows = await getWebsiteEnquiries(db, { from: '2026-10-01', to: '2026-10-21' });
  assert.deepEqual(rows.map((r) => [r.status, r.billed]), [['booked', null], ['attended', null], ['billed', 250], ['', null]]);
});

test('phoneless rows stay separate; invalid headers and duplicate IDs fail before writes; orphans are marked, not fatal', () => {
  const rows = selectWebsiteEnquiries([], [1, 2].map((i) => ({ p9: '', date: '2026-10-01', channel: 'website', text: '', data: { ...tracker(i, '2026-10-01').raw_row, 'Patient Name': 'Fixture same', 'Contact Number': '' } })));
  assert.equal(rows.length, 2);
  const grid = [[...WEBSITE_HEADERS], ...planWebsiteMirror(rows, [[...WEBSITE_HEADERS]]).append];
  assert.equal(planWebsiteMirror(rows, grid).append.length, 0);
  const current = new Map<string, number>();
  for (const r of rows) { const k = r.key.replace(/#\d+$/, ''); current.set(k, (current.get(k) ?? 0) + 1); }
  assert.equal(websiteReviewDays(grid, current)[0].gross, 2); // identical phoneless enquiries both count, like the dashboard
  assert.throws(() => planWebsiteMirror(rows, [['Changed']]), /headers changed/);
  assert.throws(() => planWebsiteMirror(rows, [grid[0], grid[1], grid[1]]), /duplicate Lead ID/);
  const orphanPlan = planWebsiteMirror([], grid);
  assert.equal(orphanPlan.orphaned, 2);
  assert.deepEqual(orphanPlan.updates.map((u) => u.values[0]), [[WEBSITE_ORPHAN_STATUS], [WEBSITE_ORPHAN_STATUS]]);
  assert.ok(orphanPlan.updates.every((u) => /!I\d+$/.test(u.range)));
});

test('routine tracker edits never stop the mirror: orphans are kept and marked, times can be filled in, hand-typed rows are ignored', async () => {
  const h = harness();
  const base = candidates();
  assert.equal((await h.run(base)).appended, 2);
  h.grids[MIRROR][1][10] = 'Yes'; h.grids[MIRROR][2][10] = 'Spam';
  // The desk fills in a time for enquiry 1 and reclassifies enquiry 2 away from website.
  const edited = [{ ...base[0], time: '14:05' }];
  const result = await h.run(edited);
  assert.equal(result.ok, true);
  assert.equal(result.appended, 0);
  assert.equal(result.orphaned, 1);
  assert.equal(h.grids[MIRROR][1][2], '14:05');
  assert.equal(h.grids[MIRROR][2][8], WEBSITE_ORPHAN_STATUS);
  assert.deepEqual([h.grids[MIRROR][1][10], h.grids[MIRROR][2][10]], ['Yes', 'Spam']); // team cells untouched
  assert.deepEqual(h.snapshot()!.days.map((d) => d.gross), [1]); // orphan excluded from counts
  // A teammate types a row by hand at the bottom: it is ignored, not fatal.
  h.grids[MIRROR].push(['', 45000, '', 'Hand typed', '', '', '', '', '', '', 'Yes']);
  const again = await h.run(edited);
  assert.equal(again.ok, true);
  assert.equal(again.ignoredRows, 1);
  assert.equal(again.refreshed, 0); // nothing changed, nothing written
  // The enquiry comes back as website: it is restored in place, not duplicated.
  const back = await h.run([{ ...base[0], time: '14:05' }, base[1]]);
  assert.equal(back.appended, 0);
  assert.equal(h.grids[MIRROR][2][8], '');
});

test('a sort just before the write is caught before anything is written; a sort mid-write never publishes a review', async () => {
  const h = harness([], 'sortBeforeWrite');
  assert.equal((await h.run()).ok, true); // first run only appends
  h.grids[MIRROR][1][10] = 'Yes'; h.grids[MIRROR][2][10] = 'Spam';
  const changed = candidates(); changed[0].status = 'booked';
  const result = await h.run(changed);
  assert.equal(result.ok, false);
  assert.equal(result.error, 'Website mirror rows moved during sync; review not saved');
  assert.equal(h.snapshot()?.available, false);
  // Nothing was written: each Lead ID still sits next to its own team cells.
  const byId = Object.fromEntries(h.grids[MIRROR].slice(1).map((row) => [row[0], [row[8], row[10]]]));
  assert.deepEqual(byId, { 'WEB-0001': ['', 'Yes'], 'WEB-0002': ['', 'Spam'] });

  const mid = harness([], 'sortDuringWrite');
  await mid.run();
  mid.grids[MIRROR][1][10] = 'Yes'; mid.grids[MIRROR][2][10] = 'Spam';
  const midResult = await mid.run(changed);
  assert.equal(midResult.ok, false);
  assert.match(midResult.error!, /rows moved during sync|duplicate Lead ID/);
  assert.equal(mid.snapshot()?.available, false);
});

test('no cross-channel double counting, independent of row order; tagged same-day evidence wins', async () => {
  const whatsapp = (i: number, date: string) => tracker(i, date, { 'Source Type': 'Organic leads', 'Inquiry Platform': 'WhatsApp' });
  const range = { from: '2026-10-01', to: '2026-10-21' };
  const counts = async (leads: Record<string, unknown>[], raw_zavis: Record<string, unknown>[] = []) => {
    const g = await getChannelPerformance(range, 'all', fixtureDb({ leads, raw_zavis }), { strict: true });
    const by = Object.fromEntries(g.channels.filter((c) => c.enquiries > 0).map((c) => [c.key, c.enquiries]));
    return { by, total: g.totals.enquiries };
  };
  const forward = await counts([whatsapp(1, '2026-10-03'), tracker(1, '2026-10-10')]);
  const backward = await counts([tracker(1, '2026-10-10'), whatsapp(1, '2026-10-03')]);
  assert.deepEqual(forward, backward);
  assert.deepEqual(forward, { by: { website: 1 }, total: 1 });
  // A Google-tagged widget click and the desk's "Website" row on the same day are one paid-search enquiry.
  const tagged = await counts([tracker(2, '2026-10-05')], [widget(2, '2026-10-05T13:38:21', { Source: 'google / fixture' })]);
  assert.deepEqual(tagged, { by: { 'paid-search': 1 }, total: 1 });
  // A widget website booking and the desk's tracker row for it, same day: one website enquiry.
  const both = await counts([tracker(3, '2026-10-06')], [widget(3, '2026-10-06T09:00:00')]);
  assert.deepEqual(both, { by: { website: 1 }, total: 1 });
});

test('scheduled sync contains an isolated website result after silver leads, and both website surfaces render feedback', () => {
  const sync = readFileSync('lib/sync/index.ts', 'utf8');
  assert.ok(sync.indexOf('await syncWebsiteMirror(supabase)') > sync.indexOf("await safeUpsert(supabase, 'leads'"));
  // A companion-tab problem is a data gap only: it never marks the sync partial or raises the banner.
  assert.ok(!sync.includes("sheetsFailed.push('Website mirror')"));
  assert.ok(sync.includes('detail: `Website mirror: ${websiteMirror.error'));
  const ui = readFileSync('components/sections/growth/GrowthPlatform.tsx', 'utf8');
  assert.ok(ui.includes('websiteReviewLine(review ?? null, p, clinicScoped)'));
  assert.ok(!ui.includes("find((c) => c.key === 'website')!"));
  assert.ok(ui.includes('websiteReviewLine(performance.websiteReview ?? null'));
});

test('production US widget timestamps group with ISO tracker days in all-time views; any campaign tag wins', async () => {
  const counts = async (leads: Record<string, unknown>[], raw_zavis: Record<string, unknown>[], range = {}) => {
    const g = await getChannelPerformance(range, 'all', fixtureDb({ leads, raw_zavis }), { strict: true });
    return { by: Object.fromEntries(g.channels.filter((c) => c.enquiries > 0).map((c) => [c.key, c.enquiries])), total: g.totals.enquiries };
  };
  // A plain widget booking (US timestamp) and the desk's tracker row for it on the same day: one website enquiry.
  assert.deepEqual(await counts([tracker(1, '2026-08-05')], [widget(1, '08/05/2026, 13:38:21')]), { by: { website: 1 }, total: 1 });
  // A Google-tagged widget click (US timestamp) and the desk's website row: paid search, as the waterfall credits bookings.
  assert.deepEqual(await counts([tracker(2, '2026-08-05')], [widget(2, '08/05/2026, 13:38:21', { Source: 'google / fixture' })]), { by: { 'paid-search': 1 }, total: 1 });
  // A tag on a different day still wins (R3: a campaign tag anywhere on the phone's history).
  assert.deepEqual(await counts([tracker(3, '2026-10-12')], [widget(3, '2026-10-05T13:38:21', { Source: 'google / fixture' })], { from: '2026-10-01', to: '2026-10-21' }), { by: { 'paid-search': 1 }, total: 1 });
  // An untagged widget row stored before a tagged one must not swallow the tagged enquiry.
  assert.deepEqual(await counts([], [widget(4, '2026-10-05T10:00:00'), widget(4, '2026-10-05T10:05:00', { Source: 'google / fixture' })], { from: '2026-10-01', to: '2026-10-21' }), { by: { 'paid-search': 1 }, total: 1 });
  // The selector reports ISO days for widget rows.
  const rows = selectWebsiteEnquiries([{ p9: phone(5).slice(-9), date: '08/09/2026', hasLane: false, paidSearch: false, data: widget(5, '08/09/2026, 13:38:21').data }], []);
  assert.deepEqual(rows.map((r) => [r.date, r.time]), [['2026-08-09', '13:38']]);
});

test('team review gross equals the dashboard when identical phoneless enquiries exist', async () => {
  const leads = [1, 2].map((i) => tracker(i, '2026-10-05', { 'Patient Name': 'Fixture same', 'Contact Number': '' }));
  const db = fixtureDb({ leads });
  const rows = await getWebsiteEnquiries(db, { from: '2026-10-01', to: '2026-10-21' });
  assert.equal(rows.length, 2);
  const h = harness();
  assert.equal((await h.run(rows)).ok, true);
  const growth = await getChannelPerformance({ from: '2026-10-01', to: '2026-10-21' }, 'all', db, { strict: true });
  assert.equal(h.snapshot()!.days.reduce((n, d) => n + d.gross, 0), growth.channels.find((c) => c.key === 'website')!.enquiries);
});
