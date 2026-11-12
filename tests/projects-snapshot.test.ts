import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  buildSnapshot, isOverdue, kpiStatus, paceTarget, PROJECTS_URL, taskCounts, type ProjectTask, type SnapshotSources,
} from '../lib/projects/snapshot';
import { buildSnapshotDaily } from '../lib/alerts/snapshotDaily';
import { buildActivation } from '../lib/overview/activation';
import type { Funnel } from '../lib/ortho/dashboard';
import { REVENUE_TARGETS } from '../config/project-targets';
import { PLANTED_NAME, PLANTED_PHONE, TODAY, nullActivation, sampleActivation } from './fixtures/activation';

const task = (id: string, project: ProjectTask['project'], status: ProjectTask['status'], due: string | null, note: string | null = null): ProjectTask =>
  ({ id, project, channel: 'Example channel', task: `Example task ${id}`, owner: 'Example owner', due, status, note, completedOn: null });

const funnel = (over: Partial<Funnel> = {}): Funnel => ({
  googleSpend: 0, googleClicks: 0, googleImpressions: 0, metaSpend: 100, metaPeople: 10, metaRealPeople: 6, spend: 100,
  leads: 9, leadsBooked: 2, appointments: 3, attended: 2, newAttended: 1, assessments: 1, starts: 0, startsAed: 0, orthoBilled: 0, ...over,
});

function sources(over: Partial<SnapshotSources> = {}): SnapshotSources {
  const raw = sampleActivation();
  return {
    today: TODAY, activation: buildActivation(raw), orthoFunnel: { yesterday: funnel(), mtd: funnel({ spend: 2400, leads: 120, attended: 30, starts: 4 }), segments: [] },
    gbp: null, tasks: [], readAt: '2026-10-29T05:00:00Z', ...over,
  };
}

test('tasks: overdue means past due and neither done nor on hold; counts by status', () => {
  const ts = [
    task('A', 'ortho', 'Done', '2026-10-01'),
    task('B', 'ortho', 'On hold', '2026-10-01'),
    task('C', 'ortho', 'Not started', '2026-10-28'),
    task('D', 'ortho', 'In progress', '2026-10-29'),
    task('E', 'ortho', 'Blocked', null),
  ];
  assert.deepEqual(ts.map((t) => isOverdue(t, TODAY)), [false, false, true, false, false]);
  assert.deepEqual(taskCounts(ts, TODAY), { total: 5, done: 1, inProgress: 1, notStarted: 1, blocked: 1, onHold: 1, overdue: 1 });
});

test('targets: pace is the month target spread over the days so far; 5% band either side is on target', () => {
  assert.equal(paceTarget(31_000, { from: '2026-10-01', to: '2026-10-15' }), 15_000);
  assert.equal(paceTarget(30_000, { from: '2026-11-01', to: '2026-11-30' }), 30_000);
  assert.equal(kpiStatus(100, 100), 'on-target');
  assert.equal(kpiStatus(96, 100), 'on-target');
  assert.equal(kpiStatus(94, 100), 'behind');
  assert.equal(kpiStatus(106, 100), 'ahead');
  assert.equal(kpiStatus(50, null), 'no-target');
  assert.equal(kpiStatus(null, 100), 'no-data');
});

test('health: blocked beats behind beats on track; a figure with no target is never behind', () => {
  const s = buildSnapshot(sources({
    tasks: [
      task('C1', 'clinic-activation', 'Not started', '2026-10-20'),
      task('G1', 'gbp', 'Blocked', '2026-11-05', 'Waiting for artwork'),
      task('S1', 'smile-club', 'In progress', '2026-11-05'),
      task('O1', 'ortho', 'Done', '2026-10-10'),
    ],
  }));
  const by = Object.fromEntries(s.projects.map((p) => [p.key, p]));
  assert.deepEqual(s.projects.map((p) => p.key), ['clinic-activation', 'ortho', 'gbp', 'smile-club']);
  assert.equal(by.gbp.health, 'blocked');
  assert.match(by.gbp.bottlenecks[0], /^Blocked: Example task G1 \(Example owner\): Waiting for artwork$/);
  assert.equal(by['clinic-activation'].health, 'behind');
  assert.ok(by['clinic-activation'].bottlenecks.some((b) => b === 'Overdue: Example task C1 (Example owner, due 20 Oct, 9 days late)'));
  // DN Ortho and Smile Club have no targets yet: never behind on figures, and nothing overdue here.
  assert.equal(by.ortho.health, 'on-track');
  assert.equal(by['smile-club'].health, 'on-track');
  for (const k of [...by.ortho.kpis, ...by['smile-club'].kpis]) {
    assert.ok(k.status === 'no-target' || k.status === 'no-data', k.label);
    assert.equal(k.targetToDate, null);
  }
  for (const p of s.projects) assert.equal(p.detailUrl, `${PROJECTS_URL}#${p.key}`);
});

test('revenue carries the management targets, paced to the window', () => {
  const s = buildSnapshot(sources());
  const ca = s.projects.find((p) => p.key === 'clinic-activation')!;
  const total = ca.kpis.find((k) => k.label === 'Billed revenue, all three clinics')!;
  assert.equal(total.monthTarget, REVENUE_TARGETS.total.value);
  assert.equal(total.targetToDate, paceTarget(REVENUE_TARGETS.total.value, s.window));
  assert.match(total.targetNote, /KPI workbook/);
  assert.ok(ca.kpis.filter((k) => k.label.startsWith('Billed revenue, ')).every((k) => k.monthTarget != null));
});

test('nothing readable: every figure is "not yet", nothing is marked behind on a null, tasks say not available', () => {
  const s = buildSnapshot({ today: TODAY, activation: buildActivation(nullActivation()), orthoFunnel: null, gbp: null, tasks: null, readAt: 'x' });
  assert.equal(s.tasksRead, false);
  for (const p of s.projects) {
    assert.ok(p.kpis.every((k) => k.status !== 'behind'), p.key);
    assert.doesNotMatch(p.headline, /\b0\b/, p.key);
    assert.match(p.headline, /not yet/, p.key);
    assert.equal(p.health, 'no-data', p.key);
  }
  const email = buildSnapshotDaily(s, TODAY);
  assert.match(email.html, /not available/);
});

test('email: one row per project, linked to its detail; subject counts; no patient data; no dashes', () => {
  const s = buildSnapshot(sources({ tasks: [task('C1', 'clinic-activation', 'Not started', '2026-10-20')] }));
  const { subject, html } = buildSnapshotDaily(s, TODAY, { recipients: 'To Ms Shadi; copied to Fahad.' });
  assert.match(subject, /^Daily snapshot · Thu 29 Oct · \d on track, \d behind/);
  for (const p of s.projects) {
    assert.ok(html.includes(p.name.replace(/&/g, '&amp;')), p.name);
    assert.ok(html.includes(`${PROJECTS_URL}#${p.key}`), p.key);
  }
  assert.ok(html.includes('1 overdue'));
  assert.ok(html.includes('To Ms Shadi; copied to Fahad.'));
  assert.ok(!html.includes(PLANTED_NAME) && !html.includes(PLANTED_PHONE));
  assert.doesNotMatch(subject + html, /[–—]/);
});
