import { C } from '@/components/board/design';
import type { Waterfall as WaterfallData } from '@/lib/deck/commandDeck';

/**
 * Revenue-contribution waterfall — the signature exhibit of the Command Deck.
 *
 * Measured components cascade left to right and land on the Total bar, so the
 * bars genuinely sum to billed revenue. Components whose revenue cannot yet be
 * traced are NOT given a share: they sit on the baseline as an outlined
 * "attribution pending" marker carrying whatever they can actually prove
 * (spend, leads). That gap is the honest part of this chart — a board member
 * can see exactly how much of the revenue the machine can currently explain.
 *
 * Pure SVG, no client JS: it renders identically in print and on a phone,
 * where the chart scrolls horizontally under a sticky Total.
 */

const aedShort = (n: number): string => {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(Math.round(n));
};

export function Waterfall({ data }: { data: WaterfallData }) {
  const measured = data.bars.filter((b) => b.revenue != null && b.revenue > 0);
  // "Pending" is a property of the component, not of this window: a traceable
  // route that simply billed nothing here is not an attribution gap.
  const pending = data.bars.filter((b) => b.attribution === 'pending');
  const total = data.total ?? 0;

  if (total <= 0) {
    return (
      <p className="rounded border border-dashed px-4 py-6 text-center text-[13px]" style={{ borderColor: C.rule, color: C.inkFaint }}>
        No billed revenue recorded in this window.
      </p>
    );
  }

  // Geometry. One column per measured bar, plus the Total column.
  const cols = measured.length + 1;
  const colW = 96;
  const gap = 18;
  const chartW = cols * colW + (cols - 1) * gap;
  const chartH = 260;
  const padTop = 26;
  const padBottom = 64;
  const plotH = chartH - padTop - padBottom;
  const scale = (v: number) => (v / total) * plotH;

  let cumulative = 0;
  const steps = measured.map((b, i) => {
    const value = b.revenue ?? 0;
    const x = i * (colW + gap);
    const h = Math.max(scale(value), 2);
    const yTop = padTop + plotH - scale(cumulative) - h;
    const step = { bar: b, x, y: yTop, h, value, cumulativeAfter: cumulative + value };
    cumulative += value;
    return step;
  });

  const totalX = measured.length * (colW + gap);
  const totalH = Math.max(scale(total), 2);
  const totalY = padTop + plotH - totalH;

  const share = (v: number) => `${Math.round((v / total) * 100)}%`;

  return (
    <div>
      <div className="scroll-x overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          width={chartW}
          height={chartH}
          role="img"
          aria-label="Billed revenue by acquisition route, cascading to the total"
          style={{ maxWidth: '100%', minWidth: Math.min(chartW, 560) }}
        >
          {/* baseline */}
          <line x1={0} y1={padTop + plotH} x2={chartW} y2={padTop + plotH} stroke={C.rule} strokeWidth={1} />

          {steps.map((s, i) => (
            <g key={s.bar.key}>
              {/* connector from the top of this bar to the next bar's foot */}
              {i < steps.length - 1 ? (
                <line
                  x1={s.x + colW}
                  y1={s.y}
                  x2={s.x + colW + gap}
                  y2={s.y}
                  stroke={C.navyPale}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              ) : (
                <line
                  x1={s.x + colW}
                  y1={s.y}
                  x2={totalX}
                  y2={s.y}
                  stroke={C.navyPale}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              )}
              <rect
                x={s.x}
                y={s.y}
                width={colW}
                height={s.h}
                fill={s.bar.attribution === 'residual' ? C.navySoft : C.navy}
                rx={2}
              />
              {/* value above the bar */}
              <text x={s.x + colW / 2} y={s.y - 7} textAnchor="middle" fontSize={12} fontWeight={600} fill={C.ink}>
                {aedShort(s.value)}
              </text>
              {/* label under the axis */}
              <text x={s.x + colW / 2} y={padTop + plotH + 16} textAnchor="middle" fontSize={10} fill={C.inkSoft}>
                {s.bar.label.length > 16 ? `${s.bar.label.slice(0, 15)}…` : s.bar.label}
              </text>
              <text x={s.x + colW / 2} y={padTop + plotH + 30} textAnchor="middle" fontSize={9.5} fill={C.inkFaint}>
                {share(s.value)} · {s.bar.bills ?? 0} treatments
              </text>
            </g>
          ))}

          {/* Total — the one warm bar on the chart */}
          <rect x={totalX} y={totalY} width={colW} height={totalH} fill={C.amber} rx={2} />
          <text x={totalX + colW / 2} y={totalY - 7} textAnchor="middle" fontSize={12.5} fontWeight={700} fill={C.amber}>
            {aedShort(total)}
          </text>
          <text x={totalX + colW / 2} y={padTop + plotH + 16} textAnchor="middle" fontSize={10} fontWeight={600} fill={C.ink}>
            Total billed
          </text>
          <text x={totalX + colW / 2} y={padTop + plotH + 30} textAnchor="middle" fontSize={9.5} fill={C.inkFaint}>
            100%
          </text>
        </svg>
      </div>

      {/* Each component opens its own live dashboard in place. */}
      <div className="mt-4">
        <p className="mb-1 text-[11px] font-medium" style={{ color: C.navyMid }}>
          ▸ Click any route below to expand its full detail — figures, method and how the revenue is traced
        </p>
        {measured.map((b) => (
          <details key={b.key} className="group border-t" style={{ borderColor: C.ruleSoft }}>
            <summary className="flex cursor-pointer list-none items-center gap-3 py-2">
              <span className="text-[11px]" style={{ color: C.navyMid }}>
                <span className="inline-block group-open:hidden">▸</span>
                <span className="hidden group-open:inline-block">▾</span>
              </span>
              <span className="flex-1 text-[11.5px] font-medium" style={{ color: C.ink }}>
                {b.label}
              </span>
              <span className="hidden text-[10.5px] sm:block" style={{ color: C.inkFaint }}>
                {b.detail}
              </span>
              <span className="w-[100px] text-right text-[12px] font-semibold tabular-nums" style={{ color: C.ink }}>
                AED {Math.round(b.revenue ?? 0).toLocaleString('en-US')}
              </span>
            </summary>
            <div className="pb-3 pl-6 pr-1">
              <p className="text-[10.5px] leading-snug" style={{ color: C.inkSoft }}>
                <span className="font-semibold" style={{ color: C.ink }}>
                  How this is traced:{' '}
                </span>
                {b.source}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 rounded px-3 py-2" style={{ background: C.navyWash }}>
                {b.breakdown.map((d) => (
                  <div key={d.label}>
                    <p
                      className="text-[15px] font-semibold tabular-nums leading-none"
                      style={{ color: d.value == null ? C.inkGhost : C.ink }}
                    >
                      {d.value == null
                        ? '—'
                        : d.unit === 'aed'
                          ? `AED ${Math.round(d.value).toLocaleString('en-US')}`
                          : d.note === 'shown as a share on the chart'
                            ? `${Math.round(d.value * 100)}%`
                            : Math.round(d.value).toLocaleString('en-US')}
                    </p>
                    <p className="mt-1 text-[9.5px] uppercase tracking-wide" style={{ color: C.inkFaint }}>
                      {d.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </details>
        ))}
      </div>

      {/* Pending components — deliberately outside the bars. */}
      {pending.length > 0 ? (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.inkFaint }}>
            The other {pending.length} channels — active, revenue attribution pending
          </p>
          <p className="mb-2 mt-0.5 max-w-[860px] text-[10.5px] leading-snug" style={{ color: C.inkSoft }}>
            These are running and measured, but none of them can yet trace a specific billed patient, so none is given
            a slice of the bars above. What each one CAN prove is shown here.
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pending.map((b) => (
              <div key={b.key} className="rounded border border-dashed px-3 py-2" style={{ borderColor: C.navyPale, background: C.navyWash }}>
                <p className="text-[12px] font-semibold" style={{ color: C.ink }}>
                  {b.label}
                </p>
                {b.provenLabel ? (
                  <p className="mt-0.5 text-[11px] tabular-nums" style={{ color: C.inkSoft }}>
                    {b.provenLabel}
                  </p>
                ) : null}
                {b.pendingNote ? (
                  <p className="mt-1 text-[10.5px] leading-snug" style={{ color: C.inkFaint }}>
                    {b.pendingNote}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
