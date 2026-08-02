import { COVER, EXEC_SUMMARY, SECTIONS, TIMELINE } from '@/config/growth-execution';
import type { BoardRange } from '@/lib/board/range';
import type { ManualMetric, MonthRow, WindowTotals } from '@/lib/board/metrics';
import { MANUAL_METRIC_KEYS } from '@/lib/board/metrics';
import { MetricCard, Pending, SectionHead, SlotText, TD, TDR, TH, THR, TableWrap } from './Primitives';

/**
 * PART 1 — Growth Execution Report (spec §5).
 *
 * Every number here is either live from the aggregate views or an explicit
 * "Data pending" card. There is no hardcoded figure in this file, which is the
 * rule that makes the report safe to hand to investors: it cannot silently go
 * stale, and it cannot show a number nobody measured.
 */

const aed = (n: number): string =>
  n >= 1_000_000 ? `AED ${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `AED ${(n / 1_000).toFixed(1)}K` : `AED ${Math.round(n)}`;
const aedFull = (n: number): string => `AED ${Math.round(n).toLocaleString('en-US')}`;
const int = (n: number): string => Math.round(n).toLocaleString('en-US');
const pct = (n: number): string => `${Math.round(n * 100)}%`;

export interface Part1Props {
  range: BoardRange;
  totals: WindowTotals;
  prior: WindowTotals | null;
  monthly: MonthRow[];
  manual: Map<string, ManualMetric>;
  lastUpdated: string | null;
  /** Set on the public board view — hides internal-only asides. */
  publicView?: boolean;
}

export function Part1Execution({ range, totals, prior, monthly, manual, publicView = false }: Part1Props) {
  const d = (cur: number | null, pri: number | null): number | null =>
    cur == null || pri == null || pri === 0 ? null : (cur - pri) / pri;

  const cmp = range.compareLabel ?? undefined;

  /** A manual metric card, or "Data pending" when nobody has entered it yet. */
  const manualCard = (key: string, label: string) => {
    const m = manual.get(key);
    const def = MANUAL_METRIC_KEYS.find((k) => k.key === key);
    const fmt = (v: number) =>
      def?.unit === 'aed' ? aed(v) : def?.unit === 'pct' ? `${Math.round(v)}%` : int(v);
    return (
      <MetricCard
        key={key}
        label={label}
        value={m?.value != null ? fmt(m.value) : null}
        source={m ? m.sourceNote : 'Awaiting entry'}
      />
    );
  };

  return (
    <section id="part-1" className="scroll-mt-24">
      {/* ── Cover ── */}
      <header className="border-b-2 border-accent pb-5">
        <p className="eyebrow text-accent">Part 1</p>
        <h2 className="mt-1 text-[22px] font-semibold tracking-tight text-ink sm:text-[26px]">
          Growth Execution Report
        </h2>
        <p className="mt-1 text-[12.5px] text-ink-soft">
          What has been built and shipped · {COVER.periodLabel}
        </p>
        <div className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-3">
          <Meta label="Prepared by">
            {COVER.preparedBy} · <SlotText slot={COVER.preparedByTitle} />
          </Meta>
          <Meta label="For">{COVER.preparedFor}</Meta>
          <Meta label="Metrics window">
            <span className="font-semibold text-ink">{range.label}</span>
            {cmp ? <span className="block text-[11px] text-ink-faint">{cmp}</span> : null}
          </Meta>
        </div>
      </header>

      {/* ── Executive summary ── */}
      <SectionHead id="s-summary" n="1.0" title="Executive summary" />
      <p className="max-w-[78ch] text-[13px] leading-relaxed text-ink-soft">{EXEC_SUMMARY}</p>

      {/* ── Hero stats ── */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          hero
          label="Ad spend"
          value={totals.spend != null ? aed(totals.spend) : null}
          delta={d(totals.spend, prior?.spend ?? null)}
          deltaLabel={cmp}
          polarity="neutral"
          source="Meta + Google Ads, in window"
        />
        <MetricCard
          hero
          label="Appointments booked"
          value={totals.booked != null ? int(totals.booked) : null}
          delta={d(totals.booked, prior?.booked ?? null)}
          deltaLabel={cmp}
          source="Practo — system of record"
        />
        <MetricCard
          hero
          label="Cost per booking"
          value={totals.costPerBooking != null ? aedFull(totals.costPerBooking) : null}
          delta={d(totals.costPerBooking, prior?.costPerBooking ?? null)}
          deltaLabel={cmp}
          polarity="down-good"
          source="Spend ÷ booked appointments"
        />
        <MetricCard
          hero
          label="Billed revenue"
          value={totals.revenue != null ? aed(totals.revenue) : null}
          delta={d(totals.revenue, prior?.revenue ?? null)}
          deltaLabel={cmp}
          source="Practo billing, in window"
        />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Patients who attended"
          value={totals.showed != null ? int(totals.showed) : null}
          delta={d(totals.showed, prior?.showed ?? null)}
          deltaLabel={cmp}
          source="Practo — arrived + completed"
        />
        <MetricCard
          label="Show-up rate"
          value={totals.showRate != null ? pct(totals.showRate) : null}
          delta={d(totals.showRate, prior?.showRate ?? null)}
          deltaLabel={cmp}
          source="Attended ÷ all resolved appointments"
        />
        <MetricCard
          label="Return on ad spend"
          value={totals.roas != null ? `${totals.roas.toFixed(1)}×` : null}
          delta={d(totals.roas, prior?.roas ?? null)}
          deltaLabel={cmp}
          source="Billed revenue ÷ ad spend"
        />
        <MetricCard
          label="Ad impressions"
          value={totals.impressions != null ? int(totals.impressions) : null}
          delta={d(totals.impressions, prior?.impressions ?? null)}
          deltaLabel={cmp}
          polarity="neutral"
          source="Meta + Google Ads reach"
        />
      </div>
      <p className="mt-2.5 text-[11px] leading-relaxed text-ink-faint">
        Revenue and attendance are measured from the Practo practice-management feed, which became complete on
        21 April 2026. Windows that start earlier show spend and reach for the full period but revenue only from that
        date — the report never back-fills a number it did not measure.
      </p>

      {/* ── Timeline ── */}
      <SectionHead id="s-timeline" n="1.1" title="Growth timeline" note="Dec 2025 → today" />
      <ol className="space-y-0">
        {TIMELINE.map((t, i) => (
          <li key={`${t.period}-${i}`} className="print-avoid-break flex gap-2.5 sm:gap-4">
            <div className="flex w-[74px] shrink-0 flex-col items-end pt-[2px] sm:w-[118px]">
              <span className="text-right text-[11px] font-semibold leading-snug text-accent">{t.period}</span>
            </div>
            <div className="relative flex flex-col items-center">
              <span
                className={`mt-[6px] h-[9px] w-[9px] shrink-0 rounded-full border-2 ${
                  t.evidenced ? 'border-accent bg-accent' : 'border-line bg-card'
                }`}
              />
              {i < TIMELINE.length - 1 ? <span className="w-px flex-1 bg-line" /> : null}
            </div>
            {/* min-w-0: without it this flex child refuses to shrink below its
                text width and the whole board report scrolls sideways on a
                phone — which is exactly where it gets opened. */}
            <div className="min-w-0 flex-1 pb-4">
              <p className="text-[12.5px] leading-snug text-ink">{t.milestone}</p>
              {t.evidence ? (
                <p className="mt-0.5 text-[10.5px] leading-snug text-ink-faint">✓ {t.evidence}</p>
              ) : null}
              {t.pending ? (
                <p className="mt-1">
                  <Pending>Exact month to confirm</Pending>
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-1 text-[10.5px] leading-snug text-ink-faint">
        Filled markers are corroborated by the dashboard&apos;s own ingested records — those dates are evidence, not
        recollection. Hollow markers await confirmation.
      </p>

      {/* ── 1.2 Acquisition ── */}
      <SectionHead id="s-acq" n="1.2" title="Acquisition engine" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <p className="text-[12.5px] leading-relaxed text-ink-soft">
            The first paid campaign launched in the December 2025 window and scaled hard through Q1 2026. In April the
            channel mix was consolidated: Meta was paused and budget moved behind Google Search, which has run
            continuously since. Spend per month has been deliberately steady since May while the conversion side of
            the funnel was built out — the discipline Part 2 calls decision rule #1, fix conversion leakage before
            scaling spend.
          </p>
          <p className="text-[12.5px] leading-relaxed text-ink-soft">
            Clinic-level campaigns run for <SlotText slot={SECTIONS.acquisition.clinicName} />, with a practitioner
            brand campaign for <SlotText slot={SECTIONS.acquisition.practitioner} />.
          </p>
          <div className="rounded-card border border-line border-l-[3px] border-l-accent bg-card px-4 py-3">
            <p className="eyebrow mb-1">Partner governance</p>
            <p className="text-[12px] leading-relaxed text-ink-soft">{SECTIONS.acquisition.partnerGovernance}</p>
            {!publicView ? (
              <p className="no-print mt-2 text-[11px] italic leading-snug text-watch">
                Note for Fahad: {SECTIONS.acquisition.partnerNote}
              </p>
            ) : null}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard
            label="Meta spend (to pause)"
            value={totals.spend != null ? metaSpendLabel(monthly) : null}
            source="Meta Ads — paused 27 Apr 2026"
          />
          <MetricCard
            label="Google Ads spend"
            value={googleSpend(monthly) != null ? aed(googleSpend(monthly)!) : null}
            source="Google Ads — continuous"
          />
          <MetricCard
            label="Ad clicks"
            value={totals.clicks != null ? int(totals.clicks) : null}
            delta={d(totals.clicks, prior?.clicks ?? null)}
            deltaLabel={cmp}
            polarity="neutral"
            source="Meta + Google Ads, in window"
          />
          <MetricCard
            label="No-shows"
            value={totals.noshow != null ? int(totals.noshow) : null}
            delta={d(totals.noshow, prior?.noshow ?? null)}
            deltaLabel={cmp}
            polarity="down-good"
            source="Practo — the leakage to close"
          />
        </div>
      </div>

      {/* ── 1.3 Website ── */}
      <SectionHead id="s-web" n="1.3" title="dentalnation.com" />
      <p className="text-[12.5px] leading-relaxed text-ink-soft">
        {SECTIONS.website.body} Built with <SlotText slot={SECTIONS.website.vendor} />.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {manualCard('gsc_indexed_pages', 'Pages indexed')}
        {manualCard('gsc_impressions', 'Search impressions')}
        {manualCard('gsc_clicks', 'Search clicks')}
      </div>
      <p className="mt-3 text-[12.5px] leading-relaxed text-ink-soft">{SECTIONS.website.organicPoint}</p>

      {/* ── 1.4 Creative ── */}
      <SectionHead id="s-creative" n="1.4" title="Creative engine" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Phase n="Phase 1" title="Agency" body={SECTIONS.creative.phase1} />
        <Phase n="Phase 2" title="In-house" body={SECTIONS.creative.phase2} />
      </div>
      <p className="mt-3 text-[12.5px] text-ink-soft">
        In-house creative: <SlotText slot={SECTIONS.creative.name} />
      </p>
      <p className="mt-1.5 text-[12.5px] text-ink-soft">
        <SlotText slot={SECTIONS.creative.costDelta} />
      </p>

      {/* ── 1.5 Marketing OS ── */}
      <SectionHead id="s-mos" n="1.5" title="Marketing Operating System" note="proprietary" />
      <p className="mb-3 text-[12.5px] leading-relaxed text-ink-soft">{SECTIONS.marketingOs.intro}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Capability title="Daily control dashboard" body={SECTIONS.marketingOs.dashboard} live />
        <Capability title="WhatsApp layer" body={SECTIONS.marketingOs.whatsapp} live />
        <Capability title="Patient management" body={SECTIONS.marketingOs.patients} live />
        <Capability title="Voice agent" body={SECTIONS.marketingOs.voice} />
      </div>
      <p className="mt-2 text-[12.5px] text-ink-soft">
        Voice agent use case: <SlotText slot={SECTIONS.marketingOs.voiceUseCase} />
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {manualCard('whatsapp_messages', 'WhatsApp messages sent')}
        {manualCard('whatsapp_response_rate', 'WhatsApp response rate')}
        {manualCard('whatsapp_bookings', 'Bookings via WhatsApp')}
      </div>
      <p className="mt-3 rounded-card border border-accent/25 bg-accent-50 px-4 py-3 text-[12.5px] font-medium leading-relaxed text-ink">
        {SECTIONS.marketingOs.selfReference}
      </p>

      {/* ── 1.6 Smile Club ── */}
      <SectionHead id="s-smile" n="1.6" title="Smile Club" />
      <p className="text-[12.5px] leading-relaxed text-ink-soft">{SECTIONS.smileClub.body}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {manualCard('smile_club_members', 'Members')}
        {manualCard('smile_club_revenue', 'Membership revenue')}
      </div>
      <p className="mt-3 text-[12.5px] leading-relaxed text-ink-soft">{SECTIONS.smileClub.strategic}</p>

      {/* ── 1.7 Demand generation ── */}
      <SectionHead id="s-demand" n="1.7" title="Demand generation ramp" />
      <p className="text-[12.5px] leading-relaxed text-ink-soft">
        Owner: <SlotText slot={SECTIONS.demandGen.owner} />
      </p>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
        Focus: <SlotText slot={SECTIONS.demandGen.focus} />
      </p>

      {/* ── 1.8 Continuity & next 90 days ── */}
      <SectionHead id="s-next" n="1.8" title="Continuity & the next 90 days" />
      <p className="print-avoid-break rounded-card border border-line border-l-[3px] border-l-accent bg-card px-4 py-3 text-[12.5px] leading-relaxed text-ink-soft">
        {SECTIONS.continuity.line}
      </p>
      <ul className="mt-3 space-y-1.5">
        {SECTIONS.continuity.next90.map((n) => (
          <li key={n.text} className="flex gap-2 text-[12.5px] leading-relaxed text-ink-soft">
            <span aria-hidden className="mt-[7px] h-[3px] w-[3px] shrink-0 rounded-full bg-accent-400" />
            {n.pending ? <Pending>{n.text}</Pending> : n.text}
          </li>
        ))}
      </ul>

      {/* ── 1.9 KPI appendix ── */}
      <SectionHead id="s-appendix" n="1.9" title="KPI appendix" note="month by month, Dec 2025 → today" />
      <TableWrap>
        <table className="w-full min-w-[700px] border-collapse">
          <thead>
            <tr className="border-b border-accent">
              <th className={TH}>Month</th>
              <th className={THR}>Spend</th>
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
                  <Cell v={m.spendTotal} fmt={aedFull} />
                  <Cell v={m.impressions} fmt={int} />
                  <Cell v={m.apptsBooked} fmt={int} bold />
                  <Cell v={m.apptsShowed} fmt={int} />
                  <Cell v={m.apptsNoshow} fmt={int} />
                  <Cell v={cpb} fmt={aedFull} />
                  <Cell v={m.revenue} fmt={aedFull} bold />
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableWrap>
      <p className="mt-2 text-[10.5px] leading-relaxed text-ink-faint">
        An em-dash means no source reported that metric in that month — not a zero result. Practo billing and
        attendance begin 21 April 2026; Meta spend ends 27 April 2026.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {manualCard('creative_monthly_output', 'Creative output / month')}
      </div>
    </section>
  );
}

function Cell({ v, fmt, bold }: { v: number | null; fmt: (n: number) => string; bold?: boolean }) {
  return (
    <td className={`${TDR} ${bold ? 'font-semibold' : ''}`}>
      {v == null ? <span className="text-ink-ghost">—</span> : fmt(v)}
    </td>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow text-[10px]">{label}</p>
      <p className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">{children}</p>
    </div>
  );
}

function Phase({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="print-avoid-break rounded-card border border-line bg-card px-4 py-3">
      <p className="eyebrow text-[9.5px] text-accent">{n}</p>
      <p className="mt-0.5 text-[12.5px] font-semibold text-ink">{title}</p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

function Capability({ title, body, live }: { title: string; body: string; live?: boolean }) {
  return (
    <div className="print-avoid-break rounded-card border border-line bg-card px-4 py-3">
      <p className="flex items-center gap-2 text-[12.5px] font-semibold text-ink">
        {title}
        {live ? (
          <span className="rounded border border-good/40 bg-good-50 px-1.5 py-[1px] text-[9.5px] font-semibold uppercase tracking-wide text-good">
            Live
          </span>
        ) : (
          <span className="rounded border border-watch/40 bg-watch-50 px-1.5 py-[1px] text-[9.5px] font-semibold uppercase tracking-wide text-watch">
            R&amp;D
          </span>
        )}
      </p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

/** Total Meta spend across all recorded months (it stopped in April). */
function metaSpendLabel(monthly: MonthRow[]): string | null {
  const rows = monthly.filter((m) => m.spendMeta != null);
  if (rows.length === 0) return null;
  const total = rows.reduce((a, m) => a + (m.spendMeta ?? 0), 0);
  return aed(total);
}

function googleSpend(monthly: MonthRow[]): number | null {
  const rows = monthly.filter((m) => m.spendGoogle != null);
  if (rows.length === 0) return null;
  return rows.reduce((a, m) => a + (m.spendGoogle ?? 0), 0);
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[Number(m) - 1]} ${y}`;
}
