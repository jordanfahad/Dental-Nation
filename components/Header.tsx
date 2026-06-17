'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { refreshNow } from '@/app/actions';
import { dubaiDateLabel } from '@/lib/dates';

/** Report header: title, date picker (defaults to latest), and "Refresh now". */
export function Header({
  dates,
  currentDate,
  source,
}: {
  dates: string[];
  currentDate: string;
  source: 'live' | 'mock';
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function onPickDate(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(params.toString());
    next.set('date', e.target.value);
    startTransition(() => router.push(`/?${next.toString()}`));
  }

  async function onRefresh() {
    setRefreshing(true);
    setToast(null);
    const res = await refreshNow();
    setRefreshing(false);
    setToast(res.message);
    startTransition(() => router.refresh());
    setTimeout(() => setToast(null), 6000);
  }

  return (
    <header className="no-print flex flex-wrap items-center justify-between gap-3 pb-5">
      <div>
        <p className="eyebrow text-accent">Dental Nation · Lane E</p>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Daily Control Report</h1>
      </div>

      <div className="flex items-center gap-2">
        {source === 'mock' ? (
          <span className="rounded-full bg-watch/10 px-2.5 py-1 text-[11px] font-medium text-watch">
            Mock data
          </span>
        ) : null}
        {toast ? (
          <span className="max-w-xs truncate rounded-md bg-na/10 px-2.5 py-1 text-[11.5px] text-ink-soft">
            {toast}
          </span>
        ) : null}
        <label className="sr-only" htmlFor="date">
          Report date
        </label>
        <select
          id="date"
          value={currentDate}
          onChange={onPickDate}
          disabled={pending}
          className="tnum rounded-md border border-line bg-card px-2.5 py-1.5 text-[13px] text-ink shadow-card focus:border-accent focus:outline-none"
        >
          {dates.map((d) => (
            <option key={d} value={d}>
              {dubaiDateLabel(d)}
            </option>
          ))}
        </select>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition hover:bg-accent-600 disabled:opacity-60"
        >
          {refreshing ? 'Refreshing…' : 'Refresh now'}
        </button>
      </div>
    </header>
  );
}
