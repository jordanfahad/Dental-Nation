/**
 * Reader for the DN-032 Channels preview at /next/channels.
 *
 * ONE RULE - NO NEW ARITHMETIC. Every figure is a straight projection of what
 * the 09:00 emails already read:
 *   - readPerformanceDaily (lib/alerts/performanceDaily.ts) for the Growth
 *     month-to-date channel rows (enquiries, booked, spend and the Growth
 *     table's own cost per enquiry), ad spend, the branded click share and
 *     the Instagram figures;
 *   - readGbpDaily (lib/alerts/gbpDaily.ts) for Google profile calls, month
 *     to the latest day Google has reported, added over the branches exactly
 *     as the Social tab's all-clinics lens adds them (buildGmbReport sums the
 *     branches with data; branches without data are named, not hidden).
 * The only calculation added here is the total cost per enquiry = ad spend
 * MTD divided by measured MTD enquiries, the same rule the Overview already
 * shows (lib/overview/read.ts), unavailable when either side is missing.
 * Proof URLs are built here, server side, with the SAME builders the morning
 * emails use (lib/alerts/links.ts), so a figure's drawer always opens exactly
 * the view the email links for the same dates and clinic.
 *
 * buildChannels is pure; readChannels does the reading and never throws for a
 * missing source (a source that cannot be read becomes null, which the page
 * renders as "Unavailable", never 0).
 */
import type { AdminClient } from '@/lib/supabase/server';
import { CHANNEL_NAMES, readPerformanceDaily, type PerformanceDailyData } from '@/lib/alerts/performanceDaily';
import { GBP_CLINIC_NAMES, readGbpDaily, type GbpDailyData } from '@/lib/alerts/gbpDaily';
import { CHANNELS } from '@/config/growth-channels';
import {
  digitalLink, growthLink, growthPatientsLink, marketingLink, periods, periodsFor, socialLink, type Range,
} from '@/lib/alerts/links';
import { emptyPerformance } from './read';

/** One Growth channel row as the Growth table prints it, named for the view. */
export interface ChannelRow {
  key: string;
  name: string;
  enquiries: number;
  booked: number;
  /** AED in the window; null where the Growth table shows no spend. */
  spend: number | null;
  /** Cost per enquiry as the Growth table prints it; null where it prints none. */
  costPerEnquiry: number | null;
  /** True when the Growth table marks the cost approximate (paid search: it counts modelled phone enquiries). */
  costIsEstimate: boolean;
  /** The patient list behind this channel, same dates - the email's "Patients" proof. */
  patientsUrl: string;
}

export interface ChannelsData {
  /** Dubai today (the page is opened on this day; figures cover up to yesterday). */
  today: string;
  mtd: Range;
  /** Growth MTD channel rows in the reader's own order; null = the window could not be read. */
  rows: ChannelRow[] | null;
  /** Growth MTD totals plus the stored ad spend; cost per enquiry is the Overview's spend/enquiries rule. */
  totals: { enquiries: number | null; booked: number | null; spend: number | null; costPerEnquiry: number | null };
  urls: { growthMtd: string; spendMtd: string };
  /** The largest channel by MTD enquiries (ties keep the Growth order); null when no channel has an enquiry. */
  biggest: ChannelRow | null;
  /** Google profile calls, 1st of the reported month to the latest day Google has reported for every branch. */
  gbpCalls: {
    value: number | null;
    /** The latest fully reported day (the "through" label); null = Google has not reported. */
    throughDay: string | null;
    range: Range | null;
    url: string;
    /** Branches Google has not reported, by name - the sum covers the others only. */
    missing: string[];
  };
  /**
   * Branded share of sampled search clicks with its own available-through
   * window. Like gbpCalls, the url is always present: the Digital view the
   * audit maps M28 to, pinned to the sample's window when one exists and live
   * otherwise, so an unavailable share never borrows another figure's proof.
   */
  share: { percent: number | null; range: Range | null; url: string };
  instagram: { followers: number | null; reachMtd: number | null; url: string };
}

