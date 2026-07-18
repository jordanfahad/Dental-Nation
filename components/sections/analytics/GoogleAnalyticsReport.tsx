import { Suspense } from 'react';
import { getGoogleAnalyticsReport } from '@/lib/analytics/report';
import { Ga4Lanes } from '@/components/sections/analytics/Ga4Lanes';
import type { Ga4Slice } from '@/lib/sync/adapters/ga4-adapter';
import { SiteSpeed } from '@/components/sections/analytics/SiteSpeed';
import { Ga4Attribution } from '@/components/sections/analytics/Ga4Attribution';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import { Donut, HBarChart, type BarDatum } from '@/components/charts/Charts';
import { ownerFor } from '@/config/data-gap-owners';
import { dubaiDateLabel } from '@/lib/dates';

const int = (n: number) => Math.round(n).toLocaleString('en-US');
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

const toDonut = (rows: Ga4Slice[]): BarDatum[] => rows.map((r) => ({ label: r.key, value: r.sessions }));

/** A compact slice table: dimension value with sessions, users and leads. */
function SliceTable({ rows, head }: { rows: Ga4Slice[]; head: string }) {
  const th = 'py-1.5 px-2 text-[10px] font-medium uppercase tracking-wide text-ink-faint';
  const td = 'py-1.5 px-2 text-[12px] text-ink';
  const num = 'py-1.5 px-2 text-right text-[12px] tabular-nums text-ink-soft';
  return (
    <table className="w-full text-left">
      <thead><tr className="border-b border-line">
        <th className={th}>{head}</th>
        <th className={`${th} text-right`}>Sessions</th>
        <th className={`${th} text-right`}>Users</th>
        <th className={`${th} text-right`}>Leads</th>
      </tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className="border-b border-line/60 last:border-0">
            <td className={td}><span className="block max-w-[160px] truncate" title={r.key}>{r.key}</span></td>
            <td className={num}>{int(r.sessions)}</td>
            <td className={num}>{int(r.users)}</td>
            <td className={`${num} font-medium text-ink`}>{int(r.leads)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Google Analytics tab — GA4 audience: demographics (gender, age), device,
 * acquisition channel (each with sessions/users/leads) and per-event lead
 * acquisition. Live from the GA4 Data API; honest data gap on any failure.
 */
export async function GoogleAnalyticsReport() {
  const { available, note, data, lanes, lanesNote } = await getGoogleAnalyticsReport();

  if (!available || !data) {
    return (
      <Card>
        <SectionHeader tag="GA" eyebrow="Google Analytics · GA4" title="Google Analytics" />
        <div className="px-5 pb-5 pt-4">
          <DataGapInline detail={note ?? 'GA4 audience data unavailable'} owner={ownerFor('channel')} />
        </div>
      </Card>
    );
  }

  const { totals, byGender, byAge, byDevice, byChannel, events } = data;
  const leadRate = totals.sessions > 0 ? totals.leads / totals.sessions : 0;
  const mobile = byDevice.find((d) => d.key.toLowerCase() === 'mobile');
  const mobileShare = totals.sessions > 0 && mobile ? mobile.sessions / totals.sessions : null;
  const period = `${dubaiDateLabel(data.period.from)} → ${dubaiDateLabel(data.period.to)}`;

  const kpis: KpiItem[] = [
    { label: 'Sessions', value: int(totals.sessions), hint: 'GA4, all visits' },
    { label: 'Users', value: int(totals.users) },
    { label: 'Leads', value: int(totals.leads), hint: 'site-tagged events' },
    { label: 'Lead rate', value: pct(leadRate), hint: 'leads ÷ sessions' },
    { label: 'Mobile share', value: mobileShare != null ? pct(mobileShare) : null, gapDetail: 'no device split', gapOwner: ownerFor('channel') },
    { label: 'Events tracked', value: int(events.length) },
  ];

  const ageBars: BarDatum[] = byAge.map((a) => ({ label: a.key, value: a.sessions }));

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader
          tag="GA" eyebrow="Google Analytics · GA4" title="Google Analytics"
          right={<span className="text-[11px] text-ink-faint">{period}</span>}
        />
        <div className="px-5 pb-5 pt-4">
          <p className="text-[12.5px] leading-snug text-ink-soft">
            First-party website behaviour from GA4 — who visits (gender, age), on what device, through
            which acquisition channel, and which on-site events drive leads. Sessions and leads come
            straight from the GA4 property, so these reconcile with the Analytics UI.
          </p>
        </div>
      </Card>

      {lanes.length > 0 ? <Ga4Lanes lanes={lanes} note={lanesNote} /> : null}

      <Card>
        <SectionHeader tag="GA1" eyebrow="Scorecard" title="Audience at a glance" />
        <div className="px-5 pb-5 pt-4"><KpiBand items={kpis} /></div>
      </Card>

      <Suspense fallback={<SiteSpeedSkeleton />}>
        <SiteSpeed />
      </Suspense>

      <Card>
        <SectionHeader tag="GA3" eyebrow="Acquisition" title="Channels — sessions & lead acquisition" />
        <div className="grid grid-cols-1 gap-5 px-5 pb-5 pt-4 lg:grid-cols-2">
          <Donut data={toDonut(byChannel)} valueFormat="int" centerLabel="sessions" height={210} />
          <div className="overflow-x-auto"><SliceTable rows={byChannel} head="Channel" /></div>
        </div>
        <div className="px-5 pb-5">
          <Takeaway>
            Heads-up on <span className="font-medium text-ink">Paid Social</span>: GA4 only attributes Meta
            clicks that arrive UTM-tagged, so Meta is heavily under-counted here — untagged Meta traffic
            lands in Direct / Organic Social / Unassigned, and on-Facebook Instant-Form leads never reach the
            site. For Meta&apos;s true spend &amp; leads use the <span className="font-medium text-ink">Marketing
            tab</span>; UTM-tagging ad URLs is what fixes this. Fuller view in Multi-touch attribution below.
          </Takeaway>
        </div>
      </Card>

      <Suspense fallback={<AttributionSkeleton />}>
        <Ga4Attribution />
      </Suspense>

      <Card>
        <SectionHeader tag="GA4" eyebrow="Demographics" title="Gender" />
        <div className="grid grid-cols-1 gap-5 px-5 pb-5 pt-4 lg:grid-cols-2">
          <Donut data={toDonut(byGender)} valueFormat="int" centerLabel="sessions" height={200} />
          <div className="overflow-x-auto"><SliceTable rows={byGender} head="Gender" /></div>
        </div>
      </Card>

      <Card>
        <SectionHeader tag="GA5" eyebrow="Demographics" title="Age" />
        <div className="grid grid-cols-1 gap-5 px-5 pb-5 pt-4 lg:grid-cols-2">
          <div><HBarChart data={ageBars} valueFormat="int" /></div>
          <div className="overflow-x-auto"><SliceTable rows={byAge} head="Age" /></div>
        </div>
      </Card>

      <Card>
        <SectionHeader tag="GA6" eyebrow="Tech" title="Device" />
        <div className="grid grid-cols-1 gap-5 px-5 pb-5 pt-4 lg:grid-cols-2">
          <Donut data={toDonut(byDevice)} valueFormat="int" centerLabel="sessions" height={200} />
          <div className="overflow-x-auto"><SliceTable rows={byDevice} head="Device" /></div>
        </div>
      </Card>

      <Card>
        <SectionHeader tag="GA7" eyebrow="Events" title={`Lead acquisition by event (${events.length})`} />
        <div className="px-5 pb-5 pt-4 overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="border-b border-line">
              <th className="py-2 px-2 text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">Event</th>
              <th className="py-2 px-2 text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">Type</th>
              <th className="py-2 px-2 text-right text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">Users</th>
              <th className="py-2 px-2 text-right text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">Count</th>
            </tr></thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.event} className="border-b border-line/60 last:border-0">
                  <td className="py-2 px-2 text-[12px] text-ink">{e.event}</td>
                  <td className="py-2 px-2">
                    {e.isLead
                      ? <span className="rounded bg-good/10 px-1.5 py-0.5 text-[10px] font-medium text-good">Lead</span>
                      : <span className="text-[11px] text-ink-faint">event</span>}
                  </td>
                  <td className="py-2 px-2 text-right text-[12px] tabular-nums text-ink-soft">{int(e.users)}</td>
                  <td className="py-2 px-2 text-right text-[12px] tabular-nums font-medium text-ink">{int(e.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Takeaway>
            Every GA4 event with its user and trigger counts; the ones flagged <span className="font-medium text-good">Lead</span>{' '}
            are what the dashboard counts as gross leads (tunable in config). Use this to see which
            on-site actions actually convert visitors into enquiries.
          </Takeaway>
        </div>
      </Card>
    </div>
  );
}

/** Placeholder shown while PageSpeed Insights is being fetched (streamed via Suspense). */
function SiteSpeedSkeleton() {
  return (
    <Card>
      <SectionHeader tag="GA2" eyebrow="Core Web Vitals" title="Site Speed" />
      <div className="px-5 pb-5 pt-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-lg border border-line bg-panel/40" />
          ))}
        </div>
        <p className="mt-3 text-[11px] text-ink-faint">Measuring live with PageSpeed Insights…</p>
      </div>
    </Card>
  );
}

/** Placeholder shown while GA4 multi-touch attribution is computed (Suspense). */
function AttributionSkeleton() {
  return (
    <Card>
      <SectionHeader tag="GA4·MTA" eyebrow="Attribution" title="Multi-touch attribution" />
      <div className="px-5 pb-5 pt-4">
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg border border-line bg-panel/40" />
          ))}
        </div>
        <div className="h-32 animate-pulse rounded bg-panel/40" />
      </div>
    </Card>
  );
}
