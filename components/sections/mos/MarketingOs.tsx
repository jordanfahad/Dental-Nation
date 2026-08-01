import Link from 'next/link';
import { getMosReport, type MosApproval, type MosKpiRow, type MosPipeline, type Rag } from '@/lib/mos/report';
import { getKpiMap, type KpiRow as BenchRow } from '@/lib/growth/kpiMap';
import { INTEGRITY_FLAGS, MOS_RISKS, ZAVIS_ASKS } from '@/config/marketing-os';
import { currentRole } from '@/lib/auth/role';
import { Card, SectionHeader } from '@/components/ui/Card';
import { MosSubNav, MOS_VIEWS } from './MosSubNav';
import { WeeklyEntryForms, ApprovalDecide } from './AdminForms';

/**
 * Marketing OS — the Zavis-built system reported to the CEO as five operating
 * pipelines, each in three layers: Built → Activated → Outcome. Only Outcome
 * joins the Benchmark KPIs; build volume is never presented as performance.
 *
 * Views (?mpipe=): overview (default) · one per pipeline · approvals · risk.
 * Group-level by design — the clinic filter does not apply here.
 */

const aed = (n: number): string => `AED ${Math.round(n).toLocaleString('en-US')}`;
const int = (n: number): string => Math.round(n).toLocaleString('en-US');

function fmtVal(unit: string | null, v: number | null): string {
  if (v == null) return '—';
  switch (unit) {
    case 'pct': {
      const p = v * 100;
      return `${p >= 10 ? Math.round(p) : p.toFixed(1)}%`;
    }
    case 'aed': return aed(v);
    case 'x': return `${v.toFixed(1)}×`;
    case 'days': return `${v % 1 ? v.toFixed(1) : v} d`;
    case 'hours': return `${v % 1 ? v.toFixed(1) : v} h`;
    case 'bool': return v >= 1 ? 'Yes' : 'No';
    default: return int(v);
  }
}

const RAG_STYLE: Record<Rag, { dot: string; label: string; text: string }> = {
  green: { dot: 'bg-good', label: 'Green', text: 'text-good' },
  amber: { dot: 'bg-watch', label: 'Amber', text: 'text-watch' },
  red: { dot: 'bg-bad', label: 'Red', text: 'text-bad' },
};

