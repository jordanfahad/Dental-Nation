import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { CALENDAR, OBJECTIVES, byWeek, checks, filterCampaign, mix, production, weekLabel, weekStart, withTaskProgress } from '../lib/content/calendar';

test('every entry has a unique id, one of the four objectives, and no em dash', () => {
  assert.equal(new Set(CALENDAR.map((i) => i.id)).size, CALENDAR.length);
  for (const i of CALENDAR) {
    assert.ok((OBJECTIVES as readonly string[]).includes(i.objective), i.id);
    assert.ok(!/—/.test(Object.values(i).join(' ')), i.id);
  }
  assert.equal(CALENDAR.length, 55);
});

test('Smile Club WhatsApp goes in each dentist\'s name to their own patients', () => {
  for (const i of CALENDAR.filter((x) => x.campaign === 'smileclub' && x.platform.startsWith('WhatsApp, in the dentist'))) {
    assert.match(i.audience, /patients/, i.id);
    assert.doesNotMatch(i.platform, /blast/i, i.id);
  }
});

test('weeks start on Monday and read as plain ranges', () => {
  assert.equal(weekStart('2026-10-09'), '2026-10-05');
  assert.equal(weekStart('2026-10-05'), '2026-10-05');
  assert.equal(weekStart('2026-10-11'), '2026-10-05');
  assert.equal(weekLabel('2026-10-05'), '5 to 11 Oct');
  assert.equal(weekLabel('2026-09-28'), '28 Sep to 4 Oct');
});

test('dated entries group by week in date order; undated entries stay apart', () => {
  const { weeks, undated } = byWeek(CALENDAR);
  assert.equal(weeks.reduce((n, w) => n + w.items.length, 0) + undated.length, CALENDAR.length);
  for (const w of weeks) for (const i of w.items) assert.equal(weekStart(i.date!), w.monday);
  assert.ok(undated.every((i) => i.date === null));
  const oct5 = weeks.find((w) => w.monday === '2026-10-05')!;
  assert.equal(oct5.items.filter((i) => i.date === '2026-10-09' && i.format === 'Video').length, 6);
});

test('a task marked done turns an entry to "Made", or notes it on a date still to agree', () => {
  const out = withTaskProgress(CALENDAR, (t) => t === 'm-banner' || t === 'm-v2');
  assert.equal(out.find((i) => i.id === 'sc-banner')!.status, 'ready');
  const ads2 = out.find((i) => i.id === 'sc-ads-2')!;
  assert.equal(ads2.status, 'proposed');
  assert.match(ads2.detail, /made/);
  assert.equal(out.find((i) => i.id === 'co-linkedin')!.status, 'confirm');
});

test('campaign filter and mix', () => {
  assert.ok(filterCampaign(CALENDAR, 'ymk').every((i) => i.campaign === 'ymk'));
  assert.equal(filterCampaign(CALENDAR, 'nonsense').length, CALENDAR.length);
  const m = mix(CALENDAR);
  assert.equal(m.reduce((n, x) => n + x.n, 0), CALENDAR.length);
  assert.equal(m[0].objective, 'Promotional');
});

test('the checks follow the filter and name the open questions in plain words', () => {
  const c = checks(CALENDAR, '2026-10-09');
  assert.ok(c.some((s) => /nobody has confirmed they are made/.test(s)));
  assert.ok(c.some((s) => /Dr Tosun Dental Clinic announcement has no date yet/.test(s)));
  assert.ok(c.some((s) => /Al Maher announcement has no date yet/.test(s)));
  assert.ok(c.some((s) => /educational/.test(s)));
  assert.ok(c.some((s) => /Google Business Profile posts/.test(s)));
  // A YMK-only view only talks about YMK: nothing to check with Mohan, no Tosun or mix lines.
  const ymk = checks(filterCampaign(CALENDAR, 'ymk'), '2026-10-09', false);
  assert.deepEqual(ymk, []);
  // A proposed date that passes without agreement is flagged.
  assert.ok(checks(CALENDAR, '2026-10-13').some((s) => /passed without being agreed/.test(s)));
});

test('production lists filming with edit dates and the filmed status from the shoot plan', () => {
  const p = production('2026-10-09');
  const mon5 = p.find((x) => x.date === '2026-10-05')!;
  assert.match(mon5.delivery, /First edit Thu 8 Oct; finished Sun 11 Oct/);
  assert.match(mon5.status, /1 of 4 filmed; ask Mohan/);
  assert.equal(p.find((x) => x.date === '2026-10-13' && /Filming/.test(x.what))!.status, 'Planned');
});
