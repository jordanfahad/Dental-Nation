import { C, fmt } from '@/components/board/design';
import type { FunnelStage } from '@/lib/deck/commandDeck';

/**
 * The wide funnel — Mr. Akbar's sketch rendered as an instrument.
 *
 * A tapering band read left to right: visibility at the wide end, revenue at
 * the narrow one, with a vertical division per stage and the conversion into
 * each stage sitting on the boundary.
 *
 * The taper is INDICATIVE, not to scale, and the page says so. Impressions and
 * treatments differ by four orders of magnitude; a linear band would render
 * everything after "reach" as an invisible sliver, and a log scale on a board
 * page invites a reader to draw proportions that aren't there. So the shape
 * carries the narrative and every printed figure is exact.
 *
 * Pure SVG: identical in print and on a phone, where it scrolls sideways.
 */

const compact = (n: number): string => {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (Math.abs(n) >= 10_000) return `${Math.round(n / 1000)}k`;
  return Math.round(n).toLocaleString('en-US');
};

export function FunnelView({ stages }: { stages: FunnelStage[] }) {
  const n = stages.length;
  const colW = 132;
  const chartW = n * colW;
  const chartH = 232;
  const topPad = 30;
  const bandTop = 58; // widest point, left edge
  const bandTopEnd = 138; // top edge at the far right — the taper
  const baseline = 196;

  // Top edge of the band at column boundary i (0..n).
  const topAt = (i: number) => bandTop + ((bandTopEnd - bandTop) * i) / n;

  return (
    <div>
      <div className="scroll-x overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          width={chartW}
          height={chartH}
          role="img"
          aria-label="The patient journey from brand visibility through to billed revenue"
          style={{ maxWidth: '100%', minWidth: Math.min(chartW, 640) }}
        >
          {/* the tapering band */}
          <path
            d={`M 0 ${topAt(0)} L ${chartW} ${topAt(n)} L ${chartW} ${baseline} L 0 ${baseline} Z`}
            fill={C.navyWash}
            stroke={C.navyPale}
            strokeWidth={1}
          />

          {stages.map((s, i) => {
            const x0 = i * colW;
            const mid = x0 + colW / 2;
            const top = topAt(i + 0.5);
            const isRevenue = s.key === 'revenue';
            return (
              <g key={s.key}>
                {/* stage divider */}
                {i > 0 ? (
                  <line x1={x0} y1={topAt(i)} x2={x0} y2={baseline} stroke={C.navyPale} strokeWidth={1} />
                ) : null}

                {/* conversion into this stage, sitting on the boundary */}
                {s.rate ? (
                  <text x={x0} y={topAt(i) - 8} textAnchor="middle" fontSize={9.5} fontWeight={600} fill={C.amber}>
                    {s.rate}
                  </text>
                ) : null}

                {/* the number */}
                <text
                  x={mid}
                  y={top + 32}
                  textAnchor="middle"
                  fontSize={isRevenue ? 17 : 18}
                  fontWeight={700}
                  fill={s.value == null ? C.inkGhost : isRevenue ? C.amber : C.navy}
                >
                  {s.value == null ? '—' : isRevenue ? `AED ${compact(s.value)}` : compact(s.value)}
                </text>

                {/* stage name */}
                <text x={mid} y={top + 50} textAnchor="middle" fontSize={10.5} fontWeight={600} fill={C.ink}>
                  {s.label}
                </text>

                {/* what it counts, wrapped to two short lines */}
                {wrap(s.basis, 22).map((line, li) => (
                  <text key={li} x={mid} y={baseline + 16 + li * 11} textAnchor="middle" fontSize={9} fill={C.inkFaint}>
                    {line}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      <p className="mt-2 text-[10.5px] leading-snug" style={{ color: C.inkFaint }}>
        The taper is indicative, not to scale — the stages differ by orders of magnitude, so the shape carries the
        story and the printed figures are exact. Percentages on each divider are the conversion into that stage.
      </p>

      {stages.some((s) => s.pending) ? (
        <ul className="mt-2 space-y-1">
          {stages
            .filter((s) => s.pending)
            .map((s) => (
              <li key={s.key} className="text-[10.5px]" style={{ color: C.amber }}>
                {s.label}: {s.pending}
              </li>
            ))}
        </ul>
      ) : null}

      {/* Each stage opens its own live dashboard in place — the exact figure,
          where it is calculated from, what it is made of, and what would make
          a reader misread it. */}
      <div className="mt-3">
        <p className="mb-1 text-[11px] font-medium" style={{ color: C.navyMid }}>
          ▸ Click any stage below to expand its live dashboard — what the number is made of and exactly where it is
          calculated from
        </p>
        {stages.map((s) => (
          <details key={s.key} className="group border-t" style={{ borderColor: C.ruleSoft }}>
            <summary className="flex cursor-pointer list-none items-center gap-3 py-2">
              <span className="text-[11px]" style={{ color: C.navyMid }}>
                <span className="inline-block group-open:hidden">▸</span>
                <span className="hidden group-open:inline-block">▾</span>
              </span>
              <span className="flex-1 text-[11.5px] font-medium" style={{ color: C.ink }}>
                {s.label}
              </span>
              <span className="hidden text-[10.5px] sm:block" style={{ color: C.inkFaint }}>
                {s.basis}
              </span>
              <span
                className="w-[92px] text-right text-[12px] font-semibold tabular-nums"
                style={{ color: s.value == null ? C.inkGhost : C.ink }}
              >
                {s.value == null ? '—' : s.unit === 'aed' ? fmt.aedExact(s.value) : fmt.int(s.value)}
              </span>
              <span className="w-[52px] text-right text-[10.5px] tabular-nums" style={{ color: C.amber }}>
                {s.rate ?? ''}
              </span>
            </summary>

            <div className="pb-3 pl-6 pr-1">
              <p className="text-[10.5px] leading-snug" style={{ color: C.inkSoft }}>
                <span className="font-semibold" style={{ color: C.ink }}>
                  Where this comes from:{' '}
                </span>
                {s.source}
              </p>

              {s.breakdown.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 rounded px-3 py-2" style={{ background: C.navyWash }}>
                  {s.breakdown.map((b) => (
                    <div key={b.label}>
                      <p
                        className="text-[15px] font-semibold tabular-nums leading-none"
                        style={{ color: b.value == null ? C.inkGhost : C.ink }}
                      >
                        {b.value == null ? '—' : b.unit === 'aed' ? fmt.aedExact(b.value) : fmt.int(b.value)}
                      </p>
                      <p className="mt-1 text-[9.5px] uppercase tracking-wide" style={{ color: C.inkFaint }}>
                        {b.label}
                      </p>
                      {b.note ? (
                        <p className="text-[9.5px]" style={{ color: C.amber }}>
                          {b.note}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {s.caveat ? (
                <p
                  className="mt-2 rounded border-l-2 px-3 py-1.5 text-[10.5px] leading-snug"
                  style={{ borderColor: C.amberSoft, background: C.amberWash, color: C.inkSoft }}
                >
                  {s.caveat}
                </p>
              ) : null}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

/** Break a caption into at most two short lines for the SVG axis. */
function wrap(text: string, max: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max) {
      lines.push(cur.trim());
      cur = w;
      if (lines.length === 2) break;
    } else {
      cur = `${cur} ${w}`;
    }
  }
  if (lines.length < 2 && cur.trim()) lines.push(cur.trim());
  if (lines.length === 2 && words.join(' ').length > lines.join(' ').length + 1) {
    lines[1] = `${lines[1].replace(/[.,]$/, '')}…`;
  }
  return lines.slice(0, 2);
}
