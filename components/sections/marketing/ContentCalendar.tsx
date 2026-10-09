import { Card, SectionHeader } from '@/components/ui/Card';
import {
  CALENDAR,
  CAMPAIGNS,
  DATA_AS_OF,
  FREQUENCY,
  STATUS_LABEL,
  addDays,
  byWeek,
  checks,
  dayLabel,
  filterCampaign,
  mix,
  production,
  weekLabel,
  weekStart,
  withTaskProgress,
  type CalendarItem,
  type Objective,
  type Status,
} from '@/lib/content/calendar';
import { dubaiToday, loadTaskStatuses } from '@/lib/smileclub/tracker';

const OBJECTIVE_COLOR: Record<Objective, string> = {
  Promotional: '#1F3A5F',
  'Trust-building': '#15803D',
  Educational: '#6D28D9',
  Engagement: '#B45309',
};

const STATUS_CLASS: Record<Status, string> = {
  live: 'bg-good-50 text-good',
  scheduled: 'bg-good-50 text-good',
  ready: 'bg-good-50 text-good',
  proposed: 'bg-watch-50 text-watch',
  confirm: 'bg-stop-50 text-stop',
  plan: 'bg-na-50 text-ink-faint',
};

/** The four colours, in words. */
const LEGEND: [string, string][] = [
  ['bg-good-50 text-good', 'Green: out, scheduled or made'],
  ['bg-watch-50 text-watch', 'Amber: posting date not agreed yet'],
  ['bg-stop-50 text-stop', 'Red: was due, check with Mohan'],
  ['bg-na-50 text-ink-faint', 'Grey: not planned yet'],
];

function ObjectiveTag({ o }: { o: Objective }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11.5px] text-ink-soft">
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: OBJECTIVE_COLOR[o] }} />
      {o}
    </span>
  );
}

