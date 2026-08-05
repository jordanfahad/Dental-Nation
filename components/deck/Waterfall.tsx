import { C } from '@/components/board/design';
import type { Waterfall as WaterfallData, WaterfallBar } from '@/lib/deck/commandDeck';

/**
 * Revenue-contribution waterfall — the signature exhibit of the Command Deck.
 *
 * HORIZONTAL, one row per channel, chart and table fused into a single
 * exhibit. The first cut of this chart was a fourteen-column vertical cascade
 * with rotated, truncated labels — at board size it read as gibberish, which
 * for the page's most important exhibit is disqualifying. Rows fix every
 * legibility problem at once: labels sit flat and full-length, a 268-dirham
 * channel gets the same readable row as a 326k one, the cascade survives as
 * each row's bar starting where the previous row's ended, and the numbers live
 * in aligned columns instead of floating over bars.
 *
 * Per row: solid = revenue traced to a named billed patient · pale = the
 * modelled share of untraced revenue · amber tick = present but nothing
 * attributable yet. Rows expand in place to the channel's own live figures,
 * provenance and — from a board link — a no-login jump into the live
 * dashboard view behind it.
 */

const aedExact = (n: number): string => `AED ${Math.round(n).toLocaleString('en-US')}`;

export function Waterfall({
  data,
  dashHrefFor,
}: {
  data: WaterfallData;
  dashHrefFor?: (key: string) => string | null;
}) {
  const total = data.contributionTotal || data.total || 0;
  const alloc = data.allocation;

  if (total <= 0) {
    return (
      <p className="rounded border border-dashed px-4 py-6 text-center text-[13px]" style={{ borderColor: C.rule, color: C.inkFaint }}>
        No billed revenue recorded in this window.
      </p>
    );
  }

  // The cascade: each row's bar starts where the previous row's ended.
  let cum = 0;
  const rows = data.bars.map((b) => {
    const start = cum / total;
    const width = b.contribution / total;
    cum += b.contribution;
    return { bar: b, start, width };
  });

  const tracedShown = data.bars.reduce((a, b) => a + (b.traced ?? 0), 0);
  const allocatedShown = data.bars.reduce((a, b) => a + b.allocated, 0);

  return (
    <div>
      {/* Legend — what the shades mean, said once. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[10.5px]" style={{ color: C.inkSoft }}>
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
          <span className="inline-block h-[10px] w-[3px]" style={{ background: C.amberSoft }} />
          Active, nothing attributable yet
        </span>
      </div>

      <p className="mb-1 mt-3 text-[11px] font-medium" style={{ color: C.navyMid }}>
        ▸ Click or tap any channel to open its full detail — the figures, where each comes from, and the live dashboard
        behind it
      </p>

      {/* Column headings */}
      <div className="flex items-center gap-3 border-b pb-1 text-[9.5px] uppercase tracking-wide" style={{ borderColor: C.rule, color: C.inkFaint }}>
        <span className="w-[11px]" />
        <span className="w-[168px] shrink-0 sm:w-[208px]">Channel</span>
        <span className="hidden flex-1 md:block">Contribution — bars cascade left to right and land on the total</span>
        <span className="hidden w-[86px] text-right sm:block">Traced</span>
        <span className="hidden w-[86px] text-right sm:block">Modelled</span>
        <span className="w-[96px] text-right">Contribution</span>
        <span className="w-[40px] text-right">Share</span>
      </div>

      {rows.map(({ bar, start, width }) => (
        <ChannelRow
          key={bar.key}
          bar={bar}
          start={start}
          width={width}
          total={total}
          dashHref={dashHrefFor ? dashHrefFor(bar.key) : null}
        />
      ))}

      {/* Total — the one warm row. */}
      <div className="flex items-center gap-3 border-t-2 py-2" style={{ borderColor: C.ink }}>
        <span className="w-[11px]" />
        <span className="w-[168px] shrink-0 text-[12px] font-semibold sm:w-[208px]" style={{ color: C.ink }}>
          Total billed revenue
        </span>
        <span className="hidden flex-1 md:block">
          <span className="block h-[16px] w-full rounded-sm" style={{ background: C.amber }} />
        </span>
        <span className="hidden w-[86px] text-right text-[11.5px] font-semibold tabular-nums sm:block" style={{ color: C.ink }}>
          {aedExact(tracedShown)}
        </span>
        <span className="hidden w-[86px] text-right text-[11.5px] font-semibold tabular-nums sm:block" style={{ color: C.ink }}>
          {aedExact(allocatedShown)}
        </span>
        <span className="w-[96px] text-right text-[12.5px] font-bold tabular-nums" style={{ color: C.amber }}>
          {aedExact(total)}
        </span>
        <span className="w-[40px] text-right text-[10.5px] font-semibold tabular-nums" style={{ color: C.ink }}>
          100%
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
      <p className="mt-1.5 max-w-[900px] text-[10px] leading-snug" style={{ color: C.inkFaint }}>
        Traced plus Modelled equals Contribution on every row and on the total. Only Contribution adds up to billed
        revenue: reading the Traced column alone understates every advertising channel, and reading Contribution as if
        it were measured overstates them.
        {alloc.available
          ? ` The ${aedExact(alloc.pool)} booked at reception, by phone or with no CRM record at all is the pool being shared out, which is why those two rows show only what came back to them — their full traced figures are inside their drawers.`
          : ''}
      </p>
    </div>
  );
}

