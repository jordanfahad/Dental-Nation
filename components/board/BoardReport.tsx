import { format, parseISO } from 'date-fns';
import {
  getBoardCrm, getBoardDaily, getBoardMonthly, getLastIngestion, getManualMetrics, sumWindow, delta,
} from '@/lib/board/metrics';
import { resolveBoardRange } from '@/lib/board/range';
import { buildInsights } from '@/lib/board/insights';
import { dubaiToday } from '@/lib/dates';
import { Part1Execution } from './Part1Execution';
import { Part2OperatingSystem } from './Part2OperatingSystem';
import { BoardNavMobile, BoardNavRail } from './BoardNav';
import { RangeControl } from './RangeControl';
import { PrintButton } from './PrintButton';
import { Cover } from './Cover';
import { fmt } from './design';

/**
 * The board growth report — both parts, one document.
 *
 * 🔒 Everything read here comes from lib/board/metrics.ts, which touches only
 * the aggregate-only views. No patient-level table is reachable, which is what
 * makes this component safe to render on the public share route.
 *
 * `publicView` changes tone, not access: it hides internal asides. It never
 * unlocks additional data.
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
  const [daily, monthly, manual, lastUpdated, crm] = await Promise.all([
    getBoardDaily(),
    getBoardMonthly(),
    getManualMetrics(),
    getLastIngestion(),
    getBoardCrm(),
  ]);

  const today = dubaiToday();
  const dataFrom = daily[0]?.day ?? today;
  const dataTo = daily[daily.length - 1]?.day ?? today;
  const range = resolveBoardRange(searchParams, dataFrom, dataTo);

  const totals = sumWindow(daily, range.from, range.to);
  const prior =
    range.compareFrom && range.compareTo ? sumWindow(daily, range.compareFrom, range.compareTo) : null;

  // The appendix always shows the full history, not the selected window — it is
  // the audit trail behind the exhibits, and truncating it to the filter would
  // hide exactly the months a sceptical reader wants to check.
  const appendix = monthly.filter((m) => (m.spendTotal ?? m.apptsBooked ?? m.revenue) != null);
  // Return-on-investment claims are computed over the whole recorded history,
  // never the selected window — see the note in buildInsights.
  const allTime = sumWindow(daily, dataFrom, dataTo);
  const insights = buildInsights(totals, prior, appendix, range.label, allTime);

  const tone = (dv: number | null, invert = false): 'good' | 'stop' | 'flat' | undefined => {
    if (dv == null) return undefined;
    if (Math.round(dv * 100) === 0) return 'flat';
    return (invert ? dv < 0 : dv > 0) ? 'good' : 'stop';
  };
  const chip = (dv: number | null): string | undefined =>
    dv == null ? undefined : `${fmt.signedPct(dv)} ${range.compareLabel ? range.compareLabel.replace(/^vs\. /, 'vs ') : ''}`.trim();

  const dBooked = delta(totals.booked, prior?.booked ?? null);
  const dRevenue = delta(totals.revenue, prior?.revenue ?? null);
  const dCpb = delta(totals.costPerBooking, prior?.costPerBooking ?? null);

  return (
    <div className="report print-exact">
      {/* ── Cover ── */}
      <Cover
        headline={insights.coverHeadline}
        periodLabel="December 2025 – August 2026"
        windowLabel={range.label}
        compareLabel={range.compareLabel}
        lastUpdated={lastUpdated ? format(parseISO(lastUpdated), 'd MMM yyyy, HH:mm') : null}
        stats={[
          { label: 'Media investment', value: totals.spend != null ? fmt.aed(totals.spend) : null },
          { label: 'Appointments booked', value: totals.booked != null ? fmt.int(totals.booked) : null, delta: chip(dBooked), deltaTone: tone(dBooked) },
          { label: 'Billed revenue', value: totals.revenue != null ? fmt.aed(totals.revenue) : null, delta: chip(dRevenue), deltaTone: tone(dRevenue) },
          { label: 'Cost per booking', value: totals.costPerBooking != null ? fmt.aedExact(totals.costPerBooking) : null, delta: chip(dCpb), deltaTone: tone(dCpb, true) },
        ]}
      />

      {/* ── Controls ── */}
      <div className="no-print mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-line py-3">
        <RangeControl range={range} basePath={basePath} />
        <div className="flex shrink-0 flex-wrap items-center gap-2">
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

      {/* ── How to read this document ── */}
      <div className="mt-6 grid gap-4 border-b border-line pb-6 sm:grid-cols-2">
        <ReadingNote
          part="Part 1"
          title="What has been executed"
          body="Live measurement from the group's own pipeline: media investment, bookings, attendance and billed revenue since December 2025. Refreshed every fifteen minutes — the board sees what management sees."
        />
        <ReadingNote
          part="Part 2"
          title="The operating system it plugs into"
          body="The documented architecture for scaling from these campaigns to a multi-clinic platform: 13 demand lanes, the Growth Office, the conversion control room and the retention engine. Design targets, not measurements — and labelled as such throughout."
        />
      </div>

      <BoardNavMobile />

      <div className="flex gap-8">
        <BoardNavRail />
        <div className="min-w-0 flex-1">
          <Part1Execution
            range={range}
            totals={totals}
            prior={prior}
            monthly={appendix}
            manual={manual}
            insights={insights}
            crm={crm}
            lastUpdated={lastUpdated}
            publicView={publicView}
          />
          <Part2OperatingSystem />

          <footer className="mt-12 flex flex-wrap justify-between gap-2 border-t-2 border-ink pt-4 text-[10.5px] text-ink-faint">
            <span>
              Dental Nation · Growth Report · Part 1 live from the Lane E pipeline · Part 2 from the July 2026 Growth
              Operating Report
            </span>
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

function ReadingNote({ part, title, body }: { part: string; title: string; body: string }) {
  return (
    <div className="print-avoid-break">
      <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-accent">{part}</p>
      <p className="mt-1 text-[14px] font-semibold tracking-[-0.01em] text-ink">{title}</p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}
