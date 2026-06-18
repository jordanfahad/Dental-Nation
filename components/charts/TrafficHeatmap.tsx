import { TOKENS } from './Charts';

/**
 * Conversation-traffic heatmap: hour-of-day (rows) × weekday (columns), cells
 * shaded by intensity in the single accent color (no chart lib, renders + prints
 * server-side). An all-zero / empty matrix renders a calm note, never a fake grid.
 */

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function hourLabel(h: number): string {
  if (h === 0) return '12a';
  if (h === 12) return '12p';
  return h < 12 ? `${h}a` : `${h - 12}p`;
}

/** Linear blend from white → accent at fraction t (0..1). */
function shade(t: number): string {
  // accent #1F3A5F = (31,58,95); blend from white.
  const r = Math.round(255 + (31 - 255) * t);
  const g = Math.round(255 + (58 - 255) * t);
  const b = Math.round(255 + (95 - 255) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export function TrafficHeatmap({ matrix }: { matrix: number[][] }) {
  const max = Math.max(0, ...matrix.flatMap((row) => row));
  if (!matrix.length || max === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-line text-[12px] text-ink-faint">
        No conversation traffic recorded yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        {/* column header */}
        <div className="grid" style={{ gridTemplateColumns: '34px repeat(7, minmax(0, 1fr))' }}>
          <div />
          {WEEKDAYS.map((d) => (
            <div key={d} className="pb-1 text-center text-[10px] font-medium text-ink-faint">
              {d}
            </div>
          ))}
        </div>
        {/* rows: one per hour */}
        {matrix.map((row, hour) => (
          <div
            key={hour}
            className="grid items-center"
            style={{ gridTemplateColumns: '34px repeat(7, minmax(0, 1fr))' }}
          >
            <div className="pr-1.5 text-right text-[9.5px] tabular-nums text-ink-faint">
              {hour % 3 === 0 ? hourLabel(hour) : ''}
            </div>
            {row.map((v, wd) => {
              const t = v / max;
              return (
                <div key={wd} className="px-px py-px">
                  <div
                    className="h-3.5 rounded-[2px]"
                    style={{ background: v === 0 ? '#F4F4F5' : shade(0.15 + t * 0.85) }}
                    title={`${WEEKDAYS[wd]} ${hourLabel(hour)} · ${v} conversation${v === 1 ? '' : 's'}`}
                  />
                </div>
              );
            })}
          </div>
        ))}
        {/* legend */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[10px] text-ink-faint">Fewer</span>
          <div className="flex gap-0.5">
            {[0.12, 0.32, 0.52, 0.72, 0.95].map((t) => (
              <span
                key={t}
                className="h-3 w-5 rounded-[2px]"
                style={{ background: shade(t) }}
              />
            ))}
          </div>
          <span className="text-[10px] text-ink-faint">More</span>
          <span className="ml-2 text-[10px] text-ink-ghost" style={{ color: TOKENS.inkFaint }}>
            peak {max}/hr
          </span>
        </div>
      </div>
    </div>
  );
}
