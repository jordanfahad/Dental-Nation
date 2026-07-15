'use client';

import { useMemo, useState } from 'react';
import type { ClinicFunnelReport, ClinicJourneyPatient, PatientClass } from '@/lib/executive/clinicFunnel.types';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { FunnelViz, type FunnelStageViz } from '@/components/charts/FunnelViz';
import { dubaiDateLabel } from '@/lib/dates';
import { fmtAed } from '@/components/sections/executive/parts';

const int = (n: number) => Math.round(n).toLocaleString('en-US');
const pct = (n: number) => `${Math.round(n * 100)}%`;

type Filter = 'all' | PatientClass;

const CLASS_STYLE: Record<PatientClass, string> = {
  new: 'text-good border-good/40 bg-good/5',
  existing: 'text-accent border-accent/40 bg-accent/5',
  upcoming: 'text-watch border-watch/40 bg-watch/5',
};
const CLASS_LABEL: Record<PatientClass, string> = { new: 'new', existing: 'existing', upcoming: 'not yet visited' };

/**
 * Interactive clinic patient-journey view. The New / Existing / Not-yet-visited
 * chips are clickable filters — picking one recomputes the whole funnel, the
 * collected total and the table for just that cohort; "All" shows everything.
 * `compact` drops the table + enquiries context for the Bookings / Marketing
 * strips while keeping the same interactive funnel.
 */