function RagDot({ rag }: { rag: Rag }) {
  const s = RAG_STYLE[rag];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${s.text}`}>
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

const LAYER_TITLES: Record<MosKpiRow['layer'], { title: string; hint: string }> = {
  built: { title: 'Built', hint: 'What exists — capacity, never performance.' },
  activation: { title: 'Activated', hint: 'Is the built thing actually being used — the pipeline-specific metrics.' },
  outcome: { title: 'Outcome — joins the Benchmark', hint: 'The only layer that counts as performance; every row maps to a Benchmark KPI.' },
};

/* ------------------------------------------------------------- overview -- */

function OverviewRatio({ ratio }: { ratio: { revenueAed: number | null; trueCostAed: number | null; value: number | null } }) {
  return (
    <Card>
      <SectionHeader eyebrow="Marketing OS · the one number" title="Attributable pipeline revenue ÷ true cost" />
      <div className="px-5 pb-5 pt-3">
        <div className="flex flex-wrap items-baseline gap-4">
          <span className="text-[34px] font-semibold tabular-nums leading-none text-ink">
            {ratio.value != null ? `${ratio.value.toFixed(2)}×` : '—'}
          </span>
          <span className="text-[12px] text-ink-soft">
            revenue {ratio.revenueAed != null ? aed(ratio.revenueAed) : '—'} ÷ true cost{' '}
            {ratio.trueCostAed != null ? aed(ratio.trueCostAed) : '—'}
            <span className="block text-[10.5px] text-ink-faint">True cost = Zavis fee + Azure + (internal hours × loaded rate)</span>
          </span>
        </div>
        {ratio.value == null ? (
          <p className="mt-3 max-w-[720px] text-[12.5px] leading-snug text-ink-soft">
            Nothing has reached patients yet except the site; this ratio activates with first published content /
            first campaign / first members.
          </p>
        ) : null}
      </div>
    </Card>
  );
}

function Scorecard({ pipelines, queueHref }: { pipelines: MosPipeline[]; queueHref: string }) {
  return (
    <Card>
      <SectionHeader eyebrow="Marketing OS" title="Five-pipeline scorecard" />
      <div className="overflow-x-auto px-2 pb-4 pt-3">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
              <th className="py-1.5 pl-3 pr-2 text-left">Pipeline</th>
              <th className="px-2 py-1.5 text-left">Status</th>
              <th className="px-2 py-1.5 text-left">Headline</th>
              <th className="px-2 py-1.5 text-left">Critical dependency</th>
              <th className="px-2 py-1.5 text-left">Blocker owner</th>
              <th className="py-1.5 pl-2 pr-3 text-right">Days blocked</th>
            </tr>
          </thead>
          <tbody>
            {pipelines.map((p) => (
              <tr key={p.slug} className="border-t border-line/70 align-top">
                <td className="py-2.5 pl-3 pr-2">
                  <Link href={`${queueHref}&mpipe=${p.slug}`} className="text-[12.5px] font-medium text-ink underline-offset-2 hover:text-accent hover:underline">
                    {p.name}
                  </Link>
                  <span className="block text-[10.5px] text-ink-faint">owner {p.owner}</span>
                </td>
                <td className="px-2 py-2.5">
                  <RagDot rag={p.rag} />
                  <span className="mt-0.5 block max-w-[200px] text-[10px] leading-snug text-ink-faint">{p.ragReason}</span>
                </td>
                <td className="px-2 py-2.5 text-[12px] text-ink">{p.headline}</td>
                <td className="px-2 py-2.5 text-[11.5px] text-ink-soft">{p.criticalDependency ?? '—'}</td>
                <td className="px-2 py-2.5 text-[11.5px] font-medium text-ink">{p.blockerOwner ?? '—'}</td>
                <td className="py-2.5 pl-2 pr-3 text-right text-[12px] tabular-nums text-ink">{p.daysBlocked ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------- detail --- */

function KpiTable({ rows, compare, bench }: { rows: MosKpiRow[]; compare: boolean; bench: Map<string, BenchRow> }) {
  return (
    <table className="w-full min-w-[700px] border-collapse">
      <thead>
        <tr className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
          <th className="py-1.5 pl-3 pr-2 text-left">Metric</th>
          <th className="px-2 py-1.5 text-right">Value</th>
          {compare ? <th className="px-2 py-1.5 text-right">Prev window</th> : null}
          <th className="px-2 py-1.5 text-right">Target / thresholds</th>
          <th className="px-2 py-1.5 text-center">Verdict</th>
          <th className="py-1.5 pl-2 pr-3 text-left">Benchmark join</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((k) => {
          const b = k.benchmarkKey ? bench.get(k.benchmarkKey) ?? null : null;
          return (
            <tr key={k.slug} className="border-t border-line/70 align-top">
              <td className="py-2.5 pl-3 pr-2">
                <span className="block text-[12.5px] font-medium leading-tight text-ink">
                  {k.metric}
                  {k.guard ? (
                    <span className="ml-1.5 rounded-full bg-bad-weak px-1.5 py-0.5 text-[9.5px] font-semibold text-bad">guard</span>
                  ) : null}
                </span>
                {k.note ? <span className="mt-0.5 block max-w-[300px] text-[10.5px] leading-snug text-ink-faint">{k.note}</span> : null}
              </td>
              <td className="px-2 py-2.5 text-right">
                <span className={`text-[13px] font-semibold tabular-nums ${k.value == null ? 'text-ink-faint' : 'text-ink'}`}>
                  {fmtVal(k.unit, k.value)}
                </span>
                {k.valueDate ? <span className="block text-[10px] text-ink-faint">as of {k.valueDate}</span> : null}
                {k.valueNote ? <span className="block max-w-[170px] text-[10px] leading-snug text-ink-faint">{k.valueNote}</span> : null}
              </td>
              {compare ? (
                <td className="px-2 py-2.5 text-right text-[12px] tabular-nums text-ink-soft">{fmtVal(k.unit, k.prevValue)}</td>
              ) : null}
              <td className="px-2 py-2.5 text-right text-[11px] leading-snug text-ink-soft">
                {k.target != null ? <span className="block">target {fmtVal(k.unit, k.target)}</span> : null}
                {k.thresholdGreen != null ? <span className="block text-good">green {k.better === 'lower' ? '≤' : '≥'} {fmtVal(k.unit, k.thresholdGreen)}</span> : null}
                {k.thresholdRed != null ? <span className="block text-bad">red {k.better === 'lower' ? '≥' : '≤'} {fmtVal(k.unit, k.thresholdRed)}</span> : null}
                {k.target == null && k.thresholdGreen == null && k.thresholdRed == null ? '—' : null}
              </td>
              <td className="px-2 py-2.5 text-center">{k.verdict ? <RagDot rag={k.verdict} /> : <span className="text-[11px] text-ink-faint">—</span>}</td>
              <td className="py-2.5 pl-2 pr-3">
                {k.layer === 'outcome' && b ? (
                  b.flagged ? (
                    <span className="inline-block max-w-[220px] rounded-full border border-dashed border-watch/60 px-2 py-0.5 text-[10px] font-medium leading-snug text-watch" title={b.flagged}>
                      unreliable denominator
                    </span>
                  ) : (
                    <span className="block max-w-[230px] text-[11px] leading-snug text-ink-soft">
                      <span className="font-medium text-ink">{b.display}</span>
                      {b.def.benchmark ? <> vs {b.def.benchmark.label}</> : null}
                      <span className="block text-[10px] text-ink-faint">{b.def.label} (Benchmark tab)</span>
                    </span>
                  )
                ) : k.layer === 'outcome' ? (
                  <span className="text-[10.5px] text-ink-faint">benchmark row: {k.benchmarkKey}</span>
                ) : (
                  <span className="text-[10.5px] text-ink-faint">—</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function PipelineDetail({ p, compare, bench }: { p: MosPipeline; compare: boolean; bench: Map<string, BenchRow> }) {
  const layers: MosKpiRow['layer'][] = ['built', 'activation', 'outcome'];
  return (
    <>
      <Card>
        <SectionHeader eyebrow={`Marketing OS · ${p.owner}`} title={p.name} right={<RagDot rag={p.rag} />} />
        <div className="px-5 pb-4 pt-1 text-[12px] leading-snug text-ink-soft">
          <p>
            <span className="font-medium text-ink">Status:</span> {p.ragReason}.{' '}
            {p.criticalDependency ? (
              <>
                <span className="font-medium text-ink">Critical dependency:</span> {p.criticalDependency}
                {p.blockerOwner ? ` (owner: ${p.blockerOwner})` : ''}
                {p.daysBlocked != null ? ` — ${p.daysBlocked} days` : ''}.
              </>
            ) : null}
          </p>
        </div>
      </Card>
      {layers.map((layer) => {
        const rows = p.kpis.filter((k) => k.layer === layer);
        if (rows.length === 0) return null;
        const meta = LAYER_TITLES[layer];
        return (
          <Card key={layer}>
            <SectionHeader eyebrow={meta.hint} title={meta.title} />
            <div className="overflow-x-auto px-2 pb-4 pt-2">
              <KpiTable rows={rows} compare={compare} bench={bench} />
            </div>
          </Card>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------ approvals -- */

function ApprovalsView({ approvals, isAdmin }: { approvals: MosApproval[]; isAdmin: boolean }) {
  const order = { pending: 0, approved: 1, published: 2, rejected: 3 } as const;
  const sorted = [...approvals].sort((a, b) => order[a.status] - order[b.status] || b.ageBd - a.ageBd);
  return (
    <Card>
      <SectionHeader
        eyebrow="Marketing OS · two-track gate"
        title="Approval queue"
        right={<span className="text-[10.5px] text-ink-faint">SEO 3 business days · Clinical 5 business days</span>}
      />
      <p className="max-w-[820px] px-5 pt-1 text-[11.5px] leading-snug text-ink-soft">
        Clinical content cannot publish without a NAMED clinical reviewer — the sign-off is stored and becomes the
        page&apos;s <code className="rounded bg-panel px-1 py-0.5 text-[10.5px]">reviewedBy</code> credential (the E-E-A-T asset).
      </p>
      <div className="overflow-x-auto px-2 pb-4 pt-3">
        <table className="w-full min-w-[820px] border-collapse">
          <thead>
            <tr className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
              <th className="py-1.5 pl-3 pr-2 text-left">Item</th>
              <th className="px-2 py-1.5 text-left">Track</th>
              <th className="px-2 py-1.5 text-left">Gate</th>
              <th className="px-2 py-1.5 text-right">Submitted</th>
              <th className="px-2 py-1.5 text-right">Age (bd)</th>
              <th className="px-2 py-1.5 text-left">Status</th>
              <th className="py-1.5 pl-2 pr-3 text-left">Reviewer</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((a) => (
              <tr key={a.id} className={`border-t border-line/70 align-top ${a.breach ? 'bg-bad-weak/60' : ''}`}>
                <td className="py-2.5 pl-3 pr-2">
                  <span className="block text-[12.5px] font-medium leading-tight text-ink">{a.title}</span>
                  {a.note ? <span className="mt-0.5 block max-w-[300px] text-[10px] leading-snug text-ink-faint">{a.note}</span> : null}
                  {isAdmin ? (
                    <div className="mt-2">
                      <ApprovalDecide id={a.id} track={a.track} reviewer={a.reviewer} status={a.status} />
                    </div>
                  ) : null}
                </td>
                <td className="px-2 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${a.track === 'clinical' ? 'bg-accent/5 text-accent' : 'bg-panel text-ink-soft'}`}>
                    {a.track === 'clinical' ? 'Clinical · 5bd' : 'SEO · 3bd'}
                  </span>
                </td>
                <td className="px-2 py-2.5 text-[11.5px] text-ink-soft">{a.gate ?? '—'}</td>
                <td className="px-2 py-2.5 text-right text-[11.5px] tabular-nums text-ink-soft">{a.submittedAt}</td>
                <td className="px-2 py-2.5 text-right">
                  <span className={`text-[12.5px] font-semibold tabular-nums ${a.breach ? 'text-bad' : 'text-ink'}`}>{a.ageBd}</span>
                  {a.breach ? <span className="block text-[9.5px] font-medium text-bad">{a.hardBreach ? '> 2× SLA' : 'over SLA'}</span> : null}
                </td>
                <td className="px-2 py-2.5 text-[11.5px] capitalize text-ink">{a.status}</td>
                <td className="py-2.5 pl-2 pr-3 text-[11.5px] text-ink">{a.reviewer ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ----------------------------------------------------------------- risk -- */

function RiskView() {
  return (
    <>
      <Card>
        <SectionHeader eyebrow="Marketing OS" title="Risk register" />
        <div className="space-y-3 px-5 pb-5 pt-3">
          {MOS_RISKS.map((r) => (
            <div key={r.key} className="rounded-card border border-line bg-panel/40 px-4 py-3">
              <p className="text-[12.5px] font-medium text-ink">
                <span className={`mr-2 rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase ${r.severity === 'high' ? 'bg-bad-weak text-bad' : 'bg-watch-50 text-watch'}`}>
                  {r.severity}
                </span>
                {r.title}
                <span className="ml-2 text-[10.5px] font-normal text-ink-faint">owner {r.owner}</span>
              </p>
              <p className="mt-1 text-[11.5px] leading-snug text-ink-soft">{r.detail}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <SectionHeader eyebrow="Marketing OS" title="Standing asks from Zavis" />
        <ol className="list-decimal space-y-1.5 px-5 pb-5 pl-10 pt-3">
          {ZAVIS_ASKS.map((a) => (
            <li key={a.key} className="text-[12px] leading-snug text-ink-soft">{a.ask}</li>
          ))}
        </ol>
      </Card>
    </>
  );
}

/* ---------------------------------------------------------------- entry -- */

export async function MarketingOs({
  range,
  compare,
  mpipe,
}: {
  range?: { from?: string; to?: string; preset?: string };
  compare?: boolean;
  mpipe?: string;
}) {
  const view = MOS_VIEWS.some((v) => v.key === mpipe) && mpipe ? mpipe : '';
  const [report, role] = await Promise.all([
    getMosReport({ from: range?.from, to: range?.to }, compare === true),
    currentRole(),
  ]);
  const isAdmin = role === 'admin';

  if (!report) {
    return (
      <Card>
        <SectionHeader eyebrow="Group" title="Marketing OS" />
        <p className="px-5 pb-5 pt-3 text-[12.5px] text-ink-soft">
          Marketing OS tables are not available — run <code className="rounded bg-panel px-1.5 py-0.5 text-[11.5px]">supabase/migrations/0019_marketing_os.sql</code>.
        </p>
      </Card>
    );
  }

  const rangeQs = range?.from && range?.to ? `&preset=custom&from=${range.from}&to=${range.to}` : '';
  const baseHref = `/?tab=group&gtab=mos${rangeQs}`;
  const pipeline = report.pipelines.find((p) => p.slug === view) ?? null;

  // The Benchmark join (outcome rows + integrity flags) needs the live KPI map;
  // fetched only for pipeline detail so the Overview stays fast.
  const bench = new Map<string, BenchRow>();
  if (pipeline) {
    const km = await getKpiMap({ from: range?.from, to: range?.to }).catch(() => null);
    if (km) for (const m of km.motions) for (const r of m.rows) bench.set(r.def.key, r);
  }

  const dnBlocked = report.pipelines.filter((p) => p.blockerOwner && p.blockerOwner.includes('DN')).length;
  const zavisBlocked = report.pipelines.filter((p) => p.blockerOwner && p.blockerOwner.includes('Zavis')).length;

  return (
    <div className="space-y-4">
      <MosSubNav active={view} />
      <p className="text-[10.5px] text-ink-faint">
        Group-level view — the clinic filter does not apply here. Window: {report.from ?? 'all time'} → {report.to}
        {report.compare ? ' · comparing vs previous period' : ''}.
      </p>

      {view === '' ? (
        <>
          <OverviewRatio ratio={report.ratio} />
          <Scorecard pipelines={report.pipelines} queueHref={baseHref} />

          <Card>
            <SectionHeader
              eyebrow="Marketing OS · the constraint"
              title="Approval queue"
              right={
                <Link href={`${baseHref}&mpipe=approvals`} className="text-[11px] font-medium text-accent underline-offset-2 hover:underline">
                  open the queue →
                </Link>
              }
            />
            <div className="flex flex-wrap gap-6 px-5 pb-5 pt-3">
              <div>
                <p className="text-[24px] font-semibold tabular-nums leading-none text-ink">{report.queue.pending}</p>
                <p className="mt-1 text-[10.5px] text-ink-faint">items waiting</p>
              </div>
              <div>
                <p className="text-[24px] font-semibold tabular-nums leading-none text-ink">{report.queue.oldestBd ?? '—'}</p>
                <p className="mt-1 text-[10.5px] text-ink-faint">oldest, business days</p>
              </div>
              <div>
                <p className="text-[24px] font-semibold tabular-nums leading-none text-ink">
                  {report.queue.seo} <span className="text-[13px] font-normal text-ink-faint">SEO</span> · {report.queue.clinical}{' '}
                  <span className="text-[13px] font-normal text-ink-faint">Clinical</span>
                </p>
                <p className="mt-1 text-[10.5px] text-ink-faint">by review track</p>
              </div>
              <p className="max-w-[380px] self-center text-[11.5px] leading-snug text-ink-soft">
                Content is built and QA-passed; the constraint is our approval throughput. Every waiting item has an
                owner in the queue view.
              </p>
            </div>
          </Card>

          <Card>
            <SectionHeader eyebrow="Marketing OS" title="Each pipeline's single critical dependency" />
            <div className="grid gap-2 px-5 pb-5 pt-3 sm:grid-cols-2 lg:grid-cols-5">
              {report.pipelines.map((p) => (
                <div key={p.slug} className="rounded-card border border-line bg-panel/40 px-3 py-2.5">
                  <p className="text-[11px] font-semibold leading-tight text-ink">{p.name}</p>
                  <p className="mt-1 text-[10.5px] leading-snug text-ink-soft">{p.criticalDependency ?? '—'}</p>
                  <p className="mt-1 text-[10px] font-medium text-ink-faint">→ {p.blockerOwner ?? p.owner}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionHeader eyebrow="Marketing OS · management is a cost line" title="Effort & vendor cost" />
            <div className="flex flex-wrap gap-6 px-5 pb-5 pt-3">
              <div>
                <p className="text-[20px] font-semibold tabular-nums leading-none text-ink">
                  {report.effort.avgHours != null ? `${report.effort.avgHours.toFixed(1)} h` : '—'}
                </p>
                <p className="mt-1 text-[10.5px] text-ink-faint">DN hours/week on Zavis coordination</p>
              </div>
              <div>
                <p className="text-[20px] font-semibold tabular-nums leading-none text-ink">
                  {report.effort.reworkRate != null ? `${Math.round(report.effort.reworkRate * 100)}%` : '—'}
                </p>
                <p className="mt-1 text-[10.5px] text-ink-faint">rework rate (items sent back)</p>
              </div>
              <div>
                <p className="text-[20px] font-semibold tabular-nums leading-none text-ink">
                  {dnBlocked} <span className="text-[12px] font-normal text-ink-faint">DN</span> · {zavisBlocked}{' '}
                  <span className="text-[12px] font-normal text-ink-faint">Zavis</span>
                </p>
                <p className="mt-1 text-[10.5px] text-ink-faint">blocker ownership split</p>
              </div>
              <div>
                <p className="text-[20px] font-semibold tabular-nums leading-none text-ink">
                  {report.costs.totalAed > 0 || report.effort.costAed != null
                    ? aed(report.costs.totalAed + (report.effort.costAed ?? 0))
                    : '—'}
                </p>
                <p className="mt-1 text-[10.5px] text-ink-faint">
                  true cost this window{report.costs.totalAed > 0 ? ` (Zavis ${aed(report.costs.zavisAed)} · Azure ${aed(report.costs.azureAed)})` : ' — enter fees below'}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <SectionHeader eyebrow="Marketing OS · before any judgement" title="Measurement integrity" />
            <p className="max-w-[820px] px-5 pt-1 text-[11.5px] leading-snug text-ink-soft">
              Artifacts in the current benchmark window that would corrupt a Marketing OS evaluation. While a flag is
              open, every affected Benchmark row shows “unreliable denominator” instead of a verdict.
            </p>
            <div className="space-y-2.5 px-5 pb-5 pt-3">
              {INTEGRITY_FLAGS.map((f) => (
                <div key={f.key} className="rounded-card border border-line bg-panel/40 px-4 py-3">
                  <p className="text-[12px] font-medium text-ink">
                    <span className={`mr-2 rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase ${f.status === 'open' ? 'bg-watch-50 text-watch' : 'bg-good-50 text-good'}`}>
                      {f.status}
                    </span>
                    {f.title}
                    <span className="ml-2 text-[10.5px] font-normal text-ink-faint">fix owner {f.owner}</span>
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-ink-soft">{f.detail}</p>
                </div>
              ))}
            </div>
          </Card>

          {isAdmin ? (
            <Card>
              <SectionHeader eyebrow="Admin · Phase 1 data feed" title="Weekly update" />
              <p className="max-w-[720px] px-5 pt-1 text-[11px] leading-snug text-ink-faint">
                Manual weekly entry until the API feeds land (Phase 2: GSC/GA4/join-funnel · Phase 3: Content OS +
                WhatsApp stats). Percentages entered as decimals.
              </p>
              <WeeklyEntryForms
                kpiOptions={report.pipelines.flatMap((p) =>
                  p.kpis.map((k) => ({ slug: k.slug, label: `${p.name} — ${k.metric} (${k.layer})` })),
                )}
              />
            </Card>
          ) : null}
        </>
      ) : null}

      {pipeline ? <PipelineDetail p={pipeline} compare={report.compare} bench={bench} /> : null}
      {view === 'approvals' ? <ApprovalsView approvals={report.approvals} isAdmin={isAdmin} /> : null}
      {view === 'risk' ? <RiskView /> : null}
    </div>
  );
}
