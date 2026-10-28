/**
 * Daily and month-to-date performance 09:00 email (template 4, approved 24 Oct 2026).
 * To Mr Akbar and Ms Shadi; copied to Fahad.
 *
 * Sections, in order: group at a glance, by clinic, digital marketing by
 * channel, programmes, brand signals, and the last 7 days against the 7
 * before. Every figure links to the reports.dentalnation.com view that shows
 * it (lib/alerts/links.ts) and the layout comes from lib/alerts/shell.ts.
 *
 * Each figure is read with the same function and options as the page it
 * links to, so the emailed number is the number on the proof page:
 *  - Enquiries, bookings, shows, channel spend and cost per enquiry:
 *    getChannelPerformance(range, clinic, db) with the Growth page's default
 *    options (GrowthPlatform.tsx). Executive's "Appointments booked" and
 *    "Appointments attended" are the same report's totals for its clinic lens
 *    (lib/executive/report.ts), and a report with no appointment feed rows is
 *    "not yet" (Executive then falls back to another source).
 *  - Billed revenue: getPractoSummary({ from, to, clinic }), Executive's
 *    "Clinic revenue" (null unless its source is live). It reads through the
 *    dashboard's own Supabase client, as the page does.
 *  - Ad spend: getAdSpendForRange (Meta + Google insight rows in the window),
 *    the Marketing "Performance / Paid" spend.
 *  - DN Ortho billing: readOrthoDaily (lib/alerts/orthoDaily.ts).
 *  - Smile Club booked and showed: the Growth "Partnerships (Smile Club)" row;
 *    members: Gautam's company list (loadCorp), as in the Smile Club email.
 *  - Google reviews: getGmbReviewsReport('all'), the Social reviews card.
 *  - Brand searches: the own-brand column of Digital > Competitors
 *    (getCompetitorSnapshots, lane_e.competitor_snapshots).
 *  - Branded share: the Search Console reader (getSearchConsoleReport) over
 *    the 1st of the month to the latest Search Console day, with the Digital
 *    page's branded rule over its top 250 queries; null after 8 seconds.
 *  - Instagram: getSocialReport for the month to date, as the Social tab.
 *
 * Enquiries are tracked for all clinics together, so they are not split by
 * clinic. Al Maher's bookings and bills are in Practo from 22 Oct 2026
 * (AL_MAHER_PRACTO_FROM); earlier dates have none.
 *
 * readPerformanceDaily is read-only and never throws for one missing source:
 * a source that cannot be read becomes null and renders "not yet".
 * buildPerformanceDaily is pure.
 */
import type { AdminClient } from '@/lib/supabase/server';
import { AL_MAHER_PRACTO_FROM, type ClinicFilterKey } from '@/config/clinics';
import { CHANNELS } from '@/config/growth-channels';
import { COMPETITORS, OWN } from '@/config/competitors';
import { getChannelPerformance, type GrowthPerfClinic, type GrowthReport } from '@/lib/growth/channelPerformance';
import { getPractoSummary } from '@/lib/practo/report';
import { getAdSpendForRange } from '@/lib/marketing/report';
import { getGmbReviewsReport } from '@/lib/analytics/gmb-reviews';
import { getSocialReport } from '@/lib/social/report';
import { getSearchConsoleReport } from '@/lib/analytics/search-console';
import { getCompetitorSnapshots, hasData, type CompetitorSnapshot } from '@/lib/analytics/competitor';
import { loadCorp } from '@/lib/smileclub/tracker';
import { readOrthoDaily, ORTHODONTISTS } from '@/lib/alerts/orthoDaily';
import { MEMBERS_TARGET } from '@/lib/alerts/smileclubDaily';
import {
  COMPETITORS_LINK, IMPACT_SMILE_CLUB, digitalLink, executiveLink, growthLink, growthPatientsLink, marketingLink,
  periods, practoRevenueLink, socialLink, type ExecClinic, type Range,
} from '@/lib/alerts/links';
import {
  bold, dayLabel, emailHtml, finishEmail, fmt, h2, list, note, NOT_YET, num, proof, rangeLabel, table, text, tiles, tone,
} from '@/lib/alerts/shell';

