import type { ReactNode } from 'react';
import { startOfMonth, endOfMonth, subMonths, subDays, parseISO, format, differenceInCalendarDays } from 'date-fns';
import { getExecutiveReport } from '@/lib/executive/report';
import { getArabyAdsReport } from '@/lib/arabyads/report';
import { getDoctorPerformance } from '@/lib/executive/doctors';
import { getDigitalSeo } from '@/lib/analytics/digital';
import type { ClinicFilterKey } from '@/config/clinics';
import { ReportControls } from './ReportControls';
import { TrendChart, Donut, HBarChart, type TrendSeries, type BarDatum } from '@/components/charts/Charts';
import { dubaiDateLabel } from '@/lib/dates';

const iso = (d: Date) => d.toISOString().slice(0, 10);
const aed = (n: number | null | undefined) => (n == null ? '—' : `AED ${Math.round(n).toLocaleString('en-US')}`);
const aedK = (n: number | null | undefined) => {
  if (n == null) return '—';
  if (Math.abs(n) >= 1000) return `AED ${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}K`;
  return `AED ${Math.round(n)}`;
};
const int = (n: number | null | undefined) => (n == null ? '—' : Math.round(n).toLocaleString('en-US'));
const pct = (n: number | null | undefined) => (n == null ? '—' : `${Math.round(n * 100)}%`);

const MOMENTUM_COLORS = { spend: '#D55E00', bookings: '#0072B2', enquiries: '#CC79A7', revenue: '#009E73' };

const VALID_PERIODS = new Set(['daily', 'weekly', 'month', 'lastmonth', 'last90', 'all']);
const REPORT_TITLE: Record<string, string> = {
  daily: 'Daily Business Review',
  weekly: 'Weekly Business Review',
  month: 'Monthly Business Review',
  lastmonth: 'Monthly Business Review',
  last90: 'Quarterly Business Review',
  all: 'Business Review',
};
const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

/** Period + anchor date → the report window. */
function boardWindow(period: string, anchorIso: string): { from: string; to: string; isAll: boolean } {
  const today = new Date();
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(anchorIso) ? parseISO(anchorIso) : today;
  switch (period) {
    case 'daily': return { from: fmt(anchor), to: fmt(anchor), isAll: false };
    case 'weekly': return { from: fmt(subDays(anchor, 6)), to: fmt(anchor), isAll: false };
    case 'lastmonth': { const lm = subMonths(today, 1); return { from: fmt(startOfMonth(lm)), to: fmt(endOfMonth(lm)), isAll: false }; }
    case 'last90': return { from: fmt(subDays(today, 89)), to: fmt(today), isAll: false };
    case 'all': return { from: '2026-01-01', to: fmt(today), isAll: true };
    case 'month':
    default: return { from: fmt(startOfMonth(today)), to: fmt(today), isAll: false };
  }
}
/** The equal-length window immediately before [from,to]. */
function priorWindow(from: string, to: string): { from: string; to: string } {
  const f = parseISO(from);
  const days = differenceInCalendarDays(parseISO(to), f) + 1;
  return { from: fmt(subDays(f, days)), to: fmt(subDays(f, 1)) };
}

