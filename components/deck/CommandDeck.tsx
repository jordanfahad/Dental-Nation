import { C, fmt } from '@/components/board/design';
import { RangeControl } from '@/components/board/RangeControl';
import { resolveBoardRange, rangeLabel } from '@/lib/board/range';
import { getCommandDeck, getDeckDaily, type ModuleCard, type ModuleStat } from '@/lib/deck/commandDeck';
import { ATTRIBUTION_NOTE, JOURNEY_STAGES, MODULE_STATUS_LABEL, type ModuleStatus } from '@/config/command-deck';
import { Waterfall } from './Waterfall';
import { FunnelView } from './FunnelView';
import { GoogleCascade } from './GoogleCascade';
import { PrintButton } from '@/components/board/PrintButton';

/**
 * The Command Deck — Mr. Akbar's car-dashboard one-pager for the board.
 *
 * One page, one date filter, everything live. Reading order is the instrument
 * cluster of a cockpit: the journey strip (the odometer), then where the
 * revenue came from (the waterfall), then one gauge per system we have
 * delivered, each opening in place into its own detail.
 *
 * 🔒 Every number arrives via lib/deck/commandDeck.ts, which reads only
 * aggregate-only views. Nothing patient-level can reach this page.
 */

const STATUS_STYLE: Record<ModuleStatus, { dot: string; text: string; bg: string }> = {
  LIVE: { dot: C.good, text: C.good, bg: C.goodWash },
  PENDING_DATA: { dot: C.amberSoft, text: C.amber, bg: C.amberWash },
  RD: { dot: C.navySoft, text: C.navyMid, bg: C.navyWash },
};

function StatusLight({ status }: { status: ModuleStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ background: s.bg, color: s.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      {MODULE_STATUS_LABEL[status]}
    </span>
  );
}

function statValue(s: ModuleStat): string {
  if (s.value == null) return '—';
  if (s.format === 'aed') return fmt.aedExact(s.value);
  if (s.format === 'pct') return `${(s.value * 100).toFixed(1)}%`;
  return fmt.int(s.value);
}

function DeltaChip({ value, downGood }: { value: number | null | undefined; downGood?: boolean }) {
  if (value == null) return null;
  const good = downGood ? value < 0 : value > 0;
  const arrow = value > 0 ? '▲' : '▼';
  return (
    <span className="ml-1.5 text-[10px] font-semibold" style={{ color: good ? C.good : C.stop }}>
      {arrow} {Math.abs(value * 100).toFixed(0)}%
    </span>
  );
}

