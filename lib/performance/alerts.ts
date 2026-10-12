import 'server-only';
import { OPS_ALERT_FROM } from '@/config/ops';
import type { AdminClient } from '@/lib/supabase/server';
import { selectAll } from '@/lib/supabase/selectAll';
import { emailConfigured, sendEmail } from '@/lib/notify/email';
import { readGbpPlan } from '@/lib/gbp/reader';
import { readPerformanceBrief } from './reader';
import { deliverPerformance, type DeliveryDependencies } from './delivery';

export async function runPerformanceAlerts(db: AdminClient, address: DeliveryDependencies['address'], now = new Date()) {
  return deliverPerformance(now, {
    configured: emailConfigured(), address,
    alreadySent: async (kind, day, primary) => {
      const { data } = await selectAll(() => db.from('sc_alert_log').select('kind,ok,recipients').eq('day', day), 'id');
      return data.some((r) => r.ok && (r.kind === kind || (r.recipients as string[] ?? []).some((a) => a.toLowerCase() === primary.toLowerCase())));
    },
    claim: async (kind, day) => {
      const { error } = await db.from('performance_email_claims').insert({ kind, day });
      if (error?.code === '23505') return false;
      if (error) throw new Error('Daily claim unavailable');
      return true;
    },
    log: async (kind, day, ok, recipients, note) => {
      const { error } = await db.from('sc_alert_log').upsert({ kind, day, ok, recipients, note, sent_at: new Date().toISOString() }, { onConflict: 'kind,day' });
      if (error) throw new Error('Performance alert log unavailable');
    },
    gbp: (asOf) => readGbpPlan(asOf, db),
    brief: (today, gbp) => readPerformanceBrief(today, db, gbp),
    send: (mail) => sendEmail({ ...mail, from: OPS_ALERT_FROM }),
  });
}