export async function BoardReport({
  date,
  cadence: rawPeriod,
  compare = false,
  clinic,
}: {
  date?: string;
  cadence?: string;
  compare?: boolean;
  clinic?: ClinicFilterKey;
}) {
  const period = rawPeriod && VALID_PERIODS.has(rawPeriod) ? rawPeriod : 'month';
  const anchor = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : iso(new Date());
  const { from, to, isAll } = boardWindow(period, anchor);
  const doCompare = compare && !isAll;
  const prev = doCompare ? priorWindow(from, to) : null;

  const [report, araby, doctors, digital, priorReport] = await Promise.all([
    getExecutiveReport({ from: isAll ? undefined : from, to: isAll ? undefined : to, preset: isAll ? 'all' : 'custom', clinic }),
    getArabyAdsReport({ from, to }),
    getDoctorPerformance({ from, to }),
    getDigitalSeo({ from, to }),
    prev ? getExecutiveReport({ from: prev.from, to: prev.to, preset: 'custom', clinic }) : Promise.resolve(null),
  ]);

  const k = report.kpis;
  const a = report.acquisition;
  const p = report.practo;
  const pk = priorReport?.kpis ?? null;
  const pa = priorReport?.acquisition ?? null;
  // Fractional change vs the previous period (null when not comparable).
  const chg = (cur: number | null | undefined, prevVal: number | null | undefined): number | null =>
    cur != null && prevVal != null && prevVal !== 0 ? (cur - prevVal) / prevVal : null;

  const periodStr = `${dubaiDateLabel(from)} → ${dubaiDateLabel(to)}`;
  const compareNote = doCompare && prev ? `vs ${dubaiDateLabel(prev.from)} → ${dubaiDateLabel(prev.to)}` : null;

  const trendData = report.monthly.map((m) => ({ date: `${m.month}-01`, spend: m.spend, bookings: m.appointments, leads: m.leads, revenue: m.revenue }));
  const trendSeries: TrendSeries[] = [
    { key: 'spend', label: 'Spend (AED)', color: MOMENTUM_COLORS.spend, kind: 'bar', axis: 'right' },
    { key: 'bookings', label: 'Bookings', color: MOMENTUM_COLORS.bookings, kind: 'line', axis: 'left' },
    { key: 'leads', label: 'Enquiries', color: MOMENTUM_COLORS.enquiries, kind: 'area', axis: 'left' },
    { key: 'revenue', label: 'Revenue (AED)', color: MOMENTUM_COLORS.revenue, kind: 'line', axis: 'right' },
  ];

  return (
    <div>
      <ReportControls period={period} date={anchor} compare={compare} />

      <article className="report mx-auto max-w-[900px]">
        {/* Cover */}
        <header className="print-avoid-break overflow-hidden rounded-card bg-accent text-white">
          <div className="px-7 py-8 sm:px-10 sm:py-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Dental Nation · Performance Report</p>
            <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight sm:text-[32px]">
              {REPORT_TITLE[period]}
            </h1>
            <p className="mt-2 text-[13.5px] text-white/85">{periodStr}{compareNote ? <span className="text-white/60"> · {compareNote}</span> : null}</p>
            <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 border-t border-white/15 pt-5 text-[12.5px]">
              <Cover label="Marketing spend" value={aedK(k.marketingSpend)} delta={chg(k.marketingSpend, pk?.marketingSpend)} goodUp={false} />
              <Cover label="New patients" value={int(a.billedNewPatients)} delta={chg(a.billedNewPatients, pa?.billedNewPatients)} />
              <Cover label="Cost / new patient" value={aed(a.cpaAll)} delta={chg(a.cpaAll, pa?.cpaAll)} goodUp={false} />
              <Cover label="Clinic revenue" value={aedK(k.clinicRevenue)} delta={chg(k.clinicRevenue, pk?.clinicRevenue)} />
              <Cover label="New-patient ROAS" value={a.roas != null ? `${a.roas.toFixed(1)}×` : '—'} delta={chg(a.roas, pa?.roas)} />
            </div>
          </div>
        </header>

        {/* Headline */}
        <Section eyebrow="Summary" title="The story in one line">
          <p className="text-[15px] leading-relaxed text-ink">
            Over this period, <strong>{aed(k.marketingSpend)}</strong> of marketing acquired{' '}
            <strong>{int(a.billedNewPatients)} new patients</strong>
            {a.cpaAll != null ? <> at <strong>{aed(a.cpaAll)}</strong> each</> : null}, contributing{' '}
            <strong>{aed(a.newPatientRevenue)}</strong> of new-patient revenue
            {a.roas != null ? <> (a <strong>{a.roas.toFixed(1)}×</strong> return)</> : null}. Total clinic revenue was{' '}
            <strong>{aed(k.clinicRevenue)}</strong> across <strong>{int(p.billCount)}</strong> bills, from{' '}
            <strong>{int(k.appointmentsBooked)}</strong> bookings ({pct(k.completionRate)} completed).
          </p>
        </Section>

        {/* Executive KPIs */}
        <Section eyebrow="Scorecard" title="Headline metrics">
          {compareNote ? <p className="mb-3 text-[11px] text-ink-faint">Change shown {compareNote}.</p> : null}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Metric label="Marketing spend" value={aed(k.marketingSpend)} sub="Meta + Google · live" delta={chg(k.marketingSpend, pk?.marketingSpend)} goodUp={false} />
            <Metric label="New patients (billed)" value={int(a.billedNewPatients)} sub="distinct · revenue-backed" delta={chg(a.billedNewPatients, pa?.billedNewPatients)} />
            <Metric label="Cost / new patient" value={aed(a.cpaAll)} sub="blended (all sources)" accent delta={chg(a.cpaAll, pa?.cpaAll)} goodUp={false} />
            <Metric label="New-patient revenue" value={aed(a.newPatientRevenue)} sub={a.revenuePerNewPatient != null ? `${aed(a.revenuePerNewPatient)} / patient` : undefined} delta={chg(a.newPatientRevenue, pa?.newPatientRevenue)} />
            <Metric label="Bookings" value={int(k.appointmentsBooked)} sub={k.aiAgentBookings != null ? `${int(k.aiAgentBookings)} by AI agent` : undefined} delta={chg(k.appointmentsBooked, pk?.appointmentsBooked)} />
            <Metric label="Completed" value={int(k.appointmentsCompleted)} sub={k.completionRate != null ? `${pct(k.completionRate)} of concluded` : undefined} delta={chg(k.appointmentsCompleted, pk?.appointmentsCompleted)} />
            <Metric label="Clinic revenue" value={aed(k.clinicRevenue)} sub={k.avgBillValue != null ? `${aed(k.avgBillValue)} avg bill` : undefined} accent delta={chg(k.clinicRevenue, pk?.clinicRevenue)} />
            <Metric label="Website sessions" value={int(k.websiteSessions)} sub={k.websiteConversions != null ? `${int(k.websiteConversions)} conversions` : 'GA4'} delta={chg(k.websiteSessions, pk?.websiteSessions)} />
          </div>
        </Section>

        {/* Acquisition */}
        <Section eyebrow="Acquisition" title="What it costs to win a new patient" breakBefore>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Cost / new patient · All" value={aed(a.cpaAll)} sub="spend ÷ all new patients" accent />
            <Metric label="Cost / new patient · Website" value={aed(a.cpaWebsite)} sub={`${int(a.websiteNewPatients)} via widget`} />
            <Metric label="New-patient revenue" value={aed(a.newPatientRevenue)} />
            <Metric label="New-patient ROAS" value={a.roas != null ? `${a.roas.toFixed(1)}×` : '—'} sub="revenue ÷ spend" accent />
          </div>
          <Insight>
            &ldquo;All&rdquo; is a blended acquisition cost — total ad spend over every new patient (incl. organic / walk-in), not a
            paid-only CPL. The website lens isolates patients whose phone matches a booking-widget submission.
          </Insight>
        </Section>

        {/* ArabyAds — the big pay-per-booking campaign */}
        {araby.bookings.total > 0 || araby.bookings.test > 0 || araby.enquiries.total > 0 || araby.cost.toDateCost > 0 || araby.firstSeen != null ? (
          <Section eyebrow="Campaign" title="ArabyAds — pay-per-booking performance" breakBefore>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Metric
                label="Confirmed bookings"
                value={int(araby.bookings.total)}
                sub={araby.bookings.test > 0 ? `${int(araby.bookings.test)} test excluded` : 'real (billable)'}
                accent
              />
              <Metric label="Campaign cost" value={aed(araby.cost.windowCost)} sub="billed per booking" />
              <Metric label="Budget used" value={pct(araby.cost.utilization)} sub={`${aedK(araby.cost.toDateCost)} of ${aedK(araby.cost.budgetCap)}`} />
              <Metric label="Enquiries" value={int(araby.enquiries.total)} sub="all channels" />
            </div>
            {araby.cost.perLane.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[420px] text-[12.5px]">
                  <thead>
                    <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                      <th className="py-2 pr-3">Lane / offer</th>
                      <th className="py-2 pr-3 text-right">Bookings</th>
                      <th className="py-2 pr-3 text-right">Rate / booking</th>
                      <th className="py-2 pl-3 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {araby.cost.perLane.map((l) => (
                      <tr key={l.laneCode} className="border-b border-line/60">
                        <td className="py-2 pr-3 text-ink">
                          {l.billingName} <span className="text-[10.5px] text-ink-faint">· {l.laneCode}</span>
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums text-ink">{int(l.bookings)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{aed(l.rate)}</td>
                        <td className="py-2 pl-3 text-right tabular-nums font-medium text-ink">{aed(l.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            <Insight>
              ArabyAds bills <strong>per confirmed booking</strong> and is invoiced separately from Meta/Google, so its cost is
              NOT in the marketing-spend figure above. Budget cap {aedK(araby.cost.budgetCap)}; {aedK(araby.cost.remaining)} remaining.
            </Insight>
          </Section>
        ) : null}

        {/* Demand funnel */}
        <Section eyebrow="Demand" title="Enquiry → booking → revenue">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Funnel label="Enquiries" value={int(k.leadsGenerated)} note="tracker + widget" />
            <Funnel label="Bookings" value={int(k.appointmentsBooked)} note="ZAVIS/Practo" />
            <Funnel label="Completed" value={int(k.appointmentsCompleted)} note={pct(k.completionRate)} />
            <Funnel label="New patients" value={int(a.billedNewPatients)} note="billed" />
            <Funnel label="Revenue" value={aedK(k.clinicRevenue)} note={`${int(p.billCount)} bills`} strong />
          </div>
        </Section>

        {/* Service quality & efficiency */}
        <Section eyebrow="Quality" title="Service quality & efficiency">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Completion rate" value={pct(k.completionRate)} sub="attended ÷ concluded" />
            <Metric label="Cancellation rate" value={pct(k.cancellationRate)} />
            <Metric label="Conversations handled" value={int(k.conversationsHandled)} sub="Zavis CRM" />
            <Metric label="Avg first response" value={k.avgFirstResponseHours != null ? `${k.avgFirstResponseHours.toFixed(1)}h` : '—'} sub="patient enquiries" />
          </div>
        </Section>

        {/* Clinic revenue mix */}
        {p.source === 'live' ? (
          <Section eyebrow="Clinic revenue" title="Where the money comes from" breakBefore>
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">By department</p>
                <Donut data={p.byDepartment as BarDatum[]} valueFormat="aed" centerLabel="revenue" height={200} />
              </div>
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Top treatments</p>
                <HBarChart data={p.byTreatment as BarDatum[]} valueFormat="aed" />
              </div>
            </div>
          </Section>
        ) : null}

        {/* Doctor performance */}
        {doctors.length ? (
          <Section eyebrow="Providers" title="Doctor performance">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-[12.5px]">
                <thead>
                  <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                    <th className="py-2 pr-3">Doctor</th>
                    <th className="py-2 pr-3">Department</th>
                    <th className="py-2 pr-3 text-right">Appointments</th>
                    <th className="py-2 pl-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((d) => (
                    <tr key={d.doctor} className="border-b border-line/60">
                      <td className="py-2 pr-3 font-medium text-ink">{d.doctor}</td>
                      <td className="py-2 pr-3 text-ink-soft">{d.department ?? '—'}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-ink">{int(d.appointments)}</td>
                      <td className="py-2 pl-3 text-right tabular-nums font-medium text-ink">{aed(d.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Insight>
              Appointments come from the live Practo book; revenue is finalized bill charges by conducting doctor. Much of the
              clinic&apos;s revenue still carries no doctor on the bill (a Practo data-entry gap), so named-doctor revenue understates
              the true split.
            </Insight>
          </Section>
        ) : null}

        {/* Momentum */}
        {trendData.length > 1 ? (
          <Section eyebrow="Momentum" title="Trajectory over recent months">
            <TrendChart data={trendData} series={trendSeries} height={260} leftFormat="int" rightFormat="aed" xFormat="month" />
            <p className="mt-2 text-[11px] text-ink-faint">
              Bars = marketing spend (AED, right). Lines = bookings &amp; enquiries (count, left) and clinic revenue (AED, right).
            </p>
          </Section>
        ) : null}

        {/* Digital & SEO */}
        <Section eyebrow="Digital & SEO" title="Website, search & social" breakBefore>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Website sessions" value={digital.traffic ? int(digital.traffic.sessions) : '—'} sub="GA4 · all traffic" />
            <Metric label="Organic (SEO) traffic" value={digital.ga4Available ? int(digital.organicSessions) : '—'} sub="Organic Search sessions" />
            <Metric label="Paid traffic" value={digital.ga4Available ? int(digital.paidSessions) : '—'} sub="paid channels" />
            <Metric label="SEO score" value={digital.seo?.seo != null ? `${digital.seo.seo}/100` : '—'} sub="Lighthouse on-page" accent />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric
              label="Organic search"
              value={digital.search?.available ? `${int(digital.search.clicks)} clicks` : '—'}
              sub={digital.search?.available ? `${int(digital.search.impressions)} impressions · pos ${digital.search.position != null ? digital.search.position.toFixed(1) : '—'}` : 'Search Console'}
            />
            <Metric label="Pages indexed" value={digital.pagesIndexed != null ? int(digital.pagesIndexed) : '—'} sub="Search Console" />
            <Metric label="Top emirate" value={digital.byEmirate[0]?.label ?? '—'} sub={digital.byEmirate[0] ? `${int(digital.byEmirate[0].sessions)} sessions` : undefined} />
            <Metric label="Social followers" value={int(digital.social.reduce((s, x) => s + (x.followers ?? 0), 0) || null)} sub={digital.social.map((s) => s.label).join(' + ') || 'IG / FB'} />
          </div>
          <Insight>
            SEO score is Google Lighthouse&apos;s on-page health (0–100); organic search (clicks / impressions / position) and pages
            indexed come live from Google Search Console. Full breakdowns — channels, emirates, demographics, social, top queries —
            are on the Digital &amp; SEO tab.
          </Insight>
        </Section>

        {/* Session demographics */}
        {digital.gender.length || digital.age.length ? (
          <Section eyebrow="Audience" title="Session demographics">
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Sessions by gender</p>
                <Donut data={digital.gender.map((g) => ({ label: g.label, value: g.sessions })) as BarDatum[]} valueFormat="int" centerLabel="sessions" height={190} />
              </div>
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Sessions by age</p>
                <HBarChart data={digital.age.map((ag) => ({ label: ag.label, value: ag.sessions })) as BarDatum[]} valueFormat="int" />
              </div>
            </div>
          </Section>
        ) : null}

        {/* Takeaways */}
        <Section eyebrow="So what" title="Takeaways">
          <ul className="space-y-2.5 text-[13.5px] leading-relaxed text-ink">
            <Take>
              Acquisition is efficient: <strong>{aed(a.cpaAll)}</strong> per new patient against{' '}
              <strong>{a.revenuePerNewPatient != null ? aed(a.revenuePerNewPatient) : '—'}</strong> average new-patient value
              {a.roas != null ? <> — a <strong>{a.roas.toFixed(1)}×</strong> blended return.</> : '.'}
            </Take>
            <Take>
              The website widget contributed <strong>{int(a.websiteNewPatients)}</strong> of the {int(a.billedNewPatients)} billed
              new patients — {a.websiteNewPatients === 0 ? 'no' : 'a small share of'} paying demand still comes through the site,
              worth improving.
            </Take>
            <Take>
              Booking follow-through: <strong>{pct(k.completionRate)}</strong> of concluded appointments completed
              {k.cancellationRate != null ? <>, <strong>{pct(k.cancellationRate)}</strong> cancelled.</> : '.'}
            </Take>
          </ul>
        </Section>

        <footer className="mt-8 border-t border-line pt-4 text-[11px] text-ink-faint">
          Generated from live dashboard data on {dubaiDateLabel(iso(new Date()))} · Dental Nation · Confidential
        </footer>
      </article>
    </div>
  );
}

/* ---------------------------------------------------------------- primitives */

/** ▲/▼ change chip. `goodUp` says which direction is good (spend/CPA = down good). */
function Delta({ delta, goodUp = true, onDark }: { delta: number | null | undefined; goodUp?: boolean; onDark?: boolean }) {
  if (delta == null || !Number.isFinite(delta)) return null;
  const flat = Math.abs(delta) < 0.005;
  const up = delta > 0;
  const good = flat ? null : up === goodUp;
  const arrow = flat ? '→' : up ? '▲' : '▼';
  const color = onDark
    ? good == null ? 'text-white/60' : good ? 'text-[#7CE0B0]' : 'text-[#FCA5A5]'
    : good == null ? 'text-ink-faint' : good ? 'text-good' : 'text-stop';
  return (
    <span className={`ml-1.5 text-[11px] font-medium tabular-nums ${color}`}>
      {arrow} {Math.abs(Math.round(delta * 100))}%
    </span>
  );
}

function Cover({ label, value, delta, goodUp }: { label: string; value: string; delta?: number | null; goodUp?: boolean }) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wide text-white/60">{label}</p>
      <p className="mt-0.5 text-[19px] font-semibold tabular-nums">
        {value}
        <Delta delta={delta} goodUp={goodUp} onDark />
      </p>
    </div>
  );
}

function Section({ eyebrow, title, children, breakBefore }: { eyebrow: string; title: string; children: ReactNode; breakBefore?: boolean }) {
  return (
    <section className={`print-avoid-break mt-8 ${breakBefore ? 'print-break' : ''}`}>
      <div className="mb-4 border-b border-line pb-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-accent">{eyebrow}</p>
        <h2 className="mt-1 text-[18px] font-semibold tracking-tight text-ink">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value, sub, accent, delta, goodUp }: { label: string; value: string; sub?: string; accent?: boolean; delta?: number | null; goodUp?: boolean }) {
  return (
    <div className={`rounded-card border p-4 ${accent ? 'border-accent/30 bg-accent/5' : 'border-line'}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-1 text-[21px] font-semibold tabular-nums text-ink">
        {value}
        <Delta delta={delta} goodUp={goodUp} />
      </p>
      {sub ? <p className="mt-0.5 text-[11px] text-ink-faint">{sub}</p> : null}
    </div>
  );
}

function Funnel({ label, value, note, strong }: { label: string; value: string; note?: string; strong?: boolean }) {
  return (
    <div className={`rounded-card border p-3.5 text-center ${strong ? 'border-good/40 bg-good/5' : 'border-line'}`}>
      <p className="text-[10.5px] uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={`mt-1 text-[20px] font-semibold tabular-nums ${strong ? 'text-good' : 'text-ink'}`}>{value}</p>
      {note ? <p className="mt-0.5 text-[10.5px] text-ink-faint">{note}</p> : null}
    </div>
  );
}

function Insight({ children }: { children: ReactNode }) {
  return <p className="mt-4 border-l-2 border-accent/40 pl-3 text-[12px] italic leading-relaxed text-ink-soft">{children}</p>;
}
function Take({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
      <span>{children}</span>
    </li>
  );
}
