import type { ReactNode } from 'react';
import { getExecutiveReport } from '@/lib/executive/report';
import { getArabyAdsReport } from '@/lib/arabyads/report';
import { getDoctorPerformance } from '@/lib/executive/doctors';
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

/** Anchor date + cadence → the report window. */
function boardWindow(date: string | undefined, cadence: 'daily' | 'weekly'): { from: string; to: string } {
  const anchor = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : iso(new Date());
  if (cadence === 'daily') return { from: anchor, to: anchor };
  const from = iso(new Date(Date.parse(`${anchor}T00:00:00Z`) - 6 * 86400_000));
  return { from, to: anchor };
}

export async function BoardReport({
  date,
  cadence: rawCadence,
  clinic,
}: {
  date?: string;
  cadence?: string;
  clinic?: ClinicFilterKey;
}) {
  const cadence: 'daily' | 'weekly' = rawCadence === 'daily' ? 'daily' : 'weekly';
  const anchor = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : iso(new Date());
  const { from, to } = boardWindow(date, cadence);
  const [report, araby, doctors] = await Promise.all([
    getExecutiveReport({ from, to, preset: 'custom', clinic }),
    getArabyAdsReport({ from, to }),
    getDoctorPerformance({ from, to }),
  ]);

  const k = report.kpis;
  const a = report.acquisition;
  const p = report.practo;
  const period = `${dubaiDateLabel(from)} → ${dubaiDateLabel(to)}`;

  const trendData = report.monthly.map((m) => ({ date: `${m.month}-01`, spend: m.spend, bookings: m.appointments, leads: m.leads, revenue: m.revenue }));
  const trendSeries: TrendSeries[] = [
    { key: 'spend', label: 'Spend (AED)', color: MOMENTUM_COLORS.spend, kind: 'bar', axis: 'right' },
    { key: 'bookings', label: 'Bookings', color: MOMENTUM_COLORS.bookings, kind: 'line', axis: 'left' },
    { key: 'leads', label: 'Enquiries', color: MOMENTUM_COLORS.enquiries, kind: 'area', axis: 'left' },
    { key: 'revenue', label: 'Revenue (AED)', color: MOMENTUM_COLORS.revenue, kind: 'line', axis: 'right' },
  ];

  return (
    <div>
      <ReportControls cadence={cadence} date={anchor} />

      <article className="report mx-auto max-w-[900px]">
        {/* Cover */}
        <header className="print-avoid-break overflow-hidden rounded-card bg-accent text-white">
          <div className="px-7 py-8 sm:px-10 sm:py-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Dental Nation · Performance Report</p>
            <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight sm:text-[32px]">
              {cadence === 'weekly' ? 'Weekly' : 'Daily'} Business Review
            </h1>
            <p className="mt-2 text-[13.5px] text-white/85">{period}</p>
            <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 border-t border-white/15 pt-5 text-[12.5px]">
              <Cover label="Marketing spend" value={aedK(k.marketingSpend)} />
              <Cover label="New patients" value={int(a.billedNewPatients)} />
              <Cover label="Cost / new patient" value={aed(a.cpaAll)} />
              <Cover label="Clinic revenue" value={aedK(k.clinicRevenue)} />
              <Cover label="New-patient ROAS" value={a.roas != null ? `${a.roas.toFixed(1)}×` : '—'} />
            </div>
          </div>
        </header>

        {/* Headline */}
        <Section eyebrow="Summary" title="The story in one line">
          <p className="text-[15px] leading-relaxed text-ink">
            Over this {cadence} window, <strong>{aed(k.marketingSpend)}</strong> of marketing acquired{' '}
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Metric label="Marketing spend" value={aed(k.marketingSpend)} sub="Meta + Google · live" />
            <Metric label="New patients (billed)" value={int(a.billedNewPatients)} sub="distinct · revenue-backed" />
            <Metric label="Cost / new patient" value={aed(a.cpaAll)} sub="blended (all sources)" accent />
            <Metric label="New-patient revenue" value={aed(a.newPatientRevenue)} sub={a.revenuePerNewPatient != null ? `${aed(a.revenuePerNewPatient)} / patient` : undefined} />
            <Metric label="Bookings" value={int(k.appointmentsBooked)} sub={k.aiAgentBookings != null ? `${int(k.aiAgentBookings)} by AI agent` : undefined} />
            <Metric label="Completed" value={int(k.appointmentsCompleted)} sub={k.completionRate != null ? `${pct(k.completionRate)} of concluded` : undefined} />
            <Metric label="Clinic revenue" value={aed(k.clinicRevenue)} sub={k.avgBillValue != null ? `${aed(k.avgBillValue)} avg bill` : undefined} accent />
            <Metric label="Website sessions" value={int(k.websiteSessions)} sub={k.websiteConversions != null ? `${int(k.websiteConversions)} conversions` : 'GA4'} />
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

function Cover({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wide text-white/60">{label}</p>
      <p className="mt-0.5 text-[19px] font-semibold tabular-nums">{value}</p>
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

function Metric({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-card border p-4 ${accent ? 'border-accent/30 bg-accent/5' : 'border-line'}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-1 text-[21px] font-semibold tabular-nums text-ink">{value}</p>
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
