import {
  AT_A_GLANCE, CADENCE, CHANNEL_MAP, CHAPTERS, CLOSING, CONVERSION_TARGETS, DEMAND_ENGINE,
  FUNDING_COMMANDS, FUNNEL_STAGES, GROUP_STRUCTURE, GROWTH_OFFICE, LANES, LANES_RULE,
  LANES_SOURCE, OPEN_WORK, OPERATING_MODEL, OWN_LANES, OWN_LANES_SOURCE, PORTFOLIO_REST,
  PPP, RETENTION, REVOPS, SCORECARD, TARGETS_SOURCE,
} from '@/config/growth-os';
import { LaneTamChart, TargetVsMarketChart } from './Charts';
import { DemandFlywheel, LanePortfolioMatrix } from './charts/StrategyGraphics';
import { ChapterDivider, Exhibit, Takeaway } from './Exhibit';
import { SectionHead, SourceCaption, TD, TDR, TH, THR, TableWrap } from './Primitives';

/**
 * PART 2 — The Growth Operating System (spec §6).
 *
 * Static strategy content from the July 2026 deck. Nothing here is a live
 * measurement, and the section intro says so explicitly: the board must never
 * read a design target as a reported result. Part 1 carries the live numbers.
 */
export function Part2OperatingSystem() {
  return (
    <section id="part-2" className="scroll-mt-24">
      <ChapterDivider
        id="s-part2"
        breakBefore
        part="Part 2"
        title="The operating system it plugs into"
        standfirst="The documented architecture for scaling from these first campaigns to a multi-clinic growth platform: thirteen demand lanes, the Growth Office, the conversion control room, clinic chapters and the retention engine. Every figure in this part is a design target or market estimate from the July 2026 Growth Operating Report — not a measured result. Part 1 is where the live numbers are."
        contents={['Portfolio', 'Operating model', 'Growth Office', 'Demand engine', 'Targets', 'Control room', 'Structure', 'Cadence']}
      />

      {/* 2.1 At a glance */}
      <SectionHead id="s-glance" n="2.1" title="At a glance" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {AT_A_GLANCE.map((g) => (
          <div key={g.label} className="print-avoid-break rounded-card border border-line bg-card px-4 py-3.5">
            <p className="text-[26px] font-semibold leading-none tracking-tight text-accent">{g.value}</p>
            <p className="mt-1.5 text-[12px] font-medium text-ink">{g.label}</p>
            <p className="mt-1 text-[10.5px] leading-snug text-ink-faint">{g.sub}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 border-l-2 border-accent/40 pl-3 text-[12.5px] leading-relaxed text-ink-soft">
        Everything below exists as a documented system in the workspace. The remaining gap is execution staffing and
        live dashboards — and the dashboard layer is already live (Part 1, Section 4).
      </p>

      {/* 2.2 Operating model */}
      <SectionHead id="s-model" n="2.2" title="The operating model" />
      <div className="print-avoid-break mb-4 rounded-card border border-line bg-panel/50 px-4 py-3">
        <p className="eyebrow mb-2">The funnel</p>
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
          {FUNNEL_STAGES.map((s, i) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className="rounded border border-line bg-card px-2 py-[3px] text-[11px] font-medium text-ink">
                {s}
              </span>
              {i < FUNNEL_STAGES.length - 1 ? (
                <span aria-hidden className="text-[10px] text-ink-ghost">→</span>
              ) : null}
            </span>
          ))}
        </div>
      </div>
      <TableWrap>
        <table className="w-full min-w-[560px] border-collapse">
          <thead>
            <tr className="border-b border-accent">
              <th className={TH}>Layer</th>
              <th className={TH}>Owner</th>
              <th className={TH}>Purpose</th>
            </tr>
          </thead>
          <tbody>
            {OPERATING_MODEL.rows.map((r) => (
              <tr key={r.layer} className="border-t border-line/70 align-top">
                <td className={`${TD} font-semibold`}>{r.layer}</td>
                <td className={`${TD} text-ink-soft`}>{r.owner}</td>
                <td className={`${TD} text-ink-soft`}>{r.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
      <SourceCaption>{OPERATING_MODEL.source}</SourceCaption>

      {/* 2.3 Growth Office */}
      <SectionHead id="s-office" n="2.3" title="The Growth Office" note="eight functions, one mandate" />
      <div className="grid gap-3 sm:grid-cols-2">
        {GROWTH_OFFICE.functions.map((f) => (
          <div key={f.n} className="print-avoid-break flex gap-3 rounded-card border border-line bg-card px-3.5 py-3">
            <span className="tnum mt-[1px] text-[11px] font-bold text-accent">{String(f.n).padStart(2, '0')}</span>
            <div>
              <p className="text-[12.5px] font-semibold text-ink">{f.name}</p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-ink-soft">{f.detail}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-ink-soft">
        <span className="font-semibold text-ink">V1 team (immediate):</span> {GROWTH_OFFICE.team}.
      </p>
      <SourceCaption>{GROWTH_OFFICE.source}</SourceCaption>

      {/* 2.4 Demand engine */}
      <Exhibit
        id="s-engine"
        n={6}
        kicker="Demand engine"
        title="Five layers that feed each other — the fifth layer optimises the first, which is what makes it a flywheel rather than a funnel"
        source="Demand Generation Engine (Notion, Growth OS reference library)"
      >
        <DemandFlywheel />
      </Exhibit>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {DEMAND_ENGINE.phases.map((p) => (
          <div key={p.name} className="print-avoid-break rounded-card border border-line border-l-[3px] border-l-accent bg-card px-3.5 py-3">
            <p className="text-[12.5px] font-semibold text-ink">{p.name}</p>
            <p className="mt-1 text-[11.5px] leading-snug text-ink-soft">{p.detail}</p>
            <p className="mt-1.5 text-[11px] font-medium text-accent">KPI: {p.kpi}</p>
          </div>
        ))}
      </div>
      <SourceCaption>{DEMAND_ENGINE.source}</SourceCaption>

      {/* 2.5 The 13 lanes */}
      <SectionHead id="s-lanes" n="2.5" title="The 13 Demand Lanes (A–M)" note="the commercial architecture" />
      <p className="print-avoid-break mb-4 rounded-card border border-line border-l-[3px] border-l-watch bg-watch-50 px-4 py-2.5 text-[12.5px] font-medium leading-relaxed text-ink">
        {LANES_RULE}
      </p>
      <TableWrap>
        <table className="w-full min-w-[620px] border-collapse">
          <thead>
            <tr className="border-b border-accent">
              <th className={TH}>Lane</th>
              <th className={TH}>Name</th>
              <th className={TH}>Command</th>
              <th className={THR}>LTV:CAC target</th>
              <th className={THR}>Priority</th>
              <th className={THR}>Dubai TAM (AED M)</th>
            </tr>
          </thead>
          <tbody>
            {LANES.map((l) => (
              <tr key={l.lane} className="border-t border-line/70">
                <td className={`${TD} font-bold text-accent`}>{l.lane}</td>
                <td className={`${TD} font-medium`}>{l.name}</td>
                <td className={TD}>
                  <CommandPill command={l.command} />
                </td>
                <td className={TDR}>{l.ltvCac}×</td>
                <td className={TDR}>#{l.priority}</td>
                <td className={`${TDR} font-semibold`}>{l.tam}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {FUNDING_COMMANDS.map((c) => (
          <span key={c.key} className="text-[11px] text-ink-soft">
            <CommandPill command={c.key} /> <span className="ml-1">{c.rule}</span>
          </span>
        ))}
      </div>
      <Exhibit
        n={7}
        kicker="Portfolio"
        title="The three lanes funded without restriction are also the three largest, highest-return markets"
        source="The 13 Demand Lanes v2.0 — full architecture (Notion, Founding Partner Strategy Room)"
        note="Bubble size is the funding command. Targets and market sizing are the deck's own estimates, not measured results."
        tall
      >
        <LanePortfolioMatrix />
        <Takeaway>
          Funding follows the market rather than the org chart: every OWN lane sits in the large-market, high-return
          quadrant, and the lanes with no acquisition budget sit where the market is thinnest. That alignment is the
          test the lane architecture exists to pass.
        </Takeaway>
      </Exhibit>

      <div className="mt-8">
        <p className="eyebrow mb-2.5">Addressable market by lane (AED millions)</p>
        <LaneTamChart />
      </div>
      <SourceCaption>{LANES_SOURCE}</SourceCaption>

      {/* 2.6 OWN lanes */}
      <SectionHead id="s-own" n="2.6" title="OWN lanes" note="where we invest without restriction" />
      <div className="grid gap-4 lg:grid-cols-3">
        {OWN_LANES.map((l) => (
          <div key={l.lane} className="print-avoid-break rounded-card border border-line bg-card px-4 py-3.5">
            <p className="text-[13px] font-semibold text-ink">
              <span className="text-accent">{l.lane}</span> — {l.name}
            </p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-soft">{l.economics}</p>
            <p className="eyebrow mt-3 mb-1.5 text-[9.5px]">2026 plan</p>
            <ul className="space-y-1">
              {l.plan.map((p) => (
                <li key={p} className="flex gap-1.5 text-[11.5px] leading-snug text-ink-soft">
                  <span aria-hidden className="mt-[6px] h-[3px] w-[3px] shrink-0 rounded-full bg-accent-400" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <SourceCaption>{OWN_LANES_SOURCE}</SourceCaption>

      {/* 2.7 Targets vs market */}
      <Exhibit
        id="s-targets"
        n={8}
        kicker="Benchmarks"
        title="Every lane target sits above the Dubai norm — that gap is what the operating system exists to close"
        source="The 13 Demand Lanes v2.0 — lane unit-economics tables (Notion)"
        note="Design targets against published market benchmarks: the standards the system is being built to hit, not results it has recorded."
        tall
      >
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="eyebrow mb-2">Conversion & retention</p>
          <TableWrap>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-accent">
                  <th className={TH}>Metric</th>
                  <th className={THR}>DN target</th>
                  <th className={THR}>Dubai industry</th>
                </tr>
              </thead>
              <tbody>
                {CONVERSION_TARGETS.map((r) => (
                  <tr key={r.metric} className="border-t border-line/70">
                    <td className={TD}>{r.metric}</td>
                    <td className={`${TDR} font-semibold text-accent`}>{r.dn}%</td>
                    <td className={`${TDR} text-ink-faint`}>{r.industry}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </div>
        <div>
          <p className="eyebrow mb-2">LTV:CAC — target vs. leader threshold</p>
          <TargetVsMarketChart />
        </div>
      </div>
      </Exhibit>

      {/* 2.8 Rest of portfolio */}
      <SectionHead id="s-portfolio" n="2.8" title="The rest of the portfolio" note="BUILD · PILOT · RUN" />
      <div className="space-y-4">
        {([
          { key: 'BUILD' as const, rows: PORTFOLIO_REST.build },
          { key: 'PILOT' as const, rows: PORTFOLIO_REST.pilot },
          { key: 'RUN' as const, rows: PORTFOLIO_REST.run },
        ]).map((g) => (
          <div key={g.key} className="print-avoid-break">
            <p className="mb-2">
              <CommandPill command={g.key} />
              {g.key === 'PILOT' ? (
                <span className="ml-2 text-[11px] text-ink-faint">capped AED 15K/mo</span>
              ) : g.key === 'RUN' ? (
                <span className="ml-2 text-[11px] text-ink-faint">no acquisition spend</span>
              ) : null}
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {g.rows.map((r) => (
                <div key={r.lane} className="rounded-card border border-line bg-card px-3.5 py-2.5">
                  <p className="text-[12px] font-semibold text-ink">
                    <span className="text-accent">{r.lane}</span> — {r.name}
                  </p>
                  <p className="mt-1 text-[11.5px] leading-snug text-ink-soft">{r.detail}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <SourceCaption>{PORTFOLIO_REST.source}</SourceCaption>

      {/* 2.9 Scorecard */}
      <SectionHead id="s-scorecard" n="2.9" title="Portfolio health scorecard" note="monthly operating targets" />
      <TableWrap>
        <table className="w-full min-w-[680px] border-collapse">
          <thead>
            <tr className="border-b border-accent">
              <th className={TH}>Lane</th>
              <th className={TH}>Status</th>
              <th className={THR}>Monthly leads</th>
              <th className={THR}>Booking rate</th>
              <th className={THR}>Acceptance</th>
              <th className={THR}>Monthly revenue target</th>
            </tr>
          </thead>
          <tbody>
            {SCORECARD.rows.map((r) => (
              <tr key={r.lane} className="border-t border-line/70">
                <td className={`${TD} font-medium`}>{r.lane}</td>
                <td className={TD}>
                  <CommandPill command={r.status as never} />
                </td>
                <td className={TDR}>{r.leads}</td>
                <td className={TDR}>{r.booking}</td>
                <td className={TDR}>{r.acceptance}</td>
                <td className={`${TDR} font-semibold`}>{r.revenue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
      <p className="mt-3 rounded-card border border-accent/25 bg-accent-50 px-4 py-2.5 text-[12.5px] font-medium leading-relaxed text-ink">
        {SCORECARD.ifAllHit}
      </p>
      <p className="mt-2 text-[11px] italic leading-snug text-ink-faint">
        These are design targets. Actuals for the lanes we can already measure are in Part 1 and its KPI appendix; the
        Target-vs-Actual columns land here once each lane has its own attributed feed.
      </p>
      <SourceCaption>{SCORECARD.source}</SourceCaption>

      {/* 2.10 RevOps */}
      <SectionHead id="s-revops" n="2.10" title="Revenue Operations control room" note="the non-negotiables" />
      <p className="print-avoid-break mb-4 rounded-card border border-line border-l-[3px] border-l-stop bg-stop-50 px-4 py-2.5 text-[12.5px] font-semibold leading-relaxed text-ink">
        Decision rule #1: {REVOPS.rule}
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <TableWrap>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-accent">
                <th className={TH}>KPI</th>
                <th className={THR}>Target</th>
              </tr>
            </thead>
            <tbody>
              {REVOPS.kpis.map((k) => (
                <tr key={k.kpi} className="border-t border-line/70">
                  <td className={TD}>{k.kpi}</td>
                  <td className={`${TDR} font-semibold`}>{k.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <div>
          <p className="eyebrow mb-2">Daily control checklist</p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {REVOPS.checklist.map((c) => (
              <li key={c} className="flex gap-1.5 text-[11.5px] leading-snug text-ink-soft">
                <span aria-hidden className="text-accent">☐</span>
                {c}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11.5px] leading-relaxed text-ink-soft">
            <span className="font-semibold text-ink">Owner:</span> {REVOPS.owner}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">{REVOPS.funnel}</p>
        </div>
      </div>
      <SourceCaption>{REVOPS.source}</SourceCaption>

      {/* 2.11 Chapters & pods */}
      <SectionHead id="s-chapters" n="2.11" title="Clinic Growth Chapters & Specialty Pods" />
      <p className="mb-4 text-[12.5px] leading-relaxed text-ink-soft">
        Growth is executed clinic-by-clinic and service-line-by-service-line — not as one generic campaign.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CHAPTERS.clinics.map((c) => (
          <div key={c.name} className="print-avoid-break rounded-card border border-line bg-card px-3.5 py-3">
            <p className="text-[12.5px] font-semibold text-ink">{c.name}</p>
            <p className="mt-1 text-[11.5px] leading-snug text-ink-soft">{c.detail}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div>
          <p className="eyebrow mb-2">Each chapter defines</p>
          <ul className="space-y-1.5">
            {CHAPTERS.defines.map((d) => (
              <li key={d} className="flex gap-1.5 text-[11.5px] leading-snug text-ink-soft">
                <span aria-hidden className="mt-[6px] h-[3px] w-[3px] shrink-0 rounded-full bg-accent-400" />
                {d}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-2">Specialty Growth Pods (initial six)</p>
          <div className="flex flex-wrap gap-1.5">
            {CHAPTERS.pods.map((p) => (
              <span key={p} className="rounded border border-line bg-panel px-2 py-[3px] text-[11px] text-ink-soft">
                {p}
              </span>
            ))}
          </div>
          <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-soft">{CHAPTERS.podNote}</p>
        </div>
      </div>
      <SourceCaption>{CHAPTERS.source}</SourceCaption>

      {/* 2.12 Retention */}
      <SectionHead id="s-retention" n="2.12" title="Lifecycle / Retention Engine" />
      <p className="mb-3 text-[12.5px] leading-relaxed text-ink-soft">{RETENTION.intro}</p>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {RETENTION.lanes.map((l) => (
          <div key={l.name} className="print-avoid-break rounded-card border border-line bg-card px-3.5 py-2.5">
            <p className="text-[12px] font-semibold text-ink">
              <span className="text-accent">{l.key}</span> {l.name}
            </p>
            <p className="mt-1 text-[11.5px] leading-snug text-ink-soft">{l.detail}</p>
          </div>
        ))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {RETENTION.rules.map((r) => (
          <li key={r} className="flex gap-1.5 text-[11.5px] leading-snug text-ink-soft">
            <span aria-hidden className="mt-[6px] h-[3px] w-[3px] shrink-0 rounded-full bg-accent-400" />
            {r}
          </li>
        ))}
      </ul>
      <SourceCaption>{RETENTION.source}</SourceCaption>

      {/* 2.13 Channel map */}
      <SectionHead id="s-channels" n="2.13" title="The channel map" note="Paid · Owned · Earned · Shared · Partner" />
      <div className="space-y-2.5">
        {CHANNEL_MAP.groups.map((g) => (
          <div key={g.key} className="print-avoid-break flex flex-col gap-1 rounded-card border border-line bg-card px-4 py-2.5 sm:flex-row sm:gap-4">
            <div className="sm:w-[150px] sm:shrink-0">
              <p className="text-[12.5px] font-semibold text-ink">{g.key}</p>
              <p className="text-[10.5px] text-ink-faint">{g.role}</p>
            </div>
            <p className="text-[11.5px] leading-relaxed text-ink-soft">{g.items}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-soft">
        <span className="font-semibold text-ink">In operation today:</span> {CHANNEL_MAP.inOperation}.
      </p>
      <SourceCaption>{CHANNEL_MAP.source}</SourceCaption>

      {/* 2.14 PPP */}
      <SectionHead id="s-ppp" n="2.14" title="PPP & institutional channels" note="the market access engine" />
      <p className="text-[12.5px] leading-relaxed text-ink-soft">{PPP.intro}</p>
      <p className="mt-2.5 rounded-card border border-line bg-panel/50 px-4 py-3 text-[11.5px] leading-relaxed text-ink-soft">
        {PPP.channels}.
      </p>
      <p className="mt-2.5 text-[12px] font-medium text-ink">{PPP.sprints}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {PPP.ownership.map((o) => (
          <div key={o.who} className="rounded-card border border-line bg-card px-3 py-2">
            <p className="text-[11.5px] font-semibold text-ink">{o.who}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-ink-soft">{o.what}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-soft">
        <span className="font-semibold text-ink">Operating machinery:</span> {PPP.machinery}
      </p>
      <SourceCaption>{PPP.source}</SourceCaption>

      {/* 2.15 Group structure */}
      <SectionHead id="s-structure" n="2.15" title="One platform, separate clinic entities" />
      <TableWrap>
        <table className="w-full min-w-[600px] border-collapse">
          <thead>
            <tr className="border-b border-accent">
              <th className={TH}>Entity</th>
              <th className={TH}>Status</th>
              <th className={TH}>Role</th>
            </tr>
          </thead>
          <tbody>
            {GROUP_STRUCTURE.rows.map((r) => (
              <tr key={r.entity} className="border-t border-line/70 align-top">
                <td className={`${TD} font-medium`}>{r.entity}</td>
                <td className={TD}>
                  <StatusPill status={r.status} />
                </td>
                <td className={`${TD} text-ink-soft`}>{r.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {GROUP_STRUCTURE.why.map((w) => (
          <li key={w} className="flex gap-1.5 text-[11.5px] leading-snug text-ink-soft">
            <span aria-hidden className="mt-[6px] h-[3px] w-[3px] shrink-0 rounded-full bg-accent-400" />
            {w}
          </li>
        ))}
      </ul>
      <SourceCaption>{GROUP_STRUCTURE.source}</SourceCaption>

      {/* 2.16 Cadence */}
      <SectionHead id="s-cadence" n="2.16" title="Operating cadence" note="how the system is run" />
      <div className="grid gap-3 lg:grid-cols-3">
        {CADENCE.phases.map((p) => (
          <div key={p.window} className="print-avoid-break rounded-card border border-line bg-card px-4 py-3.5">
            <p className="eyebrow text-[9.5px] text-accent">{p.window}</p>
            <p className="mt-0.5 text-[12.5px] font-semibold text-ink">{p.name}</p>
            <ul className="mt-2 space-y-1">
              {p.items.map((i) => (
                <li key={i} className="flex gap-1.5 text-[11.5px] leading-snug text-ink-soft">
                  <span aria-hidden className="mt-[6px] h-[3px] w-[3px] shrink-0 rounded-full bg-accent-400" />
                  {i}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-soft">
        <span className="font-semibold text-ink">Weekly Growth Meeting:</span> {CADENCE.weekly}{' '}
        {CADENCE.weeklyOutput}
      </p>
      <SourceCaption>{CADENCE.source}</SourceCaption>

      {/* 2.17 Designed vs to do */}
      <SectionHead id="s-open" n="2.17" title="What is designed vs. what still needs to be done" />
      <p className="mb-3 text-[12.5px] leading-relaxed text-ink-soft">{OPEN_WORK.intro}</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <OpenList title="Immediate actions — Growth" items={OPEN_WORK.growth} />
        <OpenList title="Immediate actions — Channels" items={OPEN_WORK.channels} />
      </div>
      <p className="eyebrow mt-5 mb-2">Decision rules the team must hold</p>
      <ol className="grid gap-1.5 sm:grid-cols-2">
        {OPEN_WORK.decisionRules.map((r, i) => (
          <li key={r} className="flex gap-2 text-[11.5px] leading-snug text-ink-soft">
            <span className="tnum shrink-0 font-bold text-accent">{i + 1}.</span>
            {r}
          </li>
        ))}
      </ol>
      <SourceCaption>{OPEN_WORK.source}</SourceCaption>

      {/* 2.18 Closing */}
      <div className="print-avoid-break mt-9 rounded-card border border-accent/30 bg-accent-50 px-5 py-5">
        <p className="text-[16px] font-semibold tracking-tight text-accent">{CLOSING.headline}</p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">{CLOSING.body}</p>
      </div>
    </section>
  );
}

function OpenList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div className="print-avoid-break rounded-card border border-line bg-card px-4 py-3.5">
      <p className="eyebrow mb-2">{title}</p>
      <ul className="space-y-1.5">
        {items.map((i) => (
          <li key={i} className="flex gap-1.5 text-[11.5px] leading-snug text-ink-soft">
            <span aria-hidden className="mt-[6px] h-[3px] w-[3px] shrink-0 rounded-full bg-accent-400" />
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CommandPill({ command }: { command: 'OWN' | 'BUILD' | 'PILOT' | 'RUN' }) {
  const tone =
    command === 'OWN'
      ? 'border-accent/40 bg-accent-50 text-accent'
      : command === 'BUILD'
        ? 'border-accent-400/40 bg-panel text-ink-soft'
        : command === 'PILOT'
          ? 'border-watch/40 bg-watch-50 text-watch'
          : 'border-line bg-panel text-ink-faint';
  return (
    <span className={`inline-block rounded border px-1.5 py-[1px] text-[10px] font-semibold tracking-wide ${tone}`}>
      {command}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'Trading'
      ? 'border-good/40 bg-good-50 text-good'
      : status === 'Active'
        ? 'border-accent/40 bg-accent-50 text-accent'
        : status === 'Integrating'
          ? 'border-watch/40 bg-watch-50 text-watch'
          : 'border-line bg-panel text-ink-faint';
  return (
    <span className={`inline-block whitespace-nowrap rounded border px-1.5 py-[1px] text-[10px] font-semibold ${tone}`}>
      {status}
    </span>
  );
}
