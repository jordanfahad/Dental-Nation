'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { PRESET_OPTIONS, type BoardRange } from '@/lib/board/range';

/**
 * Date-range control for Part 1's live metrics (spec §2).
 *
 * Presets plus a custom range; every choice re-renders the metric cards on the
 * server with a recomputed comparison delta. It navigates rather than fetching
 * so a board member can send someone the exact window they were looking at.
 *
 * Part 2 is unaffected — those are static design targets, and letting a date
 * filter appear to change them would be misleading.
 */
export function RangeControl({ range, basePath }: { range: BoardRange; basePath: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const [custom, setCustom] = useState(range.preset === 'custom');

  useEffect(() => {
    setFrom(range.from);
    setTo(range.to);
  }, [range.from, range.to]);

  function go(mutate: (p: URLSearchParams) => void) {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    startTransition(() => router.push(`${basePath}?${next.toString()}`, { scroll: false }));
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-x-2 gap-y-2">
      <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint">Metrics window</span>

      <div className="flex flex-wrap gap-1">
        {PRESET_OPTIONS.map((p) => {
          const on = !custom && range.preset === p.key;
          return (
            <button
              key={p.key}
              type="button"
              disabled={pending}
              onClick={() => {
                setCustom(false);
                go((q) => {
                  q.set('preset', p.key);
                  q.delete('from');
                  q.delete('to');
                });
              }}
              className={`min-h-[36px] rounded-md border px-3 py-1.5 text-[12px] font-medium transition disabled:opacity-50 ${
                on ? 'border-accent bg-accent text-white' : 'border-line bg-card text-ink-soft hover:bg-panel'
              }`}
            >
              {p.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setCustom((v) => !v)}
          className={`min-h-[36px] rounded-md border px-3 py-1.5 text-[12px] font-medium transition ${
            custom || range.preset === 'custom'
              ? 'border-accent bg-accent text-white'
              : 'border-line bg-card text-ink-soft hover:bg-panel'
          }`}
        >
          Custom
        </button>
      </div>

      {custom || range.preset === 'custom' ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-line bg-card px-2 py-1 text-[12px] text-ink"
          />
          <span className="text-[11px] text-ink-faint">→</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-line bg-card px-2 py-1 text-[12px] text-ink"
          />
          <button
            type="button"
            disabled={pending || !from || !to || from > to}
            onClick={() =>
              go((q) => {
                q.set('from', from);
                q.set('to', to);
                q.delete('preset');
              })
            }
            className="rounded-md border border-accent bg-accent px-2.5 py-1 text-[12px] font-medium text-white transition hover:opacity-90 disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      ) : null}

      <span className="tnum text-[11.5px] text-ink-faint">
        {range.label}
        {range.compareLabel ? ` · ${range.compareLabel}` : ' · no prior period'}
      </span>
    </div>
  );
}
