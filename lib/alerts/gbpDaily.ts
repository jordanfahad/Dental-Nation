/**
 * Google Business Profile daily 09:00 email (template 3, approved 24 Oct 2026).
 * Replaces the content of the old plan-checklist email (buildGbpDaily in
 * lib/performance/emails.ts); the sender switches over separately.
 *
 * Sections, in order: a note on Google's reporting delay, at a glance (all
 * clinics), the latest day Google has reported per clinic, month to date per
 * clinic, reviews per clinic, and "Needs attention" (only when a written
 * review has no reply or a branch has no data). Every figure links to the
 * Social & Local view that shows it (lib/alerts/links.ts socialLink) and the
 * layout comes from lib/alerts/shell.ts.
 *
 * Rules reused, not re-derived:
 * - Calls, directions, website clicks and map views are summed exactly as the
 *   Social tab's Business Profile card does (buildGmbReport), so each figure
 *   matches its proof link for the same dates and clinic.
 * - Connected branches and the location to clinic mapping come from the
 *   Business Profile configuration (resolveGmbConfig), as on the Social tab.
 * - Reviews: removed reviews are excluded and "without a reply" means a
 *   written review with no reply (lib/analytics/gmb-reviews.ts); new reviews
 *   are counted by the Dubai day of their create time (lib/gbp/reader.ts).
 *
 * Google stores a day it has not processed yet as 0, and sends a day's calls,
 * directions and website clicks about a day after its map views. So the
 * latest reported day D is the latest day for which EVERY metric has been
 * reported (each metric's last day with a group total above zero), capped at
 * the earliest per-branch latest map-view day so every branch has data for D.
 * Before 25 Oct 2026 D used map views alone, which read "0 calls" for days
 * whose calls Google had not sent yet.
 *
 * readGbpDaily is read-only and never throws for one missing source: a source
 * that cannot be read becomes null and renders "not yet". buildGbpDaily is pure.
 */
import type { AdminClient } from '@/lib/supabase/server';
import { selectAll } from '@/lib/supabase/selectAll';
import { resolveGmbConfig } from '@/config/gmb';
import { GMB_CLINICS, type GmbClinicKey } from '@/config/gmb-clinics';
import { buildGmbReport, GMB_METRIC_KEYS, reportedThrough, type GmbMetricRow } from '@/lib/social/gmb-report';
import { dubaiDay } from '@/lib/gbp/plan';
import { addDaysIso, periods, socialLink, type Range } from '@/lib/alerts/links';
import {
  banner, bold, dayLabel, emailHtml, finishEmail, fmt, h2, list, NOT_YET, num, proof, rangeLabel, table, text, tiles, tone,
} from '@/lib/alerts/shell';

/* ── data ── */

/** Calls, directions, website clicks and map views (desktop + mobile) for one window; null = not available. */
export interface GbpMetricSet { calls: number | null; directions: number | null; websiteClicks: number | null; mapViews: number | null }

/** Reviews for one clinic as of 09:00 on the send day. */
export interface GbpReviewSet {
  newYesterday: number;
  total: number;
  /** Mean star rating; null when the clinic has no reviews. */
  average: number | null;
  /** Written reviews with no reply. */
  unanswered: number;
}

/**
 * ok = Google has reported this branch; not-connected = not in the Business
 * Profile configuration; no-data = connected but no map views above zero in
 * the last LOOKBACK_DAYS days; unavailable = the configuration or the daily
 * figures could not be read.
 */
export type GbpBranchStatus = 'ok' | 'not-connected' | 'no-data' | 'unavailable';

export interface GbpBranchData {
  key: GmbClinicKey;
  status: GbpBranchStatus;
  /** This branch's latest day with map views above zero; null = none. */
  latestDay: string | null;
  /** Figures for D (the latest day Google has reported for every branch). */
  day: GbpMetricSet | null;
  /** 1st of D's month to D. */
  mtd: GbpMetricSet | null;
  /** null = the reviews or the configuration could not be read, or the branch is not connected. */
  reviews: GbpReviewSet | null;
}

export interface GbpDailyData {
  /** D, YYYY-MM-DD; null when no connected branch has reported (or the figures could not be read). */
  latestDay: string | null;
  /** All clinics (the Social tab's bpclinic=all totals): D and the same weekday a week earlier. */
  all: { day: GbpMetricSet | null; weekEarlier: GbpMetricSet | null };
  /** One entry per clinic, in GMB_CLINICS order. */
  branches: GbpBranchData[];
}

/* ── rules ── */