/* ── data ── */

/** One Growth channel row, as the Growth channel table prints it. */
export interface PerfChannel {
  key: string;
  /** Measured enquiries (people, deduped by phone). */
  enquiries: number;
  /** Measured appointments booked in the window. */
  booked: number;
  /** Appointments arrived or completed. */
  showed: number;
  /** AED in the window; null where the Growth table shows no spend. */
  spend: number | null;
  /** Cost per enquiry as the Growth table prints it; null where it prints none. */
  costPerEnquiry: number | null;
  /** True when the Growth table marks the cost "≈" (paid search: it includes modelled phone enquiries). */
  costIsEstimate: boolean;
}

/** One Growth report window (all channels); null in the data = could not be read. */
export interface GrowthWindow { enquiries: number; booked: number; showed: number; channels: PerfChannel[] }

/** Booked, showed and billed AED for one clinic lens of the Executive view; null = not available. */
export interface ClinicFigures { booked: number | null; showed: number | null; billed: number | null }
export type PerfClinicKey = ExecClinic | 'group';

export interface PerformanceDailyData {
  /** Growth, gclinic=all. */
  growth: { yesterday: GrowthWindow | null; mtd: GrowthWindow | null; last7: GrowthWindow | null; prior7: GrowthWindow | null };
  /** Executive per clinic lens (and the group, clinic=all). */
  clinics: Record<PerfClinicKey, { yesterday: ClinicFigures; mtd: ClinicFigures }>;
  /** Google + Meta ad spend, month to date (AED). */
  adSpendMtd: number | null;
  /** Billing on finalised bills by the DN Ortho orthodontists, month to date (AED). */
  orthoBillingMtd: number | null;
  /** Company-reported Smile Club members over all companies. */
  smileClubMembers: number | null;
  /** Google reviews over all connected clinics (live at send time). */
  reviews: { total: number; average: number } | null;
  /** Monthly Google searches for "dental nation" (UAE). */
  brandSearches: number | null;
  /** Branded share of Google search clicks (whole percent) from the 1st of the month to the latest Search Console day. */
  brandedShare: { percent: number; from: string; to: string } | null;
  /** Instagram: latest followers and reach summed over the month to date. */
  instagram: { followers: number | null; reachMtd: number | null };
}

/* ── rules ── */

export const PERFORMANCE_DAILY_RECIPIENTS = 'To Mr Akbar and Ms Shadi; copied to Fahad.';
/** The Search Console read is dropped (shown "not yet") after this long. */
export const SEARCH_CONSOLE_TIMEOUT_MS = 8_000;
/** Smallest absolute change in enquiries that counts as a mover. */
export const MOVER_MIN = 3;
/**
 * Branded queries on Digital > Search Console (components/sections/digital/
 * DigitalSeo.tsx, const BRANDED). Kept identical; a test checks the page source.
 */
export const BRANDED_QUERY = /dental\s*nation|dentalnation|beyond the smile/i;

/** Channel table rows, in template order, with the template's names. */
export const CHANNEL_ROWS = [
  { key: 'paid-search', label: 'Paid search (Google)' },
  { key: 'paid-social', label: 'Meta' },
  { key: 'gmb', label: 'Google Business Profile' },
  { key: 'website', label: 'Website' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'partnership', label: 'Partnerships (Smile Club)' },
  { key: 'direct-walkin', label: 'Walk-in' },
] as const;

