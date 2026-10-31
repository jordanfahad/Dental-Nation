/**
 * DN Ortho weekly email (Dr Luvi, 30 Oct 2026): every Monday at 09:00 Dubai,
 * last week (Monday to Sunday) against the week before and since 1 Sep 2026.
 * To Dr Luvi, Mr Akbar and Ms Shadi; copied to Fahad.
 *
 * Every figure comes from lib/ortho/dashboard.ts, the read the /next/ortho
 * page uses, and links to that page for the same dates. A source that cannot
 * be read is "not yet", never 0.
 */
import type { AdminClient } from '@/lib/supabase/server';
import {
  buildOrthoDashboard, funnelFor, mondayOf, ORTHO_FROM, readOrthoSources, type Funnel, type OrthoDashboard,
} from '@/lib/ortho/dashboard';
import { addDaysIso, orthoLink, type Range } from './links';
import { emailHtml, finishEmail, fmt, gap, h2, note, NOT_YET, num, table, text, tiles } from './shell';

const dm = (iso: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(`${iso}T12:00:00Z`));
/** "26 Oct to 1 Nov" (weeks cross months, so both ends carry the month). */
const rangeLabel = (from: string, to: string) => `${dm(from)} to ${dm(to)}`;

export const ORTHO_WEEKLY_RECIPIENTS = 'To Dr Luvi, Mr Akbar and Ms Shadi; copied to Fahad.';

export interface OrthoWeeklyData {
  today: string;
  lastWeek: Range;
  weekBefore: Range;
  since: Range;
  last: Funnel;
  before: Funnel;
  /** Dashboard for last week (segments, outcomes, ad sets). */
  week: OrthoDashboard;
  /** Dashboard since 1 Sep (totals). */
  all: OrthoDashboard;
}

/** The Monday-to-Sunday week before the week holding `today`, and the one before it. */
export function weeklyRanges(today: string): { lastWeek: Range; weekBefore: Range; since: Range } {
  const mon = addDaysIso(mondayOf(today), -7);
  const lastWeek = { from: mon, to: addDaysIso(mon, 6) };
  const weekBefore = { from: addDaysIso(mon, -7), to: addDaysIso(mon, -1) };
  return { lastWeek, weekBefore, since: { from: ORTHO_FROM, to: lastWeek.to } };
}

export async function readOrthoWeekly(db: AdminClient, today: string): Promise<OrthoWeeklyData> {
  const { lastWeek, weekBefore, since } = weeklyRanges(today);
  const sources = await readOrthoSources(db, since);
  return {
    today, lastWeek, weekBefore, since,
    last: funnelFor(sources, lastWeek),
    before: funnelFor(sources, weekBefore),
    week: buildOrthoDashboard(sources, lastWeek),
    all: buildOrthoDashboard(sources, since),
  };
}

const aed = (v: number | null) => (v == null ? null : `AED ${fmt(v)}`);
const cell = (v: number | null, href: string, money = false) => (v == null ? NOT_YET : num(money ? aed(v) : v, href));
const plural = (n: number, one: string, many: string) => `${fmt(n)} ${n === 1 ? one : many}`;