/** Clinic names as written in the approved template. */
export const GBP_CLINIC_NAMES: Record<GmbClinicKey, string> = {
  'dental-nation': 'Dental Nation Al Wasl',
  'dr-tosun': 'Dr. Tosun Dental Clinic',
  'al-maher': 'Al Maher Medical Centre',
};
/** How far back to look for a branch's latest reported day (the sync re-pulls the last 30 days). */
export const LOOKBACK_DAYS = 30;
export const DEFAULT_RECIPIENTS = 'To Mr Akbar, Ms Shadi and Dr Luvi; copied to Fahad.';
const MAP_VIEWS = ['map_views_desktop', 'map_views_mobile'];

const monthStart = (iso: string) => `${iso.slice(0, 7)}-01`;
/** 09:00 Dubai (UTC+4, no daylight saving) on the send day, as an instant. */
export const reviewsCutoff = (today: string) => Date.parse(`${today}T05:00:00Z`);

/**
 * Each connected branch's latest day (within from..to) with map views above
 * zero, and D = the latest day every metric has been reported (see the file
 * note), capped at the earliest of the branch days so every branch has data
 * for D. Branches with no map-view day are left out of D and reported as
 * having no data.
 */
export function latestReportedDay(rows: GmbMetricRow[], connected: GmbClinicKey[], from: string, to: string) {
  const inWindow = rows.filter((r) => r.day >= from && r.day <= to);
  const views = new Map<string, number>();
  for (const r of inWindow) {
    if (!MAP_VIEWS.includes(r.metric) || r.value == null) continue;
    const k = `${r.clinic}|${r.day}`;
    views.set(k, (views.get(k) ?? 0) + Number(r.value));
  }
  const perBranch = {} as Record<GmbClinicKey, string | null>;
  for (const { key } of GMB_CLINICS) {
    let latest: string | null = null;
    if (connected.includes(key)) {
      for (const [k, v] of views) {
        const [clinic, day] = k.split('|');
        if (clinic === key && v > 0 && (!latest || day > latest)) latest = day;
      }
    }
    perBranch[key] = latest;
  }
  const branchDays = Object.values(perBranch).filter((d): d is string => d != null).sort();
  const through = reportedThrough(inWindow, connected);
  // A metric with no reported day at all in the window cannot anchor D (its
  // feed has delivered nothing); the metrics that have reported pull D back.
  const metricDays = GMB_METRIC_KEYS.map((k) => through[k]).filter((d): d is string => d != null);
  const latestDay = branchDays.length ? [branchDays[0], ...metricDays].sort()[0] : null;
  return { perBranch, latestDay };
}

/** The Social tab's Business Profile card for one window: per branch and all clinics. */
export function metricWindow(rows: GmbMetricRow[], connected: GmbClinicKey[], r: Range) {
  const report = buildGmbReport(rows.filter((x) => x.day >= r.from && x.day <= r.to), connected, 'all');
  const set = (x: { calls: number | null; directions: number | null; websiteClicks: number | null; mapViews: number | null }): GbpMetricSet =>
    ({ calls: x.calls, directions: x.directions, websiteClicks: x.websiteClicks, mapViews: x.mapViews });
  return {
    all: set(report),
    byBranch: Object.fromEntries(report.branches.map((b) => [b.clinic, set(b)])) as Record<GmbClinicKey, GbpMetricSet>,
  };
}

export interface GbpReviewRow { location_path: string; rating: number; comment: string | null; create_time: string; reply_comment: string | null }

/**
 * Active reviews created before 09:00 Dubai on the send day, per clinic.
 * Connected clinics with no reviews get zeros; other clinics get null.
 */
export function summariseReviews(rows: GbpReviewRow[], locations: { path: string; clinic: GmbClinicKey }[], today: string) {
  const yesterday = periods(today).yesterday.from;
  const cutoff = reviewsCutoff(today);
  const out = {} as Record<GmbClinicKey, GbpReviewSet | null>;
  for (const { key } of GMB_CLINICS) {
    const paths = new Set(locations.filter((l) => l.clinic === key).map((l) => l.path));
    if (!paths.size) { out[key] = null; continue; }
    const rs = rows.filter((r) => paths.has(r.location_path) && Date.parse(r.create_time) < cutoff);
    out[key] = {
      newYesterday: rs.filter((r) => dubaiDay(new Date(r.create_time)) === yesterday).length,
      total: rs.length,
      average: rs.length ? rs.reduce((n, r) => n + Number(r.rating), 0) / rs.length : null,
      unanswered: rs.filter((r) => r.comment && !r.reply_comment).length,
    };
  }
  return out;
}

/* ── read (read-only, never throws) ── */

const safe = async <T>(f: () => Promise<T>): Promise<T | null> => {
  try { return await f(); } catch { return null; }
};

