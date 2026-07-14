'use client';

import { useState } from 'react';
import type { CrmPatientBookings } from '@/lib/crm/patients';

const int = (n: number) => Math.round(n).toLocaleString('en-US');
const aed = (n: number) => `AED ${int(n)}`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "2026-07-14" → "14 Jul 2026". Blank string / null → "—". */
function dlabel(d: string | null): string {
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return '—';
  const [y, m, da] = d.split('-');
  return `${Number(da)} ${MONTHS[Number(m) - 1]} ${y}`;
}

type Filter = 'all' | 'new' | 'existing' | 'booked';

/**
 * Interactive Practo patient panel: clickable scorecards that filter the
 * appointment + per-patient tables (All / New patients / Booked-confirmed /
 * Existing), sourced from the Zavis CRM. New = the patient's first-ever
 * appointment falls in the selected range; "patient since" is that first date.
 */
export function PractoPatientsPanel({ data }: { data: CrmPatientBookings }) {
  const [filter, setFilter] = useState<Filter>('all');

  const rows = data.rows.filter((r) => {
    if (filter === 'new') return r.isNew;
    if (filter === 'existing') return !r.isNew && !!r.patientId;
    if (filter === 'booked') return r.booked;
    return true;
  });
  const paid = data.paidRows.filter((r) => {
    if (filter === 'new') return r.isNew;
    if (filter === 'existing') return !r.isNew && !!r.patientId;
    return true; // 'booked' doesn't apply per-patient → show all
  });

  const cards: { key: Filter; label: string; value: number; hint: string }[] = [
    { key: 'all', label: 'Appointments', value: data.appointments, hint: 'all statuses · click to reset' },
    { key: 'new', label: 'New patients', value: data.newPatients, hint: 'first visit in range · click to filter' },
    { key: 'existing', label: 'Existing patients', value: data.existingPatients, hint: 'seen before range · click to filter' },
    { key: 'booked', label: 'Booked / confirmed', value: data.bookedConfirmed, hint: 'of all appointments · click to filter' },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {cards.map((c) => {
          const active = filter === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setFilter(active && c.key !== 'all' ? 'all' : c.key)}
              aria-pressed={active}
              className={`rounded-card border p-3.5 text-left transition ${
                active ? 'border-accent bg-accent/5 ring-1 ring-accent/40' : 'border-line bg-card hover:bg-na/10'
              }`}
            >
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{c.label}</p>
              <p className="tnum mt-1 text-[24px] font-semibold tracking-tight text-ink">{int(c.value)}</p>
              <p className="mt-0.5 text-[11px] text-ink-faint">{c.hint}</p>
            </button>
          );
        })}
      </div>

      {filter !== 'all' ? (
        <p className="mt-3 text-[12px] text-ink-soft">
          Filtered to <span className="font-medium text-ink">{filter === 'booked' ? 'booked / confirmed' : `${filter} patients`}</span>
          {' '}· {int(rows.length)} appointment{rows.length === 1 ? '' : 's'}.{' '}
          <button type="button" onClick={() => setFilter('all')} className="text-accent underline-offset-2 hover:underline">
            Clear
          </button>
        </p>
      ) : null}

      {/* Appointments table */}
      <div className="mt-4 overflow-x-auto">
        <div className="max-h-[520px] overflow-y-auto rounded-card border border-line">
          <table className="w-full min-w-[820px] border-collapse text-[12.5px]">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-line text-left text-ink-faint">
                <th className="px-3 py-2 font-medium">Patient</th>
                <th className="px-3 py-2 font-medium">New / existing</th>
                <th className="px-3 py-2 font-medium">Appointment</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Patient since</th>
                <th className="px-3 py-2 font-medium">Service / doctor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-line/60 align-top last:border-0">
                  <td className="px-3 py-1.5 font-medium text-ink">{r.patientName}</td>
                  <td className="px-3 py-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        r.isNew ? 'bg-good/10 text-good' : 'bg-na/10 text-ink-soft'
                      }`}
                    >
                      {r.isNew ? 'New' : 'Existing'}
                    </span>
                  </td>
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
                  <td className="tnum px-3 py-1.5 text-right text-ink">{r.amount != null ? aed(r.amount) : '—'}</td>
                  <td className="tnum px-3 py-1.5 text-ink-faint">{dlabel(r.patientSince)}</td>
                  <td className="px-3 py-1.5 text-ink-faint">
                    {[r.service, r.doctor].filter(Boolean).join(' · ') || '—'}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-[12.5px] text-ink-faint">
                    No appointments match this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {data.total > data.rows.length ? (
          <p className="mt-2 text-[11.5px] text-ink-faint">
            Showing up to {int(data.rows.length)} of {int(data.total)} appointments (most recent first).
          </p>
        ) : null}
      </div>

      {/* Per-patient: who paid how much */}
      <div className="mt-6">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
          By patient — amount paid ({int(data.amountKnown)} of {int(data.appointments)} appointments priced)
        </p>
        <div className="overflow-x-auto">
          <div className="max-h-[420px] overflow-y-auto rounded-card border border-line">
            <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-line text-left text-ink-faint">
                  <th className="px-3 py-2 font-medium">Patient</th>
                  <th className="px-3 py-2 text-right font-medium">Amount paid</th>
                  <th className="px-3 py-2 text-right font-medium">Appts</th>
                  <th className="px-3 py-2 font-medium">New / existing</th>
                  <th className="px-3 py-2 font-medium">Patient since</th>
                </tr>
              </thead>
              <tbody>
                {paid.map((p, i) => (
                  <tr key={i} className="border-b border-line/60 last:border-0">
                    <td className="px-3 py-1.5 font-medium text-ink">{p.patientName}</td>
                    <td className="tnum px-3 py-1.5 text-right text-ink">{p.paid != null ? aed(p.paid) : '—'}</td>
                    <td className="tnum px-3 py-1.5 text-right text-ink-soft">{int(p.appointments)}</td>
                    <td className="px-3 py-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          p.isNew ? 'bg-good/10 text-good' : 'bg-na/10 text-ink-soft'
                        }`}
                      >
                        {p.isNew ? 'New' : 'Existing'}
                      </span>
                    </td>
                    <td className="tnum px-3 py-1.5 text-ink-faint">{dlabel(p.patientSince)}</td>
                  </tr>
                ))}
                {paid.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-[12.5px] text-ink-faint">
                      No patients match this filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-2 text-[11.5px] text-ink-faint">
          Amount is what the CRM recorded on the appointment; blank where no amount was entered. &quot;Patient
          since&quot; is the first date this patient was booked (blank if unknown).
        </p>
      </div>
    </div>
  );
}
