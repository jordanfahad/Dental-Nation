'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useTransition } from 'react';

/**
 * Board Report controls (no-print): a period selector (daily / weekly / this
 * month / last month / last 90 days / all time), an anchor-date picker (only for
 * daily & weekly), a "vs previous period" compare toggle, and "Save as PDF"
 * (window.print()). Drives ?rcad=, ?rdate=, ?rcmp=; the report reads them.
 */
export const REPORT_PERIODS = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'month', label: 'This month' },
  { key: 'lastmonth', label: 'Last month' },
  { key: 'last90', label: 'Last 90 days' },
  { key: 'all', label: 'All time' },
] as const;

export function ReportControls({ period, date, compare }: { period: string; date: string; compare: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [d, setD] = useState(date);
  useEffect(() => setD(date), [date]);

  const go = (next: URLSearchParams) => startTransition(() => router.push(`/?${next.toString()}`));
  const base = () => {
    const p = new URLSearchParams(params.toString());
    p.set('tab', 'report');
    return p;
  };
  const setPeriod = (key: string) => { const p = base(); p.set('rcad', key); go(p); };
  const applyDate = (v: string) => { if (!v) return; const p = base(); p.set('rdate', v); go(p); };
  const toggleCompare = () => { const p = base(); if (compare) p.delete('rcmp'); else p.set('rcmp', '1'); go(p); };

  const showDate = period === 'daily' || period === 'weekly';
  const canCompare = period !== 'all';

  return (
    <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex flex-wrap rounded-md border border-line p-0.5">
          {REPORT_PERIODS.map((c) => (
            <button
              key={c.key}
              onClick={() => setPeriod(c.key)}
              className={`rounded px-3 py-1.5 text-[12.5px] font-medium transition ${
                period === c.key ? 'bg-accent text-white' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        {showDate ? (
          <label className="flex items-center gap-2 text-[12.5px] text-ink-soft">
            <span>{period === 'weekly' ? 'Week ending' : 'Date'}</span>
            <input
              type="date"
              value={d}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setD(e.target.value)}
              onBlur={(e) => applyDate(e.target.value)}
              className="rounded-md border border-line bg-card px-2 py-1.5 text-[13px] text-ink"
            />
          </label>
        ) : null}
        {canCompare ? (
          <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-ink-soft">
            <input type="checkbox" checked={compare} onChange={toggleCompare} className="h-3.5 w-3.5 accent-[#1F3A5F]" />
            <span>vs previous period</span>
          </label>
        ) : null}
      </div>
      <button
        onClick={() => window.print()}
        className="rounded-md bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accent-600"
      >
        Save as PDF
      </button>
    </div>
  );
}
