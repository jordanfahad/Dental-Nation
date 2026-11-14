/**
 * Daily project snapshot (Ms Shadi, 12 Nov 2026). She asked for one short
 * manager's view, not five report emails: for every project, its status,
 * yesterday's result, progress against target, what is done, in progress
 * and still to do, and the bottleneck. Each project links to its detail.
 *
 * Projects: Clinic Activation, DN Ortho (with the marketing distribution
 * plan), Google Business Profile and Smile Club.
 *
 * Figures come from the readers behind the existing 09:00 emails
 * (readClinicActivation, which includes the DN Ortho read, and readGbpDaily),
 * so the snapshot never disagrees with them. Tasks come from
 * lane_e.project_tasks, the CEO's 5 Nov execution plan, kept current by the
 * daily project update. Targets come from config/project-targets.ts. A
 * measure with no target is never marked behind; a null is "not yet",
 * never 0.
 *
 * buildSnapshot is pure; readSnapshot does the IO.
 */
import type { AdminClient } from '@/lib/supabase/server';
import { readClinicActivation, type ClinicActivation } from '@/lib/activation/read';
import { buildActivation, type ActivationData } from '@/lib/overview/activation';
import { readGbpDaily, type GbpDailyData } from '@/lib/alerts/gbpDaily';
import { REPORTS, type Range } from '@/lib/alerts/links';
import { NO_TARGET_NOTE, RATING_TARGET, REVENUE_TARGETS } from '@/config/project-targets';

export type ProjectKey = 'clinic-activation' | 'ortho' | 'gbp' | 'smile-club';
export type TaskStatus = 'Not started' | 'In progress' | 'Done' | 'Blocked' | 'On hold';
export type Health = 'on-track' | 'behind' | 'blocked' | 'no-data';
export type KpiStatus = 'ahead' | 'on-target' | 'behind' | 'no-target' | 'no-data';

export interface ProjectTask {
  id: string;
  project: ProjectKey;
  channel: string;
  task: string;
  owner: string;
  due: string | null;
  status: TaskStatus;
  note: string | null;
  completedOn: string | null;
}

export interface Kpi {
  label: string;
  unit: 'aed' | 'count' | 'rating';
  yesterday: number | null;
  /** Month to date (rating: the current average). */
  mtd: number | null;
  /** What month to date should be by now (target pace); null = no target. */
  targetToDate: number | null;
  /** The full month's target; null = no target. */
  monthTarget: number | null;
  status: KpiStatus;
  /** Where the target comes from, or why there is none. */
  targetNote: string;
  href: string;
}

export interface TaskCounts { total: number; done: number; inProgress: number; notStarted: number; blocked: number; onHold: number; overdue: number }

export interface ProjectSnapshot {
  key: ProjectKey;
  name: string;
  health: Health;
  /** Why the health is what it is, in one line. */
  healthWhy: string;
  /** Yesterday in one line. */
  headline: string;
  kpis: Kpi[];
  counts: TaskCounts;
  tasks: ProjectTask[];
  /** The few things holding the project back, worst first. */
  bottlenecks: string[];
  /** The project's own page, /next/projects/<key>. */
  detailUrl: string;
  /** The full report for the project's figures. */
  reportUrl: string;
  reportLabel: string;
}

export interface Snapshot {
  today: string;
  yesterday: Range;
  window: Range;
  readAt: string;
  /** False when the task table could not be read (tasks then show as not available). */
  tasksRead: boolean;
  projects: ProjectSnapshot[];
}

export const PROJECTS_URL = `${REPORTS}next/projects`;
export const PROJECT_NAMES: Record<ProjectKey, string> = {
  'clinic-activation': 'Clinic Activation',
  ortho: 'DN Ortho and marketing plan',
  gbp: 'Google Business Profile',
  'smile-club': 'Smile Club',
};
export const PROJECT_KEYS: readonly ProjectKey[] = ['clinic-activation', 'ortho', 'gbp', 'smile-club'];
const ORDER = PROJECT_KEYS;
/** Each project's own page (Ms Shadi, 14 Nov 2026: one home per project). */
export const projectUrl = (p: ProjectKey) => `${PROJECTS_URL}/${p}`;
export const isProjectKey = (v: string): v is ProjectKey => (PROJECT_KEYS as readonly string[]).includes(v);
/** Within 5% of pace counts as on target. */
const ON_TARGET_BAND = 0.05;