/** Email names for every Growth channel (movers can be any of them). */
export const CHANNEL_NAMES: Record<string, string> = {
  ...Object.fromEntries(CHANNEL_ROWS.map((c) => [c.key, c.label])),
  'ai-chat': 'AI chat',
  'social-organic': 'Social organic',
  'ai-concierge': 'AI concierge',
  'patient-referral': 'Patient and family referral',
  'doctor-referral': 'Doctor referral',
  influencer: 'Influencers',
  affiliate: 'Affiliates (ArabyAds)',
  retention: 'Existing patients',
};
/** Movers line names; template 4 says "Paid search enquiries", not the table's "Paid search (Google)". */
const MOVER_NAMES: Record<string, string> = { 'paid-search': 'Paid search' };
const channelName = (key: string) => MOVER_NAMES[key] ?? CHANNEL_NAMES[key] ?? CHANNELS.find((c) => c.key === key)?.label ?? key;

/** Clinic rows of the by-clinic table. */
export const CLINIC_ROWS: { key: ExecClinic; name: string }[] = [
  { key: 'dental-nation', name: 'Dental Nation Al Wasl' },
  { key: 'dr-tosun', name: 'Dr. Tosun Dental Clinic' },
  { key: 'al-maher', name: 'Al Maher Medical Centre' },
];

/**
 * A Growth report as the Growth page prints it. No appointment feed rows means
 * the report could not be read (getChannelPerformance returns an empty report
 * on failure), so the window is null rather than zero.
 */
export function growthWindow(report: GrowthReport): GrowthWindow | null {
  if (!report.apptFeedRows) return null;
  return {
    enquiries: report.totals.enquiries,
    booked: report.totals.booked,
    showed: report.totals.showed,
    channels: report.channels.map((c) => {
      // Paid search prints "enquiry ≈AED x" (estCostPerEnquiry, PaidSearchRows.tsx);
      // every other row prints costPerEnquiry; nothing is printed without spend.
      const estimate = c.key === 'paid-search';
      const cost = c.spend == null ? null : estimate ? (c.estCostPerEnquiry ?? null) : c.costPerEnquiry;
      return {
        key: c.key, enquiries: c.enquiries, booked: c.booked, showed: c.showed, spend: c.spend,
        costPerEnquiry: cost, costIsEstimate: estimate && cost != null,
      };
    }),
  };
}

/** Branded share of clicks over the top queries, as Digital > Search Console prints it (whole percent). */
export function brandedClickShare(queries: { query: string; clicks: number }[]): number | null {
  const all = queries.reduce((n, q) => n + (Number(q.clicks) || 0), 0);
  if (!queries.length || all <= 0) return null;
  const branded = queries.filter((q) => BRANDED_QUERY.test(q.query)).reduce((n, q) => n + (Number(q.clicks) || 0), 0);
  return Math.round((branded / all) * 100);
}

/** Own brand searches per month on Digital > Competitors (sum over markets), shown beside the default competitor. */
export function ownBrandSearches(snaps: Map<string, CompetitorSnapshot>): number | null {
  const own = snaps.get(OWN.domain);
  // COMPETITORS_LINK opens the first competitor; without its figures the page shows a gap, not our column.
  if (!hasData(own) || !hasData(snaps.get(COMPETITORS[0].domain))) return null;
  const xs = own.markets.map((m) => m.brandSearches).filter((v): v is number => v != null);
  return xs.length ? xs.reduce((a, b) => a + b, 0) : null;
}

export interface Mover { key: string; now: number; before: number; delta: number }

/**
 * The channel with the biggest rise and the one with the biggest fall in
 * enquiries, each by at least `min`. Ties keep the Growth channel order.
 */
