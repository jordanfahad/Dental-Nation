'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { refreshNow } from '@/app/actions';
import { DateRangeControl } from '@/components/DateRangeControl';
import { dubaiDateLabel } from '@/lib/dates';
import type { RangeMeta } from '@/lib/types';

/** Report header: title, the global date-range control, and "Refresh now". */
export function Header({ range, source }: { range: RangeMeta; source: 'live' | 'mock' }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function onRefresh() {
    setRefreshing(true);
    setToast(null);
    try {
      const res = await refreshNow();
      setToast(res.message);
      startTransition(() => router.refresh());
    } catch {
      // The action can exceed the serverless limit on a heavy sync; the cron
      // still keeps data current, so surface it rather than spinning forever.
      setToast('Refresh is taking a while — the background sync keeps data current. Try again shortly.');
    } finally {
      setRefreshing(false); // ALWAYS reset so the button never sticks on "Refreshing…"
      setTimeout(() => setToast(null), 8000);
    }
  }

  return (
    <header className="no-print flex flex-col gap-3 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-accent">Dental Nation · All Lanes</p>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Performance Report</h1>
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
          <span className="tnum hidden text-[11.5px] text-ink-faint sm:inline">
            {dubaiDateLabel(range.from)} → {dubaiDateLabel(range.to)}
          </span>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition hover:bg-accent-600 disabled:opacity-60"
          >
            {refreshing ? 'Refreshing…' : 'Refresh now'}
          </button>
        </div>
      </div>

      <DateRangeControl range={range} />
    </header>
  );
}
