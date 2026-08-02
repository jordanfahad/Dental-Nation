import { format, parseISO } from 'date-fns';
import {
  getBoardDaily, getBoardMonthly, getLastIngestion, getManualMetrics, sumWindow,
} from '@/lib/board/metrics';
import { resolveBoardRange } from '@/lib/board/range';
import { dubaiToday } from '@/lib/dates';
import { Part1Execution } from './Part1Execution';
import { Part2OperatingSystem } from './Part2OperatingSystem';
import { BoardNav } from './BoardNav';
import { RangeControl } from './RangeControl';
import { PrintButton } from './PrintButton';

/**
 * The board growth report — both parts, one document.
 *
 * 🔒 Everything this component reads comes from lib/board/metrics.ts, which
 * touches only the aggregate-only views. No patient-level table is reachable
 * from here, which is what makes the same component safe to render on the
 * public share route and on the internal admin page.
 *
 * `publicView` changes tone, not access: it hides internal asides (notes to
 * Fahad, the link admin), and it never unlocks additional data.
 */
export async function BoardReport({
  searchParams,
  basePath,
  publicView = false,
  deckHref = '/board-assets/Dental_Nation_Growth_Report.pptx',
}: {
  searchParams: { preset?: string; from?: string; to?: string };
  basePath: string;
  publicView?: boolean;
  deckHref?: string;
}) {
  const [daily, monthly, manual, lastUpdated] = await Promise.all([
    getBoardDaily(),
    getBoardMonthly(),
    getManualMetrics(),
    getLastIngestion(),
  ]);

  const today = dubaiToday();
  const dataFrom = daily[0]?.day ?? today;
  const dataTo = daily[daily.length - 1]?.day ?? today;
  const range = resolveBoardRange(searchParams, dataFrom, dataTo);

  const totals = sumWindow(daily, range.from, range.to);
  const prior =
    range.compareFrom && range.compareTo ? sumWindow(daily, range.compareFrom, range.compareTo) : null;

  // The KPI appendix always shows the full history, not the selected window —
  // it is the audit trail behind the cards, and truncating it to the filter
  // would hide exactly the months a sceptical reader wants to check.
  const appendix = monthly.filter((m) => (m.spendTotal ?? m.apptsBooked ?? m.revenue) != null);

  return (
    <div className="report print-exact">
      {/* ── Masthead ── */}
      <header className="mb-6 border-b border-line pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-accent">Dental Nation · Growth</p>
            <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight text-ink sm:text-[36px]">
              Growth Report
            </h1>
            <p className="mt-1.5 max-w-[62ch] text-[13px] leading-relaxed text-ink-soft">
              December 2025 – August 2026 · prepared for Mr. Akbar, the Board and investors.
            </p>
          </div>
          <div className="no-print flex shrink-0 flex-wrap items-center gap-2">
            <a
              href={deckHref}
              download
              className="rounded-md border border-accent bg-accent px-3 py-1.5 text-[12.5px] font-medium text-white transition hover:opacity-90"
            >
              Download the deck (PPTX)
            </a>
            <PrintButton label="Print / Save as PDF" />
          </div>
        </div>

        {/* The bridge between the two parts (spec §0). */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <BridgeCard
            part="Part 1"
            title="What has been executed"
            body="Everything built and shipped since December 2025 — paid acquisition, the website, creative operations, the Marketing Operating System, Smile Club and the demand generation ramp. Live numbers, refreshed from the same pipeline management runs on."
          />
          <BridgeCard
            part="Part 2"
            title="The system it plugs into"
            body="The documented operating architecture for scaling from these first campaigns to a multi-clinic growth platform. The deck named the remaining gap as execution staffing and live dashboards — the dashboard layer is already live, and it is what Part 1 is served from."
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <RangeControl range={range} basePath={basePath} />
          {lastUpdated ? (
            <p className="tnum text-[11px] text-ink-faint">
              Last updated {format(parseISO(lastUpdated), 'd MMM yyyy, HH:mm')} · syncs every 15 minutes
            </p>
          ) : (
            <p className="text-[11px] text-ink-faint">Last updated — pending first sync</p>
          )}
        </div>
      </header>

      <div className="flex gap-8">
        <BoardNav />
        <div className="min-w-0 flex-1">
          <Part1Execution
            range={range}
            totals={totals}
            prior={prior}
            monthly={appendix}
            manual={manual}
            lastUpdated={lastUpdated}
            publicView={publicView}
          />
          <Part2OperatingSystem />

          <footer className="mt-10 flex flex-wrap justify-between gap-2 border-t border-line pt-4 text-[11px] text-ink-faint">
            <span>Dental Nation · Growth Report · Part 1 live · Part 2 from the July 2026 Growth Operating Report</span>
            <span>
              {range.label}
              {lastUpdated ? ` · data to ${format(parseISO(lastUpdated), 'd MMM yyyy')}` : ''}
            </span>
          </footer>
        </div>
      </div>
    </div>
  );
}

function BridgeCard({ part, title, body }: { part: string; title: string; body: string }) {
  return (
    <div className="print-avoid-break rounded-card border border-line border-l-[3px] border-l-accent bg-card px-4 py-3">
      <p className="eyebrow text-[9.5px] text-accent">{part}</p>
      <p className="mt-0.5 text-[13px] font-semibold text-ink">{title}</p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}
