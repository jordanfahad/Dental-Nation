import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Enquiries by PLATFORM (the "how did they reach us" lens), read from the
 * in-house lead tracker (lane_e.leads). The sheet carries two dimensions:
 *   • Inquiry Platform → leads.channel_source  (WhatsApp, Instagram, Walk-in, …)
 *   • Source Type      → leads.medium          (Lead Forms, Website Inquiry, …)
 *
 * This powers the Website Bookings › Platforms sub-tab. It is an ENQUIRY
 * population, deliberately kept distinct from the website booking WIDGET (a
 * different source, its own sub-tab) — the two are never summed into one number.
 *
 * Honest by construction (CLAUDE.md §15): the tracker is thin on funnel fields
 * (booking_date / appointment_date are empty, booking_status is almost always
 * null), so this centres on enquiry VOLUME, MIX and TREND — with qualified /
 * booked surfaced only where the tracker actually carries them, never a
 * fabricated multi-stage funnel. Degrades to a well-formed empty state.
 */

export type PlatformKey =
  | 'whatsapp'
  | 'instagram'
  | 'telegram'
  | 'tiktok'
  | 'website'
  | 'walkin'
  | 'zavis'
  | 'telephone'
  | 'facebook'
  | 'other';

interface PlatformDef {
  key: PlatformKey;
  label: string;
  color: string;
}

// Canonical platforms, in display order. The first six are the CEO's named set;
// the rest are real channels already in the data (shown so nothing is hidden).
// Telegram / TikTok have no rows yet — they render at zero, ready for when they do.
export const PLATFORM_DEFS: PlatformDef[] = [
  { key: 'whatsapp', label: 'WhatsApp', color: '#25D366' },
  { key: 'instagram', label: 'Instagram', color: '#C13584' },
  { key: 'telegram', label: 'Telegram', color: '#2AABEE' },
  { key: 'tiktok', label: 'TikTok', color: '#111111' },
  { key: 'website', label: 'Website forms', color: '#244260' },
  { key: 'walkin', label: 'Walk-ins', color: '#B07A1E' },
  { key: 'zavis', label: 'ZAVIS', color: '#5793A3' },
  { key: 'telephone', label: 'Telephone', color: '#6D28D9' },
  { key: 'facebook', label: 'Facebook', color: '#1877F2' },
  { key: 'other', label: 'Other', color: '#9AA6B2' },
];

const LABEL_OF = new Map(PLATFORM_DEFS.map((p) => [p.key, p.label] as const));
const COLOR_OF = new Map(PLATFORM_DEFS.map((p) => [p.key, p.color] as const));

/**
 * Classify a lead into exactly one platform bucket. Source Type = "Website
 * Inquiry" wins first (per the CEO: website-form enquiries belong under Website
 * forms even when the platform column says WhatsApp); otherwise we key off the
 * Inquiry Platform (channel_source). Returns null for sheet header junk.
 */
export function classifyPlatform(
  channelSource: string | null | undefined,
  medium: string | null | undefined,
): PlatformKey | null {
  const cs = (channelSource ?? '').trim().toLowerCase();
  const md = (medium ?? '').trim().toLowerCase();

  // Ingested sheet header rows ("Inquiry Platform" / "Source Type") — not data.
  if (cs === 'inquiry platform' || md === 'source type') return null;

  // Website-form enquiries → Website forms, regardless of platform column.
  if (/website|web form|web-form|site inquiry|site enquiry/.test(md)) return 'website';

  if (/whatsapp|whats app|\bwa\b/.test(cs)) return 'whatsapp';
  if (/instagram|insta|\big\b/.test(cs)) return 'instagram';
  if (/telegram/.test(cs)) return 'telegram';
  if (/tiktok|tik tok/.test(cs)) return 'tiktok';
  if (/walk\s*-?\s*in/.test(cs)) return 'walkin';
  if (/zavis/.test(cs)) return 'zavis';
  if (/telephone|phone|\bcall/.test(cs)) return 'telephone';
  if (/facebook|\bfb\b|meta/.test(cs)) return 'facebook';
  // A lead with no platform but a website source type already went to 'website'.
  if (!cs) return 'other';
  return 'other';
}

export interface PlatformStat {
  key: PlatformKey;
  label: string;
  color: string;
  enquiries: number;
  qualified: number;
  booked: number;
  sharePct: number; // of total enquiries in range
  lastDate: string | null; // most recent enquiry_date
}

export interface RecentEnquiry {
  date: string | null;
  platformKey: PlatformKey;
  platformLabel: string;
  sourceType: string | null; // medium
  offer: string | null;
  treatment: string | null;
  qualified: boolean;
  booked: boolean;
}

