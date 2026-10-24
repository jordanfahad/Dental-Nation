/**
 * Smile Club daily 09:00 email (template 1, approved 24 Oct 2026).
 *
 * Sections, in order: at a glance (the Growth "Partnerships (Smile Club)" row),
 * bookings and visits by clinic, partner companies by stage, shoots and
 * scripts, and what is due today per person. Every figure links to the
 * reports.dentalnation.com view that shows it (lib/alerts/links.ts) and the
 * layout comes from lib/alerts/shell.ts.
 *
 * Management rejected task completion percentages, plan percentages and
 * overdue lists, so none of them appear here: "Due today" lists only items
 * due on the send day.
 *
 * readSmileClubDaily is read-only and never throws for one missing source: a
 * source that cannot be read becomes null and renders "not yet".
 * buildSmileClubDaily is pure.
 */
import type { AdminClient } from '@/lib/supabase/server';
import { selectAll } from '@/lib/supabase/selectAll';
import { getChannelPerformance, type GrowthPerfClinic } from '@/lib/growth/channelPerformance';
import { STAGES, type Stage } from '@/lib/smileclub/corporate';
import { SHOOT_CHANGES, SHOOT_PLAN } from '@/lib/smileclub/shoots';
import { DENTISTS } from '@/lib/smileclub/scripts';
import { REVIEWERS, reviewFor, type ReviewEntry, type ReviewerId } from '@/lib/smileclub/review';
import { TRACKER_SOURCE } from '@/lib/smileclub/team';
import { loadCorp, loadReviews } from '@/lib/smileclub/tracker';
import {
  addDaysIso, growthLink, periods, smileClubLink, SMILE_CLUB_COMPANIES, SMILE_CLUB_SCRIPTS, type Range,
} from '@/lib/alerts/links';
import {
  bold, dayLabel, emailHtml, finishEmail, fmt, h2, list, note, NOT_YET, num, proof, rangeLabel, table, text, tiles,
} from '@/lib/alerts/shell';

/* ── data ── */

/** One window of the Growth "Partnerships (Smile Club)" row. */
export interface PartnershipWindow { enquiries: number; booked: number; showed: number }
/** Yesterday and month to date for one Growth clinic view; null = could not be read. */
export interface PartnershipPeriods { yesterday: PartnershipWindow | null; mtd: PartnershipWindow | null }

export type SmileClubPerson = 'gautam' | 'mj' | 'luvi' | 'shadi';

export interface SmileClubDailyData {
  /** Growth "Partnerships (Smile Club)" row per clinic view (gclinic=all, dn-alwasl, dr-tosun). */
  growth: Record<GrowthPerfClinic, PartnershipPeriods>;
  /** Gautam's company list (lane_e.sc_companies); null = could not be read. */
  companies: {
    byStage: Record<Stage, number>;
    /** Company-reported members summed over all companies; null when no company has been entered. */
    members: number | null;
  } | null;
  /** SHOOT_CHANGES entries dated within the last 7 days, newest first (max 4). */
  shootChanges: { iso: string; label: string; text: string }[];
  /** Scripts waiting on each reviewer (lane_e.sc_script_reviews); null = could not be read. */
  scriptsWaiting: Record<ReviewerId, number> | null;
  /** Smile Club team tasks due on the send day per person (lane_e.tasks, max 3 each); null = could not be read. */
  tasksDueToday: Record<SmileClubPerson, string[]> | null;
}

/* ── rules ── */

/** "Due today" order. */
export const DUE_PEOPLE: { id: SmileClubPerson; name: string; owner: string; reviewer?: ReviewerId }[] = [
  { id: 'gautam', name: 'Gautam', owner: 'Gautam', reviewer: 'gautam' },
  { id: 'mj', name: 'MJ', owner: 'MJ' },
  { id: 'luvi', name: 'Dr Luvi', owner: 'Dr Luvi', reviewer: 'luvi' },
  { id: 'shadi', name: 'Ms Shadi', owner: 'Ms Shadi', reviewer: 'shadi' },
];
export const MAX_TASKS_PER_PERSON = 3;
export const MAX_SHOOT_CHANGES = 4;
export const MEMBERS_TARGET = 24;
export const DEFAULT_RECIPIENTS = 'To Gautam, Dr Luvi, Ms Shadi and MJ; copied to Fahad.';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * SHOOT_CHANGES entries ("Fri 23 Oct (Fahad): ...") dated from 7 days before
 * `today` up to `today`, newest first. Entries carry no year, so each takes the
 * latest year that does not put it after `today`.
 */
