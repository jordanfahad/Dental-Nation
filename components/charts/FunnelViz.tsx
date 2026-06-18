import { TOKENS } from './Charts';

/**
 * A crisp horizontal funnel infographic (pure CSS — no chart lib, so it renders
 * server-side and prints cleanly). Each stage is a proportional bar; between
 * stages we show the stage-to-stage conversion. A stage with a null value is an
 * honest data gap (rendered muted), never a fabricated zero.
 */

export interface FunnelStageViz {
  label: string;
  value: number | null;
  /** Marks an upstream stage that is a known data gap when null (reach/impr). */
  hint?: string;
}

const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US');

export function FunnelViz({ stages }: { stages: FunnelStageViz[] }) {
  const measured = stages.filter((s) => s.value != null) as { label: string; value: number }[];
  const max = Math.max(...measured.map((s) => s.value), 1);

  let prevVal: number | null = null;
  return (
    <div className="space-y-1">
      {stages.map((s, i) => {
        const conv =
          prevVal != null && prevVal > 0 && s.value != null ? s.value / prevVal : null;
        const widthPct = s.value != null ? Math.max((s.value / max) * 100, 6) : 100;
        // Intensity fades down the funnel for a clean "narrowing" read.
        const shade = [TOKENS.accent, TOKENS.accent600, TOKENS.accent400, '#7C9CC4', '#9CB4D1'][
          Math.min(i, 4)
        ];
        const node = (
          <div key={s.label}>
            {i > 0 ? (
              <div className="flex items-center gap-2 py-0.5 pl-1">
                <span className="text-[10px] text-ink-ghost">↓</span>
                <span className="text-[10.5px] text-ink-faint">
                  {conv != null ? (
                    <>
                      <span className="font-medium text-ink-soft tabular-nums">
                        {Math.round(conv * 100)}%
                      </span>{' '}
                      convert
                    </>
                  ) : (
                    'conversion not measurable'
                  )}
                </span>
              </div>
            ) : null}
            <div className="flex items-center gap-3">
              <div className="flex h-9 flex-1 items-center overflow-hidden rounded-md bg-na/10">
                {s.value != null ? (
                  <div
                    className="flex h-full items-center rounded-md px-3 text-[12px] font-medium text-white transition-all"
                    style={{ width: `${widthPct}%`, background: shade, minWidth: 96 }}
                  >
                    <span className="truncate">{s.label}</span>
                  </div>
                ) : (
                  <div className="flex h-full w-full items-center px-3 text-[12px] text-watch">
                    <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-watch" />
                    {s.label} — data gap{s.hint ? ` · ${s.hint}` : ''}
                  </div>
                )}
              </div>
              <span className="w-24 shrink-0 text-right text-[13px] font-semibold tabular-nums text-ink">
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
