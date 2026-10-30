/**
 * The daily 09:00 Dubai alert emails, in send order: the four approved by the
 * owner on 24 Oct 2026, and the Clinic Activation email (Dr Luvi's daily
 * report), which is live from CLINIC_ACTIVATION_LIVE_FROM (31 Oct 2026): the
 * cron sends it to its recipients from that Dubai day, never before, while the
 * preview to Fahad renders it on any day. Sent by the /api/cron/alerts route through lib/alerts/delivery.ts:
 * one email per kind per day, claimed in lane_e.performance_email_claims before
 * sending. Nothing goes to anyone before LIVE_FROM except previews to Fahad.
 *
 * Mr Akbar is a recipient of the GBP and performance emails by owner approval
 * (24 Oct 2026). One person may receive several of these emails: there is no
 * cross-kind cap, and none of these kinds counts toward the Smile Club
 * briefing cap in lib/smileclub/alerts.ts.
 */
import type { AdminClient } from '@/lib/supabase/server';
import { NAME, type Who } from '@/lib/smileclub/alerts';
import { addDaysIso } from './links';
import { dayLabel } from './shell';
import { buildSmileClubDaily, readSmileClubDaily } from './smileclubDaily';
import { buildOrthoDaily, readOrthoDaily } from './orthoDaily';
import { buildGbpDaily, readGbpDaily } from './gbpDaily';
import { buildPerformanceDaily, readPerformanceDaily } from './performanceDaily';
import { buildActivationDaily, readActivationDaily } from './activationDaily';

export type { Who };
export type DailyAlertKind = 'am:sc-daily' | 'am:ortho-daily' | 'am:gbp-daily' | 'am:akbar-perf' | 'am:clinic-activation';
export interface BuildOpts { preview?: string; recipients?: string }
export interface AlertEmail { subject: string; html: string }

/** One daily email. Method signatures keep each builder's own data type assignable here. */
export interface DailyAlert<D = unknown> {
  kind: DailyAlertKind;
  label: string;
  to: readonly Who[];
  cc: readonly Who[];
  read(db: AdminClient, today: string): Promise<D>;
  build(data: D, today: string, opts?: BuildOpts): AlertEmail;
  /**
   * First Dubai day this kind goes to its real recipients. Omitted = LIVE_FROM.
   * null = not switched on: the cron never claims or sends it; only the
   * preview to Fahad renders it.
   */
  liveFrom?: string | null;
}

/** First Dubai day on which the emails go to their real recipients. */
export const LIVE_FROM = '2026-10-25';
/**
 * The Clinic Activation email's own first live day. null = NOT SWITCHED ON:
 * previews to Fahad only. To switch it on, set a Dubai day, e.g. '2026-11-01'
 * (after applying supabase/migrations/0052_clinic_activation_alert_kind.sql).
 */
export const CLINIC_ACTIVATION_LIVE_FROM: string | null = '2026-10-31'; // approved by Fahad 30 Oct 2026
/** lane_e.app_secrets key: any row with this key asks the next cron run to email every preview to Fahad, once. */
export const PREVIEW_KEY = 'alerts_preview_request';
/** Dubai send window: 09:00 inclusive to 11:00 exclusive. */
export const SEND_HOURS = [9, 10] as const;
/** The only person previews go to. */
export const PREVIEW_TO: Who = 'fahad';

export const DAILY_ALERTS: readonly DailyAlert[] = [
  { kind: 'am:sc-daily', label: 'Smile Club daily', to: ['gautam', 'luvi', 'shadi', 'mj'], cc: ['fahad'], read: readSmileClubDaily, build: buildSmileClubDaily },
  { kind: 'am:ortho-daily', label: 'DN Ortho daily', to: ['luvi', 'mj', 'shadi'], cc: ['fahad'], read: readOrthoDaily, build: buildOrthoDaily },
  { kind: 'am:gbp-daily', label: 'Google Business Profile daily', to: ['akbar', 'shadi', 'luvi'], cc: ['fahad'], read: readGbpDaily, build: buildGbpDaily },
  { kind: 'am:akbar-perf', label: 'Daily and month to date performance', to: ['akbar', 'shadi'], cc: ['fahad'], read: readPerformanceDaily, build: buildPerformanceDaily },
  { kind: 'am:clinic-activation', label: 'Clinic Activation daily', to: ['akbar', 'shadi', 'luvi'], cc: ['fahad'], read: readActivationDaily, build: buildActivationDaily, liveFrom: CLINIC_ACTIVATION_LIVE_FROM },
];

/** The first day this kind goes live: its own liveFrom, never before LIVE_FROM; null = not switched on. */
export function liveFromOf(a: Pick<DailyAlert, 'liveFrom'>): string | null {
  if (a.liveFrom === null) return null;
  const own = a.liveFrom ?? LIVE_FROM;
  return own < LIVE_FROM ? LIVE_FROM : own;
}

/** True when the cron may send this kind to its real recipients on Dubai day `day`. */
export function sendsLiveOn(a: Pick<DailyAlert, 'liveFrom'>, day: string): boolean {
  const from = liveFromOf(a);
  return from != null && day >= from;
}

export const DAILY_ALERT_KINDS: readonly DailyAlertKind[] = DAILY_ALERTS.map((a) => a.kind);

/** "Gautam, Dr Luvi, Ms Shadi and MJ". */
export function namesOf(who: readonly Who[]): string {
  const names = who.map((w) => NAME[w]);
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** Footer line, e.g. "To Mr Akbar and Ms Shadi; copied to Fahad." */
export const recipientsLine = (a: Pick<DailyAlert, 'to' | 'cc'>) =>
  `To ${namesOf(a.to)}${a.cc.length ? `; copied to ${namesOf(a.cc)}` : ''}.`;

/** The day the next live send happens, never before LIVE_FROM. */
export function nextSendDay(today: string, dubaiHour: number): string {
  const next = dubaiHour < SEND_HOURS[0] ? today : addDaysIso(today, 1);
  return next < LIVE_FROM ? LIVE_FROM : next;
}

/** Yellow band on a preview copy. A kind that is not switched on says so instead of naming a send day. */
export function previewNote(a: Pick<DailyAlert, 'to' | 'cc' | 'liveFrom'>, sendDay: string): string {
  const who = `${namesOf(a.to)}${a.cc.length ? `, copied to ${namesOf(a.cc)}` : ''}`;
  const from = liveFromOf(a);
  if (from == null) return `Preview for Fahad: not switched on yet. Once it is, this goes at 09:00 to ${who}.`;
  return `Preview for Fahad: on ${dayLabel(sendDay < from ? from : sendDay)} at 09:00 this goes to ${who}.`;
}
