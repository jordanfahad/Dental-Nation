/**
 * Google's own Business Profile figures per clinic, for the Google Business
 * Profile project page: the same read as the 09:00 GBP email
 * (readGbpDaily), so the two can never disagree. A null is "not yet",
 * never 0. Server component.
 */
import type { GbpDailyData, GbpMetricSet } from '@/lib/alerts/gbpDaily';
import { GBP_CLINIC_NAMES } from '@/lib/alerts/gbpDaily';

const th = 'bg-[#f4f7f5] px-3 py-2.5 align-bottom text-[10px] font-semibold tracking-[0.025em] text-[#657275] text-right first:text-left';
const td = 'border-b border-[#e8eeea] px-3 py-2.5 align-top text-right tabular-nums whitespace-nowrap first:text-left first:whitespace-normal';

const dayMonth = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(`${iso}T12:00:00Z`));

function N({ v, dp = 0 }: { v: number | null | undefined; dp?: number }) {
  if (v == null || !Number.isFinite(v)) return <span className="text-[#8a9598]">not yet</span>;
  return <>{v.toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp })}</>;
}

const STATUS_NOTE = { 'not-connected': 'Not connected to Google yet', 'no-data': 'Google has reported no activity recently', unavailable: 'Could not be read just now' } as const;

export function GbpGoogleTable({ data, href }: { data: GbpDailyData | null; href: string }) {
  if (!data) return <p className="m-0 text-[12.5px] text-[#647578]">Google&apos;s figures could not be read just now.</p>;
  const day = data.latestDay;
  const metrics = (m: GbpMetricSet | null) => [m?.calls, m?.directions, m?.websiteClicks, m?.mapViews];
  return (
    <>
      <p className="m-0 mb-2 text-xs text-[#617075]">
        Google reports a few days late. {day ? `Latest day Google has reported for every clinic: ${dayMonth(day)}; month to date runs from the 1st to that day.` : 'No day reported yet this month.'}{' '}
        <a className="font-semibold text-dn-navy underline" href={href}>Open the full Google Business Profile report</a>
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-[12.5px] text-dn-ink">
          <thead>
            <tr>
              <th className={th}>Clinic</th>
              <th className={th}>Calls (latest day)</th><th className={th}>Directions</th><th className={th}>Website clicks</th><th className={th}>Map views</th>
              <th className={th}>Calls (month)</th><th className={th}>Directions</th><th className={th}>Website clicks</th><th className={th}>Map views</th>
              <th className={th}>Reviews</th><th className={th}>Rating</th><th className={th}>No reply yet</th>
            </tr>
          </thead>
          <tbody>
            {data.branches.map((b) => (
              <tr key={b.key}>
                <td className={td}>
                  <span className="font-semibold text-dn-navy">{GBP_CLINIC_NAMES[b.key]}</span>
                  {b.status !== 'ok' ? <span className="block text-[11px] text-[#647578]">{STATUS_NOTE[b.status]}</span> : null}
                </td>
                {metrics(b.day).map((v, i) => <td key={`d${i}`} className={td}><N v={v} /></td>)}
                {metrics(b.mtd).map((v, i) => <td key={`m${i}`} className={td}><N v={v} /></td>)}
                <td className={td}><N v={b.reviews?.total} /></td>
                <td className={td}><N v={b.reviews?.average} dp={1} /></td>
                <td className={`${td} ${b.reviews?.unanswered ? 'font-bold text-[#b42318]' : ''}`}><N v={b.reviews?.unanswered} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
