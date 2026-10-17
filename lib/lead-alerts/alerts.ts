import 'server-only';
import { LEAD_ALERT_MODE, LEAD_ALERT_RECIPIENT, LEAD_ALERT_BATCH_MINUTES } from '@/config/lead-alerts';
import { OPS_ALERT_FROM } from '@/config/ops';
import { sheetMapping } from '@/config/sheet-mapping';
import { emailConfigured, sendEmail } from '@/lib/notify/email';
import { getSupabaseAdmin, type AdminClient } from '@/lib/supabase/server';
import { selectAll } from '@/lib/supabase/selectAll';
import type { SyncSummary } from '@/lib/sync';
import { deliverLeadAlerts, leadAlertsConfigured, type LeadAlertDependencies } from './delivery';
import type { AlertLead } from './emails';

export function leadAlertDependencies(db: AdminClient): LeadAlertDependencies {
  return {
    ready: async () => {
      const pause = await db.from('app_secrets').select('value').eq('key', 'alerts_paused').maybeSingle();
      return !pause.error && String(pause.data?.value ?? '').trim().toLowerCase() !== 'true' && emailConfigured();
    },
    seed: async () => {
      const result = await db.rpc('seed_lead_alert_seen');
      if (result.error || typeof result.data !== 'boolean') throw new Error('Lead alert seed unavailable');
      return result.data;
    },
    leads: async () => {
      const { data } = await selectAll(() => db.from('leads').select('id,clinic,channel_source,whatsapp_ref,raw_row'), 'id');
      return data as AlertLead[];
    },
    remember: async (ids, at) => {
      for (let i = 0; i < ids.length; i += 500) {
        const { error } = await db.from('lead_alert_seen').upsert(ids.slice(i, i + 500).map((id) => ({ id, first_seen_at: at })), { onConflict: 'id', ignoreDuplicates: true });
        if (error) throw new Error('Lead alert checkpoint unavailable');
      }
    },
    pendingIds: async () => {
      const { data } = await selectAll(() => db.from('lead_alert_seen').select('id').is('alerted_at', null), 'id');
      return data.map((row) => row.id as string);
    },
    claim: async (ids, intervalMinutes) => {
      const result = await db.rpc('claim_lead_alerts', { lead_ids: ids, min_interval_minutes: intervalMinutes });
      if (result.error || !Array.isArray(result.data) || !result.data.every((id: unknown) => typeof id === 'string')) throw new Error('Lead alert claim unavailable');
      return result.data as string[];
    },
    markAlerted: async (ids) => {
      const { error } = await db.rpc('mark_lead_alerts_sent', { lead_ids: ids });
      if (error) throw new Error('Lead alert send record unavailable');
    },
    send: (mail) => sendEmail({ ...mail, from: OPS_ALERT_FROM }),
    log: (message) => console.info(message),
  };
}

/** Post-sync hook only; the sync implementation and schedule stay unchanged. */
export async function runLeadAlertsAfterSync(summary: SyncSummary, now = new Date()): Promise<void> {
  const config = { mode: LEAD_ALERT_MODE, recipient: LEAD_ALERT_RECIPIENT, batchMinutes: LEAD_ALERT_BATCH_MINUTES };
  if (!leadAlertsConfigured(config)) { console.info('lead:whatsapp: not configured'); return; }
  if (!['success', 'partial'].includes(summary.status) || !summary.sheetsOk.includes(sheetMapping.leadTracker.label) ||
      summary.dataGaps.some((gap) => gap.detail.startsWith(`${sheetMapping.leadTracker.label} \u2192 leads`) && gap.detail.includes('not saved'))) {
    console.info('lead:whatsapp: tracker sync unavailable'); return;
  }
  const db = getSupabaseAdmin();
  if (!db) { console.info('lead:whatsapp: database unavailable'); return; }
  await deliverLeadAlerts(now, config, leadAlertDependencies(db));
}