/** One channel: cascade bar + numbers on the row, full dashboard on expand. */
function ChannelRow({
  bar: b,
  start,
  width,
  total,
  dashHref,
}: {
  bar: WaterfallBar;
  start: number;
  width: number;
  total: number;
  dashHref: string | null;
}) {
  const empty = b.contribution <= 0;
  const tracedFrac = !empty ? Math.max(0, Math.min((b.traced ?? 0) / b.contribution, 1)) : 0;
  const pct = (v: number) => `${(v * 100).toFixed(3)}%`;
  const share = width;

  return (
    <details className="group border-t" style={{ borderColor: C.ruleSoft }}>
      <summary className="flex cursor-pointer list-none items-center gap-3 py-[7px]">
        <span className="w-[11px] text-[11px]" style={{ color: C.navyMid }}>
          <span className="inline-block group-open:hidden">▸</span>
          <span className="hidden group-open:inline-block">▾</span>
        </span>

        <span className="w-[168px] shrink-0 sm:w-[208px]">
          <span className="block text-[11.5px] font-medium leading-tight" style={{ color: empty ? C.inkFaint : C.ink }}>
            {b.label}
          </span>
          <span className="hidden truncate text-[9.5px] sm:block" style={{ color: C.inkFaint }}>
            {b.detail}
          </span>
        </span>

        {/* The cascade bar. Offset = everything above this row, so the
            staircase reads left to right and lands on the amber total. */}
        <span className="relative hidden h-[16px] flex-1 self-center md:block">
          <span className="absolute inset-0 rounded-sm" style={{ background: C.ruleSoft }} />
          {empty ? (
            <span
              className="absolute top-[-2px] h-[20px] w-[3px]"
              style={{ left: pct(Math.min(start, 0.995)), background: C.amberSoft }}
              title="Active, nothing attributable yet"
            />
          ) : (
            <span
              className="absolute top-0 h-full overflow-hidden rounded-sm"
              style={{ left: pct(start), width: `max(${pct(width)}, 3px)`, background: C.navyPale }}
            >
              {tracedFrac > 0 ? (
                <span
                  className="absolute left-0 top-0 h-full"
                  style={{
                    width: pct(tracedFrac),
                    background: b.attribution === 'residual' ? C.navySoft : C.navy,
                  }}
                />
              ) : null}
            </span>
          )}
        </span>

        <span className="hidden w-[86px] text-right text-[11px] tabular-nums sm:block" style={{ color: b.traced ? C.ink : C.inkGhost }}>
          {b.traced ? aedExact(b.traced) : '—'}
        </span>
        <span className="hidden w-[86px] text-right text-[11px] tabular-nums sm:block" style={{ color: b.allocated > 0 ? C.inkSoft : C.inkGhost }}>
          {b.allocated > 0 ? aedExact(b.allocated) : '—'}
        </span>
        <span className="w-[96px] text-right text-[11.5px] font-semibold tabular-nums" style={{ color: empty ? C.inkGhost : C.ink }}>
          {empty ? '—' : aedExact(b.contribution)}
        </span>
        <span className="w-[40px] text-right text-[10px] tabular-nums" style={{ color: C.inkFaint }}>
          {empty || total <= 0 ? '—' : `${(share * 100).toFixed(share < 0.1 ? 1 : 0)}%`}
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

        {dashHref ? (
          <a
            href={dashHref}
            className="no-print mt-2.5 inline-block rounded border px-3 py-1.5 text-[11px] font-semibold no-underline"
            style={{ borderColor: C.navyPale, color: C.navyMid, background: C.navyWash }}
          >
            Open the full live dashboard view →{' '}
            <span style={{ color: C.inkFaint, fontWeight: 400 }}>(no login needed — use Back to return here)</span>
          </a>
        ) : null}
      </div>
    </details>
  );
}
