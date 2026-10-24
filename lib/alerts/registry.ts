/**
 * The four daily 09:00 Dubai alert emails (approved by the owner, 24 Oct 2026),
 * in send order. Sent by the /api/cron/alerts route through lib/alerts/delivery.ts:
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

export type { Who };
export type DailyAlertKind = 'am:sc-daily' | 'am:ortho-daily' | 'am:gbp-daily' | 'am:akbar-perf';
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
}

/** First Dubai day on which the emails go to their real recipients. */
export const LIVE_FROM = '2026-10-25';
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
];

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

/** Yellow band on a preview copy. */
export const previewNote = (a: Pick<DailyAlert, 'to' | 'cc'>, sendDay: string) =>
  `Preview for Fahad: on ${dayLabel(sendDay)} at 09:00 this goes to ${namesOf(a.to)}${a.cc.length ? `, copied to ${namesOf(a.cc)}` : ''}.`;
