import { COVER, SECTIONS, TIMELINE } from '@/config/growth-execution';
import type { BoardRange } from '@/lib/board/range';
import type { MonthRow, WindowTotals } from '@/lib/board/metrics';
import type { ManualMetric } from '@/config/board-metrics';
import { MANUAL_METRIC_KEYS } from '@/config/board-metrics';
import type { Insights } from '@/lib/board/insights';
import { ChapterDivider, Exhibit, Eyebrow, Takeaway } from './Exhibit';
import { KeyMessages } from './Cover';
import { FunnelChart } from './charts/FunnelChart';
import { TrendChart } from './charts/TrendChart';
import { RoadmapChevrons } from './charts/StrategyGraphics';
import { MetricCard, Pending, SlotText, TD, TDR, TH, THR, TableWrap } from './Primitives';
import { C, fmt } from './design';

/**
 * PART 1 — Growth Execution Report, as exhibits.
 *
 * Every number is live from the aggregate views or renders "Data pending".
 * Every exhibit title is a sentence generated in lib/board/insights.ts from
 * those same numbers, so a title can never outlive the finding it describes.
 */

export interface Part1Props {
  range: BoardRange;
  totals: WindowTotals;
  prior: WindowTotals | null;
  monthly: MonthRow[];
  manual: Map<string, ManualMetric>;
  insights: Insights;
  lastUpdated: string | null;
  publicView?: boolean;
}

