/**
 * Reader for the DN-032 Overview preview at /next.
 *
 * ONE RULE - NO NEW ARITHMETIC. Every figure is a straight projection of what
 * the 09:00 emails already read:
 *   - readPerformanceDaily (lib/alerts/performanceDaily.ts) for growth windows,
 *     clinic figures, ad spend, Smile Club members and Google reviews;
 *   - unansweredTotal(readGbpDaily(...)) (lib/alerts/gbpDaily.ts) for written
 *     reviews awaiting a reply.
 * The only calculation added here is cost per enquiry = ad spend MTD divided
 * by measured MTD enquiries (unavailable when either is missing or enquiries
 * are zero). Proof URLs are built here, server side, with the SAME builders
 * the morning email uses (lib/alerts/links.ts), so a figure's drawer always
 * opens exactly the view the email links for the same dates and clinic.
 *
 * buildOverview is pure; readOverview does the reading and never throws for a
 * missing source (a source that cannot be read becomes null, which the page
 * renders as "Unavailable", never 0).
 */
import type { AdminClient } from '@/lib/supabase/server';
import {
  CHANNEL_NAMES, MOVER_MIN, biggestMovers, readPerformanceDaily, spanLabel,
  type Mover, type PerfClinicKey, type PerformanceDailyData,
} from '@/lib/alerts/performanceDaily';
import { readGbpDaily, unansweredTotal } from '@/lib/alerts/gbpDaily';
import {
  SMILE_CLUB_COMPANIES, executiveLink, growthLink, marketingLink, periods, periodsFor, practoRevenueLink,
  socialLink, type ExecClinic, type Range,
} from '@/lib/alerts/links';
import { AL_MAHER_PRACTO_FROM } from '@/config/clinics';
import { dayMonthYear } from './format';

/** A month-to-date figure with its yesterday companion. */
export interface WindowFig { mtd: number | null; yesterday: number | null }

/** One enquiry mover, already named in plain words for the view. */
export interface OverviewMover { name: string; now: number; before: number }

export interface ClinicLens {
  key: PerfClinicKey;
  /** As the mockup prints it ("Al Wasl", not the email's longer name). */
  name: string;
  /** Small line under the clinic name ("Patient-system feed", feed-start note). */
  feedNote: string;
  booked: WindowFig;
  attended: WindowFig;
  billed: WindowFig;
  /** Executive view pinned to this lens, month to date / yesterday - the email's proof. */
  urlMtd: string;
  urlYesterday: string;
}

export interface OverviewData {
  /** Dubai today (the page is opened on this day; figures cover up to yesterday). */
  today: string;
  windows: { yesterday: Range; mtd: Range; last7: Range; prior7: Range };
  /** "21 to 27 Oct" style labels for the two 7-day windows. */
  labels: { last7: string; prior7: string };
  enquiries: { mtd: number | null; yesterday: number | null; urlMtd: string; urlYesterday: string };
  /** Google + Meta, month to date; the readers carry no per-day spend, so there is no yesterday figure. */
  spend: { mtd: number | null; urlMtd: string };
  /** Spend MTD over measured MTD enquiries; null unless both exist and enquiries > 0. */
  costPerEnquiry: { mtd: number | null; urlMtd: string };
  trend: { last7: number | null; prior7: number | null; urlLast7: string; urlPrior7: string };
  /** Biggest enquiry movers, last 7 days against the 7 before; null when either window could not be read. */
  movers: { up: OverviewMover | null; down: OverviewMover | null; min: number } | null;
  /** Al Wasl, Dr Tosun, Al Maher, then the connected-clinics group row. */
  clinics: ClinicLens[];
  /** Company-reported members; the proof opens the Smile Club company pipeline. */
  smileClubMembers: { value: number | null; url: string };
  /** Always unavailable at definition version 1 (see M25); the URL opens the nearest existing detail. */
  orthoProgramme: { url: string };
  reviews: { total: number | null; average: number | null; url: string };
  awaitingReply: { value: number | null; url: string };
}

const CLINIC_LENSES: { key: ExecClinic; name: string }[] = [
  { key: 'dental-nation', name: 'Al Wasl' },
  { key: 'dr-tosun', name: 'Dr Tosun Dental Clinic' },
  { key: 'al-maher', name: 'Al Maher Medical Centre' },
];


const named = (m: Mover | null): OverviewMover | null =>
  m ? { name: CHANNEL_NAMES[m.key] ?? m.key, now: m.now, before: m.before } : null;
const namedMovers = (m: { up: Mover | null; down: Mover | null }) =>
  ({ up: named(m.up), down: named(m.down), min: MOVER_MIN });

