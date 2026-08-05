import { C } from '@/components/board/design';
import type { Waterfall as WaterfallData, WaterfallBar } from '@/lib/deck/commandDeck';

/**
 * Revenue-contribution waterfall — the signature exhibit of the Command Deck.
 *
 * ONE chart, EVERY channel. Each column is split into the two things a board
 * member must be able to tell apart at a glance:
 *
 *   solid — revenue traced patient by patient (bill → file → phone → route)
 *   pale  — that channel's modelled share of the revenue nobody could trace
 *
 * The columns cascade left to right and land on the Total bar, so they add up
 * to billed revenue exactly. A channel with nothing in either half still gets
 * its place on the axis with a marker rather than being dropped, because a
 * missing channel reads as "we forgot it" and a zero reads as "it did nothing"
 * — the drawer underneath says which it actually is.
 *
 * Pure SVG, no client JS: it renders identically in print and on a phone,
 * where the chart scrolls horizontally.
 */

const aedShort = (n: number): string => {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(Math.round(n));
};

const aedExact = (n: number): string => `AED ${Math.round(n).toLocaleString('en-US')}`;

export function Waterfall({ data }: { data: WaterfallData }) {
  const total = data.contributionTotal || data.total || 0;
  const alloc = data.allocation;

  if (total <= 0) {
    return (
      <p className="rounded border border-dashed px-4 py-6 text-center text-[13px]" style={{ borderColor: C.rule, color: C.inkFaint }}>
        No billed revenue recorded in this window.
      </p>
    );
  }

  // Every component is a column, in the configured acquisition-first order, so
  // the eye travels from what marketing produced to what walked in anyway.
  const bars = data.bars;

  const colW = 76;
  const gap = 11;
  const cols = bars.length + 1;
  const chartW = cols * colW + (cols - 1) * gap;
  const chartH = 300;
  const padTop = 26;
  const padBottom = 96;
  const plotH = chartH - padTop - padBottom;
  const scale = (v: number) => (v / total) * plotH;

  let cumulative = 0;
  const steps = bars.map((b, i) => {
    const value = b.contribution;
    const tracedPart = Math.max(0, Math.min(b.traced ?? 0, value));
    const x = i * (colW + gap);
    const h = scale(value);
    const yTop = padTop + plotH - scale(cumulative) - h;
    const step = {
      bar: b,
      x,
      y: yTop,
      h,
      value,
      tracedH: scale(tracedPart),
      empty: value <= 0,
    };
    cumulative += value;
    return step;
  });

  // Column totals come from the bars, not from the traced grand total: the two
  // pool routes hand their revenue to the allocation, so summing traced-as-read
  // would double-count it against Contribution.
  const tracedShown = bars.reduce((a, b) => a + (b.traced ?? 0), 0);
  const allocatedShown = bars.reduce((a, b) => a + b.allocated, 0);

  const totalX = bars.length * (colW + gap);
  const totalH = Math.max(scale(total), 2);
  const totalY = padTop + plotH - totalH;
  const share = (v: number) => `${((v / total) * 100).toFixed(v / total < 0.1 ? 1 : 0)}%`;

  // Labels are angled: fourteen channels will not fit horizontally at a size
  // anyone can read.
  const axisLabel = (x: number, text: string, bold = false) => (
    <text
      x={x}
      y={padTop + plotH + 12}
      transform={`rotate(-38 ${x} ${padTop + plotH + 12})`}
      textAnchor="end"
      fontSize={9.5}
      fontWeight={bold ? 600 : 400}
      fill={bold ? C.ink : C.inkSoft}
    >
      {text.length > 24 ? `${text.slice(0, 23)}…` : text}
    </text>
  );

  return (
    <div>
      <div className="scroll-x overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          width={chartW}
          height={chartH}
          role="img"
          aria-label="Billed revenue contribution by channel, traced and modelled, cascading to the total"
          style={{ maxWidth: '100%', minWidth: Math.min(chartW, 620) }}
        >
          <line x1={0} y1={padTop + plotH} x2={chartW} y2={padTop + plotH} stroke={C.rule} strokeWidth={1} />

          {steps.map((s, i) => {
            const next = steps[i + 1];
            const connectorX2 = next ? next.x : totalX;
            return (
              <g key={s.bar.key}>
                {!s.empty ? (
                  <line
                    x1={s.x + colW}
                    y1={s.y}
                    x2={connectorX2}
                    y2={s.y}
                    stroke={C.navyPale}
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                ) : null}

                {s.empty ? (
                  // Present on the axis, honestly at zero.
                  <line
                    x1={s.x + 8}
                    y1={padTop + plotH}
                    x2={s.x + colW - 8}
                    y2={padTop + plotH}
                    stroke={C.amberSoft}
                    strokeWidth={2.5}
                  />
                ) : (
                  <>
                    {/* whole contribution, pale */}
                    <rect x={s.x} y={s.y} width={colW} height={Math.max(s.h, 2)} fill={C.navyPale} rx={2} />
                    {/* traced portion, solid, sitting at the foot of the column */}
                    {s.tracedH > 0 ? (
                      <rect
                        x={s.x}
                        y={s.y + s.h - s.tracedH}
                        width={colW}
                        height={Math.max(s.tracedH, 2)}
                        fill={s.bar.attribution === 'residual' ? C.navySoft : C.navy}
                        rx={2}
                      />
                    ) : null}
                    <text x={s.x + colW / 2} y={s.y - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill={C.ink}>
                      {aedShort(s.value)}
                    </text>
                  </>
                )}

                {axisLabel(s.x + colW / 2, s.empty ? `${s.bar.label} — 0` : `${s.bar.label} · ${share(s.value)}`)}
              </g>
            );
          })}

          {/* Total — the one warm bar on the chart */}
          <rect x={totalX} y={totalY} width={colW} height={totalH} fill={C.amber} rx={2} />
          <text x={totalX + colW / 2} y={totalY - 6} textAnchor="middle" fontSize={12} fontWeight={700} fill={C.amber}>
            {aedShort(total)}
          </text>
          {axisLabel(totalX + colW / 2, 'Total billed · 100%', true)}
        </svg>
      </div>

      {/* Legend — what the two shades mean, said once and plainly. */}
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[10.5px]" style={{ color: C.inkSoft }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[10px] w-[16px] rounded-sm" style={{ background: C.navy }} />
          Traced to a named billed patient
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[10px] w-[16px] rounded-sm" style={{ background: C.navyPale }} />
          Modelled share of untraced revenue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[10px] w-[16px] rounded-sm" style={{ background: C.navySoft }} />
          Direct &amp; walk-in
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[3px] w-[16px]" style={{ background: C.amberSoft }} />
          On the axis, nothing attributable yet
        </span>
      </div>

      <p className="mt-2 max-w-[900px] rounded border-l-2 px-3 py-2 text-[10.5px] leading-snug" style={{ borderColor: C.navyPale, background: C.navyWash, color: C.inkSoft }}>
        {alloc.method}
      </p>
      {alloc.confidence ? (
        <p className="mt-1.5 max-w-[900px] rounded border-l-2 px-3 py-2 text-[10.5px] leading-snug" style={{ borderColor: C.amber, background: C.amberWash, color: C.inkSoft }}>
          {alloc.confidence}
        </p>
      ) : null}

      {/* ── The one table: every channel, every number, expandable ────────── */}
      <div className="mt-4">
        <p className="mb-1 text-[11px] font-medium" style={{ color: C.navyMid }}>
          ▸ Click or tap any channel below to open its live detail — the figures, where each one comes from, and how
          the revenue is traced
        </p>
        <div className="flex items-center gap-3 border-b pb-1 text-[9.5px] uppercase tracking-wide" style={{ borderColor: C.rule, color: C.inkFaint }}>
          <span className="w-[11px]" />
          <span className="flex-1">Channel</span>
          <span className="w-[96px] text-right">Traced</span>
          <span className="w-[96px] text-right">Modelled</span>
          <span className="w-[104px] text-right">Contribution</span>
          <span className="w-[44px] text-right">Share</span>
        </div>
        {bars.map((b) => (
          <ChannelRow key={b.key} bar={b} total={total} />
        ))}
        <div className="flex items-center gap-3 border-t-2 pt-1.5 text-[11.5px] font-semibold" style={{ borderColor: C.ink, color: C.ink }}>
          <span className="w-[11px]" />
          <span className="flex-1">Total billed revenue</span>
          <span className="w-[96px] text-right tabular-nums">{aedExact(tracedShown)}</span>
          <span className="w-[96px] text-right tabular-nums">{aedExact(allocatedShown)}</span>
          <span className="w-[104px] text-right tabular-nums">{aedExact(total)}</span>
          <span className="w-[44px] text-right tabular-nums">100%</span>
        </div>
        <p className="mt-1 max-w-[900px] text-[10px] leading-snug" style={{ color: C.inkFaint }}>
          Traced plus Modelled equals Contribution on every row and on the total. Only Contribution adds up to billed
          revenue: reading the Traced column alone understates every advertising channel, and reading Contribution as
          if it were measured overstates them.
          {alloc.available
            ? ` The ${aedExact(alloc.pool)} booked at reception, by phone or with no CRM record at all is the pool being shared out, which is why those two rows show only what came back to them — their full traced figures are inside their drawers.`
            : ''}
        </p>
      </div>
    </div>
  );
}

/** One channel: summary line always visible, full dashboard on expand. */
function ChannelRow({ bar: b, total }: { bar: WaterfallBar; total: number }) {
  const contribution = b.contribution;
  const dim = contribution <= 0;
  return (
    <details className="group border-t" style={{ borderColor: C.ruleSoft }}>
      <summary className="flex cursor-pointer list-none items-center gap-3 py-2">
        <span className="w-[11px] text-[11px]" style={{ color: C.navyMid }}>
          <span className="inline-block group-open:hidden">▸</span>
          <span className="hidden group-open:inline-block">▾</span>
        </span>
        <span className="flex-1 min-w-0">
          <span className="block truncate text-[11.5px] font-medium" style={{ color: dim ? C.inkFaint : C.ink }}>
            {b.label}
          </span>
          <span className="hidden truncate text-[10px] sm:block" style={{ color: C.inkFaint }}>
            {b.detail}
          </span>
        </span>
        <span className="w-[96px] text-right text-[11.5px] tabular-nums" style={{ color: b.traced ? C.ink : C.inkGhost }}>
          {b.traced ? aedExact(b.traced) : '—'}
        </span>
        <span className="w-[96px] text-right text-[11.5px] tabular-nums" style={{ color: b.allocated > 0 ? C.inkSoft : C.inkGhost }}>
          {b.allocated > 0 ? aedExact(b.allocated) : '—'}
        </span>
        <span className="w-[104px] text-right text-[12px] font-semibold tabular-nums" style={{ color: dim ? C.inkGhost : C.ink }}>
          {dim ? '—' : aedExact(contribution)}
        </span>
        <span className="w-[44px] text-right text-[10.5px] tabular-nums" style={{ color: C.inkFaint }}>
          {dim || total <= 0 ? '—' : `${((contribution / total) * 100).toFixed(contribution / total < 0.1 ? 1 : 0)}%`}
        </span>
      </summary>

      <div className="pb-3 pl-[26px] pr-1">
        <p className="text-[10.5px] leading-snug" style={{ color: C.inkSoft }}>
          <span className="font-semibold" style={{ color: C.ink }}>
            Traced revenue:{' '}
          </span>
          {b.source}
        </p>
        <p className="mt-1 text-[10.5px] leading-snug" style={{ color: C.inkSoft }}>
          <span className="font-semibold" style={{ color: C.ink }}>
            Modelled share:{' '}
          </span>
          {b.allocationBasis}
        </p>
        {b.pendingNote ? (
          <p className="mt-1 text-[10.5px] leading-snug" style={{ color: C.amber }}>
            <span className="font-semibold">Why revenue cannot be traced here: </span>
            {b.pendingNote}
          </p>
        ) : null}
        {b.provenLabel ? (
          <p className="mt-1 text-[10.5px] tabular-nums" style={{ color: C.inkFaint }}>
            What this channel can prove in this window: {b.provenLabel}
          </p>
        ) : null}

        {b.breakdown.length > 0 ? (
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
                      ? aedExact(d.value)
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
        ) : null}
      </div>
    </details>
  );
}
