import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { AdminClient } from '../lib/supabase/server';
import {
  buildSmileClubDaily, readSmileClubDaily, recentShootChanges, scriptsWaitingFor, type SmileClubDailyData,
} from '../lib/alerts/smileclubDaily';
import { DENTISTS, scriptHash } from '../lib/smileclub/scripts';
import type { ReviewEntry } from '../lib/smileclub/review';

const TODAY = '2026-10-24';
const Y = { from: '2026-10-23', to: '2026-10-23' };
const MTD = { from: '2026-10-01', to: '2026-10-23' };

/** Synthetic figures only; each value is unique so its link can be checked. */
function sample(): SmileClubDailyData {
  return {
    growth: {
      all: { yesterday: { enquiries: 3, booked: 5, showed: 2 }, mtd: { enquiries: 38, booked: 61, showed: 47 } },
      'dn-alwasl': { yesterday: { enquiries: 3, booked: 7, showed: 1 }, mtd: { enquiries: 38, booked: 36, showed: 28 } },
      'dr-tosun': { yesterday: { enquiries: 0, booked: 9, showed: 1 }, mtd: { enquiries: 0, booked: 25, showed: 19 } },
    },
    companies: { byStage: { target: 11, contacted: 8, meeting: 4, proposal: 13, signed: 12, launched: 1, lost: 6 }, members: 14 },
    shootChanges: [{ iso: '2026-10-23', label: 'Fri 23 Oct (Fahad)', text: 'Synthetic shoot moved \u2013 new date to confirm \u2014 waiting for the dentist' }],
    scriptsWaiting: { shadi: 15, luvi: 2, gautam: 0 },
    tasksDueToday: { gautam: ['Follow up \u2014 proposals sent', 'Task two', 'Task three', 'Task four'], mj: [], luvi: [], shadi: [] },
  };
}

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
function anchors(html: string) {
  return [...html.matchAll(/<a href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({ href: decode(m[1]), text: decode(m[2]) }));
}
/** The single anchor whose text is exactly `value`. */
function linkOf(html: string, value: string) {
  const hits = anchors(html).filter((a) => a.text === value);
  assert.equal(hits.length, 1, `expected one link for ${value}, got ${hits.length}`);
  return new URL(hits[0].href);
}
function assertGrowth(html: string, value: string, range: { from: string; to: string }, gclinic: string) {
  const u = linkOf(html, value);
  assert.equal(u.origin + u.pathname, 'https://reports.dentalnation.com/');
  assert.deepEqual(Object.fromEntries(u.searchParams), { tab: 'group', gtab: 'growth', gclinic, preset: 'custom', from: range.from, to: range.to });
}
function assertSmileClub(html: string, value: string, sc: 'team' | 'scripts', hash: string) {
  const u = linkOf(html, value);
  assert.equal(u.origin + u.pathname, 'https://reports.dentalnation.com/');
  assert.deepEqual(Object.fromEntries(u.searchParams), { tab: 'smileclub', sc });
  assert.equal(u.hash, hash);
}

test('subject: day, booked yesterday and enquiries this month', () => {
  assert.equal(buildSmileClubDaily(sample(), TODAY).subject, 'Smile Club · Sat 24 Oct · 5 booked yesterday, 38 enquiries this month');
  const one = sample();
  one.growth.all.mtd = { enquiries: 1, booked: 61, showed: 47 };
  assert.equal(buildSmileClubDaily(one, TODAY).subject, 'Smile Club · Sat 24 Oct · 5 booked yesterday, 1 enquiry this month');
});

test('every figure links to reports.dentalnation.com with the right tab, dates and clinic', () => {
  const { html } = buildSmileClubDaily(sample(), TODAY);
  // Tiles (Growth, all clinics) and their linked sub-figures.
  assertGrowth(html, '38', MTD, 'all');
  assertGrowth(html, '3', Y, 'all');
  assertGrowth(html, '5', Y, 'all');
  assertGrowth(html, '47', MTD, 'all');
  for (const a of anchors(html).filter((x) => x.text === '61')) {
    assert.deepEqual(Object.fromEntries(new URL(a.href).searchParams), { tab: 'group', gtab: 'growth', gclinic: 'all', preset: 'custom', ...MTD });
  }
  assert.equal(anchors(html).filter((x) => x.text === '61').length, 2); // "Month to date 61" and "of 61 booked"
  assertSmileClub(html, '14', 'team', '#corp-pipeline');
  // By clinic.
  assertGrowth(html, '7', Y, 'dn-alwasl');
  assertGrowth(html, '36', MTD, 'dn-alwasl');
  assertGrowth(html, '28', MTD, 'dn-alwasl');
  assertGrowth(html, '9', Y, 'dr-tosun');
  assertGrowth(html, '25', MTD, 'dr-tosun');
  assertGrowth(html, '19', MTD, 'dr-tosun');
  // Companies by stage, in the dashboard's stage order.
  for (const v of ['11', '8', '4', '13', '12', '1', '6']) assertSmileClub(html, v, 'team', '#corp-pipeline');
  const stageOrder = ['Target', 'Contacted', 'Meeting held', 'Proposal sent', 'Trial signed', 'Staff launched', 'Not now'].map((s) => html.indexOf(`>${s}</td>`));
  assert.ok(stageOrder.every((i, k) => i > 0 && (k === 0 || i > stageOrder[k - 1])));
  // Scripts: total with reviewer split, and each reviewer's own count under Due today.
  assertSmileClub(html, '17 (Ms Shadi 15, Dr Luvi 2)', 'scripts', '');
  assertSmileClub(html, '15', 'scripts', '');
  assertSmileClub(html, '2', 'scripts', '');
  // Every link, including Proof links and the landing button, stays on the dashboard.
  for (const a of anchors(html)) assert.ok(a.href.startsWith('https://reports.dentalnation.com/'), a.href);
  assert.ok(anchors(html).some((a) => a.href === 'https://reports.dentalnation.com/?tab=smileclub' && a.text.startsWith('Open the Smile Club report')));
  // Al Maher has no feed: never linked.
  assert.match(html, /Al Maher Medical Centre<\/td>(<td[^>]*><span style="color:#6B7280">not yet<\/span><\/td>){3}<td[^>]*><\/td>/);
});

test('nulls render "not yet" without a link and never as zero', () => {
  const data: SmileClubDailyData = {
    growth: { all: { yesterday: null, mtd: null }, 'dn-alwasl': { yesterday: null, mtd: null }, 'dr-tosun': { yesterday: null, mtd: null } },
    companies: null, shootChanges: [], scriptsWaiting: null, tasksDueToday: null,
  };
  const { subject, html } = buildSmileClubDaily(data, TODAY);
  assert.equal(subject, 'Smile Club · Sat 24 Oct · booked yesterday not yet, enquiries this month not yet');
  // 4 tiles + 3 sub-figures + 9 clinic cells + 7 stages + scripts + 2 due-today lines.
  assert.equal((html.match(/>not yet</g) ?? []).length, 26);
  assert.equal(anchors(html).some((a) => a.text.includes('not yet')), false);
  assert.equal(anchors(html).filter((a) => /^\d/.test(a.text)).length, 0);
  assert.match(html, /<b>Tasks due today:<\/b> <span[^>]*>not yet<\/span>/);
  assert.match(html, /<b>Scripts waiting for review:<\/b> <span[^>]*>not yet<\/span>/);
  assert.doesNotMatch(html, /Nothing due today/);
  assert.match(html, /No changes in the last 7 days/);
  // Members not reported yet, while the rest is known.
  const partial = sample();
  partial.companies!.members = null;
  const p = buildSmileClubDaily(partial, TODAY).html;
  assert.match(p, /Members, all companies<\/div>\s*<div[^>]*><span style="color:#6B7280">not yet<\/span><\/div>/);
});

test('no em or en dashes, no percentages, no overdue lists, no prices', () => {
  const { subject, html } = buildSmileClubDaily(sample(), TODAY, { preview: 'Preview \u2014 sample', recipients: 'To Gautam \u2013 test.' });
  assert.equal(/[\u2013\u2014]/.test(subject + html), false);
  const visible = html.replace(/<[^>]*>/g, ' ');
  assert.doesNotMatch(visible, /%/);
  assert.doesNotMatch(visible, /overdue|completion|score/i);
  assert.doesNotMatch(visible, /AED|dirham/i);
  assert.match(html, /To Gautam - test\./);
  assert.match(html, /Preview - sample/);
});

test('Due today: only people with items, at most 3 tasks each, scripts for reviewers', () => {
  const { html } = buildSmileClubDaily(sample(), TODAY);
  const due = html.slice(html.indexOf('Due today</h2>'));
  assert.match(due, /<b>Gautam:<\/b> Follow up - proposals sent /);
  assert.match(due, /Task three/);
  assert.doesNotMatch(due, /Task four/);
  assert.match(due, /<b>Dr Luvi:<\/b> review <a [^>]*>2<\/a> scripts/);
  assert.match(due, /<b>Ms Shadi:<\/b> review <a [^>]*>15<\/a> scripts /);
  assert.doesNotMatch(due, /<b>MJ:/);
  const task = anchors(due).find((a) => a.text.startsWith('Proof'))!;
  assert.deepEqual(Object.fromEntries(new URL(task.href).searchParams), { tab: 'smileclub', sc: 'team' });
  const order = ['Gautam:', 'Dr Luvi:', 'Ms Shadi:'].map((n) => due.indexOf(n));
  assert.ok(order[0] < order[1] && order[1] < order[2]);

  const quiet = sample();
  quiet.scriptsWaiting = { shadi: 0, luvi: 0, gautam: 0 };
  quiet.tasksDueToday = { gautam: [], mj: [], luvi: [], shadi: [] };
  const q = buildSmileClubDaily(quiet, TODAY).html;
  assert.match(q, /<li[^>]*>Nothing due today<\/li><\/ul>/);
  assert.equal((q.slice(q.indexOf('Due today</h2>')).match(/<li/g) ?? []).length, 1);
});

test('shoot changes: last 7 days only, newest first, at most 4, year inferred', () => {
  const changes = [
    'Fri 23 Oct (Fahad): newest.',
    'Mon 19 Oct (MJ): inside the window.',
    'Sat 17 Oct (MJ): first day of the window.',
    'Fri 16 Oct (MJ): too old.',
    'Sat 24 Oct (Fahad): today, listed out of order.',
    'Tue 20 Oct (MJ): fifth in the window.',
    'Not a dated line',
  ];
  const got = recentShootChanges(TODAY, changes);
  assert.deepEqual(got.map((c) => c.iso), ['2026-10-24', '2026-10-23', '2026-10-20', '2026-10-19']);
  assert.deepEqual(got[1], { iso: '2026-10-23', label: 'Fri 23 Oct (Fahad)', text: 'newest.' });
  assert.deepEqual(recentShootChanges('2027-01-03', ['Tue 29 Dec (MJ): across the year end.']).map((c) => c.iso), ['2026-12-29']);
  // The real shoot log on the approval day: only the 23 Oct entry is within 7 days.
  assert.deepEqual(recentShootChanges(TODAY).map((c) => c.label), ['Fri 23 Oct (Fahad)']);
});

test('scripts waiting: sent or filming soon, and not approved on the current wording', () => {
  const [a, b] = DENTISTS;
  const at = '2026-10-20T08:00:00Z';
  const entries: ReviewEntry[] = [
    { dentistId: a.id, reviewer: 'fahad', decision: 'sent', note: null, hash: scriptHash(a), actor: 'Fahad', at },
    { dentistId: a.id, reviewer: 'shadi', decision: 'approved', note: null, hash: scriptHash(a), actor: 'Ms Shadi', at },
    { dentistId: a.id, reviewer: 'luvi', decision: 'approved', note: null, hash: 'old-wording', actor: 'Dr Luvi', at },
    // Approved but never sent and not filming soon: not counted.
    { dentistId: b.id, reviewer: 'shadi', decision: 'approved', note: null, hash: 'x', actor: 'Ms Shadi', at },
  ];
  assert.deepEqual(scriptsWaitingFor(entries, TODAY), { shadi: 0, luvi: 1, gautam: 1 });
});

type Rows = Record<string, Record<string, unknown>[]>;
/** A Supabase-shaped fake: failing tables answer with an error result, as the real client does. */
function fakeDb(tables: Rows, failing: (t: string) => boolean): AdminClient {
  return { from(table: string) {
    const down = failing(table);
    let rows = [...(tables[table] ?? [])];
    const result = (data: unknown) => (down ? { data: null, error: { message: 'synthetic outage' } } : { data, error: null });
    const q: Record<string, unknown> = {
      select: () => q, order: () => q, in: () => q, limit: () => q, gte: () => q, lte: () => q, like: () => q,
      eq: (k: string, v: unknown) => { rows = rows.filter((r) => r[k] === v); return q; },
      neq: (k: string, v: unknown) => { rows = rows.filter((r) => r[k] !== v); return q; },
      range: async (from: number, to: number) => result(rows.slice(from, to + 1)),
      maybeSingle: async () => result(rows[0] ?? null),
      then: (resolve: (v: unknown) => void) => resolve(result(rows)),
    };
    return q;
  } } as unknown as AdminClient;
}

test('read never throws: every failed source becomes null', async () => {
  const data = await readSmileClubDaily(fakeDb({}, () => true), TODAY);
  for (const c of ['all', 'dn-alwasl', 'dr-tosun'] as const) assert.deepEqual(data.growth[c], { yesterday: null, mtd: null });
  assert.equal(data.companies, null);
  assert.equal(data.scriptsWaiting, null);
  assert.equal(data.tasksDueToday, null);
  assert.deepEqual(data.shootChanges.map((c) => c.iso), ['2026-10-23']);
  assert.match(buildSmileClubDaily(data, TODAY).html, /not yet/);
});

test('read: companies by stage, members, scripts and tasks due today from synthetic rows', async () => {
  const company = (id: string, stage: string, members: number) => ({ id, name: `Company ${id}`, type: 'sme', stage, members, updated_at: '2026-10-20T08:00:00Z' });
  const task = (id: string, owner: string, name: string, due: string, status = 'open', raw: Record<string, unknown> = { stage: 0, steps: 3 }) =>
    ({ id, source: 'smileclub-team', owner, name, due_date: due, status, raw });
  const tables: Rows = {
    sc_companies: [company('a', 'proposal', 5), company('b', 'proposal', 0), company('c', 'signed', 4), company('d', 'lost', 0)],
    sc_calendar_events: [],
    sc_script_reviews: [{ dentist_id: DENTISTS[0].id, reviewer: 'fahad', decision: 'sent', note: null, hash: scriptHash(DENTISTS[0]), actor: 'Fahad', at: '2026-10-20T08:00:00Z' }],
    tasks: [
      task('1', 'Gautam', 'Call the proposals', TODAY),
      task('2', 'Gautam', 'Already done', TODAY, 'done'),
      task('3', 'Gautam', 'All steps ticked', TODAY, 'open', { stage: 3, steps: 3 }),
      task('4', 'Gautam', 'Due tomorrow', '2026-10-25'),
      task('5', 'Mohan', 'Not a recipient', TODAY),
      task('6', 'Dr Luvi', 'B task', TODAY), task('7', 'Dr Luvi', 'A task', TODAY), task('8', 'Dr Luvi', 'D task', TODAY), task('9', 'Dr Luvi', 'C task', TODAY),
      { ...task('10', 'Gautam', 'Other project', TODAY), source: 'manual' },
    ],
  };
  // Growth sources fail; the Smile Club tables still read.
  const growthTables = new Set(['practo_appointments_raw', 'practo_bills_raw', 'meta_insights_raw', 'google_ads_insights_raw', 'ga4_summary', 'social_insights', 'google_ads_click_types', 'meta_platform_insights_raw', 'ga4_lead_events_source']);
  const data = await readSmileClubDaily(fakeDb(tables, (t) => !(t in tables) || growthTables.has(t)), TODAY);
  assert.deepEqual(data.companies, { byStage: { target: 0, contacted: 0, meeting: 0, proposal: 2, signed: 1, launched: 0, lost: 1 }, members: 9 });
  assert.deepEqual(data.scriptsWaiting, { shadi: 1, luvi: 1, gautam: 1 });
  assert.deepEqual(data.tasksDueToday, { gautam: ['Call the proposals'], mj: [], luvi: ['A task', 'B task', 'C task'], shadi: [] });
  assert.deepEqual(data.growth.all, { yesterday: null, mtd: null });

  const none = await readSmileClubDaily(fakeDb({ ...tables, sc_companies: [] }, (t) => !(t in tables) || growthTables.has(t)), TODAY);
  assert.equal(none.companies?.members, null);
  assert.equal(none.companies?.byStage.target, 0);
});

test('read: the Growth "Partnerships (Smile Club)" row per clinic, yesterday and month to date', async () => {
  const appt = (k: string, day: string, status: string, doctor: string, remarks: string) =>
    ({ appt_key: k, appt_date: day, mr_no: `DN-SYN-${k}`, status, doctor, patient_name: null, patient_phone: null, data: remarks ? { remarks } : {} });
  const tables: Rows = {
    practo_appointments_raw: [
      appt('1', '2026-10-23', 'Arrived', '', 'Smile Club member'),
      appt('2', '2026-10-05', 'Booked', '', 'smileclub'),
      appt('3', '2026-10-23', 'Completed', '', ''),
      appt('4', '2026-10-22', 'Completed', 'Dr. Dilsad Ozdogan', 'smile club'),
      appt('5', '2026-09-30', 'Completed', '', 'smile club'),
    ],
  };
  const data = await readSmileClubDaily(fakeDb(tables, () => false), TODAY);
  assert.deepEqual(data.growth.all, { yesterday: { enquiries: 0, booked: 1, showed: 1 }, mtd: { enquiries: 0, booked: 3, showed: 2 } });
  assert.deepEqual(data.growth['dn-alwasl'], { yesterday: { enquiries: 0, booked: 1, showed: 1 }, mtd: { enquiries: 0, booked: 2, showed: 1 } });
  assert.deepEqual(data.growth['dr-tosun'], { yesterday: { enquiries: 0, booked: 0, showed: 0 }, mtd: { enquiries: 0, booked: 1, showed: 1 } });
  // An empty but readable source is a real zero, not "not yet".
  assert.deepEqual(data.companies?.byStage.target, 0);
  assert.deepEqual(data.tasksDueToday, { gautam: [], mj: [], luvi: [], shadi: [] });
  assert.deepEqual(data.scriptsWaiting, { shadi: 0, luvi: 0, gautam: 0 });
});
