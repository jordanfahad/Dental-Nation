import { LEAD_ALERT_WINDOW, type LeadAlertMode } from '@/config/lead-alerts';
import { hasWhatsAppEvidence } from './evidence';
import { buildWhatsAppLeadAlert, type AlertLead } from './emails';

export interface LeadAlertConfig { mode: LeadAlertMode; recipient: string | null; batchMinutes: number }
export interface LeadAlertDependencies {
  ready: () => Promise<boolean>;
  seed: () => Promise<boolean>;
  leads: () => Promise<AlertLead[]>;
  remember: (ids: string[], at: string) => Promise<void>;
  pendingIds: () => Promise<string[]>;
  claim: (ids: string[], intervalMinutes: number) => Promise<string[]>;
  markAlerted: (ids: string[]) => Promise<void>;
  send: (mail: { to: string[]; subject: string; html: string }) => Promise<{ ok: boolean }>;
  log: (message: string) => void;
}

export function leadAlertsConfigured(config: LeadAlertConfig): boolean {
  return config.mode !== 'off' && !!config.recipient?.trim();
}

/** No side effects in the disabled path except its single static log line. */
export async function deliverLeadAlerts(now: Date, config: LeadAlertConfig, deps: LeadAlertDependencies): Promise<void> {
  const log = (message: string) => deps.log(`lead:whatsapp: ${message}`);
  if (!leadAlertsConfigured(config)) { log('not configured'); return; }
  if (!['batched', 'instant'].includes(config.mode) || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(config.recipient!.trim()) ||
      !Number.isSafeInteger(config.batchMinutes) || config.batchMinutes < 1) { log('invalid configuration'); return; }
  try {
    if (!await deps.ready()) { log('paused or unavailable'); return; }
    if (await deps.seed()) { log('history seeded; nothing sent'); return; }
    const leads = [...new Map((await deps.leads()).map((lead) => [lead.id, lead])).values()];
    const evidence = leads.filter(hasWhatsAppEvidence);
    await deps.remember(evidence.map((lead) => lead.id), now.toISOString());
    // Both modes use the same desk hours; discovery still runs outside them.
    const time = new Intl.DateTimeFormat('en-GB', { timeZone: LEAD_ALERT_WINDOW.timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
    if (time < LEAD_ALERT_WINDOW.start || time >= LEAD_ALERT_WINDOW.end) { log('outside delivery window'); return; }
    const pending = new Set(await deps.pendingIds());
    const waiting = leads.filter((lead) => pending.has(lead.id));
    if (!waiting.length) { log('nothing new'); return; }
    const claimed = new Set(await deps.claim(waiting.map((lead) => lead.id), config.mode === 'batched' ? config.batchMinutes : 0));
    const selected = waiting.filter((lead) => claimed.has(lead.id));
    if (!selected.length) { log('already claimed or batch interval not due'); return; }
    // Claims survive failed/ambiguous sends and marking failures. Never retry them.
    const result = await deps.send({ to: [config.recipient!.trim()], ...buildWhatsAppLeadAlert(selected) });
    if (!result.ok) { log('transport failed or uncertain; claim retained'); return; }
    await deps.markAlerted(selected.map((lead) => lead.id));
    log(`sent ${selected.length} new leads`);
  } catch {
    log('read/delivery failed; any delivery claim retained');
  }
}
