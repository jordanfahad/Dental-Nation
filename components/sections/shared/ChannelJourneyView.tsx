'use client';

import { useMemo, useState } from 'react';
import type { ClinicFunnelReport, ClinicJourneyPatient } from '@/lib/executive/clinicFunnel.types';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { dubaiDateLabel } from '@/lib/dates';
import { fmtAed } from '@/components/sections/executive/parts';

const int = (n: number) => Math.round(n).toLocaleString('en-US');
const pct = (n: number) => `${Math.round(n * 100)}%`;

type Filter = 'all' | 'showed' | 'noshow' | 'paid' | 'rebooked';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All booked' },
  { key: 'showed', label: 'Showed up' },
  { key: 'noshow', label: 'Not shown' },
  { key: 'paid', label: 'Converted / paid' },
  { key: 'rebooked', label: 'Re-booked' },
];

const isRebooked = (p: ClinicJourneyPatient): boolean => !!p.nextAppt;

interface ChannelRow {
  channel: string;
  booked: number;
  showed: number;
  treated: number;
  paid: number;
  revenue: number;
  rebooked: number;
}

/**
 * Full journey ranked BY BOOKING CHANNEL (Website widget / AI agent / Front desk
 * / Walk-in) — booked → showed → treated → paid → re-booked, best-to-low by
 * revenue — plus a filterable per-patient table (booked / showed / not-shown /
 * paid / re-booked). This is the channel the booking record actually carries;
 * the marketing platform (WhatsApp/Instagram) can't be tied to a booked patient
 * (matches ~1%), so it stays on the Platforms sub-tab — see the note below.
 */
