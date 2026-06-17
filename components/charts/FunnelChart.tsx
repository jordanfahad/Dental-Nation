import type { FunnelStage } from '@/lib/types';
import { fmtInt, fmtPct } from '@/lib/format';

/**
 * Horizontal funnel (§D), built by hand for full control of the consulting
 * aesthetic. Measured stages get a bar scaled to the funnel's max; upstream
 * stages with no source render an explicit muted "data gap" row (never a zero).
 */
export function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const measuredMax = Math.max(1, ...stages.map((s) => s.today ?? 0));
  return (
    <div className="space-y-1.5">
      {stages.map((stage) => {
        const value = stage.today;
        const isGap = value == null;
        const widthPct = isGap ? 0 : Math.max(2, (value / measuredMax) * 100);
        return (
          <div key={stage.key} className="grid grid-cols-[150px_1fr_92px] items-center gap-3">
            <div className="truncate text-[12px] text-ink-soft" title={stage.label}>
              {stage.label}
            </div>
            <div className="relative h-7 rounded bg-na/5">
              {isGap ? (
                <div className="absolute inset-0 flex items-center rounded border border-dashed border-watch/40 bg-watch/5 px-2 text-[10.5px] font-medium text-watch">
                  data gap — no source
                </div>
              ) : (
                <div
                  className="flex h-full items-center justify-end rounded bg-accent px-2"
                  style={{ width: `${widthPct}%`, minWidth: '2.5rem' }}
                >
                  <span className="tnum text-[12px] font-semibold text-white">{fmtInt(value)}</span>
                </div>
              )}
            </div>
            <div className="tnum text-right text-[11px] text-ink-faint">
              {stage.conversionFromPrev != null ? (
                <span>{fmtPct(stage.conversionFromPrev)} →</span>
              ) : (
                <span className="text-ink-ghost">—</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
