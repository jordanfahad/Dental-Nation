import 'server-only';
import { unstable_cache } from 'next/cache';
import { fetchGa4Audience, fetchGa4Lanes, type Ga4Audience, type Ga4LaneRow } from '@/lib/sync/adapters/ga4-adapter';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { GA4_LANES } from '@/config/ga4';

/**
 * Google Analytics tab model — demographics (gender/age), device, acquisition
 * channel and per-event lead acquisition from GA4, plus landing-page traffic by
 * LANE. Honours the header date-range control (from/to); when no range is set it
 * falls back to 2026-01-01 → today. Never throws; any GA4 failure degrades to an
 * honest data gap.
 *
 * Cached 30 min PER RANGE via the Vercel Data Cache: this tab fires several GA4
 * reports and GA4 itself lags hours, so a short cache keeps the page fast without
 * making the numbers meaningfully stale. from/to are function args so each range
 * caches independently.
 */
export interface LaneReportRow extends Ga4LaneRow {
  booked: number; // real (non-test) website-widget bookings attributed to the lane
}
export interface GoogleAnalyticsReport {
  available: boolean;
  note: string | null;
  data: Ga4Audience | null;
  lanes: LaneReportRow[];
  lanesNote: string | null;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const DEFAULT_FROM = '2026-01-01';

/** Widget submission timestamp "MM/DD/YYYY, HH:MM:SS" (or ISO) → YYYY-MM-DD. */
function submittedDate(v: unknown): string | null {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const ms = Date.parse(s);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString().slice(0, 10);
}

/** Real (non-test) widget bookings per lane, from the widget Source token,
 *  scoped to the selected date range by submission Timestamp. */
async function widgetBookedByLane(from: string, to: string): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const db = getSupabaseAdmin();
  if (!db) return out;
  try {
    const { data } = await db.from('raw_zavis').select('data');
    for (const r of (data as { data: Record<string, unknown> }[] | null) ?? []) {
      const d = r.data ?? {};
      if (!('Full Name' in d)) continue;
      const email = String(d['Email'] ?? '');
      const name = String(d['Full Name'] ?? '');
      const ref = String(d['Booking Reference'] ?? '').trim().toUpperCase();
      if (/zavis|test/i.test(email) || /test|sagar/i.test(name) || ref.startsWith('BK')) continue; // test rule
      // Keep only bookings whose submission falls inside the selected range, so
      // this column moves with the date control like the GA4 columns do.
      const day = submittedDate(d['Timestamp']);
      if (day && (day < from || day > to)) continue;
      const src = String(d['Source'] ?? '').toLowerCase();
      for (const lane of GA4_LANES) {
        if (lane.widgetSource && src.includes(`dental_nation_${lane.widgetSource}`)) {
          out.set(lane.key, (out.get(lane.key) ?? 0) + 1);
        }
      }
    }
  } catch {
    /* optional */
  }
  return out;
}

// The cached worker — from/to are real function args so each date range caches
// independently (unstable_cache folds the args into the cache key).
const getReport = unstable_cache(
  async (from: string, to: string): Promise<GoogleAnalyticsReport> => {
    let data: Ga4Audience | null = null;
    let note: string | null = null;
    let available = false;
    try {
      const d = await fetchGa4Audience(from, to);
      available = d.totals.sessions > 0 || d.events.length > 0;
      data = available ? d : null;
      note = available ? null : 'no GA4 activity in this window';
    } catch (err) {
      note = (err as Error).message;
    }

    let lanes: LaneReportRow[] = [];
    let lanesNote: string | null = null;
    try {
      const [ga4Lanes, booked] = await Promise.all([fetchGa4Lanes(from, to), widgetBookedByLane(from, to)]);
      lanes = ga4Lanes.map((l) => ({ ...l, booked: booked.get(l.key) ?? 0 }));
    } catch (err) {
      lanesNote = (err as Error).message;
    }

    return { available, note, data, lanes, lanesNote };
  },
  // NOTE: bump this key whenever the returned SHAPE changes — a stale cache of an
  // older shape served to a newer component crashes the tab (v2→v3 added lane.geo;
  // v4 makes the whole report range-aware via from/to args; v5 adds lane
  // qualified + value to LaneGeoMetrics — a stale v4 geo bucket lacks those keys
  // and would sum to NaN, so the key MUST bump with the shape).
  ['ga4-audience-v5-qualified-value'],
  { revalidate: 1800 },
);

/** Range-aware entry point. Defaults to 2026-01-01 → today when unset. */
export function getGoogleAnalyticsReport(range: { from?: string; to?: string } = {}): Promise<GoogleAnalyticsReport> {
  const from = range.from || DEFAULT_FROM;
  const to = range.to || iso(new Date());
  return getReport(from, to);
}