const fmt = (n: number) => n.toLocaleString('en-GB', { maximumFractionDigits: 0 });
const aed = (n: number | null) => (n == null ? 'not yet' : `AED ${fmt(n)}`);
/** "AED 120 spend", or "spend not yet" when unknown. */
const aedOf = (n: number | null, what: string) => (n == null ? `${what} not yet` : `AED ${fmt(n)} ${what}`);
const count = (n: number | null, one: string, many: string) => (n == null ? `${many} not yet` : `${fmt(n)} ${n === 1 ? one : many}`);
const dayMonth = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(`${iso}T12:00:00Z`));
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
const daysInMonth = (iso: string) => new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)), 0)).getUTCDate();
const sumKnown = (xs: (number | null | undefined)[]): number | null => {
  const k = xs.filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
  return k.length ? k.reduce((a, x) => a + x, 0) : null;
};

/** A task is overdue when its due day has passed and it is neither done nor on hold. */
export const isOverdue = (t: ProjectTask, today: string) =>
  t.due != null && t.due < today && t.status !== 'Done' && t.status !== 'On hold';

export function taskCounts(tasks: ProjectTask[], today: string): TaskCounts {
  const by = (s: TaskStatus) => tasks.filter((t) => t.status === s).length;
  return {
    total: tasks.length, done: by('Done'), inProgress: by('In progress'), notStarted: by('Not started'),
    blocked: by('Blocked'), onHold: by('On hold'), overdue: tasks.filter((t) => isOverdue(t, today)).length,
  };
}

/** Pace target: the month's target spread evenly over its days, up to the window's last day. */
export function paceTarget(monthTarget: number, window: Range): number {
  const elapsed = Number(window.to.slice(8));
  return Math.round((monthTarget * elapsed) / daysInMonth(window.to));
}

export function kpiStatus(actual: number | null, target: number | null, direction: 'up' | 'down' = 'up'): KpiStatus {
  if (target == null) return actual == null ? 'no-data' : 'no-target';
  if (actual == null) return 'no-data';
  const ratio = direction === 'up' ? actual / target : target / Math.max(actual, 1e-9);
  if (ratio >= 1 + ON_TARGET_BAND) return 'ahead';
  if (ratio >= 1 - ON_TARGET_BAND) return 'on-target';
  return 'behind';
}

function kpi(
  label: string, unit: Kpi['unit'], yesterday: number | null, mtd: number | null, href: string,
  target?: { month: number; window: Range; source: string } | { level: number; source: string },
): Kpi {
  if (!target) return { label, unit, yesterday, mtd, targetToDate: null, monthTarget: null, status: kpiStatus(mtd, null), targetNote: NO_TARGET_NOTE, href };
  if ('level' in target) {
    return { label, unit, yesterday, mtd, targetToDate: target.level, monthTarget: target.level, status: kpiStatus(mtd, target.level), targetNote: target.source, href };
  }
  const toDate = paceTarget(target.month, target.window);
  return { label, unit, yesterday, mtd, targetToDate: toDate, monthTarget: target.month, status: kpiStatus(mtd, toDate), targetNote: target.source, href };
}

/** "Set up GMB ads on the 3 profiles (Zavis (Syed), due 7 Nov, 5 days late)". */
export function overdueLine(t: ProjectTask, today: string): string {
  const late = daysBetween(t.due!, today);
  return `${t.task} (${t.owner}, due ${dayMonth(t.due!)}, ${late} ${late === 1 ? 'day' : 'days'} late)`;
}

const pctGap = (k: Kpi) =>
  k.mtd != null && k.targetToDate ? Math.round((1 - k.mtd / k.targetToDate) * 100) : null;

