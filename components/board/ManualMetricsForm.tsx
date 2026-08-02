'use client';

import { useActionState, useState } from 'react';
import { saveManualMetric } from '@/app/reports/board/actions';
import { MANUAL_METRIC_KEYS, type ManualMetric } from '@/config/board-metrics';

/**
 * Entry form for the Part 1 numbers that have no live feed yet (spec §7.2):
 * Search Console, WhatsApp volumes, Smile Club.
 *
 * Until a value is entered, the matching card on the report reads "Data
 * pending" — deliberately, so an unfilled metric is visible rather than absent.
 * The source note is stored with the value and rendered on the card, so a
 * hand-entered figure always declares itself as one.
 */
export function ManualMetricsForm({ existing }: { existing: Record<string, ManualMetric | undefined> }) {
  const [state, action, pending] = useActionState(saveManualMetric, null);
  const [key, setKey] = useState(MANUAL_METRIC_KEYS[0].key);

  const def = MANUAL_METRIC_KEYS.find((k) => k.key === key);
  const current = existing[key];

  return (
    <section className="no-print rounded-card border border-line bg-card px-4 py-4">
      <h3 className="text-[14px] font-semibold text-ink">Manual metrics</h3>
      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
        Numbers with no live feed yet. Anything left blank renders as “Data pending” on the report — never as a zero,
        and never as an invented figure.
      </p>

      <form action={action} className="mt-3 grid gap-2.5 sm:grid-cols-2">
        <label className="block">
          <span className="eyebrow mb-1 block text-[9.5px]">Metric</span>
          <select
            name="metric_key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="w-full rounded-md border border-line bg-card px-2.5 py-1.5 text-[12.5px] text-ink"
          >
            {MANUAL_METRIC_KEYS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="eyebrow mb-1 block text-[9.5px]">Value {def ? `(${def.unit})` : ''}</span>
          <input
            name="value"
            defaultValue={current?.value != null ? String(current.value) : ''}
            key={`v-${key}`}
            inputMode="decimal"
            placeholder={def?.hint ?? ''}
            className="w-full rounded-md border border-line bg-card px-2.5 py-1.5 text-[12.5px] text-ink placeholder:text-ink-ghost"
          />
        </label>

        <label className="block">
          <span className="eyebrow mb-1 block text-[9.5px]">Period start</span>
          <input
            type="date"
            name="period_start"
            defaultValue={current?.periodStart ?? '2025-12-01'}
            key={`ps-${key}`}
            className="w-full rounded-md border border-line bg-card px-2.5 py-1.5 text-[12.5px] text-ink"
          />
        </label>

        <label className="block">
          <span className="eyebrow mb-1 block text-[9.5px]">Period end</span>
          <input
            type="date"
            name="period_end"
            defaultValue={current?.periodEnd ?? new Date().toISOString().slice(0, 10)}
            key={`pe-${key}`}
            className="w-full rounded-md border border-line bg-card px-2.5 py-1.5 text-[12.5px] text-ink"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="eyebrow mb-1 block text-[9.5px]">Source label (shown on the card)</span>
          <input
            name="source_note"
            defaultValue={current?.sourceNote ?? ''}
            key={`sn-${key}`}
            placeholder="e.g. Search Console export, 2 Aug 2026"
            className="w-full rounded-md border border-line bg-card px-2.5 py-1.5 text-[12.5px] text-ink placeholder:text-ink-ghost"
          />
        </label>

        <input type="hidden" name="unit" value={def?.unit ?? ''} />

        <div className="flex items-center gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md border border-accent bg-accent px-3 py-1.5 text-[12.5px] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save metric'}
          </button>
          {state?.error ? <span className="text-[11.5px] text-stop">{state.error}</span> : null}
          {state?.ok ? <span className="text-[11.5px] text-good">Saved.</span> : null}
          {current ? (
            <span className="text-[11px] text-ink-faint">
              Current: {current.value ?? '—'} · {current.periodStart} → {current.periodEnd}
            </span>
          ) : (
            <span className="text-[11px] text-ink-faint">Not entered yet</span>
          )}
        </div>
      </form>
    </section>
  );
}
