import { GMB_CLINICS, type GmbClinicKey } from '@/config/gmb-clinics';
import { buildGmbReport, type GmbMetricRow } from '@/lib/social/gmb-report';

export const GBP_HEADERS = ['Date', 'Branch', 'Plan day', 'Activity', 'Status', 'Done by', 'Proof link', 'Notes'] as const;
export const GBP_PLAN_LINK = 'https://reports.dentalnation.com/?tab=operations&otab=gbp';
export const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
export const dayCount = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000) + 1;
export const dubaiDay = (at = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(at);
export const validDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(`${s}T12:00:00Z`)) && new Date(`${s}T12:00:00Z`).toISOString().slice(0, 10) === s;

export interface RawLogRow { row_index: number; data: Record<string, unknown> }
export interface LogEntry {
  row: number; date: string; clinic: GmbClinicKey; planDay: number;
  activity: string; status: 'Done' | 'Partial' | 'Not done'; doneBy: string; proof: string; notes: string;
}
export type ParsedLogRow = { kind: 'valid'; entry: LogEntry } | { kind: 'example' } | { kind: 'invalid'; row: number; reasons: string[] };

/** Strict calendar dates and exact branch labels; retain the source unchanged in bronze. */
export function parseLogRow(raw: RawLogRow): ParsedLogRow {
  const cell = (key: typeof GBP_HEADERS[number]) => String(raw.data[key] ?? '').trim();
  if (/^EXAMPLE\b/i.test(cell('Activity')) || /^EXAMPLE\b/i.test(cell('Notes'))) return { kind: 'example' };
  const date = cell('Date');
  const clinic = GMB_CLINICS.find((c) => c.label === cell('Branch'))?.key;
  const planDay = Number(cell('Plan day'));
  const status = cell('Status');
  const reasons: string[] = [];
  if (!validDay(date)) reasons.push('Date must be a real YYYY-MM-DD date');
  if (!clinic) reasons.push('Unknown branch');
  if (!/^\d+$/.test(cell('Plan day')) || !Number.isInteger(planDay) || planDay < 1 || planDay > 30) reasons.push('Plan day must be 1-30');
  if (!['Done', 'Partial', 'Not done'].includes(status)) reasons.push('Unknown status');
  if (!cell('Activity')) reasons.push('Activity is required');
  if (reasons.length || !clinic) return { kind: 'invalid', row: raw.row_index, reasons };
  return { kind: 'valid', entry: { row: raw.row_index, date, clinic, planDay, activity: cell('Activity'),
    status: status as LogEntry['status'], doneBy: cell('Done by'), proof: cell('Proof link'), notes: cell('Notes') } };
}

export function parseDailyLog(rows: RawLogRow[]) {
  const parsed = rows.map(parseLogRow);
  return {
    entries: parsed.flatMap((r) => r.kind === 'valid' ? [r.entry] : []).sort((a, b) => b.date.localeCompare(a.date) || b.row - a.row),
    invalid: parsed.flatMap((r) => r.kind === 'invalid' ? [r] : []),
    examples: parsed.filter((r) => r.kind === 'example').length,
  };
}

export function planProgress(entries: LogEntry[], asOf: string, clinic?: GmbClinicKey) {
  // One shared 30-day plan: filtering a branch never moves its start date.
  const start = entries.filter((e) => e.date <= asOf).map((e) => e.date).sort()[0] ?? null;
  const day = start ? Math.min(30, dayCount(start, asOf)) : 0;
  const end = start ? addDays(start, day - 1) : asOf;
  const logged = entries.filter((e) => (!clinic || e.clinic === clinic) && start && e.date >= start && e.date <= end);
  const days = start ? Array.from({ length: day }, (_, i) => addDays(start, i)) : [];
  const done = logged.filter((e) => e.status === 'Done').length;
  const partial = logged.filter((e) => e.status === 'Partial').length;
  const notDone = logged.filter((e) => e.status === 'Not done').length;
  const worked = new Set(logged.filter((e) => e.status !== 'Not done').map((e) => e.date));
  return { start, day, done, partial, notDone, total: logged.length,
    complete: logged.length ? done / logged.length : 0,
    coverage: day ? worked.size / day : null,
    missingDays: days.filter((d) => !logged.some((e) => e.date === d)),
    dayMismatches: logged.filter((e) => e.planDay !== dayCount(start!, e.date)).length,
  };
}
export type PlanProgress = ReturnType<typeof planProgress>;
export type TrackStatus = 'On track' | 'Watch' | 'Off track';
/** Complete-day comparisons only. Coverage <50% or calls down >25% = Off track;
 * coverage >=80% and calls down no more than 10% = On track; otherwise Watch.
 * Missing metrics/baseline never earn green. A zero baseline cannot give a percentage. */