function judge(tasks: ProjectTask[], kpis: Kpi[], today: string, extra: string[] = []) {
  const counts = taskCounts(tasks, today);
  const overdue = tasks.filter((t) => isOverdue(t, today)).sort((a, b) => (a.due! < b.due! ? -1 : 1));
  const blocked = tasks.filter((t) => t.status === 'Blocked');
  const behind = kpis.filter((k) => k.status === 'behind');
  // What is stuck first (blocked, then overdue tasks), then data gaps, then results behind target.
  const bottlenecks = [
    ...blocked.map((t) => `Blocked: ${t.task} (${t.owner})${t.note ? `: ${t.note}` : ''}`),
    ...overdue.slice(0, 3).map((t) => `Overdue: ${overdueLine(t, today)}`),
    ...(overdue.length > 3 ? [`and ${overdue.length - 3} more overdue tasks`] : []),
    ...extra,
    ...behind.map((k) => `${k.label} is ${pctGap(k)}% behind target pace (${k.unit === 'aed' ? aed(k.mtd) : fmt(k.mtd ?? 0)} against ${k.unit === 'aed' ? aed(k.targetToDate) : fmt(k.targetToDate ?? 0)} by now)`),
  ];
  // No figure readable and nothing stuck: say so rather than call it on track.
  const noData = kpis.length > 0 && kpis.every((k) => k.mtd == null && k.yesterday == null);
  const health: Health = blocked.length ? 'blocked' : overdue.length || behind.length ? 'behind' : noData ? 'no-data' : 'on-track';
  const why: string[] = [];
  if (blocked.length) why.push(`${blocked.length} ${blocked.length === 1 ? 'task' : 'tasks'} blocked`);
  if (overdue.length) why.push(`${overdue.length} ${overdue.length === 1 ? 'task' : 'tasks'} overdue`);
  for (const k of behind) why.push(`${k.label.toLowerCase()} behind target`);
  if (noData) why.push('figures could not be read');
  const healthWhy = why.length ? why.join('; ') : counts.total ? 'No task overdue and no figure behind target' : 'No figure behind target';
  return { counts, bottlenecks, health, healthWhy };
}

export interface SnapshotSources {
  today: string;
  activation: ActivationData;
  /** The DN Ortho funnel from the same read (ClinicActivation.ortho.funnel); null = unreadable. */
  orthoFunnel: NonNullable<ClinicActivation['ortho']>['funnel'] | null;
  gbp: GbpDailyData | null;
  /** null = the task table could not be read. */
  tasks: ProjectTask[] | null;
  readAt: string;
}

