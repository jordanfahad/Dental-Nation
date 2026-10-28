import Link from 'next/link';
import type { ReactNode } from 'react';
import { GMB_CLINICS, resolveGmbClinic } from '@/config/gmb-clinics';
import { currentUser } from '@/lib/auth/role';
import { readGbpPlan } from '@/lib/gbp/reader';
import { rateChange, type GbpPlan as Plan, type MetricWindow } from '@/lib/gbp/plan';
import { readPerformanceNote } from '@/lib/performance/reader';
import { change, count } from '@/lib/performance/emails';
import { PerformanceNote } from './PerformanceNote';
import { readClinicComparison } from '@/lib/gbp/clinic-comparison-reader';
import { GbpClinicTable } from './GbpClinicTable';

const panel = 'rounded-card border border-line bg-card p-5';
const safeProof = (value: string) => { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : null; } catch { return null; } };
function DataTable({ headers, rows, caption }: { headers: string[]; rows: ReactNode[][]; caption: string }) {
  return <div className="overflow-x-auto"><table className="w-full text-left text-xs">
    <caption className="mb-3 text-left text-ink-soft">{caption}</caption>
    <thead><tr>{headers.map((h) => <th key={h} scope="col" className="border-b border-line p-2">{h}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} className="border-b border-line p-2 align-top">{v}</td>)}</tr>)}</tbody>
  </table></div>;
}
function BranchResults({ branch: b }: { branch: Plan['branches'][number] }) {
  const metrics: [keyof Pick<MetricWindow, 'calls' | 'directions' | 'websiteClicks' | 'mapViews' | 'reviews' | 'rating'>, string][] = [
    ['calls', 'Calls'], ['directions', 'Direction requests'], ['websiteClicks', 'Website clicks'], ['mapViews', 'Map views'], ['reviews', 'New reviews'], ['rating', 'Average rating of new reviews'],
  ];
  return <section className={panel}>
    <h3 className="mb-2 text-lg font-semibold">{b.label} <span className={b.status === 'Off track' ? 'text-red-700' : b.status === 'On track' ? 'text-green-700' : 'text-amber-700'}>{b.status}</span></h3>
    {!b.connected ? <p className="mb-3 text-sm text-ink-soft">Not connected yet. Connect this branch&apos;s Google Business Profile to show results.</p> : null}
    <p className="mb-3 text-sm">Day {b.progress.day} of 30 · {b.progress.done} done / {b.progress.partial} partial / {b.progress.notDone} not done · {(b.progress.complete * 100).toFixed(0)}% of logged activities complete</p>
    <p className="mb-3 text-xs text-ink-soft">Activity coverage: {b.progress.coverage == null ? 'plan not started' : `${(b.progress.coverage * 100).toFixed(0)}%`} of elapsed plan days have Done or Partial activity. Days with no entry: {b.progress.missingDays.length}{b.progress.missingDays.length ? ` (${b.progress.missingDays.join(', ')})` : ''}.</p>
    <DataTable caption={`Last 7: ${b.last7.from} to ${b.last7.to}. Last 28: ${b.last28.from} to ${b.last28.to}. Baseline: ${b.baseline ? `${b.baseline.from} to ${b.baseline.to}` : 'awaiting first logged date'}.`}
      headers={['Measure', 'Before plan (28 days)', 'Last 7 days', '7-day rate vs baseline', 'Last 28 days', '28-day rate vs baseline']}
      rows={metrics.map(([key, label]) => {
        const rating = key === 'rating';
        const fmt = (n: number | null | undefined) => rating && n != null ? n.toFixed(1) : count(n);
        const delta = (w: MetricWindow) => rating ? 'Not a volume rate' : change(rateChange(w[key], w.days, b.baseline?.[key] ?? null, 28));
        return [label, fmt(b.baseline?.[key]), fmt(b.last7[key]), delta(b.last7), fmt(b.last28[key]), delta(b.last28)];
      })} />
    <p className="mt-3 text-xs text-ink-soft">Coverage: last 7 {b.last7.coverage}; last 28 {b.last28.coverage}; baseline {b.baseline?.coverage ?? 'unavailable'}. Missing days are unavailable, not zero. Average rating covers new reviews in each period; currently removed reviews are excluded.</p>
  </section>;
}

