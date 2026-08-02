import { LANES, LTV_CAC_TARGETS, type Command } from '@/config/growth-os';

/**
 * The two Part 2 charts (spec §6.5, §6.7).
 *
 * Deliberately plain CSS/SVG rather than the dashboard's Recharts components:
 * these render on a public share route that must print to a clean board packet
 * and open fast on a phone. A client-side chart library would mean a blank
 * rectangle in the PDF and a hydration cost for two static figures. The colour
 * fills survive printing via the `print-exact` class on the report root.
 */

const COMMAND_COLOR: Record<Command, string> = {
  OWN: '#1F3A5F',
  BUILD: '#5B7BA3',
  PILOT: '#B45309',
  RUN: '#9CA3AF',
};

/** §6.5 — addressable market by lane (AED M), sorted descending. */
export function LaneTamChart() {
  const rows = [...LANES].sort((a, b) => b.tam - a.tam);
  const max = Math.max(...rows.map((r) => r.tam));
  const total = rows.reduce((a, r) => a + r.tam, 0);

  return (
    <figure className="print-avoid-break">
      <div className="space-y-[5px]">
        {rows.map((r) => (
          <div key={r.lane} className="flex items-center gap-2">
            <span className="w-[104px] shrink-0 truncate text-[11px] text-ink-soft sm:w-[190px]">
              <span className="font-semibold text-ink">{r.lane}</span> · {r.name}
            </span>
            {/* min-w-0 on the track: without it the 38px minimum bar width
                becomes the track's own minimum, and the row refuses to shrink
                on a phone — pushing the whole page sideways. */}
            <div className="flex h-[16px] min-w-0 flex-1 items-center rounded-sm bg-panel">
              <div
                className="flex h-full min-w-[34px] items-center justify-end rounded-sm pr-1.5"
                style={{ width: `${(r.tam / max) * 100}%`, background: COMMAND_COLOR[r.command] }}
              >
                <span className="tnum text-[9.5px] font-semibold text-white">{r.tam}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {(Object.keys(COMMAND_COLOR) as Command[]).map((k) => (
          <span key={k} className="flex items-center gap-1.5 text-[10.5px] text-ink-faint">
            <span aria-hidden className="h-[8px] w-[8px] rounded-[2px]" style={{ background: COMMAND_COLOR[k] }} />
            {k}
          </span>
        ))}
        <span className="ml-auto tnum text-[10.5px] text-ink-faint">
          Total AED {total.toLocaleString('en-US')}M addressable
        </span>
      </div>
      <figcaption className="mt-2 text-[10.5px] leading-snug text-ink-faint">
        Dubai addressable market by lane, AED millions. Bar colour is the funding command, so where the money is
        allowed to go is readable against where the market is.
      </figcaption>
    </figure>
  );
}

/** §6.7 — DN LTV:CAC target vs. the market-leader threshold. */
export function TargetVsMarketChart() {
  const rows = LTV_CAC_TARGETS;
  const max = Math.max(...rows.flatMap((r) => [r.dn, r.threshold]));

  return (
    <figure className="print-avoid-break">
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.lane}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-[11.5px] font-medium text-ink">{r.lane}</span>
              <span className="tnum text-[10.5px] text-ink-faint">
                target {r.dn}× · leader threshold {r.threshold}×
              </span>
            </div>
            <div className="space-y-[3px]">
              <div className="flex items-center gap-2">
                <span className="w-[54px] shrink-0 text-[9.5px] uppercase tracking-wide text-ink-faint">DN</span>
                <div className="flex h-[13px] min-w-0 flex-1 items-center rounded-sm bg-panel">
                  <div
                    className="flex h-full min-w-[30px] items-center justify-end rounded-sm bg-accent pr-1.5"
                    style={{ width: `${(r.dn / max) * 100}%` }}
                  >
                    <span className="tnum text-[9px] font-semibold text-white">{r.dn}×</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-[54px] shrink-0 text-[9.5px] uppercase tracking-wide text-ink-faint">Leader</span>
                <div className="flex h-[13px] min-w-0 flex-1 items-center rounded-sm bg-panel">
                  <div
                    className="flex h-full min-w-[30px] items-center justify-end rounded-sm pr-1.5"
                    style={{ width: `${(r.threshold / max) * 100}%`, background: '#C7CFDA' }}
                  >
                    <span className="tnum text-[9px] font-semibold text-ink-soft">{r.threshold}×</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <figcaption className="mt-3 text-[10.5px] leading-snug text-ink-faint">
        Every lane target sits above the Dubai norm. The gap is not an assumption about the market — it is what the
        operating system is built to close.
      </figcaption>
    </figure>
  );
}
