'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { PRESETS } from '@/lib/range';
import type { RangeMeta } from '@/lib/types';

/**
 * Global date-range control (Step 2). Preset buttons + custom from/to inputs +
 * a "vs previous period" toggle. On change it navigates (router.push) updating
 * the searchParams while PRESERVING `tab`, so the range applies across all tabs.
 * Lives in the header.
 */
export function DateRangeControl({ range, basePath = '/' }: { range: RangeMeta; basePath?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);

  /** Navigate with the next params, always keeping `tab`. Stays on the current
   *  page (`basePath`) so it works both on the dashboard and the standalone
   *  Araby Ads report route. */
  function go(mutate: (p: URLSearchParams) => void) {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    startTransition(() => router.push(`${basePath}?${next.toString()}`));
  }

  function onPreset(preset: string) {
    go((p) => {
      p.set('preset', preset);
      p.delete('from');
      p.delete('to');
    });
  }

  function onApplyCustom() {
    if (!from || !to || from > to) return;
    go((p) => {
      p.set('from', from);
      p.set('to', to);
      p.set('preset', 'custom');
    });
  }

  function onToggleCompare() {
    go((p) => p.set('compare', range.compare === 'prev' ? 'none' : 'prev'));
  }

  const compareOn = range.compare === 'prev';

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      {/* Presets */}
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((preset) => {
          const active = range.preset === preset.key;
          return (
            <button
              key={preset.key}
              onClick={() => onPreset(preset.key)}
              disabled={pending}
              className={`rounded-md px-2.5 py-1.5 text-[12px] font-medium transition disabled:opacity-60 ${
                active ? 'bg-accent text-white' : 'bg-na/10 text-ink-soft hover:bg-na/20'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Custom range */}
      <div className="flex items-center gap-1.5 rounded-md border border-line bg-card px-2 py-1">
        <input
          type="date"
          value={from}
          max={to}
          onChange={(e) => setFrom(e.target.value)}
          className="tnum bg-transparent text-[12px] text-ink focus:outline-none"
          aria-label="From date"
        />
        <span className="text-ink-faint">→</span>
        <input
          type="date"
          value={to}
          min={from}
          onChange={(e) => setTo(e.target.value)}
          className="tnum bg-transparent text-[12px] text-ink focus:outline-none"
          aria-label="To date"
        />
        <button
          onClick={onApplyCustom}
          disabled={pending || !from || !to || from > to}
          className="rounded bg-accent px-2 py-0.5 text-[11.5px] font-medium text-white transition hover:bg-accent-600 disabled:opacity-50"
        >
          Apply
        </button>
      </div>

      {/* vs previous period toggle */}
      <button
        onClick={onToggleCompare}
        disabled={pending}
        aria-pressed={compareOn}
        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition disabled:opacity-60 ${
          compareOn ? 'border-accent bg-accent-50 text-accent' : 'border-line bg-card text-ink-soft hover:bg-na/10'
        }`}
      >
        <span
          className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm border text-[9px] ${
            compareOn ? 'border-accent bg-accent text-white' : 'border-line text-transparent'
          }`}
        >
          ✓
        </span>
        vs previous period
      </button>
    </div>
  );
}
