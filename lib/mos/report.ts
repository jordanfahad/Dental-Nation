import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { MOS_SLA_DAYS } from '@/config/marketing-os';

/**
 * Marketing OS read layer — pipelines, three-layer KPIs with their latest
 * snapshot in the selected window (and the previous window when comparing),
 * the two-track approval queue with SLA ages, effort/cost lines and the
 * "one number" (attributable revenue ÷ true cost).
 *
 * RAG is COMPUTED (spec §6), never trusted from the stored row:
 *   red   — any activation KPI breaches threshold_red, or any pending approval
 *           exceeds 2× its SLA;
 *   amber — any pending approval over SLA, or activation data missing/stale
 *           (>14 days old at the window end);
 *   green — otherwise.
 * The stored pipeline row contributes the dependency/blocker copy only.
 */

export type Rag = 'green' | 'amber' | 'red';
export type MosLayer = 'built' | 'activation' | 'outcome';

export interface MosKpiRow {
  slug: string;
  layer: MosLayer;
  metric: string;
  unit: string | null;
  target: number | null;
  thresholdRed: number | null;
  thresholdGreen: number | null;
  better: 'higher' | 'lower';
  benchmarkKey: string | null;
  guard: boolean;
  note: string | null;
  /** Latest snapshot on/before the window end. */
  value: number | null;
  valueDate: string | null;
  valueNote: string | null;
  /** Latest snapshot in the PREVIOUS window (when compare is on). */
  prevValue: number | null;
  /** Green/red verdict vs its own thresholds (null when unjudgeable). */
  verdict: Rag | null;
}

export interface MosPipeline {
  slug: string;
  name: string;
  owner: string;
  rag: Rag;
  ragReason: string;
  criticalDependency: string | null;
  blockerOwner: string | null;
  blockedSince: string | null;
  daysBlocked: number | null;
  /** The headline metric shown on the scorecard row. */
  headline: string;
  kpis: MosKpiRow[];
}

export interface MosApproval {
  id: number;
  pipelineSlug: string;
  title: string;
  url: string | null;
  track: 'seo' | 'clinical';
  gate: string | null;
  submittedAt: string;
  slaDays: number;
  reviewer: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'published';
  decidedAt: string | null;
  publishedAt: string | null;
  note: string | null;
  /** Business-day age (pending: to window end / today; else to decision). */
  ageBd: number;
  breach: boolean;
  hardBreach: boolean; // > 2× SLA
}

export interface MosEffortWeek {
  weekStart: string;
  hoursTotal: number;
  reworkItems: number;
  totalItems: number;
  loadedRate: number | null;
}

export interface MosReport {
  from: string | null;
  to: string;
  compare: boolean;
  pipelines: MosPipeline[];
  approvals: MosApproval[];
  queue: { pending: number; oldestBd: number | null; seo: number; clinical: number };
  effort: { weeks: MosEffortWeek[]; avgHours: number | null; reworkRate: number | null; costAed: number | null };
  costs: { months: number; zavisAed: number; azureAed: number; otherAed: number; totalAed: number };
  /** The one number: attributable revenue ÷ true cost. Null until outcomes flow. */
  ratio: { revenueAed: number | null; trueCostAed: number | null; value: number | null };
}

