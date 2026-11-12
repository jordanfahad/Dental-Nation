/**
 * Zavis new-lead alert (Dr Luvi, 12 Nov 2026): when a lead from the ads comes
 * into Zavis, email her straight away.
 *
 * Zavis (crm.zavis.ai, account 13) posts a webhook for each event
 * (contact_created, conversation_created, message_created, ...). Every event
 * is logged to lane_e.zavis_webhook_events; a lead alert goes out once per
 * conversation, on its first incoming patient message.
 *
 * "From an ad" is read from the payload: Meta click-to-WhatsApp leads carry a
 * referral (ad id, headline, source URL, ctwa_clid), and Zavis may also label
 * the conversation. Which fields Zavis fills is confirmed on the first real
 * ad leads, so the mode starts in 'test' (every new lead, to Fahad only, with
 * the detected source) and moves to 'live' (ad leads only, to Dr Luvi) by
 * setting lane_e.app_secrets 'zavis_alert_mode'. No deploy needed to switch.
 *
 * The email carries the lead's name, phone and first message: Dr Luvi needs
 * them to act. Nothing patient-related is ever written to this public repo.
 */

export type AlertMode = 'off' | 'test' | 'live';

export interface ZavisLead {
  conversationId: number | null;
  contactId: number | null;
  name: string | null;
  phone: string | null;
  firstMessage: string | null;
  inbox: string | null;
  createdAt: string | null;
}

export interface AdSource {
  fromAd: boolean;
  /** What marked it (e.g. "Meta ad referral: <headline>", "label: meta_ad"); null when nothing did. */
  detail: string | null;
}

type J = Record<string, unknown>;
const obj = (v: unknown): J => (v && typeof v === 'object' && !Array.isArray(v) ? (v as J) : {});
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : null);
const int = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : null);

/** Event name from the payload. */
export const eventOf = (p: unknown): string => str(obj(p).event) ?? 'unknown';

/** Is this the patient writing (not the team, not a bot or a private note)? */
export function isIncomingPatientMessage(p: unknown): boolean {
  const m = obj(p);
  if (eventOf(p) !== 'message_created') return false;
  const type = m.message_type;
  const incoming = type === 'incoming' || type === 0;
  return incoming && m.private !== true;
}

/** Pull the lead fields from any conversation or message payload, whatever its shape. */
export function leadOf(p: unknown): ZavisLead {
  const m = obj(p);
  const conv = eventOf(p).startsWith('conversation') ? m : obj(m.conversation);
  const sender = obj(m.sender);
  const metaSender = obj(obj(conv.meta).sender);
  const contact = Object.keys(metaSender).length ? metaSender : obj(conv.contact ?? m.contact ?? (sender.type === 'contact' || !sender.type ? sender : {}));
  const firstFromConv = Array.isArray(conv.messages) ? (conv.messages as unknown[]).map(obj).find((x) => x.message_type === 'incoming' || x.message_type === 0) : undefined;
  return {
    conversationId: int(conv.id ?? m.conversation_id ?? obj(m.conversation).id),
    contactId: int(contact.id ?? obj(conv.contact_inbox).contact_id),
    name: str(contact.name),
    phone: str(contact.phone_number),
    firstMessage: eventOf(p) === 'message_created' ? str(m.content) : str(firstFromConv?.content),
    inbox: str(obj(m.inbox).name ?? obj(conv.inbox).name),
    createdAt: str(m.created_at ?? conv.created_at),
  };
}

const AD_KEYS = /^(referral|ctwa_clid|ad_id|ads?_?context|source_url|source_type|headline|campaign|utm_source|utm_campaign)$/i;
const AD_VALUES = /\b(ad|ads|meta ad|facebook ad|instagram ad|ctwa|click.?to.?whatsapp|paid)\b|fb\.me|facebook\.com|instagram\.com/i;

/**
 * Pure: does anything in the payload say this lead came from an ad? Looks for
 * a Meta referral object, ad keys anywhere, and ad-like labels. Returns what it
 * found so the alert can show it and the mode can be tuned on real payloads.
 */
