'use client';

import { useMemo, useState } from 'react';
import type { WidgetEnquiryReport } from '@/lib/bookings/widgetEnquiries';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';

const int = (n: number) => Math.round(n).toLocaleString('en-US');
const pct = (n: number | null) => (n == null ? '—' : `${Math.round(n * 100)}%`);

function dayLabel(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit', timeZone: 'UTC' });
  } catch {
    return iso;
  }
}

type Filter = 'all' | 'booked' | 'failed';

export function WidgetEnquiriesPanel({ report, period }: { report: WidgetEnquiryReport; period: string }) {
  const [filter, setFilter] = useState<Filter>('all');

  const rows = useMemo(() => {
    if (filter === 'all') return report.enquiries;
    return report.enquiries.filter((e) => e.status === filter);
  }, [report.enquiries, filter]);

  if (report.source === 'empty') {
    return (
      <Card>
        <SectionHeader eyebrow="Website Bookings · widget enquiries" title="Website widget enquiries — booked vs failed to book" />
        <div className="px-5 pb-5 pt-4">
          <p className="text-[12.5px] text-ink-soft">
            No widget enquiries in this window yet. This fills from the booking-widget sheet on the next sync (excludes test rows).
          </p>
        </div>
      </Card>
    );
  }

  const chips: { key: Filter; label: string; n: number; color: string }[] = [
    { key: 'all', label: 'All enquiries', n: report.total, color: 'bg-ink text-panel' },
    { key: 'booked', label: 'Booked', n: report.booked, color: 'bg-good text-white' },
    { key: 'failed', label: 'Failed to book', n: report.failed, color: 'bg-stop text-white' },
  ];

  return (
    <Card>
      <SectionHeader
        eyebrow="Website Bookings · widget enquiries"
        title="Website widget enquiries — booked vs failed to book"
        right={<span className="text-[11px] text-ink-faint">{period}</span>}
      />
      <div className="px-5 pb-5 pt-4">
        {/* KPI band */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-line bg-panel p-3">
            <p className="text-[19px] font-semibold text-ink">{int(report.total)}</p>
            <p className="text-[10.5px] uppercase tracking-wide text-ink-faint">Enquiries (non-test)</p>
          </div>
          <div className="rounded-xl border border-line bg-panel p-3">
            <p className="text-[19px] font-semibold text-good">{int(report.booked)}</p>
            <p className="text-[10.5px] uppercase tracking-wide text-ink-faint">Booked (in ZAVIS/Practo)</p>
          </div>
          <div className="rounded-xl border border-line bg-panel p-3">
            <p className="text-[19px] font-semibold text-stop">{int(report.failed)}</p>
            <p className="text-[10.5px] uppercase tracking-wide text-ink-faint">Failed to book</p>
          </div>
          <div className="rounded-xl border border-line bg-panel p-3">
            <p className="text-[19px] font-semibold text-ink">{pct(report.bookedRate)}</p>
            <p className="text-[10.5px] uppercase tracking-wide text-ink-faint">Booked rate</p>
          </div>
        </div>

        {/* Filter chips */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              className={`rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                filter === c.key ? c.color : 'bg-panel-2 text-ink-soft hover:text-ink'
              }`}
            >
              {c.label} · {int(c.n)}
            </button>
          ))}
        </div>

        {/* Detail table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[12px]">
            <thead>
              <tr className="border-b border-line text-left text-[10.5px] uppercase tracking-wide text-ink-faint">
                <th className="py-2 pr-3">Patient</th>
                <th className="py-2 pr-3">Phone</th>
                <th className="py-2 pr-3">Treatment</th>
                <th className="py-2 pr-3">Clinic</th>
                <th className="py-2 pr-3">Enquired</th>
                <th className="py-2 pr-3">Requested date</th>
                <th className="py-2 pl-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.key} className="border-b border-line/60">
                  <td className="py-2 pr-3 text-ink">{e.name ?? '—'}</td>
                  <td className="py-2 pr-3 tabular-nums text-ink-soft">{e.phone ?? '—'}</td>
                  <td className="py-2 pr-3 text-ink-soft">{e.treatment ?? '—'}</td>
                  <td className="py-2 pr-3 text-ink-soft">{e.clinic ?? '—'}</td>
                  <td className="py-2 pr-3 tabular-nums text-ink-soft">{dayLabel(e.enquiredAt)}</td>
                  <td className="py-2 pr-3 tabular-nums text-ink-soft">{dayLabel(e.apptDate)}</td>
                  <td className="py-2 pl-3">
                    {e.status === 'booked' ? (
                      <span className="rounded-full bg-good/10 px-2 py-0.5 text-[11px] font-medium text-good">Booked</span>
                    ) : (
                      <span className="rounded-full bg-stop/10 px-2 py-0.5 text-[11px] font-medium text-stop">Failed to book</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-[12px] text-ink-faint">No enquiries in this filter.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <Takeaway>
          Every non-test website-widget enquiry, and whether it reached the clinic&apos;s booking system.{' '}
          <strong>Booked</strong> = the enquirer&apos;s phone matches a real appointment in ZAVIS or Practo;{' '}
          <strong>Failed to book</strong> = no match — the widget→Practo hand-off didn&apos;t complete. Booking totals
          elsewhere stay Practo-sourced; this is the enquiry lens only.
        </Takeaway>
      </div>
    </Card>
  );
}
