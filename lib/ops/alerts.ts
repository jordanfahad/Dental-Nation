import 'server-only';
import type { AdminClient } from '@/lib/supabase/server';
import { sendEmail, emailConfigured } from '@/lib/notify/email';
import { OPS_ALERT_EMAILS, OPS_ALERT_FROM, OPS_ALERT_MAX_PER_RUN } from '@/config/ops';

/**
 * New-lead email alerts. On each sync, any NON-TEST website booking-widget
 * submission newer than the last-alerted high-water mark emails the ops inbox
 * (OPS_ALERT_EMAILS). The mark lives in app_secrets so it survives deploys.
 *
 * Safety: gated on RESEND_API_KEY (no key → no send, no mark change). The FIRST
 * run after enabling seeds the mark to "now" so historical forms are NOT blasted
 * — only forms that arrive from then on alert.
 */

const MARK_KEY = 'ops_last_lead_alert_ms';

const pick = (d: Record<string, unknown>, ...keys: string[]): string => {
  for (const k of keys) {
    const v = String(d[k] ?? '').trim();
    if (v) return v;
  }
  return '';
};
function isTest(name: string, email: string, details: string, ref: string): boolean {
  return /zavis|test/i.test(email) || /test|sagar/i.test(name) || /^test\b/i.test(details) || /^BK/i.test(ref.trim());
}
const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] ?? c);

export interface LeadAlertResult {
  sent: number;
  skipped: boolean;
  note?: string;
  error?: string;
}

function leadHtml(f: Record<string, string>): string {
  const row = (k: string, v: string) =>
    v ? `<tr><td style="padding:4px 12px 4px 0;color:#71717a;font:13px sans-serif">${k}</td><td style="padding:4px 0;font:13px sans-serif;color:#111">${esc(v)}</td></tr>` : '';
  return `
    <div style="font:14px sans-serif;color:#111">
      <p style="margin:0 0 8px"><strong>New website lead form</strong></p>
      <table style="border-collapse:collapse">
        ${row('Name', f.name)}
        ${row('Phone', f.phone)}
        ${row('Email', f.email)}
        ${row('Treatment', f.treatment)}
        ${row('Preferred clinic', f.clinic)}
        ${row('Doctor', f.doctor)}
        ${row('Requested date', f.requestedDate)}
        ${row('Details', f.details)}
        ${row('Source', f.source)}
        ${row('Submitted', f.submitted)}
      </table>
      <p style="margin:12px 0 0;color:#71717a;font:12px sans-serif">Please follow up. This is an automated alert from the Dental Nation dashboard.</p>
    </div>`;
}

export async function sendNewLeadAlerts(supabase: AdminClient): Promise<LeadAlertResult> {
  if (!emailConfigured()) return { sent: 0, skipped: true, note: 'alerts disabled (no SMTP_* / RESEND_API_KEY)' };
  if (OPS_ALERT_EMAILS.length === 0) return { sent: 0, skipped: true, note: 'no OPS_ALERT_EMAILS' };

  try {
    // High-water mark. First run after enabling → seed to now, alert nothing yet.
    const { data: markRow } = await supabase.from('app_secrets').select('value').eq('key', MARK_KEY).maybeSingle();
    const markRaw = (markRow as { value?: string } | null)?.value;
    if (!markRaw) {
      await supabase.from('app_secrets').upsert({ key: MARK_KEY, value: String(Date.now()) }, { onConflict: 'key' });
      return { sent: 0, skipped: false, note: 'seeded high-water mark; alerts start from the next new form' };
    }
    const mark = Number(markRaw) || 0;

    const { data } = await supabase.from('raw_zavis').select('data');
    const rows = (data as { data: Record<string, unknown> }[] | null) ?? [];
    const fresh: { ms: number; f: Record<string, string> }[] = [];
    for (const r of rows) {
      const d = r.data ?? {};
      if (!('Full Name' in d) && !('Phone Number' in d)) continue;
      const name = pick(d, 'Full Name', 'Name');
      const email = pick(d, 'Email');
      const details = pick(d, 'Additional Details');
      if (isTest(name, email, details, pick(d, 'Booking Reference', 'Booking ID'))) continue;
      const ms = Date.parse(pick(d, 'Timestamp'));
      if (Number.isNaN(ms) || ms <= mark) continue;
      fresh.push({
        ms,
        f: {
          name,
          phone: pick(d, 'Phone Number', 'Phone', 'Contact Number'),
          email,
          treatment: pick(d, 'Treatment', 'Type of Treatment', 'Condition'),
          clinic: pick(d, 'Clinic Name'),
          doctor: pick(d, 'Doctor Name'),
          requestedDate: pick(d, 'Date'),
          details,
          source: pick(d, 'Source'),
          submitted: pick(d, 'Timestamp'),
        },
      });
    }
    if (fresh.length === 0) return { sent: 0, skipped: false, note: 'no new lead forms' };

    fresh.sort((a, b) => a.ms - b.ms); // oldest first
    const batch = fresh.slice(0, OPS_ALERT_MAX_PER_RUN);
    let sent = 0;
    let maxMs = mark;
    for (const { ms, f } of batch) {
      const subject = `New website lead — ${f.name || 'Unknown'}${f.treatment ? ` · ${f.treatment}` : ''}`;
      const res = await sendEmail({ to: OPS_ALERT_EMAILS, subject, html: leadHtml(f), from: OPS_ALERT_FROM });
      if (res.ok) {
        sent++;
        if (ms > maxMs) maxMs = ms; // only advance past forms we actually delivered
      } else if (res.skipped) {
        return { sent, skipped: true, note: res.error };
      } else {
        break; // send failed — stop; don't advance the mark past an undelivered form
      }
    }
    if (maxMs > mark) await supabase.from('app_secrets').upsert({ key: MARK_KEY, value: String(maxMs) }, { onConflict: 'key' });
    const note = fresh.length > batch.length ? `${fresh.length - batch.length} more queued for the next run` : undefined;
    return { sent, skipped: false, note };
  } catch (err) {
    return { sent: 0, skipped: false, error: (err as Error).message };
  }
}