/* ------------------------------------------------------------------ dates */

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Business days between two dates (inclusive start, exclusive end). */
function weekdaysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00Z`);
  const to = new Date(`${toIso}T00:00:00Z`);
  if (to <= from) return 0;
  let n = 0;
  for (let t = from.getTime(); t < to.getTime(); t += 86400_000) {
    const dow = new Date(t).getUTCDay();
    if (dow !== 0 && dow !== 6) n++;
  }
  return n;
}

/* ------------------------------------------------------------------ entry */

export async function getMosReport(
  range: { from?: string; to?: string } = {},
  compare = false,
): Promise<MosReport | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const to = range.to ?? isoDay(new Date());
  const from = range.from ?? null;
  // Previous window of equal length, ending the day before `from`.
  const prevTo = from ? isoDay(new Date(new Date(`${from}T00:00:00Z`).getTime() - 86400_000)) : null;
  const prevFrom =
    from && prevTo
      ? isoDay(
          new Date(
            new Date(`${prevTo}T00:00:00Z`).getTime() -
              (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()),
          ),
        )
      : null;

  const [pipelinesRes, kpisRes, snapsRes, apprRes, effortRes, costsRes] = await Promise.all([
    db.from('mos_pipelines').select('*').order('sort'),
    db.from('mos_kpis').select('*').order('sort'),
    db.from('mos_snapshots').select('kpi_slug, date, value, note').lte('date', to).order('date', { ascending: false }),
    db.from('mos_approvals').select('*').order('submitted_at'),
    db.from('mos_effort').select('*').order('week_start', { ascending: false }).limit(26),
    db.from('mos_costs').select('*').order('month'),
  ]);

  type Row = Record<string, unknown>;
  const P = (pipelinesRes.data ?? []) as Row[];
  const K = (kpisRes.data ?? []) as Row[];
  const S = (snapsRes.data ?? []) as Row[];
  const A = (apprRes.data ?? []) as Row[];
  const E = (effortRes.data ?? []) as Row[];
  const C = (costsRes.data ?? []) as Row[];
  if (P.length === 0) return null;

  const num = (v: unknown): number | null => (v == null ? null : Number(v));
  const str = (v: unknown): string | null => (v == null ? null : String(v));

  // Latest snapshot per KPI on/before the window end + latest in prev window.
  const latest = new Map<string, { date: string; value: number | null; note: string | null }>();
  const latestPrev = new Map<string, number | null>();
  for (const s of S) {
    const slug = String(s.kpi_slug);
    const date = String(s.date);
    if (!latest.has(slug)) latest.set(slug, { date, value: num(s.value), note: str(s.note) });
    if (compare && prevFrom && prevTo && !latestPrev.has(slug) && date <= prevTo && date >= prevFrom) {
      latestPrev.set(slug, num(s.value));
    }
  }

  // Approvals with business-day ages.
  const approvals: MosApproval[] = A.map((a) => {
    const status = String(a.status) as MosApproval['status'];
    const submittedAt = String(a.submitted_at);
    const endIso = status === 'pending' ? to : String(a.decided_at ?? a.published_at ?? to);
    const slaDays = Number(a.sla_days ?? MOS_SLA_DAYS[String(a.track) as 'seo' | 'clinical'] ?? 3);
    const ageBd = weekdaysBetween(submittedAt, endIso);
    return {
      id: Number(a.id),
      pipelineSlug: String(a.pipeline_slug),
      title: String(a.item_title),
      url: str(a.item_url),
      track: String(a.track) as 'seo' | 'clinical',
      gate: str(a.gate),
      submittedAt,
      slaDays,
      reviewer: str(a.reviewer_name),
      status,
      decidedAt: str(a.decided_at),
      publishedAt: str(a.published_at),
      note: str(a.note),
      ageBd,
      breach: status === 'pending' && ageBd > slaDays,
      hardBreach: status === 'pending' && ageBd > 2 * slaDays,
    };
  });
  const pending = approvals.filter((a) => a.status === 'pending');

  // KPI rows with values + per-KPI verdicts.
  const verdictFor = (k: Row, value: number | null): Rag | null => {
    const red = num(k.threshold_red);
    const green = num(k.threshold_green);
    if (value == null || (red == null && green == null)) return null;
    const higher = String(k.better) === 'higher';
    if (red != null && (higher ? value <= red : value >= red)) return 'red';
    if (green != null && (higher ? value >= green : value <= green)) return 'green';
    return 'amber';
  };

  const kpisByPipeline = new Map<string, MosKpiRow[]>();
  for (const k of K) {
    const slug = String(k.slug);
    const snap = latest.get(slug) ?? null;
    const row: MosKpiRow = {
      slug,
      layer: String(k.layer) as MosLayer,
      metric: String(k.metric),
      unit: str(k.unit),
      target: num(k.target),
      thresholdRed: num(k.threshold_red),
      thresholdGreen: num(k.threshold_green),
      better: (String(k.better) === 'lower' ? 'lower' : 'higher') as 'higher' | 'lower',
      benchmarkKey: str(k.benchmark_kpi_key),
      guard: Boolean(k.guard_metric),
      note: str(k.note),
      value: snap?.value ?? null,
      valueDate: snap?.date ?? null,
      valueNote: snap?.note ?? null,
      prevValue: compare ? latestPrev.get(slug) ?? null : null,
      verdict: verdictFor(k, snap?.value ?? null),
    };
    const key = String(k.pipeline_slug);
    kpisByPipeline.set(key, [...(kpisByPipeline.get(key) ?? []), row]);
  }

  // Pipelines with computed RAG (spec §6).
  const staleCutoff = isoDay(new Date(new Date(`${to}T00:00:00Z`).getTime() - 14 * 86400_000));
  const pipelines: MosPipeline[] = P.map((p) => {
    const slug = String(p.slug);
    const kpis = kpisByPipeline.get(slug) ?? [];
    const activation = kpis.filter((k) => k.layer === 'activation');
    const mine = pending.filter((a) => a.pipelineSlug === slug);

    const redKpi = activation.find((k) => k.verdict === 'red');
    const hardBreach = mine.find((a) => a.hardBreach);
    const softBreach = mine.find((a) => a.breach);
    const withData = activation.filter((k) => k.value != null);
    const stale =
      withData.length === 0 || withData.every((k) => (k.valueDate ?? '') < staleCutoff);

    let rag: Rag;
    let ragReason: string;
    if (redKpi || hardBreach) {
      rag = 'red';
      ragReason = redKpi
        ? `${redKpi.metric} breached its red threshold`
        : `approval waiting ${hardBreach!.ageBd} business days (> 2× the ${hardBreach!.slaDays}-day SLA)`;
    } else if (softBreach || stale) {
      rag = 'amber';
      ragReason = softBreach
        ? `approval over its ${softBreach.slaDays}-day SLA`
        : withData.length === 0
          ? 'no activation data yet — weekly snapshot entry pending'
          : 'activation data older than 14 days';
    } else {
      rag = 'green';
      ragReason = 'activation KPIs within thresholds and data fresh';
    }

    // Headline metric per pipeline (the scorecard's one number).
    const headlineKpi =
      slug === 'organic'
        ? null // queue is the headline — rendered from the queue itself
        : activation.find((k) => k.value != null) ?? kpis.find((k) => k.value != null) ?? null;
    const headline =
      slug === 'organic'
        ? `${mine.length} items awaiting approval · oldest ${mine.length ? Math.max(...mine.map((a) => a.ageBd)) : 0} business days`
        : headlineKpi
          ? `${headlineKpi.metric}: ${headlineKpi.value}`
          : 'no activation data yet';

    const blockedSince = str(p.blocked_since);
    return {
      slug,
      name: String(p.name),
      owner: String(p.owner),
      rag,
      ragReason,
      criticalDependency: str(p.critical_dependency),
      blockerOwner: str(p.blocker_owner),
      blockedSince,
      daysBlocked: blockedSince ? Math.max(0, Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${blockedSince}T00:00:00Z`).getTime()) / 86400_000)) : null,
      headline,
      kpis,
    };
  });

  // Effort + costs (window-scoped where dated; effort weeks limited to window).
  const effortWeeks: MosEffortWeek[] = E.map((e) => ({
    weekStart: String(e.week_start),
    hoursTotal: Number(e.hours_meetings ?? 0) + Number(e.hours_reviews ?? 0) + Number(e.hours_qa ?? 0),
    reworkItems: Number(e.rework_items ?? 0),
    totalItems: Number(e.total_items ?? 0),
    loadedRate: num(e.loaded_rate_aed),
  })).filter((e) => (!from || e.weekStart >= from) && e.weekStart <= to);
  const avgHours = effortWeeks.length
    ? effortWeeks.reduce((a, e) => a + e.hoursTotal, 0) / effortWeeks.length
    : null;
  const totalItems = effortWeeks.reduce((a, e) => a + e.totalItems, 0);
  const reworkRate = totalItems > 0 ? effortWeeks.reduce((a, e) => a + e.reworkItems, 0) / totalItems : null;
  const effortCost = effortWeeks.reduce((a, e) => a + (e.loadedRate ? e.hoursTotal * e.loadedRate : 0), 0);

  const monthsInWindow = C.filter((c) => {
    const m = String(c.month);
    return (!from || m >= from.slice(0, 8) + '01') && m <= to;
  });
  const sum = (k: string) => monthsInWindow.reduce((a, c) => a + Number(c[k] ?? 0), 0);
  const zavisAed = sum('zavis_fee_aed');
  const azureAed = sum('azure_cost_aed');
  const otherAed = sum('other_aed');
  const vendorCost = zavisAed + azureAed + otherAed;

  // The one number. Revenue stays null until outcome snapshots exist
  // (reactivation revenue, member MRR…) — never fabricated from hopes.
  const revenueKpis = new Set(['crm.out_react_rev', 'sc.out_mrr']);
  let revenueAed: number | null = null;
  for (const [slug, snap] of latest) {
    if (revenueKpis.has(slug) && snap.value != null) revenueAed = (revenueAed ?? 0) + snap.value;
  }
  const trueCostAed = vendorCost + effortCost > 0 ? vendorCost + effortCost : null;

  return {
    from,
    to,
    compare,
    pipelines,
    approvals,
    queue: {
      pending: pending.length,
      oldestBd: pending.length ? Math.max(...pending.map((a) => a.ageBd)) : null,
      seo: pending.filter((a) => a.track === 'seo').length,
      clinical: pending.filter((a) => a.track === 'clinical').length,
    },
    effort: { weeks: effortWeeks, avgHours, reworkRate, costAed: effortCost > 0 ? effortCost : null },
    costs: { months: monthsInWindow.length, zavisAed, azureAed, otherAed, totalAed: vendorCost },
    ratio: {
      revenueAed,
      trueCostAed,
      value: revenueAed != null && trueCostAed != null && trueCostAed > 0 ? revenueAed / trueCostAed : null,
    },
  };
}