export function ChannelJourneyView({ report }: { report: ClinicFunnelReport }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [channel, setChannel] = useState<string | 'all'>('all');

  // Rank booking channels by revenue (best to low).
  const channels: ChannelRow[] = useMemo(() => {
    const m = new Map<string, ChannelRow>();
    for (const p of report.patients) {
      const c = m.get(p.channel) ?? { channel: p.channel, booked: 0, showed: 0, treated: 0, paid: 0, revenue: 0, rebooked: 0 };
      c.booked += 1;
      if (p.showed) c.showed += 1;
      if (p.billed) c.treated += 1;
      if (p.paid) {
        c.paid += 1;
        c.revenue += p.paidAmount;
      }
      if (isRebooked(p)) c.rebooked += 1;
      m.set(p.channel, c);
    }
    return [...m.values()].sort((a, b) => b.revenue - a.revenue || b.booked - a.booked);
  }, [report.patients]);

  const maxRev = Math.max(...channels.map((c) => c.revenue), 1);

  const rows = useMemo(() => {
    let ps = report.patients;
    if (channel !== 'all') ps = ps.filter((p) => p.channel === channel);
    switch (filter) {
      case 'showed':
        ps = ps.filter((p) => p.showed);
        break;
      case 'noshow':
        ps = ps.filter((p) => !p.showed);
        break;
      case 'paid':
        ps = ps.filter((p) => p.paid);
        break;
      case 'rebooked':
        ps = ps.filter(isRebooked);
        break;
    }
    return [...ps].sort((a, b) => b.paidAmount - a.paidAmount || (b.bookedDate ?? '').localeCompare(a.bookedDate ?? ''));
  }, [report.patients, filter, channel]);

  const shown = rows.slice(0, 100);

  return (
    <Card>
      <SectionHeader
        eyebrow="Marketing · full journey by channel"
        title="Which channel books, shows, pays — and re-books"
      />
      <div className="px-5 pb-5 pt-4">
        {/* Channel ranking — best to low by revenue. */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-faint">
                <th className="py-2 pr-3 font-medium">#</th>
                <th className="py-2 pr-3 font-medium">Booking channel</th>
                <th className="py-2 pr-3 text-right font-medium">Booked</th>
                <th className="py-2 pr-3 text-right font-medium">Showed</th>
                <th className="py-2 pr-3 text-right font-medium">Treated</th>
                <th className="py-2 pr-3 text-right font-medium">Paid</th>
                <th className="py-2 pr-3 text-right font-medium">Re-booked</th>
                <th className="py-2 pl-3 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c, i) => (
                <tr
                  key={c.channel}
                  className="cursor-pointer border-b border-line/60 last:border-0 hover:bg-na/5"
                  onClick={() => setChannel(channel === c.channel ? 'all' : c.channel)}
                  title="Click to filter the table below to this channel"
                >
                  <td className="py-2 pr-3 tabular-nums text-ink-faint">{i + 1}</td>
                  <td className="py-2 pr-3 font-medium text-ink">
                    {c.channel}
                    {channel === c.channel ? <span className="ml-1.5 text-[10px] text-accent">▼ filtered</span> : null}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink">{int(c.booked)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">
                    {int(c.showed)} <span className="text-ink-faint">({pct(c.showed / c.booked)})</span>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{int(c.treated)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">
                    {int(c.paid)} <span className="text-ink-faint">({pct(c.paid / c.booked)})</span>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-good">{int(c.rebooked)}</td>
                  <td className="py-2 pl-3 text-right">
                    <span className="tabular-nums font-semibold text-ink">{fmtAed(c.revenue)}</span>
                    <span className="mt-0.5 block h-1 rounded-full bg-accent/70" style={{ width: `${Math.max((c.revenue / maxRev) * 100, 2)}%` }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Takeaway>
          Ranked by revenue, best to low. <strong>Channel</strong> is how the booking was made — the marketing
          platform (WhatsApp / Instagram) isn&apos;t recorded on the booking, so it can&apos;t be carried this far
          (it matches a booked patient ~1%); see the <strong>Website Bookings → Platforms</strong> sub-tab for the
          enquiry-side platform / source / medium ranking. <strong>Re-booked</strong> = the patient has a future
          appointment on the calendar.
        </Takeaway>

        {/* Filterable patient detail. */}
        <div className="mt-5 mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Show:</span>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 text-[12px] font-medium transition ${
                  active ? 'border-accent bg-accent text-white shadow-sm' : 'border-line bg-card text-ink-soft hover:border-accent/40 hover:text-ink'
                }`}
              >
                {f.label}
              </button>
            );
          })}
          {channel !== 'all' ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/5 px-2.5 py-0.5 text-[11.5px] font-medium text-accent">
              {channel}
              <button type="button" onClick={() => setChannel('all')} className="text-accent/70 hover:text-accent" aria-label="clear channel filter">
                ✕
              </button>
            </span>
          ) : null}
          <span className="text-[11.5px] text-ink-faint">{int(rows.length)} patients</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-faint">
                <th className="py-2 pr-3 font-medium">Patient</th>
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="py-2 pr-3 font-medium">Channel</th>
                <th className="py-2 pr-3 font-medium">Booked</th>
                <th className="py-2 pr-3 font-medium">Showed</th>
                <th className="py-2 pr-3 font-medium">Treatment / doctor</th>
                <th className="py-2 pr-3 text-right font-medium">Revenue</th>
                <th className="py-2 pl-3 font-medium">Re-booked</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.key} className="border-b border-line/60 last:border-0">
                  <td className="py-2 pr-3">
                    <span className="font-medium text-ink">{p.name ?? '—'}</span>
                    {p.fileNo ? <span className="block text-[10.5px] tabular-nums text-ink-faint">{p.fileNo}</span> : null}
                  </td>
                  <td className="py-2 pr-3 text-ink-soft">{p.patientClass === 'upcoming' ? 'not yet visited' : p.patientClass}</td>
                  <td className="py-2 pr-3 text-ink-soft">{p.channel}</td>
                  <td className="py-2 pr-3 tabular-nums text-ink-soft">{p.bookedDate ? dubaiDateLabel(p.bookedDate) : '—'}</td>
                  <td className="py-2 pr-3">
                    {p.showed ? (
                      <span className="text-[11px] text-good">yes</span>
                    ) : (
                      <span className="text-[11px] text-watch">no</span>
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
                  <td className="py-2 pl-3 tabular-nums">
                    {p.nextAppt ? (
                      <span className="text-good">{dubaiDateLabel(p.nextAppt)}</span>
                    ) : p.visits > 1 ? (
                      <span className="text-ink-faint">{int(p.visits)} visits</span>
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > shown.length ? (
            <p className="mt-2 text-[11.5px] text-ink-faint">Showing {int(shown.length)} of {int(rows.length)} (highest revenue first).</p>
          ) : null}
          {rows.length === 0 ? <p className="mt-2 text-[12px] text-ink-faint">No patients match this filter.</p> : null}
        </div>
      </div>
    </Card>
  );
}
