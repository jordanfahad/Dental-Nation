import type { MixRow } from '@/lib/types';
import { fmtInt } from '@/lib/format';

/** A compact share bar-list (channel/clinic/treatment mix). Single-hue bars
 *  scaled to the max, with a direct value — no rainbow, consulting aesthetic. */
export function MixList({
  rows,
  unit,
  emptyLabel = 'No data in range',
}: {
  rows: MixRow[];
  unit?: string;
  emptyLabel?: string;
}) {
  if (rows.length === 0) {
    return <p className="text-[12px] text-ink-faint">{emptyLabel}</p>;
  }
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-1.5">
      {rows.map((r, i) => (
        <div key={r.label} className="grid grid-cols-[130px_1fr_64px] items-center gap-2">
          <div className="truncate text-[12px] text-ink-soft" title={r.label}>
            {r.label}
          </div>
          <div className="relative h-5 rounded bg-na/5">
            <div
              className="h-full rounded bg-accent"
              style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, opacity: 1 - i * 0.08 }}
            />
          </div>
          <div className="tnum text-right text-[12px] font-medium text-ink">
            {unit === 'AED' ? `AED ${fmtInt(r.value)}` : fmtInt(r.value)}
          </div>
        </div>
      ))}
    </div>
  );
}
