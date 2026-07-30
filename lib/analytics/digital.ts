import 'server-only';
import { getGoogleAnalyticsReport } from './report';
import { getSiteSpeedReport } from './site-speed';
import { getSearchConsoleReport } from './search-console';
import { getSocialReport } from '@/lib/social/report';
import { GA4_EMIRATES } from '@/config/ga4';
import type { SearchConsoleReport } from '@/lib/sync/adapters/search-console-adapter';

/**
 * Digital & SEO composite for the dashboard tab + the board report. Pulls from
 * sources we already have: GA4 (traffic, channels incl. organic/SEO + paid,
 * geography, demographics, booking-widget funnel), Google PageSpeed (Lighthouse
 * on-page SEO / accessibility / best-practices / performance scores) and the
 * social feed (followers / reach / engagement). `pagesIndexed` stays null until
 * Google Search Console is wired.
 */

export interface ChannelRow { label: string; sessions: number; users: number; leads: number }
export interface NamedCount { label: string; sessions: number }
export interface SocialSnap { channel: string; label: string; followers: number | null; reach: number | null; engagement: number | null }

export interface DigitalSeoReport {
  ga4Available: boolean;
  ga4Note: string | null;
  traffic: { sessions: number; users: number; newUsers: number | null } | null;
  channels: ChannelRow[];
  organicSessions: number;
  paidSessions: number;
  funnel: { viewed: number; opened: number; submitted: number };
  byEmirate: NamedCount[];
  gender: NamedCount[];
  age: NamedCount[];
  seo: { seo: number | null; accessibility: number | null; bestPractices: number | null; performance: number | null } | null;
  social: SocialSnap[];
  pagesIndexed: number | null;
  search: SearchConsoleReport | null; // Google Search Console (organic search)
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const isOrganic = (c: string) => /organic search/i.test(c);
const isPaid = (c: string) => /paid|cpc|display|shopping/i.test(c);

/**
 * Await a source with a hard time budget. None of the four upstreams (GA4,
 * PageSpeed, Meta social, Search Console) fails fast when a Google/Meta API
 * throttles or stalls — and one stalled source used to hold the WHOLE tab at
 * the skeleton until the function limit, which reads as "not loading". A
 * source that misses its budget degrades to its fallback (an honest data gap
 * on the page) and the timing is logged so the culprit is visible in Vercel.
 */
async function timed<T>(name: string, p: Promise<T>, ms: number, fallback: T): Promise<T> {
  const t0 = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const raced = await Promise.race([
    p.then((v) => ({ v, timedOut: false as const })),
    new Promise<{ v: T; timedOut: true }>((resolve) => {
      timer = setTimeout(() => resolve({ v: fallback, timedOut: true }), ms);
    }),
  ]);
  if (timer) clearTimeout(timer);
  console.log(`[digital-seo] ${name}: ${raced.timedOut ? `TIMED OUT after ${ms}ms` : `ok in ${Date.now() - t0}ms`}`);
  return raced.v;
}

type GaReport = Awaited<ReturnType<typeof getGoogleAnalyticsReport>>;

export async function getDigitalSeo(range: { from?: string; to?: string }): Promise<DigitalSeoReport> {
  const from = range.from ?? '2026-01-01';
  const to = range.to ?? iso(new Date());
  const gaFallback = {
    available: false,
    note: 'GA4 did not respond in time (API slow or throttled) — reload in a minute; the rest of the tab is live.',
    data: null,
    lanes: [],
    lanesNote: null,
  } as unknown as GaReport;
  const [ga, speed, social, search] = await Promise.all([
    timed('ga4', getGoogleAnalyticsReport(range), 60_000, gaFallback),
    timed('pagespeed', getSiteSpeedReport().catch(() => null), 30_000, null),
    timed('social', getSocialReport({ from, to }).catch(() => null), 25_000, null),
    timed('search-console', getSearchConsoleReport(range).catch(() => null), 25_000, null),
  ]);

  const data = ga.data;
  const traffic = data ? { sessions: data.totals.sessions, users: data.totals.users, newUsers: (data.totals as { newUsers?: number }).newUsers ?? null } : null;

  const channels: ChannelRow[] = (data?.byChannel ?? []).map((c) => ({ label: c.key, sessions: c.sessions, users: c.users, leads: c.leads }));
  const organicSessions = channels.filter((c) => isOrganic(c.label)).reduce((s, c) => s + c.sessions, 0);
  const paidSessions = channels.filter((c) => isPaid(c.label)).reduce((s, c) => s + c.sessions, 0);

  // Booking-widget funnel + geography from the GA4 lane cross-tab (all lanes,
  // all geo buckets summed).
  let viewed = 0, opened = 0, submitted = 0;
  const emirate = new Map<string, number>();
  for (const lane of ga.lanes ?? []) {
    for (const [bucket, m] of Object.entries(lane.geo ?? {})) {
      viewed += m.widgetViews;
      opened += m.bookingIntent;
      submitted += m.leads;
      if (bucket !== 'nonuae') emirate.set(bucket, (emirate.get(bucket) ?? 0) + m.sessions);
    }
  }
  const emirateLabel = (k: string) => GA4_EMIRATES.find((e) => e.key === k)?.label ?? (k === 'uaeother' ? 'Other UAE' : k);
  const byEmirate: NamedCount[] = [...emirate.entries()]
    .map(([key, sessions]) => ({ label: emirateLabel(key), sessions }))
    .filter((r) => r.sessions > 0)
    .sort((a, b) => b.sessions - a.sessions);

  const gender: NamedCount[] = (data?.byGender ?? []).map((g) => ({ label: g.key, sessions: g.sessions }));
  const age: NamedCount[] = (data?.byAge ?? []).map((a) => ({ label: a.key, sessions: a.sessions }));

  const m = speed?.mobile ?? speed?.desktop ?? null;
  const seo = m ? { seo: m.seoScore, accessibility: m.accessibilityScore, bestPractices: m.bestPracticesScore, performance: m.performanceScore } : null;

  // Social snapshot: pull followers (stock), reach + engagement (flow) per channel.
  const socialSnap: SocialSnap[] = [];
  for (const ch of social?.channels ?? []) {
    const pick = (re: RegExp) => ch.metrics.find((mm) => re.test(mm.key) || re.test(mm.label ?? ''))?.value ?? null;
    socialSnap.push({
      channel: ch.channel,
      label: ch.label,
      followers: pick(/follower|fan_count|fans/i),
      reach: pick(/reach|impression/i),
      engagement: pick(/engage|interaction/i),
    });
  }

  return {
    ga4Available: ga.available,
    ga4Note: ga.note,
    traffic,
    channels: channels.sort((a, b) => b.sessions - a.sessions),
    organicSessions,
    paidSessions,
    funnel: { viewed, opened, submitted },
    byEmirate,
    gender,
    age,
    seo,
    social: socialSnap,
    pagesIndexed: search?.pagesIndexed ?? null,
    search: search ?? null,
  };
}