export function adSourceOf(p: unknown): AdSource {
  const hits: string[] = [];
  const walk = (v: unknown, path: string, depth: number) => {
    if (depth > 6 || hits.length > 3) return;
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${path}[${i}]`, depth + 1)); return; }
    if (!v || typeof v !== 'object') return;
    for (const [k, val] of Object.entries(v as J)) {
      if (/^referral$/i.test(k) && val && typeof val === 'object') {
        const r = obj(val);
        hits.push(`Meta ad referral${str(r.headline) ? `: ${str(r.headline)}` : str(r.source_id) ? ` (ad ${str(r.source_id)})` : ''}`);
        continue;
      }
      if (/^ctwa_clid$/i.test(k) && str(val)) { hits.push('Meta click-to-WhatsApp ad'); continue; }
      if (/^labels?$/i.test(k)) {
        const labels = (Array.isArray(val) ? val : [val]).map((x) => str(typeof x === 'object' ? obj(x).title ?? obj(x).name : x)).filter(Boolean) as string[];
        const ad = labels.find((l) => AD_VALUES.test(l.replace(/[_-]/g, ' ')));
        if (ad) hits.push(`label: ${ad}`);
        continue;
      }
      if (AD_KEYS.test(k) && str(val) && AD_VALUES.test(String(val))) { hits.push(`${k}: ${str(val)}`); continue; }
      if (val && typeof val === 'object') walk(val, `${path}.${k}`, depth + 1);
    }
  };
  walk(p, '', 0);
  return { fromAd: hits.length > 0, detail: hits[0] ?? null };
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Pure: the alert email. */
export function buildLeadEmail(lead: ZavisLead, ad: AdSource, mode: AlertMode): { subject: string; html: string } {
  const who = lead.name ?? 'New patient';
  const subject = `${mode === 'test' ? '[Test] ' : ''}New ${ad.fromAd ? 'ad ' : ''}lead in Zavis: ${who}${lead.phone ? ` (${lead.phone})` : ''}`;
  const link = lead.conversationId ? `https://crm.zavis.ai/app/accounts/13/conversations/${lead.conversationId}` : 'https://crm.zavis.ai';
  const row = (k: string, v: string | null) => `<tr><td style="padding:4px 10px 4px 0;color:#5c6c72">${esc(k)}</td><td style="padding:4px 0"><b>${esc(v ?? 'not given')}</b></td></tr>`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1f2a30">
${mode === 'test' ? '<p style="background:#fff7d6;padding:6px 10px;border-radius:4px;font-size:12px">Test mode: sent to Fahad only, for every new lead, to confirm how Zavis marks ad leads. Dr Luvi receives ad leads once this is switched to live.</p>' : ''}
<p style="margin:0 0 8px"><b>A new lead has just come in on Zavis.</b></p>
<table style="border-collapse:collapse">
${row('Name', lead.name)}${row('Phone', lead.phone)}${row('First message', lead.firstMessage ? lead.firstMessage.slice(0, 300) : null)}
${row('Source', ad.fromAd ? `From an ad (${ad.detail})` : 'Not marked as an ad by Zavis')}${row('Inbox', lead.inbox)}
</table>
<p style="margin:14px 0"><a href="${link}" style="background:#13314a;color:#fff;text-decoration:none;padding:8px 14px;border-radius:6px;font-weight:bold">Open the conversation in Zavis</a></p>
<p style="color:#8a9598;font-size:11px;margin:0">Sent by reports.dentalnation.com when Zavis reports a new conversation.</p></div>`;
  return { subject, html };
}

/** Who gets the alert, and whether this lead qualifies, for the mode. */
export function decide(mode: AlertMode, ad: AdSource): { send: boolean; to: 'luvi' | 'fahad' | null } {
  if (mode === 'off') return { send: false, to: null };
  if (mode === 'test') return { send: true, to: 'fahad' };
  return ad.fromAd ? { send: true, to: 'luvi' } : { send: false, to: null };
}