function StatusTag({ s }: { s: Status }) {
  return <span className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-[10.5px] font-semibold ${STATUS_CLASS[s]}`}>{STATUS_LABEL[s]}</span>;
}

/** One list of entries: when, what, where, why, status, who. A card per entry on phones, a table from tablet width up. */
function Rows({ items, dated }: { items: CalendarItem[]; dated: boolean }) {
  return (
    <>
      <ul className="space-y-2 md:hidden">
        {items.map((i) => (
          <li key={i.id} className="rounded-card border border-line px-3 py-2">
            <div className="flex items-start justify-between gap-2 text-[11.5px]">
              <span className="font-medium text-ink">
                {dated && i.date ? dayLabel(i.date) : i.when}
                {dated && i.when ? <span className="font-normal text-ink-faint"> · {i.when}</span> : null}
              </span>
              <StatusTag s={i.status} />
            </div>
            <p className="mt-1 text-[12.5px] leading-snug text-ink">{i.what}</p>
            <p className="text-[11.5px] text-ink-soft">{i.platform} · {i.format} · {i.frequency}</p>
            <p className="text-[11px] text-ink-faint">{i.detail}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-ink-faint">
              <ObjectiveTag o={i.objective} />
              <span>For: {i.audience}</span>
              <span>Who: {i.owner}</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[960px] text-[12.5px]">
          <thead>
            <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
              <th className="w-[140px] py-2 pr-3">When</th>
              <th className="py-2 pr-3">What</th>
              <th className="w-[190px] py-2 pr-3">Where</th>
              <th className="w-[120px] py-2 pr-3">Why</th>
              <th className="w-[150px] py-2 pr-3">Status</th>
              <th className="w-[180px] py-2 pl-3">Who</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-b border-line/60 align-top">
                <td className="py-2 pr-3 text-ink">
                  {dated && i.date ? <span className="font-medium">{dayLabel(i.date)}</span> : null}
                  {i.when ? <span className={`block text-[11px] ${dated ? 'text-ink-faint' : 'text-ink-soft'}`}>{i.when}</span> : null}
                  <span className="block text-[10.5px] text-ink-faint">{i.frequency}</span>
                </td>
                <td className="py-2 pr-3">
                  <span className="text-ink">{i.what}</span>
                  <span className="block text-[11px] text-ink-faint">For: {i.audience}</span>
                </td>
                <td className="py-2 pr-3 text-ink-soft">
                  {i.platform}
                  <span className="block text-[11px] text-ink-faint">{i.format}</span>
                </td>
                <td className="py-2 pr-3"><ObjectiveTag o={i.objective} /></td>
                <td className="py-2 pr-3">
                  <StatusTag s={i.status} />
                  <span className="mt-0.5 block text-[10.5px] leading-snug text-ink-faint">{i.detail}</span>
                </td>
                <td className="py-2 pl-3 text-[11.5px] text-ink-soft">{i.owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/**
 * Marketing › Content calendar (9 Oct 2026, for Ms Shadi): every piece of
 * marketing content, week by week, in the columns Ms Shadi asked for.
 * Data: lib/content/calendar.ts. Entries linked to Mohan's team tasks turn
 * to "Made" when the task is marked done in the team task calendar.
 * `qs` carries the date range so the campaign chips keep it.
 */
export async function ContentCalendar({ campaign, qs = '' }: { campaign?: string; qs?: string }) {
  const today = dubaiToday();
  const tasks = await loadTaskStatuses();
  const all = withTaskProgress(CALENDAR, (task) => tasks.status[task] === 'done');
  const items = filterCampaign(all, campaign);
  const { weeks, undated } = byWeek(items);
  const thisMonday = weekStart(today);
  const nextMonday = addDays(thisMonday, 7);
  const upcoming = weeks.filter((w) => w.monday >= thisMonday);
  const earlier = weeks.filter((w) => w.monday < thisMonday);
  const earlierCount = earlier.reduce((n, w) => n + w.items.length, 0);
  const inWeek = (m: string) => items.filter((i) => i.date && weekStart(i.date) === m).length;
  const toAgree = items.filter((i) => i.status === 'proposed').length;
  const toCheck = items.filter((i) => i.status === 'confirm').length;
  const shares = mix(items);
  const todo = checks(items, today, !campaign || !CAMPAIGNS.some((c) => c.key === campaign));
  const make = production(today);
  const active = CAMPAIGNS.find((c) => c.key === campaign)?.key;

  const chip = (on: boolean) =>
    `inline-block rounded-full border px-3 py-1 text-[11.5px] font-medium ${on ? 'border-accent bg-accent text-white' : 'border-line bg-card text-ink-soft hover:text-ink'}`;
  const tiles: [string, number, string][] = [
    ['Going out this week', inWeek(thisMonday), weekLabel(thisMonday)],
    ['Going out next week', inWeek(nextMonday), weekLabel(nextMonday)],
    ['Dates to agree', toAgree, 'not agreed yet'],
    ['Check with Mohan', toCheck, 'was due, not confirmed as made'],
  ];

  return (
    <div className="space-y-4">
      <Card highlight>
        <SectionHeader
          tag="CC"
          eyebrow="Content calendar"
          title="What we publish, week by week"
          right={<span className="text-[11px] text-ink-faint">{items.length} entries · plan as of {dayLabel(DATA_AS_OF)}</span>}
        />
        <div className="px-5 pb-5 pt-3">
          <p className="max-w-[820px] text-[12.5px] leading-snug text-ink-soft">
            Every piece of marketing content in one place: what goes out, where, why, for whom, when, and who does it.
            It covers Smile Club, the YMK Let&apos;s Play pilot, the Dental Nation clinics, and companies and the community.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {LEGEND.map(([cls, label]) => <span key={label} className={`rounded px-1.5 py-0.5 text-[10.5px] font-semibold ${cls}`}>{label}</span>)}
          </div>
          {!tasks.live ? (
            <p className="mt-2 text-[11.5px] text-watch">The team task calendar could not be read just now, so &quot;Made&quot; ticks may be missing. Reload in a minute.</p>
          ) : null}
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            {tiles.map(([label, n, sub]) => (
              <div key={label} className="rounded-card border border-line bg-card px-3 py-2">
                <p className="text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">{label}</p>
                <p className="text-[22px] font-semibold tabular-nums text-ink">{n}</p>
                <p className="text-[11px] text-ink-faint">{sub}</p>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <p className="text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">Why we post: the mix</p>
            <div className="mt-1.5 flex h-3 w-full overflow-hidden rounded-full bg-na-50">
              {shares.filter((s) => s.n).map((s) => (
                <div key={s.objective} style={{ width: `${s.share * 100}%`, backgroundColor: OBJECTIVE_COLOR[s.objective] }} title={`${s.objective}: ${s.n}`} />
              ))}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
              {shares.map((s) => (
                <span key={s.objective} className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-soft">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: OBJECTIVE_COLOR[s.objective] }} />
                  {s.objective} <b className="tabular-nums text-ink">{s.n}</b> <span className="text-ink-faint">({Math.round(s.share * 100)}%)</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {todo.length ? (
        <Card>
          <SectionHeader tag="CC1" eyebrow="To sort out" title="What needs a decision or a check" />
          <ul className="list-disc space-y-1.5 px-5 pb-5 pl-9 pt-3 text-[12.5px] leading-snug text-ink-soft">
            {todo.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </Card>
      ) : null}

      <Card>
        <SectionHeader tag="CC2" eyebrow="Calendar" title="Week by week" />
        <div className="space-y-5 px-5 pb-5 pt-3">
          <nav className="flex flex-wrap items-center gap-1.5" aria-label="Campaigns">
            <span className="mr-1 text-[11px] font-medium uppercase tracking-wide text-ink-faint">Show</span>
            <a href={`?tab=marketing&mtab=calendar${qs}`} className={chip(!active)}>Everything</a>
            {CAMPAIGNS.map((c) => (
              <a key={c.key} href={`?tab=marketing&mtab=calendar&ccamp=${c.key}${qs}`} className={chip(active === c.key)}>{c.label}</a>
            ))}
          </nav>
          {upcoming.length ? upcoming.map((w) => (
            <section key={w.monday}>
              <h3 className="mb-1 text-[13px] font-semibold text-ink">
                {w.monday === thisMonday ? `This week · ${weekLabel(w.monday)}` : w.monday === nextMonday ? `Next week · ${weekLabel(w.monday)}` : weekLabel(w.monday)}
                <span className="ml-2 text-[11px] font-normal text-ink-faint">{w.items.length} {w.items.length === 1 ? 'entry' : 'entries'}</span>
              </h3>
              <Rows items={w.items} dated />
            </section>
          )) : <p className="text-[12.5px] text-ink-faint">Nothing dated from this week on for this selection.</p>}
          {undated.length ? (
            <section>
              <h3 className="mb-1 text-[13px] font-semibold text-ink">
                No fixed date yet <span className="ml-2 text-[11px] font-normal text-ink-faint">always on, date to agree, or not planned yet</span>
              </h3>
              <Rows items={undated} dated={false} />
            </section>
          ) : null}
          {earlier.length ? (
            <details>
              <summary className="cursor-pointer text-[12px] font-medium text-ink-soft">Earlier weeks ({earlierCount} {earlierCount === 1 ? 'entry' : 'entries'})</summary>
              <div className="mt-2 space-y-4">
                {earlier.map((w) => (
                  <section key={w.monday}>
                    <h3 className="mb-1 text-[12.5px] font-semibold text-ink-soft">{weekLabel(w.monday)}</h3>
                    <Rows items={w.items} dated />
                  </section>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="min-w-0">
          <SectionHeader tag="CC3" eyebrow="Production" title="What is being made" />
          <div className="overflow-x-auto px-5 pb-5 pt-3">
            <table className="w-full min-w-[480px] text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                  <th className="w-[100px] py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">What</th>
                  <th className="w-[130px] py-2 pl-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {make.map((p) => (
                  <tr key={`${p.label}-${p.what}`} className="border-b border-line/60 align-top">
                    <td className="py-2 pr-3 font-medium text-ink">{p.label}</td>
                    <td className="py-2 pr-3 text-ink-soft">{p.what}<span className="block text-[11px] text-ink-faint">{p.delivery}</span></td>
                    <td className={`py-2 pl-3 text-[11.5px] ${/ask Mohan/i.test(p.status) ? 'text-stop' : 'text-ink-soft'}`}>{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[11px] text-ink-faint">Filming dates are not posting dates. Each video joins the calendar once it is approved.</p>
          </div>
        </Card>
        <Card className="min-w-0">
          <SectionHeader tag="CC4" eyebrow="Frequency" title="How often we post (proposal to agree)" />
          <div className="overflow-x-auto px-5 pb-5 pt-3">
            <table className="w-full min-w-[420px] text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                  <th className="py-2 pr-3">Platform</th>
                  <th className="py-2 pr-3">How often</th>
                  <th className="py-2 pl-3">What fills it</th>
                </tr>
              </thead>
              <tbody>
                {FREQUENCY.map((f) => (
                  <tr key={f.platform} className="border-b border-line/60 align-top">
                    <td className="py-2 pr-3 font-medium text-ink">{f.platform}</td>
                    <td className="py-2 pr-3 text-ink-soft">{f.how}</td>
                    <td className="py-2 pl-3 text-[11.5px] text-ink-faint">{f.fills}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[11px] text-ink-faint">
              How a piece goes out: Mohan makes it, Marketing checks it, Ms Shadi, Dr Luvi and Gautam approve it, then it is published.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