/** Pure projection of the email readers' data into the Overview shape. */
export function buildOverview(
  perf: PerformanceDailyData, awaitingReply: number | null, today: string, range?: Range,
): OverviewData {
  const p = range ? periodsFor(range) : periods(today);
  const g = perf.growth;

  const spendMtd = perf.adSpendMtd;
  const enqMtd = g.mtd?.enquiries ?? null;
  const costPerEnquiry = spendMtd != null && enqMtd != null && enqMtd > 0 ? spendMtd / enqMtd : null;

  const lens = (key: PerfClinicKey, name: string, feedNote: string, clinic?: ExecClinic): ClinicLens => {
    const c = perf.clinics[key];
    return {
      key, name, feedNote,
      booked: { mtd: c.mtd.booked, yesterday: c.yesterday.booked },
      attended: { mtd: c.mtd.showed, yesterday: c.yesterday.showed },
      billed: { mtd: c.mtd.billed, yesterday: c.yesterday.billed },
      urlMtd: executiveLink(p.mtd, clinic),
      urlYesterday: executiveLink(p.yesterday, clinic),
    };
  };

  return {
    today,
    windows: p,
    labels: { last7: spanLabel(p.last7), prior7: spanLabel(p.prior7) },
    enquiries: {
      mtd: enqMtd,
      yesterday: g.yesterday?.enquiries ?? null,
      urlMtd: growthLink(p.mtd),
      urlYesterday: growthLink(p.yesterday),
    },
    spend: { mtd: spendMtd, urlMtd: marketingLink('overview', p.mtd, { mchan: 'performance' }) },
    costPerEnquiry: { mtd: costPerEnquiry, urlMtd: growthLink(p.mtd) },
    trend: {
      last7: g.last7?.enquiries ?? null,
      prior7: g.prior7?.enquiries ?? null,
      urlLast7: growthLink(p.last7),
      urlPrior7: growthLink(p.prior7),
    },
    movers: g.last7 && g.prior7 ? namedMovers(biggestMovers(g.last7, g.prior7)) : null,
    clinics: [
      lens('dental-nation', CLINIC_LENSES[0].name, 'Patient-system feed', 'dental-nation'),
      lens('dr-tosun', CLINIC_LENSES[1].name, 'Patient-system feed', 'dr-tosun'),
      lens('al-maher', CLINIC_LENSES[2].name, `Patient-system feed from ${dayMonthYear(AL_MAHER_PRACTO_FROM)}`, 'al-maher'),
      lens('group', 'Connected clinics', 'All connected feeds together', undefined),
    ],
    smileClubMembers: { value: perf.smileClubMembers, url: SMILE_CLUB_COMPANIES },
    orthoProgramme: { url: practoRevenueLink('dental-nation', p.mtd) },
    reviews: { total: perf.reviews?.total ?? null, average: perf.reviews?.average ?? null, url: socialLink('all') },
    awaitingReply: { value: awaitingReply, url: socialLink('all') },
  };
}

/** Every source empty: the page then shows "Unavailable" everywhere, never 0. */
export function emptyPerformance(): PerformanceDailyData {
  const none = { booked: null, showed: null, billed: null };
  const clinic = { yesterday: { ...none }, mtd: { ...none } };
  return {
    growth: { yesterday: null, mtd: null, last7: null, prior7: null },
    clinics: {
      'dental-nation': { yesterday: { ...none }, mtd: { ...none } },
      'dr-tosun': { yesterday: { ...none }, mtd: { ...none } },
      'al-maher': { yesterday: { ...none }, mtd: { ...none } },
      group: clinic,
    },
    adSpendMtd: null,
    orthoBillingMtd: null,
    smileClubMembers: null,
    reviews: null,
    brandSearches: null,
    brandedShare: null,
    instagram: { followers: null, reachMtd: null },
  };
}

/**
 * Read everything the Overview shows, through the email readers; never throws.
 * `range` (optional, the page's date control) replaces month to yesterday;
 * the windows are then periodsFor(range). Reviews and replies stay live.
 */
export async function readOverview(db: AdminClient | null, today: string, range?: Range): Promise<OverviewData> {
  if (!db) return buildOverview(emptyPerformance(), null, today, range);
  const p = range ? periodsFor(range) : periods(today);
  const [perf, awaitingReply] = await Promise.all([
    readPerformanceDaily(db, today, p).catch(() => emptyPerformance()),
    (async () => {
      try { return unansweredTotal(await readGbpDaily(db, today)); } catch { return null; }
    })(),
  ]);
  return buildOverview(perf, awaitingReply, today, range);
}