export function recentShootChanges(today: string, changes: readonly string[] = SHOOT_CHANGES, max = MAX_SHOOT_CHANGES) {
  const from = addDaysIso(today, -7);
  const out: { iso: string; label: string; text: string }[] = [];
  for (const entry of changes) {
    const m = entry.match(/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) (\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/);
    if (!m) continue;
    const md = `${String(MONTHS.indexOf(m[2]) + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    const year = Number(today.slice(0, 4));
    const iso = `${year}-${md}` <= today ? `${year}-${md}` : `${year - 1}-${md}`;
    if (iso < from || iso > today) continue;
    const split = entry.indexOf('): ');
    out.push(split > 0
      ? { iso, label: entry.slice(0, split + 1), text: entry.slice(split + 3) }
      : { iso, label: entry.slice(0, m[0].length), text: entry.slice(m[0].length).replace(/^[:\s]+/, '') });
  }
  return out.sort((a, b) => b.iso.localeCompare(a.iso)).slice(0, max);
}

/**
 * Scripts waiting on each reviewer: the same rule as the morning briefing's
 * "scripts waiting on you" (approvalsWaiting in lib/smileclub/alerts.ts):
 * dentists whose scripts were sent for sign-off or who film in the next 7
 * days, where that reviewer has not approved the current wording.
 */
export function scriptsWaitingFor(entries: ReviewEntry[], today: string): Record<ReviewerId, number> {
  const sent = new Set(entries.filter((e) => e.decision === 'sent').map((e) => e.dentistId));
  const soon = new Set<string>();
  for (const d of SHOOT_PLAN) {
    if (d.iso < today || d.iso > addDaysIso(today, 7)) continue;
    for (const st of d.stops) for (const sl of st.slots) soon.add(sl.id);
  }
  const out = Object.fromEntries(REVIEWERS.map((r) => [r.id, 0])) as Record<ReviewerId, number>;
  for (const d of DENTISTS) {
    if (!sent.has(d.id) && !soon.has(d.id)) continue;
    const st = reviewFor(d, entries);
    for (const r of REVIEWERS) if (st.per[r.id].state === 'pending' || st.per[r.id].state === 'stale') out[r.id] += 1;
  }
  return out;
}

/* ── read (read-only, never throws) ── */

const safe = async <T>(f: () => Promise<T>): Promise<T | null> => {
  try { return await f(); } catch { return null; }
};

/** The "Partnerships (Smile Club)" row, with the same options the Growth page uses (GrowthPlatform.tsx), so it matches the proof link. */
async function partnership(db: AdminClient, r: Range, clinic: GrowthPerfClinic): Promise<PartnershipWindow | null> {
  const report = await getChannelPerformance(r, clinic, db);
  // The Growth reader returns an empty report (no appointment feed rows) when a source fails: that is "not yet", not zero.
  if (!report.apptFeedRows) return null;
  const row = report.channels.find((c) => c.key === 'partnership');
  return row ? { enquiries: row.enquiries, booked: row.booked, showed: row.showed } : null;
}

interface TaskRow { name: string | null; owner: string | null; status: string | null; raw: { stage?: number; steps?: number } | null }

export async function readSmileClubDaily(db: AdminClient, today: string): Promise<SmileClubDailyData> {
  const p = periods(today);
  const clinics: GrowthPerfClinic[] = ['all', 'dn-alwasl', 'dr-tosun'];
  const [growthRows, corp, reviews, tasks] = await Promise.all([
    Promise.all(clinics.flatMap((c) => [safe(() => partnership(db, p.yesterday, c)), safe(() => partnership(db, p.mtd, c))])),
    safe(() => loadCorp(db)),
    safe(() => loadReviews(db)),
    safe(async () => (await selectAll(() => db.from('tasks').select('id,name,owner,status,raw').eq('source', TRACKER_SOURCE).eq('due_date', today), 'id')).data as TaskRow[]),
  ]);

  const growth = Object.fromEntries(clinics.map((c, i) => [c, { yesterday: growthRows[i * 2], mtd: growthRows[i * 2 + 1] }])) as SmileClubDailyData['growth'];

  let companies: SmileClubDailyData['companies'] = null;
  if (corp) {
    const byStage = Object.fromEntries(STAGES.map((s) => [s.id, 0])) as Record<Stage, number>;
    for (const c of corp.companies) if (c.stage in byStage) byStage[c.stage] += 1;
    // Same rule as the performance brief (lib/performance/reader.ts): no companies entered = members not available.
    companies = { byStage, members: corp.companies.length ? corp.companies.reduce((n, c) => n + (Number(c.members) || 0), 0) : null };
  }

  let tasksDueToday: SmileClubDailyData['tasksDueToday'] = null;
  if (tasks) {
    const open = tasks.filter((t) => t.status !== 'done' && !(Number.isFinite(t.raw?.stage) && Number.isFinite(t.raw?.steps) && (t.raw!.stage as number) >= (t.raw!.steps as number)));
    tasksDueToday = Object.fromEntries(DUE_PEOPLE.map((who) => [who.id, open
      .filter((t) => (t.owner ?? '').trim() === who.owner && (t.name ?? '').trim())
      .map((t) => (t.name as string).trim())
      .sort((a, b) => a.localeCompare(b))
      .slice(0, MAX_TASKS_PER_PERSON)])) as Record<SmileClubPerson, string[]>;
  }

  return {
    growth,
    companies,
    shootChanges: (await safe(async () => recentShootChanges(today))) ?? [],
    scriptsWaiting: reviews ? scriptsWaitingFor(reviews, today) : null,
    tasksDueToday,
  };
}

/* ── build (pure) ── */

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);
/** A small linked figure under a tile value. */
const subFigure = (label: string, value: number | null | undefined, href: string, after = '') =>
  `<div style="font-size:11px">${text(label)}${label ? ' ' : ''}${num(value ?? null, href)}${after ? ` ${text(after)}` : ''}</div>`;

export function smileClubSubject(data: SmileClubDailyData, today: string): string {
  const booked = data.growth.all.yesterday?.booked;
  const enq = data.growth.all.mtd?.enquiries;
  const b = booked == null ? 'booked yesterday not yet' : `${fmt(booked)} booked yesterday`;
  const e = enq == null ? 'enquiries this month not yet' : `${fmt(enq)} ${plural(enq, 'enquiry', 'enquiries')} this month`;
  return `Smile Club · ${dayLabel(today)} · ${b}, ${e}`;
}

export function buildSmileClubDaily(data: SmileClubDailyData, today: string, opts: { preview?: string; recipients?: string } = {}): { subject: string; html: string } {
  const p = periods(today);
  const all = data.growth.all;
  const yAll = growthLink(p.yesterday), mAll = growthLink(p.mtd);

  const glance = tiles([
    { label: 'Enquiries · month to date', value: all.mtd?.enquiries ?? null, href: mAll, extra: subFigure('Yesterday', all.yesterday?.enquiries, yAll) },
    { label: 'Booked · yesterday', value: all.yesterday?.booked ?? null, href: yAll, extra: subFigure('Month to date', all.mtd?.booked, mAll) },
    { label: 'Showed · month to date', value: all.mtd?.showed ?? null, href: mAll, extra: subFigure('of', all.mtd?.booked, mAll, 'booked') },
    { label: 'Members, all companies', value: data.companies?.members ?? null, href: SMILE_CLUB_COMPANIES, sub: `Target ${MEMBERS_TARGET} · company-reported` },
  ]);

  const clinicRow = (name: string, c: 'dn-alwasl' | 'dr-tosun') => {
    const g = data.growth[c];
    const y = growthLink(p.yesterday, c), m = growthLink(p.mtd, c);
    return [text(name), num(g.yesterday?.booked ?? null, y), num(g.mtd?.booked ?? null, m), num(g.mtd?.showed ?? null, m),
      g.mtd ? proof(m) : g.yesterday ? proof(y) : ''];
  };
  const byClinic = table(['Clinic', 'Booked yesterday', 'Booked month to date', 'Showed month to date', ''], [
    clinicRow('Dental Nation Al Wasl', 'dn-alwasl'),
    clinicRow('Dr. Tosun Dental Clinic', 'dr-tosun'),
    [text('Al Maher Medical Centre'), NOT_YET, NOT_YET, NOT_YET, ''],
  ], [1, 2, 3]);

  const companies = table(['Stage', 'Companies', ''], STAGES.map((s) => data.companies
    ? [text(s.label), num(data.companies.byStage[s.id] ?? 0, SMILE_CLUB_COMPANIES), proof(SMILE_CLUB_COMPANIES)]
    : [text(s.label), NOT_YET, '']), [1]);

  const sw = data.scriptsWaiting;
  const swTotal = sw ? REVIEWERS.reduce((n, r) => n + sw[r.id], 0) : null;
  const swBreakdown = sw ? REVIEWERS.filter((r) => sw[r.id] > 0).map((r) => `${r.name} ${fmt(sw[r.id])}`).join(', ') : '';
  const shootRows = data.shootChanges.slice(0, MAX_SHOOT_CHANGES).map((c) => [text(`Shoot plan update, ${c.label}`), text(c.text), proof(SMILE_CLUB_SCRIPTS)]);
  const shoots = table(['Item', 'Status', ''], [
    ...(shootRows.length ? shootRows : [[text('Shoot plan'), text('No changes in the last 7 days'), proof(SMILE_CLUB_SCRIPTS)]]),
    [text('Scripts waiting for review'),
      swTotal == null ? NOT_YET : num(`${fmt(swTotal)}${swBreakdown ? ` (${swBreakdown})` : ''}`, SMILE_CLUB_SCRIPTS),
      swTotal == null ? '' : proof(SMILE_CLUB_SCRIPTS)],
  ]);

  const teamLink = smileClubLink('team');
  const dueLines: string[] = [];
  for (const who of DUE_PEOPLE) {
    const items = (data.tasksDueToday?.[who.id] ?? []).slice(0, MAX_TASKS_PER_PERSON).map((t) => `${text(t)} ${proof(teamLink)}`);
    const n = who.reviewer && sw ? sw[who.reviewer] : 0;
    if (n > 0) items.push(`${text('review')} ${num(n, SMILE_CLUB_SCRIPTS)} ${text(plural(n, 'script'))} ${proof(SMILE_CLUB_SCRIPTS)}`);
    if (items.length) dueLines.push(`${bold(`${who.name}:`)} ${items.join('; ')}`);
  }
  if (!data.tasksDueToday) dueLines.push(`${bold('Tasks due today:')} ${NOT_YET}`);
  if (!sw) dueLines.push(`${bold('Scripts waiting for review:')} ${NOT_YET}`);
  const due = list(dueLines.length ? dueLines : [text('Nothing due today')]);

  const body = [
    h2('At a glance (Partnerships: Smile Club)'), glance,
    note('Enquiries, bookings and visits are the "Partnerships (Smile Club)" row in Growth.'),
    h2('Bookings and visits by clinic'), byClinic,
    h2('Partner companies (Gautam)'), companies,
    h2('Shoots and scripts'), shoots,
    h2('Due today'), due,
  ].join('\n');

  const html = emailHtml({
    kicker: 'SMILE CLUB · DAILY 9 AM',
    title: 'Smile Club: yesterday and month to date',
    subtitle: `${dayLabel(p.yesterday.from)} (yesterday) and ${rangeLabel(p.mtd.from, p.mtd.to)} (month to date)`,
    body,
    landing: { href: smileClubLink(), label: 'Open the Smile Club report' },
    sources: 'Sources: Growth (Partnerships: Smile Club row, from the lead tracker and Practo, every 15 min), Gautam\'s company list, shoot plan and script reviews.',
    recipients: opts.recipients ?? DEFAULT_RECIPIENTS,
    preview: opts.preview,
  });
  return finishEmail(smileClubSubject(data, today), html);
}
