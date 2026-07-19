'use client';

import { useMemo, useState } from 'react';
import type { ProviderDay } from '@/lib/practo/appointmentAnalytics';

const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`;
const pct = (n: number) => `${Math.round(n * 100)}%`;

// Columns Mon → Sun (JS getUTCDay: 0=Sun … 6=Sat).
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DOW_LABEL: Record<number, string> = { 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT', 0: 'SUN' };
// Utilisation capacity: an 8-hour clinical day per provider (booked minutes ÷ 480).
const DAY_CAPACITY_MIN = 480;

interface Cell { revenue: number; collected: number; appts: number; bookedMinutes: number }
interface ProviderRow { provider: string; department: string | null; byDow: Record<number, Cell>; }
interface Week { start: string; end: string; label: string; rows: ProviderRow[] }

/** 'YYYY-MM-DD' → the Monday of that ISO week (as 'YYYY-MM-DD'). */
function mondayOf(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const dow = d.getUTCDay(); // 0=Sun
  const back = (dow + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}
function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function fmtDayLabel(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  return `${d.getUTCDate()} ${d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })}`;
}
const emptyCell = (): Cell => ({ revenue: 0, collected: 0, appts: 0, bookedMinutes: 0 });

export function ProviderPerformance({ providerDaily }: { providerDaily: ProviderDay[] }) {
  const [metric, setMetric] = useState<'revenue' | 'occupancy'>('revenue');

  const weeks = useMemo<Week[]>(() => {
    // week-start → provider → dow → Cell
    const byWeek = new Map<string, Map<string, ProviderRow>>();
    for (const pd of providerDaily) {
      const wk = mondayOf(pd.date);
      const provKey = pd.provider;
      let provs = byWeek.get(wk);
      if (!provs) byWeek.set(wk, (provs = new Map()));
      let row = provs.get(provKey);
      if (!row) provs.set(provKey, (row = { provider: pd.provider, department: pd.department, byDow: {} }));
      if (!row.department && pd.department) row.department = pd.department;
      const cell = row.byDow[pd.dow] ?? (row.byDow[pd.dow] = emptyCell());
      cell.revenue += pd.revenue;
      cell.collected += pd.collected;
      cell.appts += pd.appts;
      cell.bookedMinutes += pd.bookedMinutes;
    }
    return [...byWeek.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([start, provs]) => {
        const end = addDays(start, 6);
        const rows = [...provs.values()].sort(
          (a, b) => weekRevenue(b) - weekRevenue(a) || a.provider.localeCompare(b.provider),
        );
        return { start, end, label: `${fmtDayLabel(start)} – ${fmtDayLabel(end)}`, rows };
      });
  }, [providerDaily]);

  const [wi, setWi] = useState(Math.max(0, weeks.length - 1));
  const week = weeks[Math.min(wi, weeks.length - 1)];

  if (!week) {
    return <p className="px-1 py-6 text-[12.5px] text-ink-soft">No provider activity in this period.</p>;
  }

  const dailyTotals = (dow: number) =>
    week.rows.reduce(
      (acc, r) => {
        const c = r.byDow[dow] ?? emptyCell();
        acc.revenue += c.revenue;
        acc.collected += c.collected;
        acc.bookedMinutes += c.bookedMinutes;
        return acc;
      },
      { revenue: 0, collected: 0, bookedMinutes: 0 },
    );

  return (
    <div>
      {/* Header: metric toggle + week navigation */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border border-line p-0.5">
          {(['revenue', 'occupancy'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`rounded px-3 py-1 text-[12px] font-medium transition ${
                metric === m ? 'bg-accent text-white' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {m === 'revenue' ? 'Revenue Analysis' : 'Occupancy & Efficiency'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="tnum text-[12px] font-medium text-ink">{week.label}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWi((i) => Math.max(0, i - 1))}
              disabled={wi <= 0}
              className="rounded border border-line px-2 py-0.5 text-[13px] text-ink-soft transition hover:text-ink disabled:opacity-40"
              aria-label="Previous week"
            >
              ‹
            </button>
            <button
              onClick={() => setWi((i) => Math.min(weeks.length - 1, i + 1))}
              disabled={wi >= weeks.length - 1}
              className="rounded border border-line px-2 py-0.5 text-[13px] text-ink-soft transition hover:text-ink disabled:opacity-40"
              aria-label="Next week"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-line text-[10px] uppercase tracking-wide text-ink-faint">
              <th className="py-2 pr-3 text-left font-medium">Provider</th>
              {DOW_ORDER.map((dow) => (
                <th key={dow} className="px-2 py-2 text-center font-medium">
                  <span className="block">{DOW_LABEL[dow]}</span>
                  <span className="block text-[9px] normal-case text-ink-faint/70">{fmtDayLabel(addDays(week.start, (dow + 6) % 7))}</span>
                </th>
              ))}
              <th className="py-2 pl-2 text-right font-medium">Week Total</th>
            </tr>
          </thead>
          <tbody>
            {week.rows.map((r) => (
              <tr key={r.provider} className="border-b border-line/60">
                <td className="py-2.5 pr-3">
                  <span className="block font-medium text-ink">{r.provider}</span>
                  {r.department ? <span className="block text-[10px] text-accent">{r.department}</span> : null}
                </td>
                {DOW_ORDER.map((dow) => {
                  const c = r.byDow[dow];
                  return (
                    <td key={dow} className="px-2 py-2.5 text-center align-top">
                      {renderCell(c, metric)}
                    </td>
                  );
                })}
                <td className="py-2.5 pl-2 text-right align-top">{renderWeekTotal(r, metric)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line text-[11px] font-semibold">
              <td className="py-2 pr-3 text-left uppercase tracking-wide text-ink-faint">Daily total</td>
              {DOW_ORDER.map((dow) => {
                const t = dailyTotals(dow);
                return (
                  <td key={dow} className="px-2 py-2 text-center text-ink">
                    {metric === 'revenue'
                      ? t.revenue > 0
                        ? aed(t.revenue)
                        : '—'
                      : t.bookedMinutes > 0
                        ? pct(t.bookedMinutes / (DAY_CAPACITY_MIN * Math.max(1, week.rows.length)))
                        : '—'}
                  </td>
                );
              })}
              <td className="py-2 pl-2 text-right text-ink">—</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-3 text-[11px] leading-snug text-ink-faint">
        {metric === 'revenue' ? (
          <>
            Revenue is Practo&apos;s line-item charges by <strong>conducting doctor</strong> on the day each charge was posted;
            the smaller <span className="text-good">green</span> figure is cash <strong>collected</strong> (receipts allocated to
            each doctor by their share of the bill). Reflects finalized bills synced so far.
          </>
        ) : (
          <>
            Utilisation = booked appointment minutes ÷ an <strong>8-hour clinical day</strong> (480 min), from the CRM
            appointment feed — so &gt;100% means a doctor was booked beyond a standard day. This is our estimate; exact Practo
            occupancy needs each provider&apos;s roster/working hours (a known gap the appointments API will close).
          </>
        )}
      </p>
    </div>
  );
}

function weekRevenue(r: ProviderRow): number {
  return Object.values(r.byDow).reduce((s, c) => s + c.revenue, 0);
}

function renderCell(c: Cell | undefined, metric: 'revenue' | 'occupancy') {
  if (!c) return <span className="text-ink-faint/50">–</span>;
  if (metric === 'revenue') {
    if (c.revenue <= 0 && c.collected <= 0) return <span className="text-ink-faint/50">–</span>;
    return (
      <span className="block">
        <span className="block font-medium text-ink">{aed(c.revenue)}</span>
        {c.collected > 0 ? <span className="block text-[10px] text-good">{aed(c.collected)} coll.</span> : null}
      </span>
    );
  }
  if (c.bookedMinutes <= 0) return <span className="text-ink-faint/50">–</span>;
  const u = c.bookedMinutes / DAY_CAPACITY_MIN;
  const tone = u >= 0.9 ? 'text-good' : u >= 0.4 ? 'text-accent' : 'text-ink-soft';
  return (
    <span className="block">
      <span className={`block font-medium ${tone}`}>{pct(u)}</span>
      <span className="block text-[10px] text-ink-faint">{c.appts} appt{c.appts === 1 ? '' : 's'}</span>
    </span>
  );
}

function renderWeekTotal(r: ProviderRow, metric: 'revenue' | 'occupancy') {
  const cells = Object.values(r.byDow);
  if (metric === 'revenue') {
    const rev = cells.reduce((s, c) => s + c.revenue, 0);
    const coll = cells.reduce((s, c) => s + c.collected, 0);
    return (
      <span className="block">
        <span className="block font-semibold text-ink">{aed(rev)}</span>
        {coll > 0 ? <span className="block text-[10px] text-good">{aed(coll)} coll.</span> : null}
      </span>
    );
  }
  // Week utilisation = average of daily utilisation across the 7-day week.
  const booked = cells.reduce((s, c) => s + c.bookedMinutes, 0);
  return <span className="block font-semibold text-ink">{pct(booked / (DAY_CAPACITY_MIN * 7))}</span>;
}
