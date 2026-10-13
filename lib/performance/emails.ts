import { GBP_PLAN_LINK, type GbpPlan, type MetricWindow } from '@/lib/gbp/plan';
import type { PerformanceBrief, PerformancePeriod } from './core';

export type PerformanceKind = 'am:gbp-daily' | 'am:akbar-perf';
export const PERFORMANCE_RECIPIENTS = {
  'am:gbp-daily': { to: 'shadi', cc: 'fahad', max: 1 },
  'am:akbar-perf': { to: 'akbar', cc: 'fahad', max: 1 },
} as const;
const escRaw = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const esc = (s: unknown) => escRaw(String(s ?? '').replace(/\u2014/g, '-'));
export const count = (n: number | null | undefined) => n == null ? 'Unavailable' : Math.round(n).toLocaleString('en-GB');
export const change = (n: number | null) => n == null ? 'Unavailable' : `${n >= 0 ? '+' : ''}${(n * 100).toFixed(1)}%`;
const dayLabel = (day: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${day}T12:00:00Z`));
const table = (head: string[], rows: (string | number)[][]) => `<table style="border-collapse:collapse;width:100%;font-size:12px;margin:8px 0 16px"><thead><tr>${head.map((h) => `<th style="text-align:left;background:#F1F1EA;padding:6px">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td style="border-top:1px solid #E6E6DA;padding:6px;vertical-align:top">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const h = (t: string) => `<h3 style="font-size:15px;margin:20px 0 6px;border-bottom:1px solid #E6E6DA">${esc(t)}</h3>`;
const note = (t: string) => `<p style="color:#767769;font-size:12px">Data note: ${esc(t)}</p>`;
// Same typography, colours and table shell as Smile Club, without its task links/cap copy.
const shell = (title: string, body: string) => `<div style="font-family:Arial,sans-serif;font-size:14px;color:#244260;line-height:1.5;max-width:960px"><p style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#B45F53;font-weight:bold">Dental Nation</p><h2>${esc(title)}</h2>${body}<p style="font-size:12px">09:00 Dubai daily performance reporting. Copied to Fahad.</p></div>`;
// Encode an owner's literal em dash rather than changing their verbatim note.
// Generated copy uses hyphens throughout; user text remains visually verbatim.
const finish = (subject: string, html: string) => ({ subject: subject.replace(/\u2014/g, '-'), html: html.replace(/\u2014/g, '&#8212;') });
const metrics = (w: MetricWindow) => [count(w.calls), count(w.directions), count(w.websiteClicks), count(w.mapViews), count(w.reviews)];

export function buildGbpDaily(plan: GbpPlan, today: string) {
  if (!plan.hasNew && !plan.branches.some((b) => b.status === 'Off track')) return null;
  let body = `<p>Yesterday: ${esc(plan.asOf)}. Why: connect completed GBP activity with measured local demand.</p>`;
  body += note(`Daily log last synced ${plan.syncedAt ?? 'not connected yet'}. ${plan.invalid.length} invalid rows retained raw; ${plan.examples} examples excluded. Reporting through yesterday; the current day is not scored.`);
  for (const b of plan.branches) {
    body += h(`${b.label}: ${b.status}`);
    body += `<p>${b.activities.length} logged activities yesterday. Plan day ${b.progress.day} of 30; ${b.progress.done} done, ${b.progress.partial} partial, ${b.progress.notDone} not done; ${(b.progress.complete * 100).toFixed(0)}% of logged activities complete; ${b.progress.missingDays.length} days with no entry.</p>`;
    body += table(['Activity', 'Status'], b.activities.slice(0, 5).map((e) => [e.activity, e.status]));
    body += table(['Window', 'Calls', 'Directions', 'Website clicks', 'Map views', 'New reviews'], [
      [plan.asOf, ...metrics(b.yesterday)], [`Last 7 days (${b.last7.from} to ${b.last7.to})`, ...metrics(b.last7)],
      [`Prior 7 days (${b.prior7.from} to ${b.prior7.to})`, ...metrics(b.prior7)],
    ]);
    body += note(`${b.connected ? 'Connected' : 'Not connected yet'}. Calls 7-day trend: ${change(b.trend)}. ${b.last7.coverage}. Status compares activity coverage and daily call rate against the 28 days before the plan. Missing comparisons = Watch unless activity coverage is below 50%.`);
  }
  body += `<p><a href="${GBP_PLAN_LINK}">Open GBP plan</a></p>`;
  return finish(`GBP daily - ${dayLabel(today)} - ${plan.branches.reduce((n, b) => n + b.activities.length, 0)} activities - ${plan.branches.filter((b) => b.status === 'Off track').length} off-track flags`, shell('GBP daily', body));
}

function funnel(p: PerformancePeriod, label: string) {
  return h(`${label}: ${p.from} to ${p.to}`) + table(['Clinic', 'Channel group', 'Enquiries gross (raw rows)', 'Enquiries net (people)', 'Bookings', 'Shows', 'Billed patients (Growth)', 'Revenue AED'],
    p.rows.map((r) => [r.clinic, r.group, ...[r.gross, r.net, r.bookings, r.shows, r.billed, r.revenue].map(count)])) +
    table(['Clinic', 'Patients by billing file', 'New patients', 'Existing patients', 'Unclassified', 'Data note'], p.patients.map((r) => [r.clinic, count(r.total), count(r.new), count(r.existing), count(r.unclassified), r.note])) + p.notes.map(note).join('');
}
export function buildAkbarPerformance(report: PerformanceBrief) {
  let body = `<p>Reporting through ${esc(report.yesterday.to)} (Dubai). All figures are recorded counts or amounts.</p>`;
  body += h('1. Demand and funnel by channel group') + '<p>Why: show how demand becomes appointments and billed revenue.</p>';
  body += funnel(report.yesterday, 'Yesterday') + funnel(report.mtd, 'Month-to-date through yesterday');
  body += h('2. Why') + '<p>Why: identify measured changes over the last two completed 7-day windows.</p><ul>' + report.why.map((s) => `<li>${esc(s)}</li>`).join('') + '</ul>';
  body += note('Rule-based comparisons of recorded data; they identify movement, not proof of causation.');
  body += h('3. Plan of action') + '<p>Why: carry the owner’s current priorities into this brief.</p>';
  body += `<p style="white-space:pre-wrap">${escRaw(report.action || 'Plan of action: to be updated')}</p>` + note('Owner-maintained text, shown verbatim.');
  body += h('4. Benchmark (estimate)') + '<p>Why: compare public audience and reputation signals. Directional estimate, public signals only.</p>';
  const sig = (s: { value: number | null; date: string | null; delta30: number | null }, rating = false) => s.value == null ? 'no public signal stored' : `${rating ? s.value.toFixed(1) : count(s.value)} (${s.date})`;
  body += table(['Profile', 'Instagram followers', '30-day follower change', 'Google review count', '30-day review-count change', 'Rating'], report.benchmark.map((b) => [b.label, sig(b.followers), b.followers.delta30 == null ? 'no public signal stored' : count(b.followers.delta30), sig(b.reviews), b.reviews.delta30 == null ? 'no public signal stored' : count(b.reviews.delta30), sig(b.rating, true)]));
  body += note('A 30-day change requires two stored observations exactly 30 days apart for the same profile. No competitor revenue or patient estimates. The Dental Nation benchmark is the Al Wasl profile; group-scale signals are not directly comparable.');
  body += h('5. Smile Club performance') + '<p>Why: distinguish programme outcomes from tasks and planned targets.</p>';
  body += table(['Period', 'Enrolments recorded', 'Messages sent', 'Replies', 'Tagged bookings', 'Tagged shows'], [
    [report.yesterday.to, ...Object.values(report.smile.yesterday).map(count)],
    [`${report.mtd.from} to ${report.mtd.to}`, ...Object.values(report.smile.mtd).map(count)],
  ]);
  body += `<p>Company-reported members recorded: ${count(report.smile.members)}; latest company update ${esc(report.smile.membersAsOf ?? 'unavailable')}. Verified historical test memberships: ${count(report.smile.verifiedHistoricalMembers)}; verified ${esc(report.smile.verifiedAt ?? 'unavailable')}.</p>` + report.smile.notes.map(note).join('');
  body += h('6. GBP') + '<p>Why: monitor calls, directions and new reviews by branch.</p>';
  body += table(['Branch', `Calls ${report.gbp.asOf}`, 'Directions', 'New reviews', 'Status'], report.gbp.branches.map((b) => [b.label, count(b.yesterday.calls), count(b.yesterday.directions), count(b.yesterday.reviews), b.connected ? b.status : `${b.status}: not connected yet`]));
  body += note('Unavailable GBP days are not zero. Reviews are currently active reviews by original creation date; removals can restate past counts.') + `<p><a href="${GBP_PLAN_LINK}">Open GBP plan</a></p>`;
  const rev = report.yesterday.total.revenue ?? 0;
  const amount = rev >= 1000 ? `${(rev / 1000).toFixed(1)}k` : count(rev);
  const flags = report.gbp.branches.filter((b) => b.status === 'Off track').length;
  return finish(`Daily performance - ${dayLabel(report.today)} - AED ${amount} billed · ${count(report.yesterday.total.net)} net enquiries · ${flags} off-track flags`, shell('Daily performance', body));
}