export async function readGbpDaily(db: AdminClient, today: string): Promise<GbpDailyData> {
  const yesterday = periods(today).yesterday.from;
  const lookbackFrom = addDaysIso(yesterday, -(LOOKBACK_DAYS - 1));
  // Covers D's month and D minus 7 for any D in the lookback window.
  const readFrom = addDaysIso(monthStart(lookbackFrom), -7);

  const [config, metricRows, reviewRows] = await Promise.all([
    safe(async () => (await resolveGmbConfig(db, true))?.locations.map((l) => ({ path: l.path, clinic: l.clinic })) ?? []),
    safe(async () => (await selectAll(() => db.from('social_insights').select('clinic,metric,day,value')
      .eq('channel', 'gmb').gte('day', readFrom).lte('day', yesterday), ['clinic', 'channel', 'metric', 'day'])).data as GmbMetricRow[]),
    safe(async () => (await selectAll(() => db.from('gmb_reviews').select('location_path,rating,comment,create_time,reply_comment')
      .is('removed_at', null), 'review_id')).data as GbpReviewRow[]),
  ]);

  const connected = config ? config.map((l) => l.clinic) : null;
  const latest = connected && metricRows ? latestReportedDay(metricRows, connected, lookbackFrom, yesterday) : null;
  const D = latest?.latestDay ?? null;
  const day = D && metricRows && connected ? metricWindow(metricRows, connected, { from: D, to: D }) : null;
  const week = D && metricRows && connected ? metricWindow(metricRows, connected, { from: addDaysIso(D, -7), to: addDaysIso(D, -7) }) : null;
  const mtd = D && metricRows && connected ? metricWindow(metricRows, connected, { from: monthStart(D), to: D }) : null;
  const reviews = config && reviewRows ? summariseReviews(reviewRows, config, today) : null;

  const branches: GbpBranchData[] = GMB_CLINICS.map(({ key }) => {
    const status: GbpBranchStatus = !connected ? 'unavailable'
      : !connected.includes(key) ? 'not-connected'
        : !metricRows ? 'unavailable'
          : !latest?.perBranch[key] ? 'no-data' : 'ok';
    const ok = status === 'ok';
    return {
      key, status,
      latestDay: latest?.perBranch[key] ?? null,
      day: ok && day ? day.byBranch[key] : null,
      mtd: ok && mtd ? mtd.byBranch[key] : null,
      reviews: reviews?.[key] ?? null,
    };
  });

  return { latestDay: D, all: { day: day?.all ?? null, weekEarlier: week?.all ?? null }, branches };
}

/* ── build (pure) ── */

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);
const sumOf = (vals: (number | null | undefined)[]) => {
  const xs = vals.filter((v): v is number => v != null);
  return xs.length ? xs.reduce((a, b) => a + b, 0) : null;
};

/** Total written reviews without a reply across clinics; null when no clinic's reviews could be read. */
export const unansweredTotal = (data: GbpDailyData) => sumOf(data.branches.map((b) => b.reviews?.unanswered));

export function gbpSubject(data: GbpDailyData, today: string): string {
  const calls = data.latestDay ? data.all.day?.calls ?? null : null;
  const c = calls == null
    ? `calls not yet${data.latestDay ? ` (${dayLabel(data.latestDay)})` : ''}`
    : `${fmt(calls)} ${plural(calls, 'call')} (${dayLabel(data.latestDay!)})`;
  const u = unansweredTotal(data);
  const r = u == null ? 'reviews to answer not yet' : `${fmt(u)} ${plural(u, 'review')} to answer`;
  return `Google Business Profile · ${dayLabel(today)} · ${c}, ${r}`;
}