/** The view's channel names: the email's names first, then the taxonomy label. */
const channelName = (key: string) => CHANNEL_NAMES[key] ?? CHANNELS.find((c) => c.key === key)?.label ?? key;

/** Total over the branches with data, exactly like unansweredTotal (lib/alerts/gbpDaily.ts). */
const sumOf = (vals: (number | null | undefined)[]) => {
  const xs = vals.filter((v): v is number => v != null);
  return xs.length ? xs.reduce((a, b) => a + b, 0) : null;
};

/** Pure projection of the email readers' data into the Channels shape. */
export function buildChannels(perf: PerformanceDailyData, gbp: GbpDailyData | null, today: string, range?: Range): ChannelsData {
  const p = range ? periodsFor(range) : periods(today);
  const g = perf.growth.mtd;

  const rows: ChannelRow[] | null = g
    ? g.channels.map((c) => ({
        key: c.key,
        name: channelName(c.key),
        enquiries: c.enquiries,
        booked: c.booked,
        spend: c.spend,
        costPerEnquiry: c.costPerEnquiry,
        costIsEstimate: c.costIsEstimate,
        patientsUrl: growthPatientsLink(p.mtd, c.key),
      }))
    : null;

  const spendMtd = perf.adSpendMtd;
  const enqMtd = g?.enquiries ?? null;
  // The Overview's one allowed ratio: spend MTD over measured MTD enquiries.
  const costPerEnquiry = spendMtd != null && enqMtd != null && enqMtd > 0 ? spendMtd / enqMtd : null;

  // The largest channel by enquiries; a tie keeps the Growth channel order.
  let biggest: ChannelRow | null = null;
  if (rows) for (const r of rows) if (r.enquiries > 0 && (!biggest || r.enquiries > biggest.enquiries)) biggest = r;

  // Google profile calls: the same month-to-reported-day window the GBP email
  // prints per branch, added over the branches with data (the Social tab's
  // all-clinics lens adds available branches the same way).
  const D = gbp?.latestDay ?? null;
  const gbpRange = D ? { from: `${D.slice(0, 7)}-01`, to: D } : null;
  const gbpCalls = {
    value: gbp && D ? sumOf(gbp.branches.map((b) => b.mtd?.calls)) : null,
    throughDay: D,
    range: gbpRange,
    url: socialLink('all', gbpRange ?? undefined),
    missing: gbp ? gbp.branches.filter((b) => b.status !== 'ok').map((b) => GBP_CLINIC_NAMES[b.key]) : [],
  };

  const shareRange = perf.brandedShare ? { from: perf.brandedShare.from, to: perf.brandedShare.to } : null;
  const share = {
    percent: perf.brandedShare?.percent ?? null,
    range: shareRange,
    url: digitalLink(shareRange ?? undefined),
  };

  return {
    today,
    mtd: p.mtd,
    rows,
    totals: { enquiries: enqMtd, booked: g?.booked ?? null, spend: spendMtd, costPerEnquiry },
    urls: { growthMtd: growthLink(p.mtd), spendMtd: marketingLink('overview', p.mtd, { mchan: 'performance' }) },
    biggest,
    gbpCalls,
    share,
    // The same proof the morning email uses for the Instagram line (igLink).
    instagram: { followers: perf.instagram.followers, reachMtd: perf.instagram.reachMtd, url: socialLink('all', p.mtd) },
  };
}

/**
 * Read everything the Channels page shows, through the email readers; never throws.
 * `range` (optional, the page's date control) replaces month to yesterday;
 * Google profile calls keep their own month to the latest reported day.
 */
export async function readChannels(db: AdminClient | null, today: string, range?: Range): Promise<ChannelsData> {
  if (!db) return buildChannels(emptyPerformance(), null, today, range);
  const p = range ? periodsFor(range) : periods(today);
  const [perf, gbp] = await Promise.all([
    readPerformanceDaily(db, today, p).catch(() => emptyPerformance()),
    readGbpDaily(db, today).catch(() => null),
  ]);
  return buildChannels(perf, gbp, today, range);
}
