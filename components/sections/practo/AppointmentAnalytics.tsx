import type { ReactNode } from 'react';
import { getAppointmentAnalytics, type NamedAmount } from '@/lib/practo/appointmentAnalytics';
import { Card, SectionHeader } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import { Donut, TrendChart, TOKENS, type BarDatum } from '@/components/charts/Charts';
import { ProviderPerformance } from './ProviderPerformance';
import { ownerFor } from '@/config/data-gap-owners';
import { dubaiDateLabel } from '@/lib/dates';

const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`;
const int = (n: number) => Math.round(n).toLocaleString('en-US');
const pct = (n: number) => `${Math.round(n * 100)}%`;
const pct1 = (n: number) => `${(n * 100).toFixed(1)}%`;

function hourLabel(h: number | null): string | null {
  if (h == null) return null;
  const am = h < 12;
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:00 ${am ? 'AM' : 'PM'}`;
}

/**
 * Practo Insta → Appointment Analytics sub-tab. Reproduces the clinic's Practo
 * "Appointment Analytics" screen: appointment KPIs + status + trend (ZAVIS CRM
 * feed), a Revenue Overview and per-provider performance (Practo bills). Driven
 * by the header date-range control.
 */
export async function AppointmentAnalytics({ range }: { range?: { from?: string; to?: string } }) {
  const a = await getAppointmentAnalytics(range ?? {});
  const period = `${dubaiDateLabel(a.from)} → ${dubaiDateLabel(a.to)}`;

  if (a.source === 'empty') {
    return (
      <Card>
        <SectionHeader tag="PA" eyebrow="Practo Insta · appointments" title="Appointment Analytics" />
        <div className="px-5 pb-5 pt-4">
          <DataGapInline
            detail="No appointments or bills in this period — widen the date range, or upload/sync the ZAVIS appointment feed."
            owner={ownerFor('clinic')}
          />
        </div>
      </Card>
    );
  }

  const r = a.revenue;
  const kpis: KpiItem[] = [
    { label: 'Total Appointments', value: int(a.total), hint: 'bookings in period' },
    {
      label: 'Completed',
      value: int(a.completed),
      hint: a.completionRate != null ? `${pct1(a.completionRate)} completion (arrived + completed)` : undefined,
    },
    {
      label: 'Cancelled',
      value: int(a.cancelled),
      hint: a.cancellationRate != null ? `${pct1(a.cancellationRate)} cancellation rate` : undefined,
    },
    { label: 'Patients Seen', value: int(a.patientsSeen), hint: 'distinct patients (incl. repeat visits)' },
    { label: 'Peak Hour', value: hourLabel(a.peakHour) ?? '—', hint: 'busiest hour (Dubai)' },
  ];

  const statusDonut: BarDatum[] = a.status.map((s) => ({ label: s.label, value: s.value }));
  const trendData = a.trend.map((d) => ({ date: d.date, appointments: d.count }));

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader
          tag="PA"
          eyebrow="Practo Insta · appointments"
          title="Appointment Analytics"
          right={<span className="text-[11px] text-ink-faint">{period}</span>}
        />
        <div className="px-5 pb-5 pt-4">
          <p className="text-[12.5px] leading-snug text-ink-soft">
            The clinic&apos;s appointment book and money view — appointment volume, status mix and peak hours from the ZAVIS
            appointment feed, with billed / collected revenue and per-doctor performance from Practo Insta bills.{' '}
            <span className="text-ink-faint">Driven by the date range above.</span>
          </p>
        </div>
      </Card>

      <Card>
        <SectionHeader tag="PA1" eyebrow="Scorecard" title="At a glance" />
        <div className="px-5 pb-5 pt-4">
          <KpiBand items={kpis} />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionHeader tag="PA2" eyebrow="Trend" title="Appointment volume over time" />
          <div className="px-5 pb-5 pt-4">
            {trendData.length ? (
              <TrendChart
                data={trendData}
                series={[{ key: 'appointments', label: 'Appointments', color: TOKENS.accent, kind: 'area', axis: 'left', valueFormat: 'int' }]}
                leftFormat="int"
              />
            ) : (
              <DataGapInline detail="no dated appointments to chart" owner={ownerFor('clinic')} />
            )}
          </div>
        </Card>

        <Card>
          <SectionHeader tag="PA3" eyebrow="Breakdown" title="Status distribution" />
          <div className="px-5 pb-5 pt-4">
            {statusDonut.length ? (
              <Donut data={statusDonut} valueFormat="int" centerLabel="total" height={210} />
            ) : (
              <DataGapInline detail="no appointment statuses" owner={ownerFor('clinic')} />
            )}
          </div>
        </Card>
      </div>

      {/* Revenue Overview */}
      <Card>
        <SectionHeader
          tag="PA4"
          eyebrow="Revenue overview"
          title="Money billed & received in the period"
          right={<span className="text-[11px] text-ink-faint">{int(r.billCount)} bills</span>}
        />
        <div className="px-5 pb-5 pt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Billed" value={aed(r.billed)} sub="Total invoiced (net of discounts)" />
            <StatTile
              label="Collected"
              value={aed(r.collected)}
              sub={r.collectedRate != null ? `${pct(r.collectedRate)} of billed received so far` : undefined}
              tone="good"
            />
            <StatTile label="Outstanding" value={aed(r.outstanding)} sub="Awaiting payment — mostly insurance claims" tone="watch" />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Panel title="How payments came in" note="Payments recorded at the counter, refunds deducted">
              <ShareBars rows={r.byMode} format={aed} />
            </Panel>
            <Panel title="Collections by staff" note="Who received counter payments — for till reconciliation">
              <ShareBars rows={r.byStaff} format={aed} suffix={(x) => (x.count != null ? `${x.count} receipt${x.count === 1 ? '' : 's'}` : undefined)} />
            </Panel>
            <Panel title="Who pays the bills" note="Split of billed amount between insurance and patients">
              <PayerSplit insurance={r.insurance} patient={r.patient} />
            </Panel>
          </div>

          {r.coverageNote ? <p className="mt-3 text-[11px] text-ink-faint">{r.coverageNote}</p> : null}
        </div>
      </Card>

      {/* Department & Provider Performance */}
      <Card>
        <SectionHeader tag="PA5" eyebrow="Department & provider" title="Provider performance" />
        <div className="px-5 pb-5 pt-4">
          {a.providerDaily.length ? (
            <ProviderPerformance providerDaily={a.providerDaily} />
          ) : (
            <DataGapInline detail="no provider-level charges or appointments in this period" owner={ownerFor('clinic')} />
          )}
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------- primitives */

function StatTile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'watch' }) {
  const valueColor = tone === 'good' ? 'text-good' : tone === 'watch' ? 'text-ink' : 'text-ink';
  return (
    <div className="rounded-card border border-line p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={`mt-1 text-[22px] font-semibold tabular-nums ${valueColor}`}>{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-ink-faint">{sub}</p> : null}
    </div>
  );
}