export interface BookingsPlatformsReport {
  from: string;
  to: string;
  source: 'live' | 'empty';
  totalEnquiries: number;
  qualifiedTotal: number;
  bookedTotal: number;
  activePlatforms: number;
  topPlatform: { label: string; enquiries: number } | null;
  platforms: PlatformStat[];
  /** Daily total enquiries across all platforms (for the trend chart). */
  byDay: { date: string; count: number }[];
  recent: RecentEnquiry[];
  /** Website booking-widget count in the same window (a DIFFERENT source, shown
   *  beside the Website-forms tile — never summed into enquiries). */
  widgetBookings: number | null;
}

interface LeadRow {
  inquiry_date: string | null;
  channel_source: string | null;
  medium: string | null;
  offer: string | null;
  treatment_signal: string | null;
  is_qualified: boolean | null;
  booking_status: string | null;
}

function bookedFrom(status: string | null): boolean {
  const s = (status ?? '').trim().toLowerCase();
  return s === 'booked' || s === 'confirmed' || s === 'attended' || s === 'completed';
}

export async function getBookingsPlatforms(opts: {
  from: string;
  to: string;
  widgetBookings?: number | null;
}): Promise<BookingsPlatformsReport> {
  const { from, to } = opts;
  const empty = (): BookingsPlatformsReport => ({
    from,
    to,
    source: 'empty',
    totalEnquiries: 0,
    qualifiedTotal: 0,
    bookedTotal: 0,
    activePlatforms: 0,
    topPlatform: null,
    platforms: PLATFORM_DEFS.map((p) => ({
      key: p.key,
      label: p.label,
      color: p.color,
      enquiries: 0,
      qualified: 0,
      booked: 0,
      sharePct: 0,
      lastDate: null,
    })),
    byDay: [],
    recent: [],
    widgetBookings: opts.widgetBookings ?? null,
  });

  const db = getSupabaseAdmin();
  if (!db) return empty();

  let rows: LeadRow[] = [];
  try {
    let q = db
      .from('leads')
      .select('inquiry_date, channel_source, medium, offer, treatment_signal, is_qualified, booking_status');
    if (from) q = q.gte('inquiry_date', from);
    if (to) q = q.lte('inquiry_date', to);
    const { data } = await q;
    rows = (data as LeadRow[] | null) ?? [];
  } catch {
    return empty();
  }

  // Aggregate per platform.
  const acc = new Map<
    PlatformKey,
    { enquiries: number; qualified: number; booked: number; lastDate: string | null }
  >();
  for (const p of PLATFORM_DEFS) acc.set(p.key, { enquiries: 0, qualified: 0, booked: 0, lastDate: null });

  const byDayMap = new Map<string, number>();
  const recent: RecentEnquiry[] = [];

  for (const r of rows) {
    const key = classifyPlatform(r.channel_source, r.medium);
    if (!key) continue; // header junk
    const a = acc.get(key)!;
    a.enquiries += 1;
    const qualified = r.is_qualified === true;
    const booked = bookedFrom(r.booking_status);
    if (qualified) a.qualified += 1;
    if (booked) a.booked += 1;
    if (r.inquiry_date && (!a.lastDate || r.inquiry_date > a.lastDate)) a.lastDate = r.inquiry_date;
    if (r.inquiry_date) byDayMap.set(r.inquiry_date, (byDayMap.get(r.inquiry_date) ?? 0) + 1);
    recent.push({
      date: r.inquiry_date,
      platformKey: key,
      platformLabel: LABEL_OF.get(key) ?? 'Other',
      sourceType: r.medium,
      offer: r.offer,
      treatment: r.treatment_signal,
      qualified,
      booked,
    });
  }

  const totalEnquiries = [...acc.values()].reduce((s, v) => s + v.enquiries, 0);
  if (totalEnquiries === 0) return { ...empty(), source: 'empty' };

  const platforms: PlatformStat[] = PLATFORM_DEFS.map((p) => {
    const a = acc.get(p.key)!;
    return {
      key: p.key,
      label: p.label,
      color: p.color,
      enquiries: a.enquiries,
      qualified: a.qualified,
      booked: a.booked,
      sharePct: totalEnquiries > 0 ? a.enquiries / totalEnquiries : 0,
      lastDate: a.lastDate,
    };
  });

  const ranked = [...platforms].filter((p) => p.enquiries > 0).sort((a, b) => b.enquiries - a.enquiries);
  const byDay = [...byDayMap.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Most recent enquiries first, capped for the table.
  recent.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

  return {
    from,
    to,
    source: 'live',
    totalEnquiries,
    qualifiedTotal: platforms.reduce((s, p) => s + p.qualified, 0),
    bookedTotal: platforms.reduce((s, p) => s + p.booked, 0),
    activePlatforms: ranked.length,
    topPlatform: ranked[0] ? { label: ranked[0].label, enquiries: ranked[0].enquiries } : null,
    platforms,
    byDay,
    recent: recent.slice(0, 60),
    widgetBookings: opts.widgetBookings ?? null,
  };
}

export const platformColor = (key: PlatformKey): string => COLOR_OF.get(key) ?? '#9AA6B2';