export function trackStatus(coverage: number | null, callsChange: number | null): TrackStatus {
  if ((coverage != null && coverage < 0.5) || (callsChange != null && callsChange < -0.25)) return 'Off track';
  return coverage != null && coverage >= 0.8 && callsChange != null && callsChange >= -0.1 ? 'On track' : 'Watch';
}
export const rateChange = (current: number | null, currentDays: number, baseline: number | null, baselineDays: number) =>
  current == null || baseline == null || baseline <= 0 ? null : (current / currentDays) / (baseline / baselineDays) - 1;
export interface ReviewRow { clinic: GmbClinicKey; date: string; rating: number; syncedAt: string }
export interface MetricWindow {
  from: string; to: string; days: number; calls: number | null; directions: number | null;
  websiteClicks: number | null; mapViews: number | null; reviews: number | null; rating: number | null;
  coverage: string; latestDay: string | null;
}
export function metricWindow(metrics: GmbMetricRow[], reviews: ReviewRow[], clinic: GmbClinicKey, connected: boolean, from: string, to: string): MetricWindow {
  const days = dayCount(from, to);
  const rows = metrics.filter((r) => r.clinic === clinic && r.day >= from && r.day <= to);
  const report = buildGmbReport(rows, connected ? [clinic] : [], clinic).branches[0];
  const complete = (...keys: string[]) => connected && keys.every((key) => new Set(rows.filter((r) => r.metric === key && r.value != null).map((r) => r.day)).size === days);
  const rr = reviews.filter((r) => r.clinic === clinic && r.date >= from && r.date <= to);
  // A review sync observed after the end of the period is required to distinguish zero from unavailable.
  const reviewCovered = connected && reviews.some((r) => r.clinic === clinic && r.syncedAt.slice(0, 10) > to);
  const covered = new Set(rows.filter((r) => r.metric === 'calls' && r.value != null).map((r) => r.day)).size;
  return { from, to, days, calls: complete('calls') ? report.calls : null,
    directions: complete('directions') ? report.directions : null,
    websiteClicks: complete('website_clicks') ? report.websiteClicks : null,
    mapViews: complete('map_views_desktop', 'map_views_mobile') ? report.mapViews : null,
    reviews: reviewCovered ? rr.length : null,
    rating: reviewCovered && rr.length ? rr.reduce((s, r) => s + r.rating, 0) / rr.length : null,
    coverage: `${covered}/${days} call days`, latestDay: rows.map((r) => r.day).sort().at(-1) ?? null };
}

export function buildGbpPlan(input: { rows: RawLogRow[]; metrics: GmbMetricRow[]; reviews: ReviewRow[]; connected: GmbClinicKey[]; asOf: string;
  /** Latest day Google has reported every metric (the sync stores unreported days as 0); metric windows end here. Defaults to asOf. */
  metricsAsOf?: string; syncedAt: string | null }) {
  const parsed = parseDailyLog(input.rows);
  const progress = planProgress(parsed.entries, input.asOf);
  const mAsOf = input.metricsAsOf && input.metricsAsOf < input.asOf ? input.metricsAsOf : input.asOf;
  const branches = GMB_CLINICS.map((c) => {
    const connected = input.connected.includes(c.key);
    const window = (from: string, to = mAsOf) => metricWindow(input.metrics, input.reviews, c.key, connected, from, to);
    const p = planProgress(parsed.entries, input.asOf, c.key);
    const baseline = progress.start ? window(addDays(progress.start, -28), addDays(progress.start, -1)) : null;
    const last7 = window(addDays(mAsOf, -6));
    const last28 = window(addDays(mAsOf, -27));
    const yesterday = window(mAsOf);
    const prior7 = window(addDays(mAsOf, -13), addDays(mAsOf, -7));
    const change = rateChange(last7.calls, 7, baseline?.calls ?? null, 28);
    const activeReviews = input.reviews.filter((r) => r.clinic === c.key);
    const reviewSync = activeReviews.map((r) => r.syncedAt).sort().at(-1) ?? null;
    return { ...c, connected, progress: p, baseline, yesterday, last7, last28, prior7, callsChange: change,
      reputation: { count: connected && reviewSync ? activeReviews.length : null,
        rating: connected && activeReviews.length ? activeReviews.reduce((n, r) => n + r.rating, 0) / activeReviews.length : null,
        observedAt: reviewSync },
      trend: rateChange(last7.calls, 7, prior7.calls, 7), status: trackStatus(p.coverage, change),
      activities: parsed.entries.filter((e) => e.clinic === c.key && e.date === input.asOf) };
  });
  return { ...parsed, progress, branches, asOf: input.asOf, metricsAsOf: mAsOf, syncedAt: input.syncedAt,
    hasNew: branches.some((b) => b.activities.length > 0 || [b.yesterday.calls, b.yesterday.directions, b.yesterday.websiteClicks, b.yesterday.mapViews, b.yesterday.reviews].some((n) => n != null && n > 0)) };
}
export type GbpPlan = ReturnType<typeof buildGbpPlan>;