function Panel({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <div className="rounded-card border border-line p-4">
      <p className="text-[12.5px] font-semibold text-ink">{title}</p>
      {note ? <p className="mb-3 mt-0.5 text-[10.5px] text-ink-faint">{note}</p> : null}
      <div className="mt-1">{children}</div>
    </div>
  );
}

function ShareBars({
  rows,
  format,
  suffix,
}: {
  rows: NamedAmount[];
  format: (n: number) => string;
  suffix?: (r: NamedAmount) => string | undefined;
}) {
  if (!rows.length) return <p className="text-[12px] text-ink-faint">No payments recorded.</p>;
  const total = rows.reduce((s, x) => s + Math.abs(x.amount), 0) || 1;
  return (
    <ul className="space-y-2.5">
      {rows.map((x) => {
        const share = Math.abs(x.amount) / total;
        const extra = suffix?.(x);
        return (
          <li key={x.label}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[12px] text-ink">{x.label}</span>
              <span className="shrink-0 text-[12px] font-medium tabular-nums text-ink">
                {format(x.amount)} <span className="text-[10px] font-normal text-ink-faint">{pct(share)}</span>
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-panel-2">
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(2, share * 100)}%` }} />
            </div>
            {extra ? <p className="mt-0.5 text-[10px] text-ink-faint">{extra}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}

function PayerSplit({ insurance, patient }: { insurance: number; patient: number }) {
  const total = insurance + patient || 1;
  const insShare = insurance / total;
  const patShare = patient / total;
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-panel-2">
        <div className="h-full bg-accent-400" style={{ width: `${insShare * 100}%` }} title="Insurance" />
        <div className="h-full bg-accent" style={{ width: `${patShare * 100}%` }} title="Patients" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-card border border-line p-2.5">
          <p className="flex items-center gap-1.5 text-[11px] text-ink-faint">
            <span className="inline-block h-2 w-2 rounded-full bg-accent-400" /> Insurance
          </p>
          <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-ink">{aed(insurance)}</p>
          <p className="text-[10px] text-ink-faint">{pct(insShare)} of billed · paid later by insurers</p>
        </div>
        <div className="rounded-card border border-line p-2.5">
          <p className="flex items-center gap-1.5 text-[11px] text-ink-faint">
            <span className="inline-block h-2 w-2 rounded-full bg-accent" /> Patients
          </p>
          <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-ink">{aed(patient)}</p>
          <p className="text-[10px] text-ink-faint">{pct(patShare)} of billed · paid at the clinic</p>
        </div>
      </div>
    </div>
  );
}