/** Pure: no IO. */
export function buildSnapshot(s: SnapshotSources): Snapshot {
  const { today, activation: a } = s;
  const w = a.window;
  const tasksOf = (p: ProjectKey) => (s.tasks ?? []).filter((t) => t.project === p);
  const projects: ProjectSnapshot[] = [];
  const detail = (p: ProjectKey) => projectUrl(p);
  /** A section of the project's own page, pinned to the snapshot's dates (every figure stays inside its project). */
  const at = (p: ProjectKey, section: string) => `${projectUrl(p)}?${new URLSearchParams({ from: w.from, to: w.to }).toString()}#${section}`;

  /* Clinic Activation: leads and billed revenue per clinic, against the revenue targets. */
  {
    const leadsHref = at('clinic-activation', 'leads');
    const revHref = at('clinic-activation', 'revenue');
    const lt = a.leads.lines.find((l) => l.key === 'total');
    const rows = a.revenue.rows;
    const total = rows.find((r) => r.key === 'total');
    const kpis: Kpi[] = [
      kpi('Leads (front office tracker)', 'count', lt?.yesterday.leads ?? null, lt?.window.leads ?? null, leadsHref),
      kpi('Leads booked or arrived', 'count', lt?.yesterday.converted ?? null, lt?.window.converted ?? null, leadsHref),
      kpi('Billed revenue, all three clinics', 'aed', total?.yesterday ?? null, total?.window ?? null, revHref,
        { month: REVENUE_TARGETS.total.value, window: w, source: REVENUE_TARGETS.total.source }),
      ...rows.filter((r) => r.key !== 'total').map((r) => {
        const t = REVENUE_TARGETS[r.key as keyof typeof REVENUE_TARGETS];
        return kpi(`Billed revenue, ${r.name}`, 'aed', r.yesterday, r.window, revHref, t ? { month: t.value, window: w, source: t.source } : undefined);
      }),
    ];
    const extra = rows.some((r) => r.key === 'al-maher' && r.yesterday == null) ? ["Al Maher's daily report for yesterday is not in yet"] : [];
    const tasks = tasksOf('clinic-activation');
    projects.push({
      key: 'clinic-activation', name: PROJECT_NAMES['clinic-activation'], ...judge(tasks, kpis, today, extra),
      headline: `${count(lt?.yesterday.leads ?? null, 'lead', 'leads')}, ${aedOf(total?.yesterday ?? null, 'billed')}`,
      kpis, tasks, detailUrl: detail('clinic-activation'), reportUrl: at('clinic-activation', 'figures'), reportLabel: 'Detailed figures',
    });
  }

  /* DN Ortho: spend, enquiries, orthodontist visits and starts. No targets set yet. */
  {
    const f = s.orthoFunnel;
    const href = at('ortho', 'funnel');
    const kpis: Kpi[] = [
      kpi('Ad spend (Google and Meta)', 'aed', f?.yesterday.spend ?? null, f?.mtd.spend ?? null, href),
      kpi('Ortho enquiries', 'count', f?.yesterday.leads ?? null, f?.mtd.leads ?? null, at('ortho', 'leads')),
      kpi('Orthodontist visits', 'count', f?.yesterday.attended ?? null, f?.mtd.attended ?? null, href),
      kpi('Treatment starts', 'count', f?.yesterday.starts ?? null, f?.mtd.starts ?? null, href),
    ];
    const tasks = tasksOf('ortho');
    const extra = s.orthoFunnel ? [] : ['DN Ortho figures could not be read this morning'];
    projects.push({
      key: 'ortho', name: PROJECT_NAMES.ortho, ...judge(tasks, kpis, today, extra),
      headline: `${aedOf(f?.yesterday.spend ?? null, 'spend')}, ${count(f?.yesterday.leads ?? null, 'enquiry', 'enquiries')}, ${count(f?.yesterday.attended ?? null, 'orthodontist visit', 'orthodontist visits')}`,
      kpis, tasks, detailUrl: detail('ortho'), reportUrl: at('ortho', 'figures'), reportLabel: 'Detailed figures',
    });
  }

  /* Google Business Profile: Google's figures, reviews and the front office's daily review count. */
  {
    const g = s.gbp;
    const href = at('gbp', 'figures');
    const mtd = (k: 'calls' | 'directions') => (g ? sumKnown(g.branches.map((b) => b.mtd?.[k])) : null);
    const ratings = g?.branches.map((b) => b.reviews).filter((r): r is NonNullable<typeof r> => !!r && r.average != null && r.total > 0) ?? [];
    const reviewTotal = ratings.reduce((n, r) => n + r.total, 0);
    const rating = reviewTotal ? Math.round((ratings.reduce((n, r) => n + (r.average ?? 0) * r.total, 0) / reviewTotal) * 100) / 100 : null;
    const unanswered = g ? sumKnown(g.branches.map((b) => b.reviews?.unanswered)) : null;
    const newReviews = g ? sumKnown(g.branches.map((b) => b.reviews?.newYesterday)) : null;
    const fo = a.gbp.lines.find((l) => l.key === 'total');
    const kpis: Kpi[] = [
      kpi('Calls from Google', 'count', g?.all.day?.calls ?? null, mtd('calls'), href),
      kpi('Direction requests', 'count', g?.all.day?.directions ?? null, mtd('directions'), href),
      kpi('New Google reviews', 'count', newReviews, null, href),
      kpi('Reviews collected by the front office', 'count', null, fo?.window.reviewsToday ?? null, at('gbp', 'gbp')),
      kpi('Average Google rating', 'rating', null, rating, href, { level: RATING_TARGET.value, source: RATING_TARGET.source }),
    ];
    const extra = [
      ...(unanswered ? [`${fmt(unanswered)} written ${unanswered === 1 ? 'review has' : 'reviews have'} no reply yet`] : []),
      ...(g ? [] : ['Google Business Profile figures could not be read this morning']),
    ];
    const tasks = tasksOf('gbp');
    const day = g?.latestDay ? ` (Google's latest day, ${dayMonth(g.latestDay)})` : '';
    projects.push({
      key: 'gbp', name: PROJECT_NAMES.gbp, ...judge(tasks, kpis, today, extra),
      headline: `${count(g?.all.day?.calls ?? null, 'call', 'calls')}, ${count(g?.all.day?.directions ?? null, 'direction request', 'direction requests')}${day}`,
      kpis, tasks, detailUrl: detail('gbp'), reportUrl: href, reportLabel: 'Detailed figures',
    });
  }

  /* Smile Club: enquiries, follow-ups and conversions from the lead tracker. */
  {
    const href = at('smile-club', 'smile-club');
    const sc = a.smileClub.lines.find((l) => l.key === 'total');
    const kpis: Kpi[] = [
      kpi('Smile Club enquiries', 'count', sc?.yesterday.enquiries ?? null, sc?.window.enquiries ?? null, href),
      kpi('Followed up', 'count', sc?.yesterday.followedUp ?? null, sc?.window.followedUp ?? null, href),
      kpi('Converted', 'count', sc?.yesterday.converted ?? null, sc?.window.converted ?? null, href),
    ];
    const tasks = tasksOf('smile-club');
    projects.push({
      key: 'smile-club', name: PROJECT_NAMES['smile-club'], ...judge(tasks, kpis, today),
      headline: `${count(sc?.yesterday.enquiries ?? null, 'enquiry', 'enquiries')}, ${count(sc?.window.converted ?? null, 'conversion', 'conversions')} this month`,
      kpis, tasks, detailUrl: detail('smile-club'), reportUrl: href, reportLabel: 'Smile Club figures',
    });
  }

  projects.sort((x, y) => ORDER.indexOf(x.key) - ORDER.indexOf(y.key));
  return { today, yesterday: a.yesterday, window: w, readAt: s.readAt, tasksRead: s.tasks != null, projects };
}