/** One gauge in the instrument grid. Opens in place — the page stays one page. */
function Instrument({ m, extra }: { m: ModuleCard; extra?: React.ReactNode }) {
  return (
    <details className="group rounded-lg border bg-white print-avoid-break" style={{ borderColor: C.rule }}>
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold leading-tight" style={{ color: C.ink }}>
            {m.title}
          </p>
          {m.sourceNote ? (
            <p className="mt-0.5 text-[10.5px] leading-snug" style={{ color: C.inkFaint }}>
              {m.sourceNote}
            </p>
          ) : null}
        </div>
        <StatusLight status={m.status} />
      </summary>

      <div className="px-4 pb-4">
        {m.stats.length > 0 ? (
          <div className="flex flex-wrap gap-x-6 gap-y-2 border-t pt-3" style={{ borderColor: C.ruleSoft }}>
            {m.stats.map((s) => (
              <div key={s.label}>
                <p className="text-[17px] font-semibold tabular-nums leading-none" style={{ color: s.value == null ? C.inkGhost : C.ink }}>
                  {statValue(s)}
                  <DeltaChip value={s.delta} downGood={s.downGood} />
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-wide" style={{ color: C.inkFaint }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        <p className="mt-3 border-t pt-2.5 text-[11.5px] leading-snug" style={{ borderColor: C.ruleSoft, color: C.inkSoft }}>
          <span className="font-semibold" style={{ color: C.ink }}>
            Contribution:{' '}
          </span>
          {m.contribution}
        </p>

        {m.pendingNote ? (
          <p className="mt-2 rounded border-l-2 px-3 py-2 text-[11px] leading-snug" style={{ borderColor: C.amberSoft, background: C.amberWash, color: C.inkSoft }}>
            {m.pendingNote}
          </p>
        ) : null}

        {m.detail.length > 0 ? (
          <div className="mt-3 hidden group-open:block">
            <table className="w-full border-collapse">
              <tbody>
                {m.detail.map((d) => (
                  <tr key={d.label} className="border-t" style={{ borderColor: C.ruleSoft }}>
                    <td className="py-1.5 pr-3 align-top text-[11px]" style={{ color: C.inkFaint }}>
                      {d.label}
                    </td>
                    <td className="py-1.5 text-right align-top text-[11.5px] tabular-nums" style={{ color: C.ink }}>
                      {d.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {extra ? <div className="mt-3 hidden group-open:block">{extra}</div> : null}

        <p className="mt-2 text-[10.5px] font-medium group-open:hidden" style={{ color: C.navyMid }}>
          ▸ Click to expand the full detail
        </p>
        <p className="mt-2 hidden text-[10.5px] group-open:block" style={{ color: C.inkFaint }}>
          ▾ Click the title again to collapse
        </p>
      </div>
    </details>
  );
}

export async function CommandDeck({
  searchParams,
  basePath,
  recipientLabel,
  hiddenModules = [],
}: {
  searchParams: { preset?: string; from?: string; to?: string };
  basePath: string;
  recipientLabel?: string | null;
  /** Per-link module toggles (report_share_links.sections). */
  hiddenModules?: string[];
}) {
  // Resolve the window against the data's own bounds, so "since launch" starts
  // at the first day the platform actually recorded something.
  const daily = await getDeckDaily();
  const dataFrom = daily[0]?.day ?? new Date().toISOString().slice(0, 10);
  const dataTo = daily[daily.length - 1]?.day ?? dataFrom;
  const range = resolveBoardRange(searchParams, dataFrom, dataTo);
  const deck = await getCommandDeck(range.from, range.to, range.compareFrom, range.compareTo);

  const modules = deck.modules.filter((m) => !hiddenModules.includes(m.key));
  const j = deck.window.journey;
  const prior = deck.window.priorJourney;

  const conv = (a: number | null, b: number | null): string | null =>
    a == null || b == null || a === 0 ? null : `${((b / a) * 100).toFixed(b / a < 0.01 ? 2 : 1)}%`;

  const stages = JOURNEY_STAGES.map((s) => ({
    ...s,
    value: j[s.key],
    prior: prior ? prior[s.key] : null,
  }));

  return (
    <div className="space-y-5" style={{ color: C.ink }}>
      {/* ── Cockpit header ───────────────────────────────────────────────── */}
      <header className="rounded-lg px-5 py-5 text-white" style={{ background: C.navy }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: C.navyPale }}>
              Dental Nation · Group growth platform
            </p>
            <h1 className="mt-1 text-[24px] font-semibold leading-tight sm:text-[28px]">Growth Command Deck</h1>
            <p className="mt-1.5 text-[12px]" style={{ color: C.navyPale }}>
              {deck.liveModules} of {deck.totalModules} systems live · every figure below is the selected window,
              refreshed every 15 minutes
              {deck.lastUpdated ? ` · last updated ${new Date(deck.lastUpdated).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}
            </p>
          </div>
          <div className="no-print shrink-0">
            <PrintButton />
          </div>
        </div>
      </header>

      <div className="no-print">
        <RangeControl range={range} basePath={basePath} />
      </div>

      {/* ── Primary cluster — the journey strip ──────────────────────────── */}
      <section className="rounded-lg border bg-white p-4 print-avoid-break sm:p-5" style={{ borderColor: C.rule }}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-semibold">The journey — {rangeLabel(range.from, range.to)}</h2>
          <p className="text-[11px]" style={{ color: C.inkFaint }}>
            {range.compareLabel ? `Change vs ${range.compareLabel}` : 'Whole recorded period — no prior window to compare'}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
          {stages.map((s, i) => {
            const next = stages[i + 1];
            const rate = next ? conv(s.value, next.value) : null;
            const dv = s.value != null && s.prior != null && s.prior !== 0 ? (s.value - s.prior) / s.prior : null;
            return (
              <div key={s.key} className="relative">
                <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: C.inkFaint }}>
                  {s.label}
                </p>
                <p className="mt-1 text-[22px] font-semibold tabular-nums leading-none" style={{ color: s.value == null ? C.inkGhost : C.ink }}>
                  {s.value == null ? '—' : s.key === 'revenue' ? fmt.aedExact(s.value) : fmt.int(s.value)}
                  <DeltaChip value={dv} />
                </p>
                <p className="mt-1 text-[10px] leading-snug" style={{ color: C.inkFaint }}>
                  {s.basis}
                </p>
                {rate ? (
                  <span
                    className="mt-1.5 inline-block rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold"
                    style={{ background: C.navyWash, color: C.navyMid }}
                  >
                    → {rate}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── The wide funnel — visibility through to revenue ──────────────── */}
      <section className="rounded-lg border bg-white p-4 print-avoid-break sm:p-5" style={{ borderColor: C.rule }}>
        <h2 className="text-[15px] font-semibold">Visibility to revenue — the whole journey</h2>
        <p className="mt-1 max-w-[880px] text-[11.5px] leading-snug" style={{ color: C.inkSoft }}>
          The band narrows the way demand does. Two things sit at the top that behave completely differently: the
          audience the brand owns, and the reach it buys. At the lead stage the split matters just as much — a
          platform lead event is interest, while a website booking request already names a treatment, a clinic and a
          date, which is why the two are counted separately rather than added together.
        </p>
        <div className="mt-4">
          <FunnelView stages={deck.funnel} />
        </div>
      </section>

      {/* ── Projects, investment and return ──────────────────────────────── */}
      <section className="rounded-lg border bg-white p-4 print-avoid-break sm:p-5" style={{ borderColor: C.rule }}>
        <h2 className="text-[15px] font-semibold">What was built, what it cost, what it returned</h2>
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
          <div>
            <p className="text-[22px] font-semibold tabular-nums leading-none">
              {deck.investment.projectsDelivered}
              <span className="ml-1 text-[13px] font-normal" style={{ color: C.inkFaint }}>
                systems
              </span>
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wide" style={{ color: C.inkFaint }}>
              Delivered
            </p>
            <p className="mt-0.5 text-[10px]" style={{ color: C.inkFaint }}>
              {deck.investment.projectsLive} wired to a live feed
            </p>
          </div>
          <div>
            <p className="text-[22px] font-semibold tabular-nums leading-none" style={{ color: C.amber }}>
              {deck.investment.revenue == null ? '—' : fmt.aedExact(deck.investment.revenue)}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wide" style={{ color: C.inkFaint }}>
              Revenue billed
            </p>
          </div>
          <div>
            <p className="text-[22px] font-semibold tabular-nums leading-none">
              {deck.investment.mediaSpend == null ? '—' : fmt.aedExact(deck.investment.mediaSpend)}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wide" style={{ color: C.inkFaint }}>
              Media spend
            </p>
          </div>
          <div>
            <p className="text-[22px] font-semibold tabular-nums leading-none" style={{ color: deck.investment.buildCost == null ? C.inkGhost : C.ink }}>
              {deck.investment.buildCost == null ? 'Not entered' : fmt.aedExact(deck.investment.buildCost)}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wide" style={{ color: C.inkFaint }}>
              Build &amp; platform cost
            </p>
          </div>
          <div>
            <p className="text-[22px] font-semibold tabular-nums leading-none" style={{ color: deck.investment.returnMultiple == null ? C.inkGhost : C.good }}>
              {deck.investment.returnMultiple != null
                ? `${deck.investment.returnMultiple.toFixed(1)}×`
                : deck.investment.returnOnMedia != null
                  ? `${deck.investment.returnOnMedia.toFixed(1)}×`
                  : '—'}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wide" style={{ color: C.inkFaint }}>
              {deck.investment.returnMultiple != null ? 'Return on total investment' : 'Return on media only'}
            </p>
            {deck.investment.returnMultiple == null && deck.investment.returnOnMedia != null ? (
              <p className="mt-0.5 text-[10px] font-medium" style={{ color: C.amber }}>
                Partial — build cost excluded
              </p>
            ) : null}
          </div>
        </div>
        <p className="mt-3 rounded border-l-2 px-3 py-2 text-[11px] leading-snug" style={{ borderColor: C.amberSoft, background: C.amberWash, color: C.inkSoft }}>
          {deck.investment.costNote}
        </p>
      </section>

      {/* ── Revenue contribution waterfall ───────────────────────────────── */}
      <section className="rounded-lg border bg-white p-4 print-avoid-break sm:p-5" style={{ borderColor: C.rule }}>
        <h2 className="text-[15px] font-semibold">Where the billed revenue came from</h2>
        <p className="mt-1 max-w-[880px] text-[11.5px] leading-snug" style={{ color: C.inkSoft }}>
          {ATTRIBUTION_NOTE}
        </p>
        <div className="mt-4">
          <Waterfall data={deck.waterfall} />
        </div>
        {deck.waterfall.total != null && j.revenue != null ? (
          <p className="mt-3 text-[11px]" style={{ color: deck.waterfall.reconciles ? C.inkFaint : C.amber }}>
            {deck.waterfall.reconciles
              ? `Bars reconcile exactly to ${fmt.aedExact(j.revenue)} of billed revenue in this window.`
              : `Bars total ${fmt.aedExact(deck.waterfall.total)} against ${fmt.aedExact(j.revenue)} billed — the difference is bills whose patient record could not be read.`}
          </p>
        ) : null}
      </section>

      {/* ── Instrument grid ──────────────────────────────────────────────── */}
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-semibold">The systems</h2>
          <p className="text-[11px] font-medium" style={{ color: C.navyMid }}>
            ▸ Click any card to expand its live detail
          </p>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <Instrument
              key={m.key}
              m={m}
              extra={m.key === 'google_ads' ? <GoogleCascade g={deck.google} /> : undefined}
            />
          ))}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="rounded-lg border px-4 py-4 print-avoid-break" style={{ borderColor: C.rule, background: C.panel }}>
        <p className="text-[11px] leading-snug" style={{ color: C.inkSoft }}>
          <span className="font-semibold" style={{ color: C.ink }}>
            How to read this page.
          </span>{' '}
          Every figure is live from the group growth platform for the window selected above — nothing on this page is
          typed in by hand. Where a system cannot yet prove its revenue contribution, it says so rather than showing an
          estimate: those gaps are named, with the single dependency that closes each one.
        </p>
        <p className="mt-2 text-[10.5px]" style={{ color: C.inkFaint }}>
          Prepared for {recipientLabel || 'the Dental Nation board'} · Confidential ·{' '}
          {deck.lastUpdated ? `data through ${new Date(deck.lastUpdated).toLocaleDateString('en-GB', { dateStyle: 'medium' })}` : 'data timestamp pending'}
        </p>
      </footer>
    </div>
  );
}
