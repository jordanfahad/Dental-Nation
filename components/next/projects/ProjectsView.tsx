/**
 * Projects (/next/projects and /next/projects/<key>): the daily snapshot's
 * detail (Ms Shadi, 12 and 14 Nov 2026). The home shows every project on one
 * screen; each project page shows, in the same order, its status, targets
 * and progress, milestones and activities, bottlenecks, then its detailed
 * figures. Server components, no client JavaScript.
 */
import type { Health, Kpi, ProjectSnapshot, ProjectTask, Snapshot, TaskStatus } from '@/lib/projects/snapshot';

/** As isOverdue in lib/projects/snapshot.ts (not imported: that module pulls in the server-only readers). */
const isOverdue = (t: ProjectTask, today: string) =>
  t.due != null && t.due < today && t.status !== 'Done' && t.status !== 'On hold';

const HEALTH: Record<Health, { label: string; cls: string }> = {
  'on-track': { label: 'On track', cls: 'bg-[#e7f2ec] text-[#1d7a4f]' },
  behind: { label: 'Behind', cls: 'bg-[#fff4e5] text-[#b54708]' },
  blocked: { label: 'Blocked', cls: 'bg-[#fef3f2] text-[#b42318]' },
  'no-data': { label: 'No data', cls: 'bg-[#eef1f2] text-[#5c6c72]' },
};
const TASK: Record<TaskStatus, string> = {
  Done: 'bg-[#e7f2ec] text-[#1d7a4f]',
  'In progress': 'bg-[#fff4e5] text-[#a86a00]',
  'Not started': 'bg-[#e9f0fa] text-[#1f4e9c]',
  Blocked: 'bg-[#fef3f2] text-[#b42318]',
  'On hold': 'bg-[#f3edfa] text-[#6b4e9c]',
};

const th = 'bg-[#f4f7f5] px-3 py-2.5 align-bottom text-[10px] font-semibold tracking-[0.025em] text-[#657275] text-left';
const td = 'border-b border-[#e8eeea] px-3 py-2.5 align-top';
const num = 'text-right tabular-nums whitespace-nowrap';

const fmt = (n: number, dp = 0) => n.toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp });
const dayMonth = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(`${iso}T12:00:00Z`));
const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${iso}T12:00:00Z`));

function Val({ k, v }: { k: Kpi; v: number | null }) {
  if (v == null) return <span className="text-[#8a9598]">not yet</span>;
  return <>{k.unit === 'aed' ? `AED ${fmt(v)}` : k.unit === 'rating' ? fmt(v, 2) : fmt(v)}</>;
}

function Chip({ h }: { h: Health }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${HEALTH[h].cls}`}>{HEALTH[h].label}</span>;
}

function KpiStatusText({ k }: { k: Kpi }) {
  if (k.status === 'no-target') return <span className="text-[#8a9598]">No target set</span>;
  if (k.status === 'no-data') return <span className="text-[#8a9598]">{k.targetToDate == null ? 'No target set' : 'Not yet'}</span>;
  const diff = k.mtd != null && k.targetToDate ? Math.round(Math.abs(1 - k.mtd / k.targetToDate) * 100) : 0;
  if (k.status === 'behind') return <span className="font-bold text-[#b42318]">{diff}% behind</span>;
  if (k.status === 'ahead') return <span className="font-bold text-[#1d7a4f]">{diff}% ahead</span>;
  return <span className="font-bold text-[#1d7a4f]">On target</span>;
}

