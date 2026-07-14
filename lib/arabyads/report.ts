import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getCrmReport } from '@/lib/crm/report';
import { getPractoSummary } from '@/lib/practo/report';
import { isGoogleConfigured } from '@/lib/sync/google-auth';
import { fetchGa4ArabyAds, type Ga4ArabyAds } from '@/lib/sync/adapters/ga4-adapter';
import type { MixRow } from '@/lib/types';

/**
 * Araby Ads campaign report. The campaign drives paid traffic to three landing
 * pages; those visitors fill the on-site Booking Widget, which stamps the source
 * into its "Source" column (e.g. "ArabyAds / dental_nation_glowup (PID:x,
 * SUB:y)"). That column — surfaced from the bronze `raw_zavis` rows — is the
 * ground-truth conversion signal. We pair it with GA4 traffic, the lead/enquiry
 * trend across all channels (to spot a surge), and a Practo clinic-side
 * reference, so the CEO can judge whether the campaign is working.
 *
 * Honest by construction: test/seed bookings (Sagar / zavis / test / TESTPID)
 * are counted separately, never mixed into the real totals; every absent source
 * degrades to an explicit empty state, never a fabricated 0.
 */

export interface ArabyLane {
  key: 'glowup' | 'sos' | 'scan';
  label: string;
  laneCode: string; // internal "Lane E/D/J"
  url: string;
  campaign: string; // utm_campaign
  /** ArabyAds rate per confirmed booking event (AED, excl VAT). */
  cpl: number;
  /** The label ArabyAds uses in the rate card, when different from `label`. */
  billingName: string;
}

// Commercial model: pay-per-confirmed-booking. Rates from the ArabyAds rate
// card. "Ortho" maps to the /scan landing page by elimination (Glow↔glow-up,
// SOS↔sos) — confirm with the vendor if the /scan page isn't the Ortho offer.
export const ARABY_LANES: ArabyLane[] = [
  { key: 'glowup', label: 'Glow-Up', laneCode: 'Lane E', url: 'https://www.dentalnation.com/en/glow-up', campaign: 'dental_nation_glowup', cpl: 121.19, billingName: 'Glow' },
  { key: 'sos', label: 'SOS', laneCode: 'Lane D', url: 'https://www.dentalnation.com/en/sos', campaign: 'dental_nation_sos', cpl: 97.17, billingName: 'SOS' },
  { key: 'scan', label: 'Scan', laneCode: 'Lane J', url: 'https://www.dentalnation.com/en/scan', campaign: 'dental_nation_scan', cpl: 97.17, billingName: 'Ortho' },
];

/** Total campaign budget cap (AED, exclusive of VAT). */
export const ARABY_BUDGET_CAP = 55088;

const LANE_BY_CAMPAIGN = new Map(ARABY_LANES.map((l) => [l.campaign, l]));

/** Social / messaging enquiry channels we watch for a campaign-driven surge. */
const SOCIAL_CHANNELS = new Set(['whatsapp', 'instagram', 'telegram', 'facebook', 'messenger', 'tiktok']);

export interface ArabyBooking {
  date: string | null;
  lane: ArabyLane | null;
  pid: string | null;
  sub: string | null;
  price: number | null;
  isTest: boolean;
  name: string | null;
}

export interface ArabyPublisher {
  pid: string;
  sub: string;
  lane: string;
  bookings: number;
  revenue: number;
}

export interface ArabyReport {
  configured: boolean;
  source: 'live' | 'empty';
  range: { from: string; to: string };
  lanes: ArabyLane[];
  /** First ArabyAds booking date seen (real or test) — the "campaign live" marker. */
  firstSeen: string | null;
  bookings: {
    total: number; // real ArabyAds bookings in range
    test: number; // test/seed ArabyAds bookings in range (shown separately)
    revenue: number; // AED from real ArabyAds bookings
    byLane: MixRow[];
    daily: { date: string; bookings: number }[];
    byPublisher: ArabyPublisher[];
    recent: ArabyBooking[];
  };
  enquiries: {
    total: number; // leads in range (all channels)
    byChannel: MixRow[];
    social: MixRow[]; // WhatsApp/Instagram/Telegram/… subset
    daily: { date: string; count: number }[];
  };
  practo: {
    appointmentsBooked: number | null;
    clinicRevenue: number | null;
    bills: number | null;
  };
  /**
   * Cost & budget. ArabyAds bills per confirmed booking, so cost = real
   * ArabyAds bookings × the lane's rate. `windowCost` matches the tab's date
   * scope; `toDateCost` is all-time (for the budget cap, a campaign-lifetime
   * figure). Excludes VAT, matching the rate card.
   */
  cost: {
    windowCost: number;
    toDateCost: number;
    budgetCap: number;
    remaining: number;
    utilization: number; // toDateCost / budgetCap (0..1+)
    perLane: { lane: string; laneCode: string; billingName: string; rate: number; bookings: number; cost: number }[];
  };
  ga4: Ga4ArabyAds | null;
}