export async function GbpPlan({ branch }: { branch?: string }) {
  const [result, noteResult, user, comparison] = await Promise.allSettled([readGbpPlan(), readPerformanceNote(), currentUser(), readClinicComparison()]);
  const active = resolveGmbClinic(branch);
  const report = result.status === 'fulfilled' ? result.value : null;
  const action = noteResult.status === 'fulfilled' ? noteResult.value : null;
  const editable = Boolean(process.env.AUTH_SESSION_SECRET && process.env.DASHBOARD_PASSWORD) && user.status === 'fulfilled' && user.value?.role === 'admin';
  const entries = report?.entries.filter((e) => active === 'all' || e.clinic === active) ?? [];
  return <div className="space-y-4">
    <section className={panel}>
      <h2 className="text-xl font-semibold">GBP plan</h2>
      <p className="mt-2 text-sm text-ink-soft">Log each branch&apos;s work in the plan spreadsheet&apos;s <b>Daily log</b> tab. One row per activity, with its status and proof. No patient details.</p>
      <a href="https://docs.google.com/spreadsheets/d/142joaIN0oEPt3hfUmcrQlxmWaLdhNduV5b0UB_D9Rnk/edit" target="_blank" rel="noreferrer" className="text-sm text-accent underline">Open plan spreadsheet</a>
      {report ? <>
        <p className="mt-3 text-sm">Activity log through {report.asOf}, the last complete Dubai day{report.metricsAsOf !== report.asOf ? `; Google figures through ${report.metricsAsOf}, the latest day Google has reported every measure` : ''}. Day {report.progress.day} of 30{report.progress.start ? `; started ${report.progress.start}` : '; awaiting first real entry'}.</p>
        <p className="mt-1 text-sm">{report.progress.done} done / {report.progress.partial} partial / {report.progress.notDone} not done · {(report.progress.complete * 100).toFixed(0)}% of logged activities complete · {report.progress.missingDays.length} days with no entry across the team.</p>
        <p className="mt-2 text-xs text-ink-soft">Daily log sync: {report.syncedAt ?? 'not connected yet'}. {report.invalid.length} invalid rows kept raw, excluded from progress. {report.examples} examples excluded. {report.progress.dayMismatches} plan-day numbers differ from the first-date calendar. Future and post-plan entries remain in the log but do not affect 30-day progress.</p>
        {report.invalid.length ? <details className="mt-2 text-sm"><summary>Rows to correct in the sheet</summary><ul>{report.invalid.map((r) => <li key={r.row}>Row {r.row}: {r.reasons.join('; ')}</li>)}</ul></details> : null}
      </> : <p role="status" className="mt-3 text-sm">GBP plan not connected yet or data could not be read. The Daily log tab and database migration must be in place before the first sync.</p>}
      <p className="mt-3 text-xs text-ink-soft">On track: activity coverage at least 80% and daily call rate down no more than 10% against the 28 days before the plan. Off track: coverage below 50% or calls down more than 25%. All other cases: Watch. Incomplete call comparisons cannot earn On track. Logged activity completion is not completion of the full plan&apos;s task inventory.</p>
    </section>
    <nav aria-label="GBP branch" className="flex flex-wrap gap-2">{[{ key: 'all', label: 'All branches' }, ...GMB_CLINICS].map((c) => <Link key={c.key} href={`?tab=operations&otab=gbp&gbpbranch=${c.key}`} aria-current={active === c.key ? 'page' : undefined} className={`rounded-full border px-3 py-1.5 text-sm ${active === c.key ? 'bg-accent text-white' : 'border-line bg-card'}`}>{c.label}</Link>)}</nav>
    <GbpClinicTable report={comparison.status === 'fulfilled' ? comparison.value : null} />
    {report?.branches.filter((b) => active === 'all' || b.key === active).map((b) => <BranchResults key={b.key} branch={b} />)}
    <section className={panel}>
      <h3 className="mb-3 text-lg font-semibold">Daily log</h3>
      {entries.length ? <DataTable caption="Latest date first. Update mistakes in the spreadsheet; the next sync replaces the stored log." headers={['Date', 'Branch', 'Plan day', 'Activity', 'Status', 'Done by', 'Proof link', 'Notes']}
        rows={entries.map((e) => { const proof = safeProof(e.proof); return [e.date, GMB_CLINICS.find((c) => c.key === e.clinic)?.label, e.planDay, e.activity, e.status, e.doneBy, proof ? <a href={proof} target="_blank" rel="noreferrer" className="text-accent underline">Open proof</a> : e.proof ? 'Invalid link' : 'No link', e.notes]; })} /> : <p className="text-sm text-ink-soft">No real entries for this branch yet.</p>}
    </section>
    <section className={panel}>{action ? editable ? <PerformanceNote body={action.body} /> : <><h3 className="font-semibold">Plan of action for the daily performance brief</h3><p className="whitespace-pre-wrap text-sm">{action.body || 'Plan of action: to be updated'}</p></> : <p className="text-sm">Performance note is unavailable until its database table can be read.</p>}</section>
  </div>;
}