function TaskTable({ tasks, today }: { tasks: ProjectTask[]; today: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-[12.5px] text-dn-ink">
        <thead>
          <tr>
            <th className={th}>Task</th><th className={th}>Owner</th><th className={th}>Due</th><th className={th}>Status</th><th className={th}>Latest update</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => {
            const late = isOverdue(t, today);
            return (
              <tr key={t.id}>
                <td className={td}>
                  <span className="font-semibold text-dn-navy">{t.task}</span>
                  <span className="text-[11px] text-[#647578]"> · {t.channel} · {t.id}</span>
                </td>
                <td className={`${td} whitespace-nowrap`}>{t.owner}</td>
                <td className={`${td} whitespace-nowrap ${late ? 'font-bold text-[#b42318]' : ''}`}>
                  {t.due ? dayMonth(t.due) : '-'}{late ? ' (overdue)' : ''}
                </td>
                <td className={td}>
                  <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${TASK[t.status]}`}>{t.status}</span>
                  {t.completedOn ? <span className="block text-[11px] text-[#647578]">on {dayMonth(t.completedOn)}</span> : null}
                </td>
                <td className={`${td} text-[#4b5a5d]`}>{t.note ?? ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const GROUPS: { label: string; match: (t: ProjectTask, today: string) => boolean }[] = [
  { label: 'Overdue', match: (t, d) => isOverdue(t, d) },
  { label: 'In progress', match: (t, d) => t.status === 'In progress' && !isOverdue(t, d) },
  { label: 'To do', match: (t, d) => (t.status === 'Not started' || t.status === 'Blocked') && !isOverdue(t, d) },
  { label: 'On hold', match: (t) => t.status === 'On hold' },
  { label: 'Done', match: (t) => t.status === 'Done' },
];

const h3 = 'm-0 mb-1 text-base font-bold tracking-[-0.3px] text-dn-navy sm:text-lg';
const kicker = 'm-0 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-dn-navy';

function Panel({ id, kick, title, sub, children }: { id: string; kick: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="my-4 min-w-0 scroll-mt-4 rounded-[10px] border border-dn-line bg-white p-4 sm:p-5">
      <p className={kicker}>{kick}</p>
      <h2 className={h3}>{title}</h2>
      {sub ? <p className="m-0 mb-3 text-xs text-[#617075]">{sub}</p> : <div className="mb-3" />}
      {children}
    </section>
  );
}

/** The project page heading: name, status, why, and yesterday in one line. */
export function ProjectHeader({ p, data }: { p: ProjectSnapshot; data: Snapshot }) {
  return (
    <div className="mb-4">
      <p className={kicker}>
        <a className="text-dn-navy underline" href="/next/projects">Projects</a> · yesterday {dayLabel(data.yesterday.from)} · month to date {dayMonth(data.window.from)} to {dayMonth(data.window.to)}
      </p>
      <h1 className="m-0 mb-2 flex flex-wrap items-center gap-3 text-[27px] font-bold leading-tight tracking-[-1.1px] text-dn-navy sm:text-[32px]">
        {p.name} <Chip h={p.health} />
      </h1>
      <p className="m-0 text-[13px] text-[#4b5a5d]">{p.healthWhy}. Yesterday: {p.headline}.</p>
    </div>
  );
}

/**
 * The same three blocks on every project page, in this order: targets and
 * progress, milestones and activities, bottlenecks. The detailed figures
 * follow on the page.
 */
export function ProjectOverview({ p, today, tasksRead }: { p: ProjectSnapshot; today: string; tasksRead: boolean }) {
  const c = p.counts;
  return (
    <>
      <Panel id="targets" kick="1 · Targets and progress" title="Results against target" sub="Month to date against the target pace for today. A measure with no target is never marked behind.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-[12.5px] text-dn-ink">
            <thead>
              <tr>
                <th className={th}>Measure</th><th className={`${th} text-right`}>Yesterday</th><th className={`${th} text-right`}>Month to date</th>
                <th className={`${th} text-right`}>Target by now</th><th className={th}>Against target</th>
              </tr>
            </thead>
            <tbody>
              {p.kpis.map((k) => (
                <tr key={k.label}>
                  <td className={td}>
                    <a className="font-semibold text-dn-navy no-underline hover:underline" href={k.href}>{k.label}</a>
                    <span className="block text-[11px] text-[#647578]">{k.targetNote}</span>
                  </td>
                  <td className={`${td} ${num}`}><Val k={k} v={k.yesterday} /></td>
                  <td className={`${td} ${num} font-semibold`}><Val k={k} v={k.mtd} /></td>
                  <td className={`${td} ${num}`}>
                    {k.targetToDate == null ? <span className="text-[#8a9598]">-</span> : <Val k={k} v={k.targetToDate} />}
                    {k.monthTarget != null && k.unit !== 'rating'
                      ? <span className="block text-[11px] text-[#647578]">month: <Val k={k} v={k.monthTarget} /></span> : null}
                  </td>
                  <td className={td}><KpiStatusText k={k} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        id="activities"
        kick="2 · Milestones and activities"
        title={tasksRead && c.total ? `${c.done} done, ${c.inProgress} in progress, ${c.notStarted + c.blocked} to do${c.onHold ? `, ${c.onHold} on hold` : ''}${c.overdue ? ` · ${c.overdue} overdue` : ''}` : 'Activities'}
        sub="From the execution plan, updated every morning before 9am. Owner and due date on every line."
      >
        {!tasksRead
          ? <p className="m-0 text-[12.5px] text-[#647578]">The task list could not be read just now.</p>
          : c.total === 0
            ? <p className="m-0 text-[12.5px] text-[#647578]">No activities in the execution plan for this project yet.</p>
            : GROUPS.map((g) => {
              const list = p.tasks.filter((t) => g.match(t, today));
              return list.length ? (
                <div key={g.label} className="mt-2">
                  <p className="m-0 mb-1 text-[12px] font-bold text-dn-navy">{g.label} ({list.length})</p>
                  <TaskTable tasks={list} today={today} />
                </div>
              ) : null;
            })}
      </Panel>

      <Panel id="bottlenecks" kick="3 · Bottlenecks" title={p.bottlenecks.length ? 'What is holding it back' : 'Nothing holding it back today'}>
        {p.bottlenecks.length
          ? <ul className="m-0 list-disc pl-5 text-[12.5px] text-dn-ink">{p.bottlenecks.map((b) => <li key={b} className="my-1">{b}</li>)}</ul>
          : <p className="m-0 text-[12.5px] text-[#647578]">No blocked or overdue activity and no figure behind target.</p>}
      </Panel>
    </>
  );
}

/** Projects home: every project on one screen, each linking to its own page. */
export function ProjectsView({ data }: { data: Snapshot }) {
  return (
    <div className="min-w-0">
      <div className="mb-4">
        <p className={kicker}>Yesterday {dayLabel(data.yesterday.from)} · month to date {dayMonth(data.window.from)} to {dayMonth(data.window.to)}</p>
        <h1 className="m-0 mb-2 text-[27px] font-bold leading-tight tracking-[-1.1px] text-dn-navy sm:text-[32px]">All projects at a glance</h1>
        <p className="m-0 text-xs text-[#617075]">
          Each project has one page with everything about it: status, targets and progress, milestones and activities, bottlenecks, then the detailed figures.
          Status: Blocked if an activity is blocked; Behind if one is overdue or a figure is behind its target pace; No data if no figure could be read; otherwise On track.
        </p>
      </div>
      <section className="my-4 min-w-0 rounded-[10px] border border-dn-line bg-white p-4 sm:p-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[12.5px] text-dn-ink">
            <thead>
              <tr>
                <th className={th}>Project</th><th className={th}>Status</th><th className={th}>Yesterday</th><th className={th}>Activities</th><th className={th}>Main bottleneck</th>
              </tr>
            </thead>
            <tbody>
              {data.projects.map((p) => (
                <tr key={p.key}>
                  <td className={td}>
                    <a className="font-semibold text-dn-navy underline" href={p.detailUrl.replace(/^https:\/\/[^/]+/, '')}>{p.name}</a>
                  </td>
                  <td className={td}><Chip h={p.health} /></td>
                  <td className={td}>{p.headline}</td>
                  <td className={`${td} whitespace-nowrap`}>
                    {data.tasksRead ? `${p.counts.done} done, ${p.counts.inProgress} in progress, ${p.counts.notStarted + p.counts.blocked} to do` : 'not available'}
                    {p.counts.overdue ? <span className="block font-bold text-[#b42318]">{p.counts.overdue} overdue</span> : null}
                  </td>
                  <td className={td}>{p.bottlenecks[0] ?? <span className="text-[#8a9598]">None</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        {data.projects.map((p) => (
          <a
            key={p.key}
            href={p.detailUrl.replace(/^https:\/\/[^/]+/, '')}
            className="block min-w-0 rounded-[10px] border border-dn-line bg-white p-4 no-underline hover:border-dn-navy sm:p-5"
          >
            <h2 className="m-0 mb-1 flex flex-wrap items-center gap-2 text-base font-bold tracking-[-0.3px] text-dn-navy sm:text-lg">
              {p.name} <Chip h={p.health} />
            </h2>
            <p className="m-0 mb-2 text-[12.5px] text-[#4b5a5d]">{p.healthWhy}. Yesterday: {p.headline}.</p>
            {p.bottlenecks.length ? (
              <ul className="m-0 mb-2 list-disc pl-5 text-[12px] text-dn-ink">
                {p.bottlenecks.slice(0, 3).map((b) => <li key={b} className="my-0.5">{b}</li>)}
              </ul>
            ) : null}
            <span className="text-[12px] font-semibold text-dn-navy underline">Open the {p.name} page</span>
          </a>
        ))}
      </div>
    </div>
  );
}
