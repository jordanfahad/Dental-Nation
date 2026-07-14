import { getPractoSummary } from '@/lib/practo/report';
import { getCrmPatientBookings } from '@/lib/crm/patients';
import { ClinicCompare } from '@/components/ClinicCompare';
import type { ClinicFilterKey } from '@/config/clinics';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import {
  ChartLegend,
  Donut,
  HBarChart,
  TOKENS,
  TrendChart,
  type BarDatum,
  type TrendSeries,
} from '@/components/charts/Charts';
import { ownerFor } from '@/config/data-gap-owners';
import { dubaiDateLabel } from '@/lib/dates';

const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`;
const int = (n: number) => Math.round(n).toLocaleString('en-US');

/**
 * Practo Insta tab — the clinic PMS lens. Reads finalized bills from
 * getPractoSummary() (all-time). This is a DISTINCT population from the booking
 * funnel + CRM appointments: real money the clinic invoiced.
 *
 * Honest states (CLAUDE.md §15): never a fabricated 0.
 *  - not configured           → "connect Practo (PRACTO_* env)" data gap
 *  - configured but no bills   → "awaiting first bills sync" data gap
 *  - bills present             → KPIs + trend + mix charts, amount-coverage caveat
 */
export async function PractoReport({
  range,
}: {
  range?: { from?: string; to?: string; clinic?: ClinicFilterKey };
} = {}) {
  const p = await getPractoSummary(range);
  const cpb = await getCrmPatientBookings({ from: range?.from, to: range?.to, clinic: range?.clinic });

  const period =
    p.periodStart && p.periodEnd
      ? `${dubaiDateLabel(p.periodStart)} → ${dubaiDateLabel(p.periodEnd)}`
      : null;

  const isEmpty = p.source === 'empty';

  const coverage = p.billCount > 0 ? p.amountKnown / p.billCount : null;

  const kpis: KpiItem[] = [
    {
      label: 'Finalized revenue',
      value: isEmpty ? null : aed(p.revenue),
      gapDetail: 'awaiting Practo bills',
      gapOwner: ownerFor('clinic'),
    },
    {
      label: 'Bills',
      value: isEmpty ? null : int(p.billCount),
      gapDetail: 'awaiting Practo bills',
      gapOwner: ownerFor('clinic'),
    },
    {
      label: 'Avg bill value',
      value: p.avgBill != null ? aed(p.avgBill) : null,
      gapDetail: 'no priced bills yet',
      gapOwner: ownerFor('clinic'),
      hint: p.avgBill != null ? `over ${int(p.amountKnown)} priced bills` : undefined,
    },
    {
      label: 'Amount coverage',
      value: coverage != null ? `${Math.round(coverage * 100)}%` : null,
      gapDetail: 'no bills to measure',
      gapOwner: ownerFor('clinic'),
      hint: coverage != null ? `${int(p.amountKnown)}/${int(p.billCount)} bills priced` : undefined,
    },
    {
      label: 'Period span',
      value: p.periodStart && p.periodEnd ? `${p.byDay.length} day${p.byDay.length === 1 ? '' : 's'}` : null,
      gapDetail: 'no dated bills yet',
      gapOwner: ownerFor('clinic'),
      hint: period ?? undefined,
    },
  ];

  const trendData = p.byDay.map((d) => ({ date: d.date, revenue: Math.round(d.revenue), bills: d.bills }));
  const trendSeries: TrendSeries[] = [
    { key: 'revenue', label: 'Revenue (AED)', color: TOKENS.accent, kind: 'area', axis: 'left', valueFormat: 'aed' },
    { key: 'bills', label: 'Bills', color: TOKENS.accent400, kind: 'line', axis: 'right', valueFormat: 'int' },
  ];

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader
          tag="P"
          eyebrow="Clinic PMS · Practo Insta"
          title="Practo Insta — Clinic Revenue (finalized bills)"
          right={
            <span className="text-[11px] text-ink-faint">
              {p.configured ? 'live API' : 'not connected'}
            </span>
          }
        />
        <div className="px-5 pb-5 pt-4">
          <p className="text-[12.5px] leading-snug text-ink-soft">
            This is the clinic&apos;s Practo Insta PMS — real money invoiced on finalized bills. It is its
            own population, distinct from the website booking widget and the CRM appointment funnel; do not
            fuse it with them.
            {period ? <span className="text-ink-faint"> Period: {period}.</span> : null}
          </p>
          {isEmpty ? (
            <div className="mt-4">
              {!p.configured ? (
                <DataGapInline
                  detail="Practo not connected — set PRACTO_BASE_URL / PRACTO_HOSPITAL / PRACTO_AUTH (PRACTO_* env), then run the first bills sync"
                  owner={ownerFor('clinic')}
                />
              ) : (
                <DataGapInline
                  detail="Practo connected, awaiting first bills sync (hourly cron; or trigger /api/practo/probe?sync=1)"
                  owner={ownerFor('clinic')}
                />
              )}
            </div>
          ) : null}
        </div>
      </Card>

      <Card>
        <SectionHeader tag="P1" eyebrow="Scorecard" title="Finalized revenue at a glance" />
        <div className="px-5 pb-5 pt-4">
          <KpiBand items={kpis} />
        </div>
      </Card>

      {p.byClinic.length ? (
        <ClinicCompare
          tag="P1b"
          eyebrow="By clinic"
          title="Finalized revenue by clinic"
          bars={p.byClinic.map((c) => ({ label: c.label, value: c.revenue }))}
          barFormat="aed"
          columns={p.byClinic.map((c) => ({
            label: c.label,
            value: aed(c.revenue),
            sub: `${int(c.bills)} bill${c.bills === 1 ? '' : 's'}`,
          }))}
          note={
            p.byClinic.some((c) => c.clinic === 'dr-tosun' && c.bills === 0)
              ? 'Dr Tosun reads AED 0 because its Practo bills aren’t syncing yet — this fills in automatically once they arrive (its appointments already show below, from the CRM).'
              : undefined
          }
        />
      ) : null}

      <Card>
        <SectionHeader tag="P2" eyebrow="Daily" title="Finalized revenue & bills over time" />
        <div className="px-5 pb-5 pt-4">
          {isEmpty ? (
            <DataGapInline detail="no dated bills to chart yet" owner={ownerFor('clinic')} />
          ) : (
            <>
              <TrendChart data={trendData} series={trendSeries} leftFormat="aed" rightFormat="int" />
              <ChartLegend
                items={[
                  { label: 'Revenue (AED)', color: TOKENS.accent },
                  { label: 'Bills', color: TOKENS.accent400 },
                ]}
              />
            </>
          )}
        </div>
      </Card>

      <Card>
        <SectionHeader tag="P3" eyebrow="Mix" title="Where the revenue comes from" />
        <div className="px-5 pb-5 pt-4">
          {isEmpty ? (
            <DataGapInline detail="no priced bills to break down yet" owner={ownerFor('clinic')} />
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                  Revenue by department
                </p>
                <Donut data={p.byDepartment as BarDatum[]} valueFormat="aed" centerLabel="revenue" height={200} />
              </div>
              <div>
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                  Top treatments by revenue
                </p>
                <HBarChart data={p.byTreatment as BarDatum[]} valueFormat="aed" />
              </div>
            </div>
          )}
        </div>
      </Card>

      {!isEmpty && p.byDoctor.length > 0 ? (
        <Card>
          <SectionHeader tag="P4" eyebrow="Mix" title="Revenue by conducting doctor" />
          <div className="px-5 pb-5 pt-4">
            <HBarChart data={p.byDoctor as BarDatum[]} valueFormat="aed" accent={TOKENS.accent600} />
            <Takeaway>
              This is real finalized clinic revenue from Practo&apos;s line-item charges — not a forecast or a
              booking estimate. Average bill value:{' '}
              <span className="font-medium text-ink-soft">{p.avgBill != null ? aed(p.avgBill) : '—'}</span>.
            </Takeaway>
          </div>
        </Card>
      ) : null}

      {/* Patients & appointments — from the Zavis CRM (Practo bills carry no
          patient name / appointment; the CRM does). */}
      <Card>
        <SectionHeader
          tag="P5"
          eyebrow="Zavis CRM · patients"
          title="New patients & appointments booked"
          right={<span className="text-[11px] text-ink-faint">Zavis CRM feed</span>}
        />
        <div className="px-5 pb-5 pt-4">
          <p className="text-[12.5px] leading-snug text-ink-soft">
            Patient entries and appointment bookings from the <strong>Zavis CRM</strong> — Practo&apos;s
            finalized bills don&apos;t carry patient names or appointments, so these come from the CRM.
            All-time; each row is one appointment with the patient, the visit date and when it was booked.
          </p>

          {cpb.source === 'empty' ? (
            <div className="mt-4">
              <DataGapInline detail="no CRM appointments ingested yet" owner={ownerFor('clinic')} />
            </div>
          ) : (
            <>
              <div className="mt-4">
                <KpiBand
                  items={[
                    { label: 'New patients', value: int(cpb.patients), hint: 'distinct patients in the CRM' },
                    { label: 'Appointments', value: int(cpb.appointments), hint: 'all statuses' },
                    { label: 'Booked / confirmed', value: int(cpb.bookedConfirmed), hint: 'of all appointments' },
                  ]}
                />
              </div>

              <div className="mt-5 overflow-x-auto">
                <div className="max-h-[520px] overflow-y-auto rounded-card border border-line">
                  <table className="w-full min-w-[720px] border-collapse text-[12.5px]">
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b border-line text-left text-ink-faint">
                        <th className="px-3 py-2 font-medium">Patient</th>
                        <th className="px-3 py-2 font-medium">Appointment</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Booked on</th>
                        <th className="px-3 py-2 font-medium">Service / doctor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cpb.rows.map((r, i) => (
                        <tr key={i} className="border-b border-line/60 align-top last:border-0">
                          <td className="px-3 py-1.5 font-medium text-ink">{r.patientName}</td>
                          <td className="tnum px-3 py-1.5 text-ink-soft">{r.appointmentLabel ?? '—'}</td>
                          <td className="px-3 py-1.5">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                r.booked ? 'bg-good/10 text-good' : 'bg-na/10 text-ink-soft'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="tnum px-3 py-1.5 text-ink-faint">
                            {r.bookedOn ? dubaiDateLabel(r.bookedOn) : '—'}
                          </td>
                          <td className="px-3 py-1.5 text-ink-faint">
                            {[r.service, r.doctor].filter(Boolean).join(' · ') || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {cpb.total > cpb.rows.length ? (
                  <p className="mt-2 text-[11.5px] text-ink-faint">
                    Showing {int(cpb.rows.length)} of {int(cpb.total)} appointments (most recent first).
                  </p>
                ) : null}
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
