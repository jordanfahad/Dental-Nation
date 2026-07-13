import 'server-only';
import { formatInTimeZone } from 'date-fns-tz';
import { parseISO } from 'date-fns';
import type { AdminClient } from '@/lib/supabase/server';
import type { FunnelStage } from '@/lib/types';
import { DUBAI_TZ, previousDate } from '@/lib/dates';
import { isGoogleConfigured } from '@/lib/sync/google-auth';
import { fetchGa4FunnelDaily } from '@/lib/sync/adapters/ga4-adapter';

/**
 * §D Daily-Funnel LIVE overlay. The stored snapshot funnel only carries the
 * lead-tracker stages; several stages the CEO asked for DO have real sources
 * that just weren't wired into the per-day funnel:
 *
 *   • Landing-page visits  ← GA4 sessions (per day)
 *   • WhatsApp clicks      ← GA4 `whatsapp_click` event
 *   • Call clicks          ← GA4 `call_click` event (env-overridable name)
 *   • Bookings             ← the website booking widget (lane_e.bookings)
 *   • Show-ups             ← Zavis CRM completed appointments (lane_e.crm_appointments)
 *   • Reviews captured     ← Zavis CSAT responses (lane_e.crm_csat)
 *
 * A stage is only filled when its source actually produced data across the span
 * (`measured`) — so a source that returns nothing (e.g. a call event that isn't
 * tracked yet) stays an honest data gap rather than a fabricated 0. Reach and
 * Proof stay gaps: Meta reach isn't in our feed and its token is stale; Proof
 * has no source.
 */

/** Per-stage day/day/total triple from a live source. */
export interface OverlayStage {
  today: number;
  yesterday: number;
  total: number;
  /** Human source label for the Notes column. */
  source: string;
}

export type FunnelOverlay = Map<string, OverlayStage>;

/** Bucket a value into today / yesterday / running total by its date key. */
function accumulate(
  acc: { today: number; yesterday: number; total: number },
  dateKey: string | null,
  today: string,
  yesterday: string,
  amount = 1,
) {
  if (!dateKey) return;
  acc.total += amount;
  if (dateKey === today) acc.today += amount;
  else if (dateKey === yesterday) acc.yesterday += amount;
}

/** Dubai-local YYYY-MM-DD for a timestamptz (CRM/CSAT `created_at`/`recorded_at`). */
function dubaiDay(ts: string | null | undefined): string | null {
  if (!ts) return null;
  try {
    return formatInTimeZone(parseISO(ts), DUBAI_TZ, 'yyyy-MM-dd');
  } catch {
    return null;
  }
}

/**
 * Compute the live overlay for `date` (with `yesterday` = the prior Dubai day).
 * `spanFrom`/`spanTo` bound the GA4 fetch (and therefore the GA4 "total" column).
 * Every read is defensive: a failing source is simply omitted (its stage stays a
 * gap), so this never throws and never blocks the report.
 */
export async function getFunnelOverlay(
  db: AdminClient,
  opts: { date: string; spanFrom: string; spanTo: string },
): Promise<FunnelOverlay> {
  const { date, spanFrom, spanTo } = opts;
  const yesterday = previousDate(date);
  const overlay: FunnelOverlay = new Map();

  const put = (key: string, acc: { today: number; yesterday: number; total: number }, source: string) => {
    if (acc.total > 0) overlay.set(key, { ...acc, source });
  };

  const [ga4, bookings, appts, csat] = await Promise.allSettled([
    // GA4 per-day sessions + WhatsApp/call clicks.
    isGoogleConfigured() ? fetchGa4FunnelDaily(spanFrom, spanTo) : Promise.resolve([]),
    // Website booking widget — booked rows by booking_date.
    db.from('bookings').select('booking_date, status'),
    // Zavis CRM completed appointments (show-ups) by created_at.
    db.from('crm_appointments').select('status, created_at').eq('is_test', false),
    // Zavis CSAT responses (reviews captured) by recorded_at.
    db.from('crm_csat').select('recorded_at'),
  ]);

  // --- GA4: landing-page visits / WhatsApp clicks / call clicks -------------
  if (ga4.status === 'fulfilled') {
    const lp = { today: 0, yesterday: 0, total: 0 };
    const wa = { today: 0, yesterday: 0, total: 0 };
    const call = { today: 0, yesterday: 0, total: 0 };
    for (const d of ga4.value) {
      accumulate(lp, d.date, date, yesterday, d.sessions);
      accumulate(wa, d.date, date, yesterday, d.whatsappClicks);
      accumulate(call, d.date, date, yesterday, d.callClicks);
    }
    put('lp_visits', lp, 'GA4 sessions');
    put('wa_clicks', wa, 'GA4 · whatsapp_click');
    put('call_clicks', call, 'GA4 · call_click');
  }

  // --- Bookings (website widget) -------------------------------------------
  if (bookings.status === 'fulfilled' && Array.isArray(bookings.value.data)) {
    const acc = { today: 0, yesterday: 0, total: 0 };
    for (const r of bookings.value.data as { booking_date: string | null; status: string | null }[]) {
      if (r.status !== 'booked') continue;
      accumulate(acc, r.booking_date ? r.booking_date.slice(0, 10) : null, date, yesterday);
    }
    put('glow_up_bookings', acc, 'Booking widget');
  }

  // --- Show-ups (CRM completed appointments) -------------------------------
  if (appts.status === 'fulfilled' && Array.isArray(appts.value.data)) {
    const acc = { today: 0, yesterday: 0, total: 0 };
    for (const r of appts.value.data as { status: string | null; created_at: string | null }[]) {
      if ((r.status ?? '').trim().toLowerCase() !== 'completed') continue;
      accumulate(acc, dubaiDay(r.created_at), date, yesterday);
    }
    put('attended_visits', acc, 'Zavis CRM (completed)');
  }

  // --- Reviews captured (CSAT responses) -----------------------------------
  if (csat.status === 'fulfilled' && Array.isArray(csat.value.data)) {
    const acc = { today: 0, yesterday: 0, total: 0 };
    for (const r of csat.value.data as { recorded_at: string | null }[]) {
      accumulate(acc, dubaiDay(r.recorded_at), date, yesterday);
    }
    put('reviews_captured', acc, 'Zavis CSAT');
  }

  return overlay;
}

/**
 * Merge a live overlay onto the stored snapshot funnel: for every measured
 * overlay stage, replace that stage's today/yesterday/total and clear its
 * data-gap (`upstream`) flag, then recompute stage-to-stage conversion across
 * the measured stages so the rates stay consistent with the new values.
 * Stages with no overlay (Reach, Proof, …) are left exactly as they were.
 */
export function mergeFunnelOverlay(funnel: FunnelStage[], overlay: FunnelOverlay): FunnelStage[] {
  const merged = funnel.map((stage) => {
    const o = overlay.get(stage.key);
    if (!o) return { ...stage };
    return {
      ...stage,
      upstream: false,
      today: o.today,
      yesterday: o.yesterday,
      total: o.total,
      source: o.source,
    };
  });

  // Recompute conversion vs. the previous MEASURED stage (today's values).
  let prev: number | null = null;
  for (const stage of merged) {
    if (stage.today != null) {
      stage.conversionFromPrev = prev != null && prev > 0 ? stage.today / prev : null;
      prev = stage.today;
    }
  }
  return merged;
}
