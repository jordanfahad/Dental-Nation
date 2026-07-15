/**
 * A crisp horizontal funnel infographic (pure CSS — renders server- or client-
 * side and prints cleanly). Each stage is a proportional, colour-filled bar with
 * the count inside; between stages we show the step conversion. When a stage is
 * LARGER than the one above (coverage, not drop-off — e.g. bookings exceeding the
 * tracked-lead channel), it's shown as growth (↑ ×N), never a bogus ">100%
 * convert". A null value is an honest data gap (muted), never a fabricated zero.
 */

export interface FunnelStageViz {
  label: string;
  value: number | null;
  /** Marks an upstream stage that is a known data gap when null (reach/impr). */
  hint?: string;
}

const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US');

// Sequential navy→sky palette — distinct per stage, darkest at the top so the
// funnel reads as it narrows. Clamped for longer funnels.
const STAGE_FILL = ['#1F3A5F', '#2C5E86', '#3B82A6', '#57A0BE', '#7CBBD1', '#A6D3E0'];

export function FunnelViz({ stages }: { stages: FunnelStageViz[] }) {
  const measured = stages.filter((s) => s.value != null) as { label: string; value: number }[];
  const max = Math.max(...measured.map((s) => s.value), 1);

  let prevVal: number | null = null;
  return (
    <div className="space-y-1">
      {stages.map((s, i) => {
        const conv = prevVal != null && prevVal > 0 && s.value != null ? s.value / prevVal : null;
        const widthPct = s.value != null ? Math.max((s.value / max) * 100, 7) : 0;
        const fill = STAGE_FILL[Math.min(i, STAGE_FILL.length - 1)];
        const grew = conv != null && conv > 1.001;
        const inside = widthPct >= 18; // enough room to print the count inside
        const node = (
          <div key={s.label}>
            {i > 0 ? (
              <div className="flex items-center gap-1.5 py-0.5 pl-[190px]">
                <span className="text-[10px] text-ink-ghost">↓</span>
                {conv != null ? (
                  grew ? (
                    <span className="text-[10.5px] text-emerald-600">
                      <span className="font-semibold tabular-nums">
                        ↑ ×{conv >= 9.95 ? Math.round(conv) : conv.toFixed(1)}
                      </span>{' '}
                      <span className="text-ink-faint">vs previous (coverage)</span>
                    </span>
                  ) : (
                    <span className="text-[10.5px] text-ink-faint">
                      <span className="font-semibold text-ink-soft tabular-nums">{Math.round(conv * 100)}%</span> convert
                    </span>
                  )
                ) : (
                  <span className="text-[10.5px] text-ink-faint">conversion not measurable</span>
                )}
              </div>
            ) : null}
            <div className="grid grid-cols-[178px_1fr_auto] items-center gap-3">
              <div className="truncate text-[12.5px] font-medium text-ink" title={s.label}>
                {s.label}
              </div>
              <div className="relative flex h-9 items-center overflow-hidden rounded-lg bg-na/10 ring-1 ring-inset ring-line/50">
                {s.value != null ? (
                  <div
                    className="flex h-full items-center justify-end rounded-lg px-2.5 shadow-sm transition-all"
                    style={{
                      width: `${widthPct}%`,
                      minWidth: 34,
                      background: `linear-gradient(90deg, ${fill}, ${fill}cc)`,
                    }}
                  >
                    {inside ? (
                      <span className="text-[12px] font-bold tabular-nums text-white drop-shadow-sm">{fmtInt(s.value)}</span>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex h-full w-full items-center rounded-lg border border-dashed border-watch/40 bg-watch/5 px-2.5 text-[11px] font-medium text-watch">
                    <span className="mr-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-watch" />
                    data gap{s.hint ? ` · ${s.hint}` : ''}
                  </div>
                )}
              </div>
              <span className="w-14 shrink-0 text-right text-[14px] font-bold tabular-nums text-ink">
                {s.value != null ? fmtInt(s.value) : '—'}
              </span>
            </div>
          </div>
        );
        if (s.value != null) prevVal = s.value;
        return node;
      })}
    </div>
  );
}