export function biggestMovers(now: GrowthWindow, before: GrowthWindow, min = MOVER_MIN): { up: Mover | null; down: Mover | null } {
  const keys = [...new Set([...now.channels.map((c) => c.key), ...before.channels.map((c) => c.key)])];
  const rows = keys.map((key) => {
    const n = now.channels.find((c) => c.key === key)?.enquiries ?? 0;
    const b = before.channels.find((c) => c.key === key)?.enquiries ?? 0;
    return { key, now: n, before: b, delta: n - b };
  });
  const up = rows.filter((r) => r.delta >= min).reduce<Mover | null>((best, r) => (!best || r.delta > best.delta ? r : best), null);
  const down = rows.filter((r) => r.delta <= -min).reduce<Mover | null>((best, r) => (!best || r.delta < best.delta ? r : best), null);
  return { up, down };
}

/* ── read (read-only, never throws) ── */

const safe = async <T>(f: () => Promise<T>): Promise<T | null> => {
  try { return await f(); } catch { return null; }
};

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('timed out')), ms); });
  return Promise.race([p, limit]).finally(() => clearTimeout(timer));
}

/** 1st of the month to the latest day Search Console has, read exactly as the linked Digital view reads it. */
async function readBrandedShare(mtd: Range): Promise<PerformanceDailyData['brandedShare']> {
  const first = await getSearchConsoleReport({ from: mtd.from, to: mtd.to });
  if (!first.available) return null;
  const last = first.daily.map((d) => d.date).filter((d) => d >= mtd.from && d <= mtd.to).sort().at(-1);
  if (!last) return null;
  const report = last === mtd.to ? first : await getSearchConsoleReport({ from: mtd.from, to: last });
  if (!report.available) return null;
  const percent = brandedClickShare(report.topQueries);
  return percent == null ? null : { percent, from: mtd.from, to: last };
}

export async function readPerformanceDaily(db: AdminClient, today: string): Promise<PerformanceDailyData> {
  const p = periods(today);
  const growth = (r: Range, c: GrowthPerfClinic) => safe(async () => growthWindow(await getChannelPerformance(r, c, db)));
  const billed = (r: Range, clinic: ClinicFilterKey) => safe(async () => {
    const s = await getPractoSummary({ from: r.from, to: r.to, clinic });
    return s.source === 'live' ? s.revenue : null;
  });

  const [
    allY, allM, all7, allP7, waslY, waslM, tosunY, tosunM, maherY, maherM,
    billedAllY, billedAllM, billedWaslY, billedWaslM, billedTosunY, billedTosunM, billedMaherY, billedMaherM,
    adSpendMtd, orthoBillingMtd, smileClubMembers, reviews, brandSearches, brandedShare, instagram,
  ] = await Promise.all([
    growth(p.yesterday, 'all'), growth(p.mtd, 'all'), growth(p.last7, 'all'), growth(p.prior7, 'all'),
    growth(p.yesterday, 'dn-alwasl'), growth(p.mtd, 'dn-alwasl'), growth(p.yesterday, 'dr-tosun'), growth(p.mtd, 'dr-tosun'),
    growth(p.yesterday, 'amc'), growth(p.mtd, 'amc'),
    billed(p.yesterday, 'all'), billed(p.mtd, 'all'), billed(p.yesterday, 'dental-nation'), billed(p.mtd, 'dental-nation'),
    billed(p.yesterday, 'dr-tosun'), billed(p.mtd, 'dr-tosun'), billed(p.yesterday, 'al-maher'), billed(p.mtd, 'al-maher'),
    safe(async () => {
      const s = await getAdSpendForRange(p.mtd.from, p.mtd.to, db);
      return s.rows > 0 ? s.total : null;
    }),
    safe(async () => {
      const ortho = await readOrthoDaily(db, today);
      const xs = ortho.doctors.map((d) => d.billedMtd);
      return xs.length > 0 && xs.every((v) => v != null) ? xs.reduce<number>((a, v) => a + (v ?? 0), 0) : null;
    }),
    safe(async () => {
      const corp = await loadCorp(db);
      // Same rule as the Smile Club email: no companies entered = members not available.
      return corp.companies.length ? corp.companies.reduce((n, c) => n + (Number(c.members) || 0), 0) : null;
    }),
    safe(async () => {
      const r = await getGmbReviewsReport('all', db);
      return r ? { total: r.total, average: r.avg } : null;
    }),
    safe(async () => ownBrandSearches(await getCompetitorSnapshots())),
    safe(() => withTimeout(readBrandedShare(p.mtd), SEARCH_CONSOLE_TIMEOUT_MS)),
    safe(async () => {
      const r = await getSocialReport({ from: p.mtd.from, to: p.mtd.to, gmbClinic: 'all' }, db);
      const ig = r.channels.find((c) => c.channel === 'instagram');
      const metric = (key: string) => ig?.metrics.find((m) => m.key === key)?.value ?? null;
      return { followers: metric('followers'), reachMtd: metric('reach') };
    }),
  ]);

  const figures = (g: GrowthWindow | null, b: number | null): ClinicFigures => ({ booked: g?.booked ?? null, showed: g?.showed ?? null, billed: b });
  return {
    growth: { yesterday: allY, mtd: allM, last7: all7, prior7: allP7 },
    clinics: {
      'dental-nation': { yesterday: figures(waslY, billedWaslY), mtd: figures(waslM, billedWaslM) },
      'dr-tosun': { yesterday: figures(tosunY, billedTosunY), mtd: figures(tosunM, billedTosunM) },
      'al-maher': { yesterday: figures(maherY, billedMaherY), mtd: figures(maherM, billedMaherM) },
      group: { yesterday: figures(allY, billedAllY), mtd: figures(allM, billedAllM) },
    },
    adSpendMtd,
    orthoBillingMtd,
    smileClubMembers,
    reviews,
    brandSearches,
    brandedShare,
    instagram: instagram ?? { followers: null, reachMtd: null },
  };
}