export function buildOrthoWeekly(d: OrthoWeeklyData, _today: string, opts: { preview?: string; recipients?: string } = {}): { subject: string; html: string } {
  const { last, before, lastWeek, weekBefore, since } = d;
  const total = d.all.total;
  const hW = orthoLink(lastWeek, 'weeks');
  const hB = orthoLink(weekBefore, 'weeks');
  const hS = orthoLink(since, 'weeks');

  const rows: [string, (f: Funnel) => number | null, boolean][] = [
    ['Ad spend (Google and Meta)', (f) => f.spend, true],
    ['Google clicks', (f) => f.googleClicks, false],
    ['Meta real chats', (f) => f.metaRealPeople, false],
    ['Ortho enquiries (lead tracker)', (f) => f.leads, false],
    ['Enquiries booked or arrived', (f) => f.leadsBooked, false],
    ['Orthodontist visits attended', (f) => f.attended, false],
    ['New patients seen by an orthodontist', (f) => f.newAttended, false],
    ['Ortho assessments billed', (f) => f.assessments, false],
    ['Ortho treatment starts', (f) => f.starts, false],
    ['Ortho billing', (f) => f.orthoBilled, true],
  ];
  const compare = rows.map(([label, get, money]) => [
    text(label), cell(get(last), hW, money), cell(get(before), hB, money), cell(get(total), hS, money),
  ]);

  const segSum = d.week.segments.reduce((a, s) => a + (s.googleSpend ?? 0), 0);
  const segRows = d.week.segments.map((s) => [
    text(s.name), cell(s.googleSpend, orthoLink(lastWeek, 'segments'), true),
    s.googleSpend == null || !segSum ? text('') : text(`${Math.round((s.googleSpend / segSum) * 100)}%`),
    cell(s.leadsTagged, orthoLink(lastWeek, 'segments')),
  ]);

  const outcomeAll = d.week.outcomes?.reduce((a, o) => a + o.count, 0) ?? 0;
  const outcomeRows = (d.week.outcomes ?? []).filter((o) => o.count > 0).map((o) => [
    text(o.label), num(o.count, orthoLink(lastWeek, 'leads')), text(outcomeAll ? `${Math.round((o.count / outcomeAll) * 100)}%` : ''),
  ]);

  const adRows = (d.week.metaAdSets ?? []).slice(0, 6).map((m) => [
    text(m.name), num(aed(m.spend), orthoLink(lastWeek, 'meta')), text(`${m.people} / ${m.realPeople}`),
    text(m.realPeople ? `AED ${fmt(Math.round(m.spend / m.realPeople))}` : 'none yet'),
  ]);

  const body = [
    tiles([
      { label: 'Ad spend', value: aed(last.spend), href: hW },
      { label: 'Ortho enquiries', value: last.leads, href: orthoLink(lastWeek, 'leads'), sub: last.leadsBooked == null ? undefined : `${fmt(last.leadsBooked)} booked or arrived` },
      { label: 'Visits attended', value: last.attended, href: orthoLink(lastWeek, 'clinic'), sub: last.newAttended == null ? undefined : `${fmt(last.newAttended)} new patients` },
      { label: 'Treatment starts', value: last.starts, href: hW, sub: last.startsAed == null ? undefined : `AED ${fmt(last.startsAed)}` },
    ]),
    h2('1. Last week against the week before'),
    table(['Measure', `Last week (${rangeLabel(lastWeek.from, lastWeek.to)})`, `Week before (${rangeLabel(weekBefore.from, weekBefore.to)})`, 'Since 1 Sep 2026'], compare, [1, 2, 3]),
    note('Ads and enquiries are DN Ortho only. Visits, assessments, starts and billing are every orthodontist patient in Practo, because Practo cannot yet link a patient to a lead or a campaign.'),

    h2('2. Segments (Google Search, last week)'),
    table(['Segment', 'Spend', 'Share', 'Enquiries with the segment code'], segRows, [1, 2, 3]),
    note('Enquiries get a segment once the WhatsApp message carries a code such as DNO-S1 and the front office keeps it in the tracker.'),

    h2('3. What happened to last week’s ortho enquiries'),
    outcomeRows.length ? table(['Status in the lead tracker', 'Enquiries', 'Share'], outcomeRows, [1, 2]) : note(d.week.outcomes == null ? 'The lead tracker could not be read.' : 'No ortho enquiries last week.'),

    h2('4. Meta ortho ad sets, last week'),
    adRows.length ? table(['Ad set or campaign', 'Spend', 'Chats started / real', 'AED per real chat'], adRows, [1, 2, 3]) : note(d.week.metaAdSets == null ? 'Meta Ads could not be read.' : 'No Meta ortho spend last week.'),
    note('A real chat means the person sent at least two messages. Meta’s own leads figure double counts and is not used.'),

    d.all.live.google == null && d.all.live.meta == null ? gap('No DN Ortho ad spend since 1 Sep 2026.') : '',
  ].join('\n');

  const parts = [
    last.spend == null ? 'spend not yet' : `AED ${fmt(last.spend)} spend`,
    last.leads == null ? 'enquiries not yet' : plural(last.leads, 'enquiry', 'enquiries'),
    last.starts == null ? 'starts not yet' : plural(last.starts, 'start', 'starts'),
  ];
  const subject = `DN Ortho weekly · ${rangeLabel(lastWeek.from, lastWeek.to)} · ${parts.join(', ')}`;

  return finishEmail(subject, emailHtml({
    kicker: 'DN ORTHO · WEEKLY, MONDAY 9 AM',
    title: 'DN Ortho: spend, enquiries, appointments and treatment starts',
    subtitle: `${rangeLabel(lastWeek.from, lastWeek.to)}, against ${rangeLabel(weekBefore.from, weekBefore.to)} and since 1 Sep 2026`,
    body,
    landing: { href: orthoLink(since), label: 'Open the DN Ortho dashboard' },
    sources: 'Sources: Google Ads and Meta Ads (campaigns and ad sets named ortho), Inhouse Lead Tracker (lead tabs), Practo appointments and bills.',
    recipients: opts.recipients ?? ORTHO_WEEKLY_RECIPIENTS,
    preview: opts.preview,
  }));
}
