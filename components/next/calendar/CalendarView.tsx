/**
 * Content calendar (/next/calendar): the month's posts by week, from
 * config/content-calendar.ts (edited by hand as production moves). Server
 * component, no client JavaScript; the password gate covers it like every
 * other route.
 */
import {
  CALENDAR_NOTE, CONTENT_CALENDAR, SEGMENT_LABEL, STATUS_LABEL, TRACK_LABEL,
  type CalendarPost, type CalendarStatus, type CalendarWeek,
} from '@/config/content-calendar';
import { rangeDates } from '@/lib/overview/format';

const STATUS_STYLE: Record<CalendarStatus, string> = {
  posted: 'bg-[#e7f2ec] text-[#1d7a4f]',
  scheduled: 'bg-[#e9f0fa] text-[#1f4e9c]',
  'in-production': 'bg-[#f7efe2] text-[#a86a00]',
  'creative-pending': 'bg-[#f3edfa] text-[#6b4e9c]',
  planned: 'bg-[#eef1f2] text-[#5c6c72]',
};

const TRACK_SHORT = { zavis: 'Zavis', ai: 'AI video', real: 'Real' } as const;

const th = 'bg-[#f4f7f5] px-3 py-2.5 align-bottom text-[10px] font-semibold tracking-[0.025em] text-[#657275] text-left';
const td = 'border-b border-[#e8eeea] px-3 py-3 align-top';

const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${iso}T12:00:00Z`));

function StatusChip({ status }: { status: CalendarStatus }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function PostRow({ p }: { p: CalendarPost }) {
  return (
    <tr>
      <td className={`${td} whitespace-nowrap font-semibold text-dn-navy`}>{dayLabel(p.date)}</td>
      <td className={td}>
        <span className="font-semibold text-dn-navy">{p.title}</span>
        {p.note ? <span className="text-[11px] text-[#647578]"> · {p.note}</span> : null}
      </td>
      <td className={td}>{TRACK_SHORT[p.track]}</td>
      <td className={td}>{SEGMENT_LABEL[p.segment]}</td>
      <td className={td}>{p.ad ? <span className="font-bold text-dn-navy">Ad</span> : <span className="text-[#8a9598]">-</span>}</td>
      <td className={td}><StatusChip status={p.status} /></td>
    </tr>
  );
}

function Week({ week }: { week: CalendarWeek }) {
  const range = { from: week.posts[0].date, to: week.posts[week.posts.length - 1].date };
  const pending = week.posts.filter((p) => p.status === 'creative-pending').length;
  return (
    <section className="my-4 min-w-0 rounded-[10px] border border-dn-line bg-white p-4 sm:p-5">
      <div className="mb-3">
        <p className="m-0 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-dn-navy">{rangeDates(range)}</p>
        <h2 className="m-0 mb-1 text-base font-bold tracking-[-0.3px] text-dn-navy sm:text-lg">&ldquo;{week.theme}&rdquo;</h2>
        {pending > 0 && (
          <p className="m-0 text-xs text-[#6b4e9c]">{pending} {pending === 1 ? 'creative' : 'creatives'} pending with Zavis</p>
        )}
      </div>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={`Week: ${week.theme}`}>
        <table className="w-full min-w-[640px] border-collapse text-left text-xs">
          <thead>
            <tr>
              {['Day', 'Post', 'Track', 'For', 'Paid ad', 'Status'].map((h) => (
                <th key={h} scope="col" className={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {week.posts.map((p) => <PostRow key={p.date} p={p} />)}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function CalendarView() {
  const posts = CONTENT_CALENDAR.flatMap((w) => w.posts);
  const count = (s: CalendarStatus) => posts.filter((p) => p.status === s).length;
  const tiles: { label: string; value: number }[] = [
    { label: 'Posts planned', value: posts.length },
    { label: 'Posted', value: count('posted') },
    { label: 'Scheduled', value: count('scheduled') },
    { label: 'In production', value: count('in-production') },
    { label: 'Creative pending (Zavis)', value: count('creative-pending') },
  ];
  return (
    <main className="mx-auto max-w-[1100px] px-4 pb-6 pt-6 sm:px-8 sm:pt-7">
      <div className="mb-4">
        <p className="m-0 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-dn-navy">Content Calendar</p>
        <h1 className="m-0 mb-2 text-[27px] font-bold leading-tight tracking-[-1.1px] text-dn-navy sm:text-[32px]">
          What goes out, when, and who owes what
        </h1>
        <p className="m-0 text-xs text-[#617075]">
          5 ortho posts and 1 Smile Club post a week across three tracks: {TRACK_LABEL.zavis}, {TRACK_LABEL.ai} and {TRACK_LABEL.real}.
          Approved with Mr Akbar on 5 Nov 2026.
        </p>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className="min-w-0 rounded-lg border border-dn-line bg-white p-3">
            <p className="m-0 text-xl font-bold text-dn-navy">{t.value}</p>
            <p className="m-0 mt-0.5 text-[11px] font-semibold text-[#5c6c72]">{t.label}</p>
          </div>
        ))}
      </div>
      {CONTENT_CALENDAR.map((w) => <Week key={w.theme} week={w} />)}
      <p className="m-0 mt-3 text-[11px] text-[#627277]">{CALENDAR_NOTE}</p>
    </main>
  );
}
