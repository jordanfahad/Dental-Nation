/**
 * Daily snapshot 09:00 email (Ms Shadi, 12 Nov 2026): one short email in place
 * of the five report emails. One row per project: status, yesterday, progress
 * against target, tasks and the main bottleneck, each linking to the project's
 * section on /next/projects for the detail (tasks done, in progress and to do,
 * every figure against its target, every bottleneck).
 *
 * Read and view model: lib/projects/snapshot.ts, the same as the page, so the
 * email and the page can never disagree.
 */
import type { AdminClient } from '@/lib/supabase/server';
import { PROJECTS_URL, readSnapshot, type Health, type Kpi, type ProjectSnapshot, type Snapshot } from '@/lib/projects/snapshot';
import { banner, bold, dayLabel, emailHtml, esc, finishEmail, fmt, rangeLabel, table, text } from './shell';

export type SnapshotDailyData = Snapshot;
export const readSnapshotDaily = (db: AdminClient, today: string): Promise<Snapshot> => readSnapshot(db, today);

const HEALTH: Record<Health, { label: string; bg: string; fg: string }> = {
  'on-track': { label: 'On track', bg: '#E7F2EC', fg: '#1D7A4F' },
  behind: { label: 'Behind', bg: '#FFF4E5', fg: '#B54708' },
  blocked: { label: 'Blocked', bg: '#FEF3F2', fg: '#B42318' },
  'no-data': { label: 'No data', bg: '#EEF1F2', fg: '#5C6C72' },
};

export const chip = (h: Health) =>
  `<span style="display:inline-block;white-space:nowrap;border-radius:10px;padding:2px 8px;font-size:10.5px;font-weight:bold;background:${HEALTH[h].bg};color:${HEALTH[h].fg}">${HEALTH[h].label}</span>`;

const value = (k: Kpi, v: number | null) =>
  v == null ? 'not yet' : k.unit === 'aed' ? `AED ${fmt(v)}` : k.unit === 'rating' ? fmt(v, 2)! : fmt(v)!;

/** "Billed revenue, all three clinics: AED 251,000 of AED 316,000 by now (21% behind)". */
export function targetLine(k: Kpi): string {
  if (k.targetToDate == null || k.mtd == null) return '';
  const diff = Math.round(Math.abs(1 - k.mtd / k.targetToDate) * 100);
  const where = k.status === 'behind' ? `${diff}% behind` : k.status === 'ahead' ? `${diff}% ahead` : 'on target';
  const color = k.status === 'behind' ? '#B42318' : '#1D7A4F';
  const of = k.unit === 'rating' ? `against ${value(k, k.targetToDate)}` : `of ${value(k, k.targetToDate)} by now`;
  return `${text(k.label)}: ${bold(value(k, k.mtd))} ${text(of)} <span style="color:${color};font-weight:bold">(${esc(where)})</span>`;
}

const link = (href: string, label: string) =>
  `<a href="${esc(href)}" style="color:#5793A3;text-decoration:none;font-weight:bold;white-space:nowrap">${esc(label)}&nbsp;&#8599;</a>`;

function row(p: ProjectSnapshot, tasksRead: boolean): string[] {
  const targets = p.kpis.filter((k) => k.targetToDate != null && k.mtd != null).slice(0, 1).map(targetLine);
  const c = p.counts;
  const tasks = !tasksRead
    ? '<span style="color:#6B7280">not available</span>'
    : c.total === 0
      ? '<span style="color:#6B7280">none in the plan</span>'
      : `${fmt(c.done)} done, ${fmt(c.inProgress)} in progress, ${fmt(c.notStarted + c.blocked)} to do${c.onHold ? `, ${fmt(c.onHold)} on hold` : ''}${c.overdue ? `<br><span style="color:#B42318;font-weight:bold">${fmt(c.overdue)} overdue</span>` : ''}`;
  return [
    `${bold(p.name)}<br>${link(p.detailUrl, 'Open details')}`,
    chip(p.health),
    text(p.headline),
    targets.length ? targets.join('<br>') : '<span style="color:#6B7280">No target set yet</span>',
    tasks,
    p.bottlenecks.length ? text(p.bottlenecks[0]) : '<span style="color:#6B7280">None</span>',
  ];
}

/** Pure: no IO. */
export function buildSnapshotDaily(data: Snapshot, today: string, opts: { preview?: string; recipients?: string } = {}): { subject: string; html: string } {
  const n = (h: Health) => data.projects.filter((p) => p.health === h).length;
  const parts = [`${n('on-track')} on track`, `${n('behind')} behind`, ...(n('blocked') ? [`${n('blocked')} blocked`] : []), ...(n('no-data') ? [`${n('no-data')} without data`] : [])];
  const all = data.projects.reduce((t, p) => ({
    total: t.total + p.counts.total, done: t.done + p.counts.done, inProgress: t.inProgress + p.counts.inProgress, overdue: t.overdue + p.counts.overdue,
  }), { total: 0, done: 0, inProgress: 0, overdue: 0 });

  const summary = banner(`${bold(`${data.projects.length} projects: ${parts.join(', ')}.`)}${data.tasksRead
    ? ` ${text(`Execution plan: ${all.total} tasks, ${all.done} done, ${all.inProgress} in progress, ${all.overdue} overdue.`)}`
    : ''}`);

  const body = [
    summary,
    table(['Project', 'Status', 'Yesterday', 'Against target (month to date)', 'Tasks', 'Main bottleneck'],
      data.projects.map((p) => row(p, data.tasksRead))),
    `<p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#6B7280;margin:6px 0">${text('Status: Blocked if a task is blocked; Behind if a task is overdue or a figure is behind its target pace; No data if no figure could be read; otherwise On track. "Open details" shows every task (done, in progress, to do), every figure against its target and every bottleneck.')}</p>`,
  ].join('\n');

  const subject = `Daily snapshot · ${dayLabel(today)} · ${parts.join(', ')}`;
  return finishEmail(subject, emailHtml({
    kicker: 'DAILY SNAPSHOT · 9 AM',
    title: 'All projects at a glance',
    subtitle: `Yesterday ${dayLabel(data.yesterday.from)} · month to date ${rangeLabel(data.window.from, data.window.to)}`,
    body,
    landing: { href: PROJECTS_URL, label: 'Open the projects page' },
    sources: 'Sources: the lead tracker, Practo, the Al Maher daily report, Google Ads, Meta, Google Business Profile and the execution plan task list. The same figures as the other 09:00 reports.',
    recipients: opts.recipients ?? 'To Ms Shadi; copied to Fahad.',
    preview: opts.preview,
  }));
}
