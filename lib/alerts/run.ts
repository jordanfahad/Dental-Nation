import 'server-only';
import { OPS_ALERT_FROM } from '@/config/ops';
import { emailConfigured, sendEmail } from '@/lib/notify/email';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { emailOf, loadStoredEmails } from '@/lib/smileclub/alerts';
import { DAILY_ALERTS, PREVIEW_KEY } from './registry';
import { deliverDailyAlerts } from './delivery';

/**
 * Production wiring for the daily 09:00 alert emails (rules in ./delivery.ts).
 * Reads are read-only; the only writes are the preview-request delete, the
 * daily claim and the lane_e.sc_alert_log audit row.
 */
export async function runDailyAlerts(now = new Date()): Promise<string[]> {
  const db = getSupabaseAdmin();
  if (!db) return ['no db'];
  // Personal addresses live in app_secrets; if they cannot be read, nobody is addressed.
  const addressesOk = await loadStoredEmails(db).catch(() => false);
  // One read per email per run, shared by its preview and live copies.
  const reads = new Map<string, Promise<unknown>>();
  return deliverDailyAlerts(now, {
    alerts: DAILY_ALERTS,
    paused: async () => {
      // Same rule as runSmileClubAlerts: a failed read counts as paused.
      const pause = await db.from('app_secrets').select('value').eq('key', 'alerts_paused').maybeSingle();
      return Boolean(pause.error) || String(pause.data?.value ?? '').trim().toLowerCase() === 'true';
    },
    configured: emailConfigured(),
    address: (who) => (addressesOk ? emailOf(who) : null),
    render: async (alert, today, opts) => {
      const key = `${alert.kind}|${today}`;
      let data = reads.get(key);
      if (!data) { data = alert.read(db, today); reads.set(key, data); }
      return alert.build(await data, today, opts);
    },
    consumePreview: async () => {
      // Delete-returning is atomic: of two concurrent runs, only one gets the row back.
      const { data, error } = await db.from('app_secrets').delete().eq('key', PREVIEW_KEY).select('key');
      if (error) throw new Error('Preview request unavailable');
      return (data ?? []).length > 0;
    },
    claimed: async (kind, day) => {
      const { data, error } = await db.from('performance_email_claims').select('kind').eq('kind', kind).eq('day', day).limit(1);
      if (error) throw new Error('Daily claim unavailable');
      return (data ?? []).length > 0;
    },
    claim: async (kind, day) => {
      const { error } = await db.from('performance_email_claims').insert({ kind, day });
      if (error?.code === '23505') return false;
      if (error) throw new Error('Daily claim unavailable');
      return true;
    },
    log: async (kind, day, ok, recipients, note) => {
      const { error } = await db.from('sc_alert_log').upsert({ kind, day, ok, recipients, note, sent_at: new Date().toISOString() }, { onConflict: 'kind,day' });
      if (error) throw new Error('Alert log unavailable');
    },
    send: (mail) => sendEmail({ ...mail, from: OPS_ALERT_FROM }),
  });
}