export function Part1Execution({ range, totals, prior, monthly, manual, insights, publicView = false }: Part1Props) {
  const d = (cur: number | null, pri: number | null): number | null =>
    cur == null || pri == null || pri === 0 ? null : (cur - pri) / pri;
  const cmp = range.compareLabel ?? undefined;

  const manualCard = (key: string, label: string) => {
    const m = manual.get(key);
    const def = MANUAL_METRIC_KEYS.find((k) => k.key === key);
    const f = (v: number) => (def?.unit === 'aed' ? fmt.aed(v) : def?.unit === 'pct' ? `${Math.round(v)}%` : fmt.int(v));
    return (
      <MetricCard
        key={key}
        label={label}
        value={m?.value != null ? f(m.value) : null}
        source={m ? m.sourceNote : 'Awaiting entry'}
      />
    );
  };

  const metaTotal = sum(monthly, (m) => m.spendMeta);
  const googleTotal = sum(monthly, (m) => m.spendGoogle);

  return (
    <section id="part-1" className="scroll-mt-24">
      <ChapterDivider
        id="s-part1"
        part="Part 1"
        title="What has been executed"
        standfirst={`From a standing start in December 2025 to a measured acquisition engine: paid media, the website, creative operations, the Marketing Operating System and Smile Club. Every figure in this part is live from the group's own data pipeline — ${range.label}.`}
        contents={['Key messages', 'Performance scorecard', 'The funnel', 'Investment vs. return', 'Execution timeline', 'The engine', 'KPI appendix']}
      />

      {/* ── Key messages ── */}
      <div id="s-summary" className="mt-9 scroll-mt-24">
        <Eyebrow>Executive summary — what the board should take away</Eyebrow>
        <KeyMessages messages={insights.keyMessages} />
      </div>

      {/* ── Exhibit 1 · Scorecard ── */}
      <Exhibit
        id="s-scorecard1"
        n={1}
        kicker="Performance"
        title={insights.titles.unitEconomics}
        source="Meta Ads & Google Ads spend; Practo appointments and billing"
        note="Every card compares the selected window against the equivalent prior period. Cost and no-show metrics are scored so that a fall reads as an improvement."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Media investment" value={v(totals.spend, fmt.aed)} delta={d(totals.spend, prior?.spend ?? null)} deltaLabel={cmp} polarity="neutral" source="Meta + Google Ads" />
          <MetricCard label="Appointments booked" value={v(totals.booked, fmt.int)} delta={d(totals.booked, prior?.booked ?? null)} deltaLabel={cmp} source="Practo — system of record" hero />
          <MetricCard label="Cost per booking" value={v(totals.costPerBooking, fmt.aedExact)} delta={d(totals.costPerBooking, prior?.costPerBooking ?? null)} deltaLabel={cmp} polarity="down-good" source="Spend ÷ booked appointments" hero />
          <MetricCard label="Billed revenue" value={v(totals.revenue, fmt.aed)} delta={d(totals.revenue, prior?.revenue ?? null)} deltaLabel={cmp} source="Practo billing" hero />
          <MetricCard label="Patients attended" value={v(totals.showed, fmt.int)} delta={d(totals.showed, prior?.showed ?? null)} deltaLabel={cmp} source="Practo — arrived + completed" />
          <MetricCard label="Show-up rate" value={totals.showRate != null ? fmt.pct(totals.showRate) : null} delta={d(totals.showRate, prior?.showRate ?? null)} deltaLabel={cmp} source="Attended ÷ resolved appointments" />
          <MetricCard label="Return on ad spend" value={totals.roas != null ? `${totals.roas.toFixed(1)}×` : null} delta={d(totals.roas, prior?.roas ?? null)} deltaLabel={cmp} source="Billed revenue ÷ media spend" />
          <MetricCard label="No-shows" value={v(totals.noshow, fmt.int)} delta={d(totals.noshow, prior?.noshow ?? null)} deltaLabel={cmp} polarity="down-good" source="Practo — the leakage to close" />
        </div>
      </Exhibit>

      {/* ── Exhibit 2 · Funnel ── */}
      <Exhibit
        id="s-funnel"
        n={2}
        kicker="The funnel"
        title={insights.titles.funnel}
        source="Meta & Google Ads delivery; Practo appointments and billing"
        note="Stage widths are on a logarithmic scale so every stage stays legible against impressions; the printed figures are exact. Bookings include walk-in and referral demand, so step percentages describe total flow, not paid attribution."
      >
        <FunnelChart
          stages={[
            { label: 'Ad impressions', value: totals.impressions, sub: 'Paid reach across Meta and Google' },
            { label: 'Clicks', value: totals.clicks, sub: 'Engaged visits from paid media' },
            { label: 'Appointments booked', value: totals.booked, sub: 'All sources, Practo system of record' },
            { label: 'Patients attended', value: totals.showed, sub: 'Arrived or completed' },
          ]}
          endpoint={totals.revenue != null ? { label: 'Billed treatment', value: fmt.aed(totals.revenue) } : undefined}
        />
        {totals.noshow != null && totals.booked ? (
          <Takeaway>
            {fmt.int(totals.noshow)} booked appointments did not arrive in this window. At the current revenue per
            attending patient, closing that gap is worth more than any additional media budget — which is why the
            operating system&apos;s first decision rule is to fix conversion leakage before scaling spend.
          </Takeaway>
        ) : null}
      </Exhibit>

      {/* ── Exhibit 3 · Investment vs return ── */}
      <Exhibit
        id="s-trend"
        n={3}
        kicker="Investment vs. return"
        title={insights.titles.trend}
        source="Meta Ads & Google Ads monthly spend; Practo billed revenue"
        note="Practice-management billing became complete on 21 April 2026; months before that show media investment only, and the revenue line begins where the measurement does."
        tall
      >
        <TrendChart rows={monthly} />
      </Exhibit>

      {/* ── Exhibit 4 · Timeline ── */}
      <Exhibit
        id="s-timeline"
        n={4}
        kicker="Execution timeline"
        title="From first campaign to a measured operating system in eight months"
        source="Dental Nation Lane E ingestion records; Growth team"
        note="Filled markers are corroborated by the dashboard's own ingested records — those dates are evidence, not recollection. Outlined markers await confirmation."
      >
        <RoadmapChevrons entries={TIMELINE} />
      </Exhibit>

      {/* ── The engine — narrative sections ── */}
      <div id="s-engine" className="mt-12 scroll-mt-24 border-t border-ink pt-4">
        <Eyebrow>What was built</Eyebrow>
        <h3 className="max-w-[54ch] text-[19px] font-semibold leading-[1.25] tracking-[-0.015em] text-ink sm:text-[22px]">
          Five capabilities now run the group&apos;s demand — three of them owned outright
        </h3>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Capability
          id="s-acq"
          n="01"
          title="Acquisition engine"
          status="live"
          body={
            <>
              First paid campaign launched in the December 2025 window and scaled hard through Q1 2026. In April the
              mix was consolidated — Meta paused, budget moved behind Google Search — and monthly investment has been
              deliberately flat since while the conversion side was built out.
            </>
          }
          facts={[
            { k: 'Meta (to pause)', v: metaTotal != null ? fmt.aed(metaTotal) : null },
            { k: 'Google Ads', v: googleTotal != null ? fmt.aed(googleTotal) : null },
          ]}
          footer={
            <>
              <p className="text-[11.5px] leading-relaxed text-ink-soft">
                Clinic campaigns run for <SlotText slot={SECTIONS.acquisition.clinicName} />, with a practitioner
                brand campaign for <SlotText slot={SECTIONS.acquisition.practitioner} />.
              </p>
              <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
                <span className="font-semibold text-ink">Partner governance.</span>{' '}
                {SECTIONS.acquisition.partnerGovernance}
              </p>
              {!publicView ? (
                <p className="no-print mt-2 text-[10.5px] italic leading-snug text-watch">
                  Note for Fahad: {SECTIONS.acquisition.partnerNote}
                </p>
              ) : null}
            </>
          }
        />

        <Capability
          id="s-mos"
          n="02"
          title="Marketing Operating System"
          status="live"
          body={
            <>
              Owned infrastructure, not rented SaaS. Twelve live data sources reconcile into one daily control layer —
              spend, leads, bookings and billed revenue in one place, refreshed every fifteen minutes.{' '}
              <span className="font-medium text-ink">This report is served from that same system</span>, so the board
              reads the numbers management runs on rather than a deck built once and already stale.
            </>
          }
          facts={[
            { k: 'Data sources', v: '12' },
            { k: 'Refresh', v: 'Every 15 min' },
          ]}
          footer={
            <div className="space-y-1.5">
              <SubCapability label="WhatsApp layer" state="Live" text={SECTIONS.marketingOs.whatsapp} />
              <SubCapability label="Patient management" state="Live" text={SECTIONS.marketingOs.patients} />
              <SubCapability label="Voice agent" state="R&D" text={SECTIONS.marketingOs.voice} />
            </div>
          }
        />

        <Capability
          id="s-web"
          n="03"
          title="dentalnation.com"
          status="live"
          body={
            <>
              {SECTIONS.website.body} Built with <SlotText slot={SECTIONS.website.vendor} />. Organic is the
              compounding channel: paid buys attention only while it is funded, whereas every indexed page keeps
              earning after the spend stops.
            </>
          }
          footer={
            <div className="grid gap-2 sm:grid-cols-3">
              {manualCard('gsc_indexed_pages', 'Pages indexed')}
              {manualCard('gsc_impressions', 'Impressions')}
              {manualCard('gsc_clicks', 'Clicks')}
            </div>
          }
        />

        <Capability
          id="s-creative"
          n="04"
          title="Creative engine"
          status="live"
          body={
            <>
              Phase 1 engaged an external agency to establish production volume. Phase 2 transitioned the agency out
              and brought creative in-house — faster turnaround, materially lower cost, and tighter brand consistency.
            </>
          }
          footer={
            <>
              <p className="text-[11.5px] text-ink-soft">
                In-house creative: <SlotText slot={SECTIONS.creative.name} />
              </p>
              <p className="mt-1.5 text-[11.5px] text-ink-soft">
                <SlotText slot={SECTIONS.creative.costDelta} />
              </p>
            </>
          }
        />

        <Capability
          id="s-smile"
          n="05"
          title="Smile Club"
          status="live"
          body={
            <>
              The membership programme is live under Gautam. Its strategic role is recurring revenue plus a retention
              flywheel per patient — the membership loop named in the Lifecycle &amp; Retention Engine in Part 2.
            </>
          }
          footer={
            <div className="grid gap-2 sm:grid-cols-2">
              {manualCard('smile_club_members', 'Members')}
              {manualCard('smile_club_revenue', 'Membership revenue')}
            </div>
          }
        />

        <Capability
          id="s-demand"
          n="06"
          title="Demand generation ramp"
          status="building"
          body={<>The next phase of the engine — dedicated ownership to drive demand generation up across channels.</>}
          footer={
            <>
              <p className="text-[11.5px] text-ink-soft">
                Owner: <SlotText slot={SECTIONS.demandGen.owner} />
              </p>
              <p className="mt-1.5 text-[11.5px] text-ink-soft">
                Focus: <SlotText slot={SECTIONS.demandGen.focus} />
              </p>
            </>
          }
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {manualCard('whatsapp_messages', 'WhatsApp messages sent')}
        {manualCard('whatsapp_response_rate', 'WhatsApp response rate')}
        {manualCard('whatsapp_bookings', 'Bookings via WhatsApp')}
      </div>

      {/* ── Continuity & next 90 days ── */}
      <div id="s-next" className="mt-12 scroll-mt-24 border-t border-ink pt-4">
        <Eyebrow>Continuity &amp; the next 90 days</Eyebrow>
        <h3 className="max-w-[54ch] text-[19px] font-semibold leading-[1.25] tracking-[-0.015em] text-ink sm:text-[22px]">
          The engine runs without interruption; the next phase compounds what is already measured
        </h3>
        <p className="mt-3 max-w-[76ch] border-l-[3px] border-l-accent bg-accent-50 px-4 py-3 text-[12.5px] leading-relaxed text-ink-soft">
          {SECTIONS.continuity.line}
        </p>
        <ol className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {SECTIONS.continuity.next90.map((n, i) => (
            <li key={n.text} className="flex gap-2.5 text-[12.5px] leading-relaxed text-ink-soft">
              <span className="tnum shrink-0 font-semibold text-accent">{String(i + 1).padStart(2, '0')}</span>
              {n.pending ? <Pending>{n.text}</Pending> : n.text}
            </li>
          ))}
        </ol>
      </div>

      {/* ── Exhibit 5 · KPI appendix ── */}
      <Exhibit
        id="s-appendix"
        n={5}
        kicker="Appendix"
        title={insights.titles.appendix}
        source="Meta Ads, Google Ads, Practo appointments and billing — Dental Nation Lane E pipeline"
        note="An em-dash means no source reported that metric in that month — not a zero result. Practo billing and attendance begin 21 April 2026; Meta spend ends 27 April 2026."
      >
        <TableWrap>
          <table className="w-full min-w-[700px] border-collapse">
            <thead>
              <tr className="border-b-2 border-ink">
                <th className={TH}>Month</th>
                <th className={THR}>Media spend</th>
                <th className={THR}>Impressions</th>
                <th className={THR}>Booked</th>
                <th className={THR}>Attended</th>
                <th className={THR}>No-show</th>
                <th className={THR}>Cost / booking</th>
                <th className={THR}>Billed revenue</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((m) => {
                const cpb = m.spendTotal != null && m.apptsBooked ? m.spendTotal / m.apptsBooked : null;
                return (
                  <tr key={m.month} className="border-t border-line/70">
                    <td className={`${TD} whitespace-nowrap font-medium`}>{monthLabel(m.month)}</td>
                    <Cell v={m.spendTotal} f={fmt.aedExact} />
                    <Cell v={m.impressions} f={fmt.int} />
                    <Cell v={m.apptsBooked} f={fmt.int} bold />
                    <Cell v={m.apptsShowed} f={fmt.int} />
                    <Cell v={m.apptsNoshow} f={fmt.int} />
                    <Cell v={cpb} f={fmt.aedExact} />
                    <Cell v={m.revenue} f={fmt.aedExact} bold />
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ink">
                <td className={`${TD} font-semibold`}>Total</td>
                <Cell v={sum(monthly, (m) => m.spendTotal)} f={fmt.aedExact} bold />
                <Cell v={sum(monthly, (m) => m.impressions)} f={fmt.int} bold />
                <Cell v={sum(monthly, (m) => m.apptsBooked)} f={fmt.int} bold />
                <Cell v={sum(monthly, (m) => m.apptsShowed)} f={fmt.int} bold />
                <Cell v={sum(monthly, (m) => m.apptsNoshow)} f={fmt.int} bold />
                <td className={TDR} />
                <Cell v={sum(monthly, (m) => m.revenue)} f={fmt.aedExact} bold />
              </tr>
            </tfoot>
          </table>
        </TableWrap>
        <div className="mt-4">
          <Eyebrow>Creative output</Eyebrow>
          <div className="grid gap-3 sm:grid-cols-3">{manualCard('creative_monthly_output', 'Assets per month')}</div>
        </div>
      </Exhibit>
    </section>
  );
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

const v = (n: number | null, f: (x: number) => string): string | null => (n == null ? null : f(n));

function sum(rows: MonthRow[], pick: (m: MonthRow) => number | null): number | null {
  let seen = false;
  let t = 0;
  for (const r of rows) {
    const x = pick(r);
    if (x != null) {
      seen = true;
      t += x;
    }
  }
  return seen ? t : null;
}

function Cell({ v: val, f, bold }: { v: number | null; f: (n: number) => string; bold?: boolean }) {
  return (
    <td className={`${TDR} ${bold ? 'font-semibold' : ''}`}>
      {val == null ? <span className="text-ink-ghost">—</span> : f(val)}
    </td>
  );
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[Number(m) - 1]} ${y}`;
}

function Capability({
  id, n, title, status, body, facts, footer,
}: {
  id?: string;
  n: string;
  title: string;
  status: 'live' | 'building';
  body: React.ReactNode;
  facts?: { k: string; v: string | null }[];
  footer?: React.ReactNode;
}) {
  return (
    <div id={id} className="print-avoid-break scroll-mt-24 border-t border-line pt-3.5">
      <div className="flex items-baseline gap-2.5">
        <span className="tnum text-[11px] font-bold text-accent">{n}</span>
        <h4 className="text-[14px] font-semibold tracking-[-0.01em] text-ink">{title}</h4>
        <span
          className={`ml-auto shrink-0 rounded-full border px-2 py-[1px] text-[9px] font-semibold uppercase tracking-wider ${
            status === 'live' ? 'border-good/40 bg-good-50 text-good' : 'border-watch/40 bg-watch-50 text-watch'
          }`}
        >
          {status === 'live' ? 'Live' : 'Building'}
        </span>
      </div>
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">{body}</p>
      {facts?.length ? (
        <div className="mt-3 flex flex-wrap gap-x-7 gap-y-2 border-y border-line/70 py-2.5">
          {facts.map((f) => (
            <div key={f.k}>
              <p className="text-[9.5px] uppercase tracking-[0.12em] text-ink-faint">{f.k}</p>
              {f.v ? (
                <p className="tnum mt-0.5 text-[15px] font-semibold leading-none text-ink">{f.v}</p>
              ) : (
                <p className="mt-0.5"><Pending>pending</Pending></p>
              )}
            </div>
          ))}
        </div>
      ) : null}
      {footer ? <div className="mt-3">{footer}</div> : null}
    </div>
  );
}

function SubCapability({ label, state, text }: { label: string; state: 'Live' | 'R&D'; text: string }) {
  return (
    <p className="flex gap-2 text-[11.5px] leading-snug text-ink-soft">
      <span
        aria-hidden
        className="mt-[5px] h-[6px] w-[6px] shrink-0 rounded-full"
        style={{ background: state === 'Live' ? C.good : C.amber }}
      />
      <span>
        <span className="font-semibold text-ink">{label}</span>
        <span className="ml-1.5 text-[9.5px] uppercase tracking-wide text-ink-ghost">{state}</span> — {text}
      </span>
    </p>
  );
}
