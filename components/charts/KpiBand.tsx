import type { ReactNode } from 'react';
import { Sparkline, TOKENS } from './Charts';

/**
 * Executive KPI scorecard band — the "answer-first" strip at the top of a report.
 * Each card shows the headline number, an optional period-over-period delta
 * (colored by whether the move is good), and an optional sparkline trend. A
 * metric with no source renders an honest data-gap card, never a fake 0.
 */

export interface KpiItem {
  label: string;
  /** Preformatted value (e.g. "AED 29,993", "12%"), or null for a data gap. */
  value: string | null;
  /** Period-over-period change as a fraction (e.g. 0.12 = +12%), or null. */
  deltaPct?: number | null;
  /** Which direction is "good" for this metric. Default: up is good. */
  goodWhenUp?: boolean;
  /** Trailing series for the sparkline. */
  spark?: number[];
  sparkColor?: string;
  /** Data-gap context when value is null. */
  gapDetail?: string;
  gapOwner?: string;
  /** A small caption under the value (e.g. a denominator note). */
  hint?: string;
}

function DeltaChip({ deltaPct, goodWhenUp = true }: { deltaPct: number; goodWhenUp?: boolean }) {
  const up = deltaPct > 0;
  const flat = Math.abs(deltaPct) < 0.005;
  const good = flat ? null : up === goodWhenUp;
  const color = good == null ? 'text-ink-faint' : good ? 'text-good' : 'text-stop';
  const arrow = flat ? '→' : up ? '▲' : '▼';
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums ${color}`}>
      {arrow} {Math.abs(Math.round(deltaPct * 100))}%
    </span>
  );
}

function Card({ item }: { item: KpiItem }) {
  const isGap = item.value == null;
  return (
    <div className="rounded-card border border-line bg-card p-3.5">
      <p className="text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">{item.label}</p>
      {isGap ? (
        <div className="mt-1.5">
          <p className="text-[15px] font-semibold text-watch">Data gap</p>
          {item.gapDetail ? (
            <p className="mt-0.5 text-[10.5px] leading-snug text-ink-faint">
              {item.gapDetail}
              {item.gapOwner ? ` · ${item.gapOwner}` : ''}
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <div className="mt-1 flex items-end justify-between gap-2">
            <span className="text-[26px] font-semibold leading-none tracking-tight text-ink tabular-nums">
              {item.value}
            </span>
            {item.spark && item.spark.length > 1 ? (
              <Sparkline data={item.spark} color={item.sparkColor ?? TOKENS.accent400} />
            ) : null}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            {item.deltaPct != null ? (
              <DeltaChip deltaPct={item.deltaPct} goodWhenUp={item.goodWhenUp} />
            ) : null}
            {item.hint ? <span className="text-[10.5px] text-ink-faint">{item.hint}</span> : null}
          </div>
        </>
      )}
    </div>
  );
}

const COLS: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
};

export function KpiBand({ items, children }: { items: KpiItem[]; children?: ReactNode }) {
  const cols = COLS[Math.min(Math.max(items.length, 2), 6)] ?? COLS[4];
  return (
    <div>
      <div className={`grid gap-3 ${cols}`}>
        {items.map((it) => (
          <Card key={it.label} item={it} />
        ))}
      </div>
      {children}
    </div>
  );
}