export function ClinicJourneyView({
  report,
  eyebrow,
  title,
  compact = false,
}: {
  report: ClinicFunnelReport;
  eyebrow: string;
  title: string;
  compact?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const period = `${dubaiDateLabel(report.from)} → ${dubaiDateLabel(report.to)}`;

  const view = useMemo(() => {
    const ps = filter === 'all' ? report.patients : report.patients.filter((p) => p.patientClass === filter);
    const showed = ps.filter((p) => p.showed).length;
    const billed = ps.filter((p) => p.billed).length;
    const paid = ps.filter((p) => p.paid).length;
    const paidAED = ps.reduce((s, p) => s + (p.paid ? p.paidAmount : 0), 0);
    return { ps, booked: ps.length, showed, billed, paid, paidAED };
  }, [filter, report.patients]);

  const stages: FunnelStageViz[] = [
    { label: 'Booked', value: view.booked },
    { label: 'Showed up', value: view.showed },
    { label: 'Treatment (billed)', value: view.billed },
    { label: 'Paid', value: view.paid },
  ];
  const paidPerPatient = view.paid > 0 ? view.paidAED / view.paid : null;
  const rows = view.ps.slice(0, 80);

  const chips: { key: Filter; label: string; count: number; style: string }[] = [
    { key: 'all', label: 'All', count: report.booked, style: 'text-ink border-line bg-card' },
    { key: 'new', label: 'New', count: report.newCount, style: CLASS_STYLE.new },
    { key: 'existing', label: 'Existing', count: report.existingCount, style: CLASS_STYLE.existing },
  ];
  if (report.upcomingCount > 0) {
    chips.push({ key: 'upcoming', label: 'Not yet visited', count: report.upcomingCount, style: CLASS_STYLE.upcoming });
  }

  return (
    <Card>
      <SectionHeader eyebrow={eyebrow} title={title} right={<span className="text-[11px] text-ink-faint">{period}</span>} />
      <div className="px-5 pb-5 pt-4">
        {/* Clickable cohort filter. */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Of {int(report.booked)} booked:</span>
          {chips.map((c) => {
            const active = filter === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setFilter(c.key)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 text-[12px] font-medium transition ${c.style} ${
                  active ? 'ring-2 ring-accent/50 shadow-sm' : 'opacity-70 hover:opacity-100'
                }`}
              >
                {int(c.count)} {c.label}
              </button>
            );
          })}
          {filter !== 'all' ? (
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="text-[11.5px] text-ink-faint underline decoration-dotted hover:text-ink"
            >
              clear
            </button>
          ) : null}
        </div>

        {!compact ? (
          <div className="mb-4 flex flex-wrap items-baseline gap-x-6 gap-y-1 rounded-card border border-line bg-card px-4 py-3">
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Enquiries (context)</span>{' '}
              <span className="tnum text-[16px] font-semibold text-ink">{int(report.enquiries)}</span>
            </div>
            <div className="text-[11.5px] leading-snug text-ink-faint">
              The enquiry → booking link isn&apos;t captured yet (lead phones match Zavis ~1%), so this is top-of-funnel
              context — <strong>not</strong> a traced conversion.
            </div>
          </div>
        ) : null}

        <FunnelViz stages={stages} />

        <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-1 rounded-card border border-line bg-card px-4 py-3">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Collected</span>{' '}
            <span className="tnum text-[16px] font-semibold text-ink">{fmtAed(view.paidAED)}</span>
            <span className="ml-1 text-[11px] text-ink-faint">(Practo paid bills{filter !== 'all' ? ` · ${filter}` : ''})</span>
          </div>
          {paidPerPatient != null ? (
            <div className="text-[12.5px] text-ink-soft">
              ≈ <span className="tnum font-medium text-ink">{fmtAed(paidPerPatient)}</span> per paying patient
            </div>
          ) : null}
          {compact ? (
            <div className="text-[11.5px] text-ink-faint">Full patient drill-down on the Executive &amp; Practo tabs.</div>
          ) : (
            <div className="text-[12.5px] text-ink-soft">
              <span className="tnum font-medium text-ink">{pct(report.billMatchRate)}</span> of booked patients tie to a Practo bill
            </div>
          )}
        </div>

        {!compact ? (
          <>
            <Takeaway>
              The per-patient journey we can trace — matched from the Zavis appointment to the Practo bill by{' '}
              <strong>file number</strong>. <strong>Showed up</strong> = Zavis <em>completed</em> or a bill (proof of
              attendance). <strong>Channel</strong> is how the booking was made; the marketing platform
              (WhatsApp/Instagram) isn&apos;t on the booking record, so it stays an aggregate on the Platforms view.
              Click <strong>New</strong> / <strong>Existing</strong> above to see each cohort on its own.
            </Takeaway>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-faint">
                    <th className="py-2 pr-3 font-medium">Patient</th>
                    <th className="py-2 pr-3 font-medium">Type</th>
                    <th className="py-2 pr-3 font-medium">Channel</th>
                    <th className="py-2 pr-3 font-medium">Booked</th>
                    <th className="py-2 pr-3 font-medium">Showed</th>
                    <th className="py-2 pr-3 font-medium">Treatment / doctor</th>
                    <th className="py-2 pr-3 text-right font-medium">Revenue</th>
                    <th className="py-2 pl-3 font-medium">Next / follow-up</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p: ClinicJourneyPatient) => (
                    <tr key={p.key} className="border-b border-line/60 last:border-0">
                      <td className="py-2 pr-3">
                        <span className="font-medium text-ink">{p.name ?? '—'}</span>
                        {p.fileNo ? <span className="block text-[10.5px] tabular-nums text-ink-faint">{p.fileNo}</span> : null}
                      </td>
                      <td className="py-2 pr-3">
                        <span className={`rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${CLASS_STYLE[p.patientClass]}`}>
                          {CLASS_LABEL[p.patientClass]}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-ink-soft">{p.channel}</td>
                      <td className="py-2 pr-3 tabular-nums text-ink-soft">{p.bookedDate ? dubaiDateLabel(p.bookedDate) : '—'}</td>
                      <td className="py-2 pr-3">
                        {p.showed ? (
                          <span className="text-[11px] text-good">yes</span>
                        ) : p.nextAppt ? (
                          <span className="text-[11px] text-watch">no · next {dubaiDateLabel(p.nextAppt)}</span>
                        ) : (
                          <span className="text-[11px] text-ink-faint">no</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-ink-soft">
                        {p.paid ? (
                          <span className="mr-1.5 text-[10.5px] text-good">paid</span>
                        ) : p.billed ? (
                          <span className="mr-1.5 text-[10.5px] text-accent">billed</span>
                        ) : null}
                        {p.services ?? '—'}
                        {p.doctor ? <span className="block text-[10.5px] text-ink-faint">{p.doctor}</span> : null}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-ink">{p.paidAmount > 0 ? fmtAed(p.paidAmount) : '—'}</td>
                      <td className="py-2 pl-3 tabular-nums text-ink-soft">
                        {p.nextAppt ? dubaiDateLabel(p.nextAppt) : p.visits > 1 ? <span className="text-ink-faint">{int(p.visits)} visits</span> : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {view.ps.length > rows.length ? (
                <p className="mt-2 text-[11.5px] text-ink-faint">
                  Showing {int(rows.length)} of {int(view.ps.length)} patients (highest revenue first).
                </p>
              ) : null}
              {view.ps.length === 0 ? (
                <p className="mt-2 text-[12px] text-ink-faint">No {filter} patients in this window.</p>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </Card>
  );
}
