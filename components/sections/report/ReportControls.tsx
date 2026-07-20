'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useTransition } from 'react';

/**
 * Board Report controls (no-print): daily/weekly toggle, an anchor-date picker,
 * and "Save as PDF" (window.print() → the print stylesheet lays the report out
 * as clean A4). Drives ?rcad= and ?rdate=; the report reads them server-side.
 */
export function ReportControls({ cadence, date }: { cadence: 'daily' | 'weekly'; date: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [d, setD] = useState(date);
  useEffect(() => setD(date), [date]);

  const go = (next: URLSearchParams) => startTransition(() => router.push(`/?${next.toString()}`));
  const setCadence = (c: 'daily' | 'weekly') => {
    const p = new URLSearchParams(params.toString());
    p.set('tab', 'report');
    p.set('rcad', c);
    go(p);
  };
  const applyDate = (v: string) => {
    if (!v) return;
    const p = new URLSearchParams(params.toString());
    p.set('tab', 'report');
    p.set('rdate', v);
    go(p);
  };

  return (
    <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-md border border-line p-0.5">
          {(['daily', 'weekly'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCadence(c)}
              className={`rounded px-3 py-1.5 text-[13px] font-medium capitalize transition ${
                cadence === c ? 'bg-accent text-white' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[12.5px] text-ink-soft">
          <span>{cadence === 'weekly' ? 'Week ending' : 'Date'}</span>
          <input
            type="date"
            value={d}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setD(e.target.value)}
            onBlur={(e) => applyDate(e.target.value)}
            className="rounded-md border border-line bg-card px-2 py-1.5 text-[13px] text-ink"
          />
        </label>
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