const num = (v: unknown): number | null => {
  if (v == null) return null;
  const t = String(v).replace(/[^\d.-]/g, '');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

/** Parse the widget "Source" cell → {lane, pid, sub} when it's an ArabyAds row. */
function parseArabySource(raw: string): { lane: ArabyLane | null; pid: string | null; sub: string | null } | null {
  if (!/arabyads/i.test(raw)) return null;
  const m = raw.match(/dental_nation_(glowup|sos|scan)/i);
  const lane = m ? LANE_BY_CAMPAIGN.get(`dental_nation_${m[1].toLowerCase()}`) ?? null : null;
  const pidM = raw.match(/PID:\s*([^,)]*)/i);
  const subM = raw.match(/SUB:\s*([^,)]*)/i);
  return {
    lane,
    pid: pidM ? pidM[1].trim() || null : null,
    sub: subM ? subM[1].trim() || null : null,
  };
}

/** Mirror the sync's booking test rule (normalize.ts isTestBooking). */
function isTestRow(email: string, name: string, pid: string | null): boolean {
  if (/zavis|test/i.test(email) || /test|sagar/i.test(name)) return true;
  if (pid && /test/i.test(pid)) return true;
  return false;
}

function topMix(map: Map<string, number>, limit = 8): MixRow[] {
  const rows = [...map.entries()]
    .map(([label, value]) => ({ label, value: Math.round(value) }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
  if (rows.length <= limit) return rows;
  const head = rows.slice(0, limit - 1);
  const tail = rows.slice(limit - 1).reduce((a, r) => a + r.value, 0);
  return [...head, { label: 'Other', value: tail }];
}

const inRange = (d: string | null, from: string, to: string) => !!d && d >= from && d <= to;

/**
 * Booked-on date from the widget "Timestamp" ("07/14/2026, 14:38:21" →
 * "2026-07-14"). A lead campaign's conversion is WHEN the booking was placed,
 * not the (often future) appointment date — so all ArabyAds rollups scope on
 * this, matching the Website Bookings widget view. null on bad input.
 */
function bookedOnDate(ts: string): string | null {
  const m = (ts ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

export async function getArabyAdsReport(range: { from: string; to: string }): Promise<ArabyReport> {
  const { from, to } = range;
  const empty: ArabyReport = {
    configured: true,
    source: 'empty',
    range,
    lanes: ARABY_LANES,
    firstSeen: null,
    bookings: { total: 0, test: 0, revenue: 0, byLane: [], daily: [], byPublisher: [], recent: [] },
    enquiries: { total: 0, byChannel: [], social: [], daily: [] },
    practo: { appointmentsBooked: null, clinicRevenue: null, bills: null },
    cost: {
      windowCost: 0,
      toDateCost: 0,
      budgetCap: ARABY_BUDGET_CAP,
      remaining: ARABY_BUDGET_CAP,
      utilization: 0,
      perLane: ARABY_LANES.map((l) => ({ lane: l.label, laneCode: l.laneCode, billingName: l.billingName, rate: l.cpl, bookings: 0, cost: 0 })),
    },
    ga4: null,
  };

  const supabase = getSupabaseAdmin();
  if (!supabase) return empty;

  // ── Booking-widget ArabyAds attribution (bronze raw_zavis "Source" column) ──
  let firstSeen: string | null = null;
  const byLane = new Map<string, number>();
  const dailyBook = new Map<string, number>();
  const publishers = new Map<string, ArabyPublisher>();
  const recent: ArabyBooking[] = [];
  // Real (non-test) bookings per lane key: all-time (budget) + window (cost).
  const allTimeByLaneKey = new Map<string, number>();
  const windowByLaneKey = new Map<string, number>();
  let total = 0;
  let test = 0;
  let revenue = 0;
  try {
    const { data } = await supabase.from('raw_zavis').select('data');
    const rows = (data as { data: Record<string, string> }[] | null) ?? [];
    for (const r of rows) {
      const d = r.data ?? {};
      const src = String(d['Source'] ?? '').trim();
      const parsed = src ? parseArabySource(src) : null;
      if (!parsed) continue; // not an ArabyAds row
      // Scope on booked-on (when the lead came in), not the future appointment
      // date — falling back to the appointment Date when no Timestamp.
      const date = bookedOnDate(String(d['Timestamp'] ?? '')) ?? (String(d['Date'] ?? '').slice(0, 10) || null);
      if (date && (!firstSeen || date < firstSeen)) firstSeen = date;

      const name = String(d['Full Name'] ?? '').trim() || null;
      const email = String(d['Email'] ?? '').trim();
      const price = num(d['Price']);
      const isTest = isTestRow(email, name ?? '', parsed.pid);

      // All-time real bookings per lane — the campaign-lifetime cost/budget base.
      if (!isTest && parsed.lane) allTimeByLaneKey.set(parsed.lane.key, (allTimeByLaneKey.get(parsed.lane.key) ?? 0) + 1);

      if (!inRange(date, from, to)) continue;

      recent.push({ date, lane: parsed.lane, pid: parsed.pid, sub: parsed.sub, price, isTest, name });

      if (isTest) {
        test += 1;
        continue; // keep test rows out of the real rollups
      }
      total += 1;
      if (price) revenue += price;
      const laneLabel = parsed.lane?.label ?? 'Unknown lane';
      byLane.set(laneLabel, (byLane.get(laneLabel) ?? 0) + 1);
      if (parsed.lane) windowByLaneKey.set(parsed.lane.key, (windowByLaneKey.get(parsed.lane.key) ?? 0) + 1);
      if (date) dailyBook.set(date, (dailyBook.get(date) ?? 0) + 1);
      const pk = `${parsed.pid ?? '—'}|${parsed.sub ?? '—'}`;
      const pub = publishers.get(pk) ?? { pid: parsed.pid ?? '—', sub: parsed.sub ?? '—', lane: laneLabel, bookings: 0, revenue: 0 };
      pub.bookings += 1;
      pub.revenue += price ?? 0;
      publishers.set(pk, pub);
    }
  } catch {
    /* leave booking rollups empty */
  }
  recent.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

  // Cost = real ArabyAds bookings × the lane's confirmed-booking rate.
  const perLane = ARABY_LANES.map((l) => {
    const bookings = allTimeByLaneKey.get(l.key) ?? 0;
    return { lane: l.label, laneCode: l.laneCode, billingName: l.billingName, rate: l.cpl, bookings, cost: Math.round(bookings * l.cpl) };
  });
  const toDateCost = perLane.reduce((a, x) => a + x.cost, 0);
  const windowCost = ARABY_LANES.reduce((a, l) => a + (windowByLaneKey.get(l.key) ?? 0) * l.cpl, 0);
  const cost = {
    windowCost: Math.round(windowCost),
    toDateCost: Math.round(toDateCost),
    budgetCap: ARABY_BUDGET_CAP,
    remaining: Math.round(ARABY_BUDGET_CAP - toDateCost),
    utilization: ARABY_BUDGET_CAP > 0 ? toDateCost / ARABY_BUDGET_CAP : 0,
    perLane,
  };

  // ── Lead / enquiry trend across all channels (surge detection) ──
  const byChannel = new Map<string, number>();
  const social = new Map<string, number>();
  const dailyEnq = new Map<string, number>();
  let enqTotal = 0;
  try {
    let q = supabase.from('leads').select('inquiry_date, channel_source');
    if (from) q = q.gte('inquiry_date', from);
    if (to) q = q.lte('inquiry_date', to);
    const { data } = await q;
    const rows = (data as { inquiry_date: string | null; channel_source: string | null }[] | null) ?? [];
    for (const r of rows) {
      const date = (r.inquiry_date ?? '').slice(0, 10);
      const ch = (r.channel_source ?? '').trim() || 'Unknown';
      enqTotal += 1;
      byChannel.set(ch, (byChannel.get(ch) ?? 0) + 1);
      if (SOCIAL_CHANNELS.has(ch.toLowerCase())) social.set(ch, (social.get(ch) ?? 0) + 1);
      if (date) dailyEnq.set(date, (dailyEnq.get(date) ?? 0) + 1);
    }
  } catch {
    /* leave enquiry rollups empty */
  }

  // ── Practo / clinic-side reference (scoped to the same window) ──
  let practo: ArabyReport['practo'] = { appointmentsBooked: null, clinicRevenue: null, bills: null };
  try {
    const [crm, practoSummary] = await Promise.all([
      getCrmReport({ from, to }),
      getPractoSummary({ from, to }),
    ]);
    practo = {
      appointmentsBooked: crm.appointments.total,
      clinicRevenue: practoSummary.source === 'live' ? practoSummary.revenue : null,
      bills: practoSummary.source === 'live' ? practoSummary.billCount : null,
    };
  } catch {
    /* leave practo nulls */
  }

  // ── GA4 traffic (deployed-only; degrades to null on any failure) ──
  let ga4: Ga4ArabyAds | null = null;
  if (isGoogleConfigured()) {
    try {
      ga4 = await fetchGa4ArabyAds(from, to, ARABY_LANES.map((l) => l.campaign));
    } catch {
      ga4 = null;
    }
  }

  const daily = [...dailyBook.entries()].map(([date, bookings]) => ({ date, bookings })).sort((a, b) => a.date.localeCompare(b.date));
  const dailyEnquiries = [...dailyEnq.entries()].map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
  const byPublisher = [...publishers.values()].sort((a, b) => b.bookings - a.bookings);

  const hasAny = total > 0 || test > 0 || enqTotal > 0 || Boolean(ga4);

  return {
    configured: true,
    source: hasAny ? 'live' : 'empty',
    range,
    lanes: ARABY_LANES,
    firstSeen,
    bookings: {
      total,
      test,
      revenue: Math.round(revenue),
      byLane: topMix(byLane),
      daily,
      byPublisher,
      recent: recent.slice(0, 25),
    },
    enquiries: {
      total: enqTotal,
      byChannel: topMix(byChannel),
      social: topMix(social),
      daily: dailyEnquiries,
    },
    practo,
    cost,
    ga4,
  };
}