/* ── build (pure) ── */

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);
/** A small linked figure under a tile value. */
const subFigure = (label: string, value: number | null | undefined, href: string) =>
  `<div style="font-size:11px">${text(label)} ${num(value ?? null, href)}</div>`;
const dayMonth = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(`${iso}T12:00:00Z`));
/** "17 to 23 Oct", or "28 Sep to 4 Oct" across a month end. */
export const spanLabel = (r: Range) => (r.from.slice(0, 7) === r.to.slice(0, 7) ? rangeLabel(r.from, r.to) : `${dayMonth(r.from)} to ${dayMonth(r.to)}`);

export function performanceDailySubject(data: PerformanceDailyData, today: string): string {
  const enq = data.growth.yesterday?.enquiries;
  const billedY = data.clinics.group.yesterday.billed;
  const e = enq == null ? 'enquiries not yet' : `${fmt(enq)} ${plural(enq, 'enquiry', 'enquiries')}`;
  const b = billedY == null ? 'billed yesterday not yet' : `AED ${fmt(billedY)} billed yesterday`;
  return `Daily performance · ${dayLabel(today)} · ${e}, ${b}`;
}

export function buildPerformanceDaily(
  data: PerformanceDailyData,
  today: string,
  opts: { preview?: string; recipients?: string } = {},
): { subject: string; html: string } {
  const p = periods(today);
  const g = data.growth;
  const group = data.clinics.group;
  const gY = growthLink(p.yesterday), gM = growthLink(p.mtd);
  const exY = executiveLink(p.yesterday), exM = executiveLink(p.mtd);
  const spendLink = marketingLink('overview', p.mtd, { mchan: 'performance' });

  const glance = tiles([
    { label: 'Enquiries · yesterday (all clinics)', value: g.yesterday?.enquiries ?? null, href: gY, extra: subFigure('Month to date', g.mtd?.enquiries, gM) },
    { label: 'Booked · yesterday', value: group.yesterday.booked, href: exY, extra: subFigure('Month to date', group.mtd.booked, exM) },
    { label: 'Billed revenue · month to date (AED)', value: group.mtd.billed, href: exM, extra: subFigure('Yesterday', group.yesterday.billed, exY) },
    { label: 'Ad spend · month to date (AED)', value: data.adSpendMtd, href: spendLink, sub: 'Google and Meta' },
  ]);

  const clinicRow = (name: string, c: ClinicFigures, m: ClinicFigures, y: string, mo: string) => {
    const any = [c.booked, c.showed, c.billed, m.booked, m.showed, m.billed].some((v) => v != null);
    return [name, num(c.booked, y), num(c.showed, y), num(c.billed, y), num(m.booked, mo), num(m.showed, mo), num(m.billed, mo), any ? proof(mo) : ''];
  };
  const clinicRows = CLINIC_ROWS.map((c) => {
    const f = data.clinics[c.key];
    if (!f) return [text(c.name), NOT_YET, NOT_YET, NOT_YET, NOT_YET, NOT_YET, NOT_YET, ''];
    return clinicRow(text(c.name), f.yesterday, f.mtd, executiveLink(p.yesterday, c.key), executiveLink(p.mtd, c.key));
  });
  clinicRows.push(clinicRow(bold('Group'), group.yesterday, group.mtd, exY, exM));
  const byClinic = table(['Clinic', 'Booked yday', 'Showed yday', 'Billed yday (AED)', 'Booked MTD', 'Showed MTD', 'Billed MTD (AED)', ''], clinicRows, [1, 2, 3, 4, 5, 6]);

  const dash = text('-');
  const channelRows = CHANNEL_ROWS.map(({ key, label }) => {
    const y = g.yesterday?.channels.find((c) => c.key === key) ?? null;
    const m = g.mtd?.channels.find((c) => c.key === key) ?? null;
    const spend = !m ? NOT_YET : m.spend == null ? dash : num(m.spend, gM);
    const cost = !m ? NOT_YET : m.costPerEnquiry == null ? dash : num(`${m.costIsEstimate ? '≈' : ''}${fmt(m.costPerEnquiry)}`, gM);
    return [text(label), num(y?.enquiries ?? null, gY), num(m?.enquiries ?? null, gM), num(m?.booked ?? null, gM), spend, cost,
      m ? proof(growthPatientsLink(p.mtd, key), 'Patients') : ''];
  });
  const byChannel = table(['Channel', 'Enquiries yday', 'Enquiries MTD', 'Booked MTD', 'Spend MTD (AED)', 'Cost per enquiry', ''], channelRows, [1, 2, 3, 4, 5]);
  const estimated = g.mtd?.channels.some((c) => c.key === 'paid-search' && c.costIsEstimate) ?? false;

  const partnership = g.mtd?.channels.find((c) => c.key === 'partnership') ?? null;
  const ortho = practoRevenueLink('dental-nation', p.mtd);
  const programmes = table(['Programme', 'Figure', 'Month to date', ''], [
    [text(`DN Ortho: orthodontist billing (${ORTHODONTISTS.length} doctors)`), text('AED'), num(data.orthoBillingMtd, ortho), data.orthoBillingMtd == null ? '' : proof(ortho)],
    [text('Smile Club: booked / showed'), text('Partnerships row'), `${num(partnership?.booked ?? null, gM)} / ${num(partnership?.showed ?? null, gM)}`, partnership ? proof(gM) : ''],
    [text('Smile Club: members, all companies'), text('Company-reported'),
      data.smileClubMembers == null ? NOT_YET : `${num(data.smileClubMembers, IMPACT_SMILE_CLUB)} ${text(`of ${MEMBERS_TARGET}`)}`,
      data.smileClubMembers == null ? '' : proof(IMPACT_SMILE_CLUB)],
  ]);

  const reviewsLink = socialLink('all');
  const share = data.brandedShare;
  const shareLink = share ? digitalLink({ from: share.from, to: share.to }) : null;
  const igLink = socialLink('all', p.mtd);
  const ig = data.instagram;
  const brand = table(['Signal', 'Latest', ''], [
    [text('Google reviews (3 clinics): total and average'),
      `${num(data.reviews?.total ?? null, reviewsLink)} · ${num(data.reviews ? data.reviews.average.toFixed(2) : null, reviewsLink)}`,
      data.reviews ? proof(reviewsLink) : ''],
    [text('Monthly Google searches for “dental nation” (UAE)'), num(data.brandSearches, COMPETITORS_LINK), data.brandSearches == null ? '' : proof(COMPETITORS_LINK)],
    [text(`Branded share of Google search clicks (${share ? rangeLabel(share.from, share.to) : 'month to date'}, top 250 queries)`),
      share && shareLink ? num(`${share.percent}%`, shareLink) : NOT_YET, shareLink ? proof(shareLink) : ''],
    [text('Instagram followers (latest) and reach (month to date)'),
      `${num(ig.followers, igLink)} / ${num(ig.reachMtd, igLink)}`, ig.followers != null || ig.reachMtd != null ? proof(igLink) : ''],
  ]);

  const l7 = growthLink(p.last7), p7 = growthLink(p.prior7);
  const dates = `${proof(l7, spanLabel(p.last7))} ${proof(p7, spanLabel(p.prior7))}`;
  let movers: string[];
  if (!g.last7 || !g.prior7) {
    movers = [`${text('Enquiries by channel, last 7 days against the 7 before:')} ${NOT_YET}`];
  } else {
    const { up, down } = biggestMovers(g.last7, g.prior7);
    movers = [
      up
        ? `${tone('Up:', 'up')} ${text(`${channelName(up.key)} enquiries`)} ${num(up.now, l7)}${text(', up from')} ${num(up.before, p7)} ${dates}`
        : `${tone('Up:', 'up')} ${text(`no channel rose by ${MOVER_MIN} or more enquiries`)} ${dates}`,
      down
        ? `${tone('Down:', 'down')} ${text(`${channelName(down.key)} enquiries`)} ${num(down.now, l7)}${text(', down from')} ${num(down.before, p7)} ${dates}`
        : `${tone('Down:', 'down')} ${text(`no channel fell by ${MOVER_MIN} or more enquiries`)} ${dates}`,
    ];
  }

  const body = [
    h2('Group at a glance'), glance,
    h2('By clinic'), byClinic,
    note(`Enquiries are tracked for all clinics together, so they appear only in the channel table.${p.mtd.from < AL_MAHER_PRACTO_FROM ? ` Al Maher's bookings and bills are in Practo from ${dayLabel(AL_MAHER_PRACTO_FROM)}.` : ''}`),
    h2('Digital marketing by channel (all clinics)'), byChannel,
    note('Numbers open the Growth channel table for the same dates; "Patients" opens the list of patients behind each channel.'),
    estimated ? note('Paid search enquiries and bookings are measured. Its cost per enquiry is the Growth figure marked ≈, which also counts modelled phone enquiries.') : '',
    h2('Programmes'), programmes,
    h2('Brand signals'), brand,
    h2('Last 7 days vs the 7 before'), list(movers),
  ].join('\n');

  const html = emailHtml({
    kicker: 'PERFORMANCE · DAILY 9 AM',
    title: 'Daily and month-to-date performance',
    subtitle: `${dayLabel(p.yesterday.from)} (yesterday) and ${rangeLabel(p.mtd.from, p.mtd.to)} (month to date) · all clinics`,
    body,
    landing: { href: exM, label: 'Open the full report (month to date)' },
    sources: 'Sources: lead tracker and website enquiries, Practo bookings and bills (cancelled bills excluded), Google Ads and Meta (every 15 min), Google reviews, Search Console (2 to 3 days delay), Instagram.',
    recipients: opts.recipients ?? PERFORMANCE_DAILY_RECIPIENTS,
    preview: opts.preview,
  });
  return finishEmail(performanceDailySubject(data, today), html);
}