export function buildGbpDaily(data: GbpDailyData, today: string, opts: { preview?: string; recipients?: string } = {}): { subject: string; html: string } {
  const D = data.latestDay;
  const dRange = D ? { from: D, to: D } : null;
  const wDay = D ? addDaysIso(D, -7) : null;
  const wRange = wDay ? { from: wDay, to: wDay } : null;
  const mRange = D ? { from: monthStart(D), to: D } : null;
  const dLabel = D ? dayLabel(D) : null;
  const name = (k: GmbClinicKey) => GBP_CLINIC_NAMES[k];

  const freshness = banner(`${bold('Note:')} ${text('Google reports calls, directions and clicks 2 to 3 days late, and can still revise the last few days. Latest day Google has reported every measure:')} ${dLabel ? bold(dLabel) : NOT_YET}. ${text('Reviews are as of 09:00 today.')}`);

  /** "Tue 13 Oct: 14" linked to the same weekday a week earlier. */
  const weekEarlier = (v: number | null | undefined) => {
    if (!wRange || !wDay) return '';
    const label = `${dayLabel(wDay)}:`;
    return `<div style="font-size:11px">${v == null ? `${text(label)} ${NOT_YET}` : proof(socialLink('all', wRange), `${label} ${fmt(v)}`)}</div>`;
  };
  const withReviews = data.branches.filter((b) => b.reviews);
  const unanswered = unansweredTotal(data);
  const waiting = data.branches.filter((b) => (b.reviews?.unanswered ?? 0) > 0);
  const reported = data.branches.filter((b) => b.status === 'ok').length;
  const glance = tiles([
    { label: `Calls · ${dLabel ?? 'latest reported day'}`, value: dRange ? data.all.day?.calls ?? null : null,
      href: dRange ? socialLink('all', dRange) : undefined, extra: weekEarlier(data.all.weekEarlier?.calls) },
    { label: `Direction requests · ${dLabel ?? 'latest reported day'}`, value: dRange ? data.all.day?.directions ?? null : null,
      href: dRange ? socialLink('all', dRange) : undefined, extra: weekEarlier(data.all.weekEarlier?.directions) },
    { label: 'New reviews · yesterday', value: withReviews.length ? sumOf(withReviews.map((b) => b.reviews!.newYesterday)) : null, href: socialLink('all') },
    { label: 'Written reviews without a reply', value: unanswered,
      href: socialLink(waiting.length === 1 ? waiting[0].key : 'all'),
      sub: waiting.map((b) => waiting.length === 1 ? name(b.key) : `${name(b.key)} ${fmt(b.reviews!.unanswered)}`).join(', ') || undefined,
      subTone: 'down' },
  ]);

  const metricRow = (b: GbpBranchData, m: GbpMetricSet | null, r: Range | null) => {
    if (!m || !r) return [text(name(b.key)), NOT_YET, NOT_YET, NOT_YET, NOT_YET, ''];
    const href = socialLink(b.key, r);
    return [text(name(b.key)), num(m.calls, href), num(m.directions, href), num(m.websiteClicks, href), num(m.mapViews, href), proof(href)];
  };
  const head = ['Clinic', 'Calls', 'Directions', 'Website clicks', 'Map views', ''];
  const latestTable = table(head, data.branches.map((b) => metricRow(b, b.day, dRange)), [1, 2, 3, 4]);
  const mtdTable = table(head, data.branches.map((b) => metricRow(b, b.mtd, mRange)), [1, 2, 3, 4]);

  const reviewsTable = table(['Clinic', 'New yesterday', 'Total reviews', 'Average', 'Without a reply', ''], data.branches.map((b) => {
    const r = b.reviews;
    if (!r) return [text(name(b.key)), NOT_YET, NOT_YET, NOT_YET, NOT_YET, ''];
    const href = socialLink(b.key);
    return [text(name(b.key)), num(r.newYesterday, href), num(r.total, href), num(r.average == null ? null : fmt(r.average, 1), href),
      num(r.unanswered, href), proof(href, 'Latest reviews')];
  }), [1, 2, 3, 4]);

  const attention: string[] = [];
  for (const b of waiting) {
    const n = b.reviews!.unanswered;
    attention.push(`${tone('Reply needed:', 'watch')} ${num(n, socialLink(b.key))} ${text(`written ${plural(n, 'review')} at ${name(b.key)} ${n === 1 ? 'has' : 'have'} no reply yet`)} ${proof(socialLink(b.key))}`);
  }
  for (const b of data.branches) {
    const why = b.status === 'not-connected' ? `${name(b.key)} is not connected to Google Business Profile yet`
      : b.status === 'no-data' ? `Google has not reported any map views for ${name(b.key)} in the last ${LOOKBACK_DAYS} days`
        : b.status === 'unavailable' ? `the Google figures for ${name(b.key)} could not be read this morning`
          : null;
    if (why) attention.push(`${tone('No data:', 'down')} ${text(why)} ${proof(socialLink(b.key, dRange ?? undefined))}`);
  }

  const body = [
    freshness,
    h2(`At a glance (${reported === GMB_CLINICS.length ? 'all three clinics' : 'all connected clinics'})`), glance,
    h2(`Latest reported day: ${dLabel ?? 'not yet'}`), latestTable,
    h2(`Month to date: ${mRange ? rangeLabel(mRange.from, mRange.to) : 'not yet'}`), mtdTable,
    h2('Reviews (as of 09:00 today; the page shows live figures)'), reviewsTable,
    ...(attention.length ? [h2('Needs attention'), list(attention)] : []),
  ].join('\n');

  const html = emailHtml({
    kicker: 'GOOGLE BUSINESS PROFILE · DAILY 9 AM',
    title: 'Google Business Profile: calls, directions and reviews',
    subtitle: `Latest day reported by Google: ${dLabel ?? 'not yet'} · Reviews as of 09:00 today`,
    body,
    landing: { href: socialLink('all'), label: 'Open the Business Profile report' },
    sources: 'Sources: Google Business Profile (synced every 15 min; Google adds a 2 to 3 day delay), Google reviews (every 15 min).',
    recipients: opts.recipients ?? DEFAULT_RECIPIENTS,
    preview: opts.preview,
  });
  return finishEmail(gbpSubject(data, today), html);
}
