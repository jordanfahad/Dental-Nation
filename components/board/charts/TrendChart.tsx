import { C } from '../design';
import { ChartWrap } from '../Primitives';
import type { MonthRow } from '@/lib/board/metrics';

/**
 * Media investment against billed revenue, month by month.
 *
 * This is the exhibit that carries the argument: spend is flat bars, revenue
 * is a rising line, and the gap between them IS the story. Rendered as inline
 * SVG so it prints exactly and needs no client JavaScript.
 *
 * The two series have genuinely different magnitudes (tens of thousands vs
 * hundreds of thousands), so they use independent axes — labelled on both
 * sides, because an unlabelled dual axis is how charts lie.
 */

const W = 760;
const H = 300;
const PAD = { top: 18, right: 62, bottom: 40, left: 58 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const monthLabel = (m: string): string => {
  const [y, mm] = m.split('-');
  const names = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  return `${names[Number(mm) - 1]}${mm === '01' ? `’${y.slice(2)}` : ''}`;
};
const monthFull = (m: string): string => {
  const [y, mm] = m.split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[Number(mm) - 1]} ${y.slice(2)}`;
};
const kAed = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}K` : String(Math.round(n)));

export function TrendChart({ rows }: { rows: MonthRow[] }) {
  const data = rows.filter((r) => r.spendTotal != null || r.revenue != null);
  if (data.length < 2) {
    return (
      <p className="rounded border border-dashed border-line px-4 py-6 text-center text-[12px] text-ink-faint">
        The trend renders once two or more months report data.
      </p>
    );
  }

  const maxSpend = Math.max(...data.map((r) => r.spendTotal ?? 0), 1);
  const maxRev = Math.max(...data.map((r) => r.revenue ?? 0), 1);

  const bandW = PLOT_W / data.length;
  const barW = Math.min(bandW * 0.5, 34);
  const x = (i: number) => PAD.left + bandW * i + bandW / 2;
  const ySpend = (v: number) => PAD.top + PLOT_H - (v / maxSpend) * PLOT_H;
  const yRev = (v: number) => PAD.top + PLOT_H - (v / maxRev) * PLOT_H;

  const revPts = data
    .map((r, i) => (r.revenue != null ? `${x(i)},${yRev(r.revenue)}` : null))
    .filter(Boolean) as string[];

  // Gridlines at quarters of the revenue axis.
  const grid = [0.25, 0.5, 0.75, 1].map((t) => ({
    y: PAD.top + PLOT_H - t * PLOT_H,
    rev: maxRev * t,
    spend: maxSpend * t,
  }));

  return (
    <div>
      <ChartWrap label="the full timeline">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full min-w-[560px]"
        role="img"
        aria-label="Monthly media spend against billed revenue"
      >
        {/* gridlines + dual axis labels */}
        {grid.map((g) => (
          <g key={g.y}>
            <line x1={PAD.left} x2={W - PAD.right} y1={g.y} y2={g.y} stroke={C.ruleSoft} strokeWidth={1} />
            <text x={PAD.left - 8} y={g.y + 3.5} textAnchor="end" fontSize={9.5} fill={C.inkGhost}>
              {kAed(g.spend)}
            </text>
            <text x={W - PAD.right + 8} y={g.y + 3.5} fontSize={9.5} fill={C.amber}>
              {kAed(g.rev)}
            </text>
          </g>
        ))}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={PAD.top + PLOT_H}
          y2={PAD.top + PLOT_H}
          stroke={C.rule}
          strokeWidth={1.25}
        />

        {/* spend bars */}
        {data.map((r, i) =>
          r.spendTotal != null ? (
            <rect
              key={`b${r.month}`}
              x={x(i) - barW / 2}
              y={ySpend(r.spendTotal)}
              width={barW}
              height={Math.max(PAD.top + PLOT_H - ySpend(r.spendTotal), 1)}
              fill={C.navyPale}
              rx={1.5}
            />
          ) : null,
        )}

        {/* revenue line + points */}
        {revPts.length > 1 ? (
          <polyline
            points={revPts.join(' ')}
            fill="none"
            stroke={C.amber}
            strokeWidth={2.25}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
        {data.map((r, i) =>
          r.revenue != null ? (
            <circle key={`p${r.month}`} cx={x(i)} cy={yRev(r.revenue)} r={3.4} fill={C.paper} stroke={C.amber} strokeWidth={2} />
          ) : null,
        )}

        {/* value label on the final revenue point */}
        {(() => {
          const idx = [...data].reverse().findIndex((r) => r.revenue != null);
          if (idx === -1) return null;
          const i = data.length - 1 - idx;
          const v = data[i].revenue as number;
          return (
            <text
              x={x(i)}
              y={yRev(v) - 11}
              textAnchor={i === data.length - 1 ? 'end' : 'middle'}
              fontSize={11}
              fontWeight={600}
              fill={C.amber}
            >
              {kAed(v)}
            </text>
          );
        })()}

        {/* month axis */}
        {data.map((r, i) => (
          <text
            key={`x${r.month}`}
            x={x(i)}
            y={PAD.top + PLOT_H + 15}
            textAnchor="middle"
            fontSize={9.5}
            fill={C.inkFaint}
          >
            {data.length > 9 ? monthLabel(r.month) : monthFull(r.month)}
          </text>
        ))}

        {/* axis titles */}
        <text x={PAD.left - 8} y={PAD.top - 6} textAnchor="end" fontSize={9} fill={C.inkGhost}>
          AED spend
        </text>
        <text x={W - PAD.right + 8} y={PAD.top - 6} fontSize={9} fill={C.amber}>
          AED revenue
        </text>
      </svg>
      </ChartWrap>

      {/* Legend sits OUTSIDE the scroller so it is always visible, whatever
          part of the chart the reader has scrolled to. */}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 px-1">
        <Legend swatch={C.navyPale} label="Media investment (Meta + Google)" />
        <Legend swatch={C.amber} label="Billed revenue (Practo)" line />
      </div>
    </div>
  );
}

function Legend({ swatch, label, line }: { swatch: string; label: string; line?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-[10.5px] text-ink-faint">
      <span
        aria-hidden
        className="inline-block"
        style={
          line
            ? { width: 16, height: 2.5, background: swatch, borderRadius: 2 }
            : { width: 10, height: 10, background: swatch, borderRadius: 2 }
        }
      />
      {label}
    </span>
  );
}
