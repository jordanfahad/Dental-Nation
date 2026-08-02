import { C, NAVY_RAMP, fmt } from '../design';

/**
 * The end-to-end funnel, as a tapered exhibit.
 *
 * Two honesty decisions baked into this component:
 *
 *  1. Stage widths are on a LOG scale and the footnote says so. Impressions
 *     are ~4,700× the booking count; on a linear scale every stage after the
 *     first would be an invisible sliver, which reads as "we lose everything"
 *     rather than as a real shape. Log widths keep the shape legible; the
 *     printed numbers stay exact.
 *  2. Step percentages are labelled as FLOW, not as attribution. Bookings
 *     arrive from walk-ins and referrals too, so "bookings ÷ clicks" is not a
 *     paid conversion rate and is never presented as one.
 */

export interface FunnelStage {
  label: string;
  value: number | null;
  sub?: string;
}

export function FunnelChart({ stages, endpoint }: { stages: FunnelStage[]; endpoint?: { label: string; value: string } }) {
  const known = stages.filter((s) => s.value != null && s.value > 0) as { label: string; value: number; sub?: string }[];
  if (known.length < 2) {
    return (
      <p className="rounded border border-dashed border-line px-4 py-6 text-center text-[12px] text-ink-faint">
        The funnel renders once at least two stages report data.
      </p>
    );
  }

  const max = Math.max(...known.map((s) => s.value));
  const min = Math.min(...known.map((s) => s.value));
  // Log-scaled width, floored so the narrowest stage is still a readable block.
  const width = (v: number) => {
    if (max === min) return 100;
    const t = (Math.log10(v) - Math.log10(min)) / (Math.log10(max) - Math.log10(min));
    return 34 + t * 66; // 34%…100%
  };

  return (
    <div>
      <div className="space-y-[3px]">
        {known.map((s, i) => {
          const w = width(s.value);
          const prev = i > 0 ? known[i - 1] : null;
          const step = prev ? s.value / prev.value : null;
          return (
            <div key={s.label} className="flex items-stretch gap-3">
              {/* the tapering block */}
              <div className="relative min-w-0 flex-1">
                <div
                  className="flex h-[52px] items-center justify-between rounded-[3px] px-3.5 transition-all"
                  style={{
                    width: `${w}%`,
                    background: NAVY_RAMP[Math.min(i, NAVY_RAMP.length - 1)],
                  }}
                >
                  <span className="truncate text-[11.5px] font-medium text-white/85">{s.label}</span>
                  <span className="tnum ml-3 shrink-0 text-[17px] font-semibold leading-none text-white">
                    {fmt.compact(s.value)}
                  </span>
                </div>
                {s.sub ? (
                  <p className="mt-[3px] text-[10px] leading-snug text-ink-faint">{s.sub}</p>
                ) : null}
              </div>

              {/* step-down rate */}
              <div className="flex w-[86px] shrink-0 items-center">
                {step != null ? (
                  <span className="tnum text-[11px] font-semibold text-ink-soft">
                    <span aria-hidden className="mr-1 text-ink-ghost">↓</span>
                    {step < 0.01 ? fmt.pct(step, 2) : fmt.pct(step)}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {endpoint ? (
        <div className="mt-3 flex items-center gap-3 border-t border-line pt-3">
          <div
            className="flex h-[56px] flex-1 items-center justify-between rounded-[3px] px-3.5"
            style={{ background: C.amber }}
          >
            <span className="text-[11.5px] font-medium text-white/85">{endpoint.label}</span>
            <span className="tnum text-[19px] font-semibold leading-none text-white">{endpoint.value}</span>
          </div>
          <div className="w-[86px] shrink-0" />
        </div>
      ) : null}
    </div>
  );
}
