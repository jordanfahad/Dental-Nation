import 'server-only';
import type { AdminClient } from '@/lib/supabase/server';
import { sendEmail, emailConfigured } from '@/lib/notify/email';
import { OPS_ALERT_FROM, UPTIME_ALERT_EMAILS } from '@/config/ops';

/**
 * Website / booking-availability DOWN alerts — TRANSITION-triggered from the
 * 15-minute availability monitor, so an outage emails ONCE when it starts and
 * once when it recovers, never every cycle.
 *
 * Rules:
 *   - Only CONCLUSIVE widget verdicts count (a monitor error says nothing
 *     about patients and never pages anyone).
 *   - Widget and site are independent signals with independent transitions —
 *     "site down" and "site up but nobody can book" are different emergencies.
 *   - Events in the same run combine into one email.
 *
 * Previous state comes from the widget_health history itself (the row just
 * before this run's), so no extra state table is needed and a redeploy can
 * never re-blast an ongoing incident.
 */

export interface UptimeEvent {
  kind: 'widget' | 'site';
  down: boolean; // false = recovered
  detail: string;
}

export interface UptimeAlertResult {
  sent: boolean;
  events: number;
  note?: string;
  error?: string;
}

/** The monitor's previous conclusive widget verdict + previous site verdict. */
export async function readPreviousUptimeState(
  supabase: AdminClient,
): Promise<{ widgetOk: boolean | null; siteOk: boolean | null }> {
  const [w, s] = await Promise.all([
    supabase
      .from('widget_health')
      .select('ok')
      .neq('conclusive', false)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('widget_health')
      .select('site_ok')
      .not('site_ok', 'is', null)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  return {
    widgetOk: (w.data as { ok?: boolean } | null)?.ok ?? null,
    siteOk: (s.data as { site_ok?: boolean } | null)?.site_ok ?? null,
  };
}

const esc = (t: string) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] ?? c);

function eventHtml(events: UptimeEvent[]): string {
  const block = (e: UptimeEvent) => `
    <div style="margin:0 0 14px;padding:12px 14px;border-left:4px solid ${e.down ? '#B91C1C' : '#15803D'};background:${e.down ? '#FEF2F2' : '#ECFDF3'}">
      <p style="margin:0;font:600 14px sans-serif;color:#111">
        ${e.kind === 'widget' ? 'Booking availability' : 'Website'} ${e.down ? 'DOWN' : 'recovered'}
      </p>
      <p style="margin:6px 0 0;font:13px sans-serif;color:#333">${esc(e.detail)}</p>
    </div>`;
  return `
    <div style="font:14px sans-serif;color:#111">
      ${events.map(block).join('')}
      <p style="margin:12px 0 0;color:#71717a;font:12px sans-serif">
        Automated alert from the Dental Nation availability monitor (checks every 15 minutes via the Practo slots API).
        You will receive one email when an incident starts and one when it recovers.
      </p>
    </div>`;
}

/**
 * Compare this run's verdicts against the previous state and email on
 * transitions. Call AFTER the run's row has been recorded; pass the state
 * read BEFORE it was recorded.
 */
export async function sendUptimeAlerts(
  prev: { widgetOk: boolean | null; siteOk: boolean | null },
  current: { widgetOk: boolean | null; siteDown: boolean; widgetDetail: string; siteStatus: number | null },
): Promise<UptimeAlertResult> {
  const events: UptimeEvent[] = [];

  // Widget (conclusive verdicts only — callers pass widgetOk: null otherwise).
  if (current.widgetOk === false && prev.widgetOk !== false) {
    events.push({ kind: 'widget', down: true, detail: current.widgetDetail });
  } else if (current.widgetOk === true && prev.widgetOk === false) {
    events.push({ kind: 'widget', down: false, detail: current.widgetDetail });
  }

  // Site.
  if (current.siteDown && prev.siteOk !== false) {
    events.push({
      kind: 'site',
      down: true,
      detail: `www.dentalnation.com did not answer${current.siteStatus != null ? ` (HTTP ${current.siteStatus})` : ' (no response before timeout)'}.`,
    });
  } else if (!current.siteDown && prev.siteOk === false) {
    events.push({ kind: 'site', down: false, detail: 'www.dentalnation.com is answering again.' });
  }

  if (events.length === 0) return { sent: false, events: 0 };
  if (!emailConfigured()) return { sent: false, events: events.length, note: 'email transport not configured' };

  const worstDown = events.some((e) => e.down);
  const parts = events.map((e) => `${e.kind === 'widget' ? 'Booking availability' : 'Website'} ${e.down ? 'DOWN' : 'recovered'}`);
  const subject = `${worstDown ? '🔴' : '✅'} Dental Nation — ${parts.join(' · ')}`;

  const res = await sendEmail({ to: UPTIME_ALERT_EMAILS, subject, html: eventHtml(events), from: OPS_ALERT_FROM });
  if (!res.ok) return { sent: false, events: events.length, error: res.error };
  return { sent: true, events: events.length };
}