interface TaskRow {
  id: string; project: string; channel: string; task: string; owner: string; due: string | null;
  status: string; note: string | null; completed_on: string | null;
}

export async function readProjectTasks(db: AdminClient): Promise<ProjectTask[] | null> {
  try {
    const { data, error } = await db.from('project_tasks').select('id,project,channel,task,owner,due,status,note,completed_on').order('sort');
    if (error || !data) return null;
    return (data as TaskRow[]).map((r) => ({
      id: r.id, project: r.project as ProjectKey, channel: r.channel, task: r.task, owner: r.owner, due: r.due,
      status: r.status as TaskStatus, note: r.note, completedOn: r.completed_on,
    }));
  } catch {
    return null;
  }
}

/** The snapshot plus the reads behind it, so a project page can show the detail without reading twice. */
export interface SnapshotParts { snapshot: Snapshot; activation: ActivationData; gbp: GbpDailyData | null }

/** Reads every source; never throws per source. */
export async function readSnapshotParts(db: AdminClient, today: string): Promise<SnapshotParts> {
  const [raw, gbp, tasks] = await Promise.all([
    readClinicActivation(db, today),
    readGbpDaily(db, today).catch(() => null),
    readProjectTasks(db),
  ]);
  const activation = buildActivation(raw);
  const snapshot = buildSnapshot({ today, activation, orthoFunnel: raw.ortho?.funnel ?? null, gbp, tasks, readAt: raw.readAt });
  return { snapshot, activation, gbp };
}

export const readSnapshot = async (db: AdminClient, today: string): Promise<Snapshot> => (await readSnapshotParts(db, today)).snapshot;
