import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse, after } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { sendEmail, emailConfigured } from '@/lib/notify/email';
import { OPS_ALERT_FROM } from '@/config/ops';
import { emailsOf, loadStoredEmails } from '@/lib/smileclub/alerts';
import {
  adSourceOf, buildLeadEmail, decide, eventOf, isIncomingPatientMessage, leadOf, signatureStatus, type AlertMode,
} from '@/lib/zavis/leadAlert';

/**
 * Zavis webhook (Settings > Integrations > Webhooks in crm.zavis.ai, account 13).
 * The URL carries a secret token (ZAVIS_WEBHOOK_TOKEN in Vercel, or the
 * database secret 'zavis_webhook_token'); a request without it is refused. Zavis wants a success reply within 5 seconds and does
 * not resend, so the reply goes first and the logging and email run after it.
 * The password gate does not cover this path (middleware matcher).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** The expected token: ZAVIS_WEBHOOK_TOKEN in Vercel, else lane_e.app_secrets 'zavis_webhook_token'. */
async function expectedToken(): Promise<string | null> {
  const env = process.env.ZAVIS_WEBHOOK_TOKEN?.trim();
  if (env) return env;
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data } = await db.from('app_secrets').select('value').eq('key', 'zavis_webhook_token').maybeSingle();
  return String(data?.value ?? '').trim() || null;
}

function tokenOk(given: string | null, want: string | null): boolean {
  if (!want || !given) return false;
  const a = Buffer.from(given), b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

const MODES: AlertMode[] = ['off', 'test', 'live'];

export async function POST(req: NextRequest) {
  const given = req.nextUrl.searchParams.get('token');
  if (!tokenOk(given, await expectedToken())) {
    // One line per refused call (never the token itself), so a mistyped URL in Zavis shows up in the logs.
    console.warn(`[zavis-webhook] refused: ${given ? 'wrong token' : 'no token'}`);
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const raw = await req.text();
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ ok: true, ignored: 'not json' }); }
  // Signature check is logged, not enforced, until the first real calls confirm the format;
  // the secret URL token above already refuses anyone else.
  const db0 = getSupabaseAdmin();
  const { data: secretRow } = db0 ? await db0.from('app_secrets').select('value').eq('key', 'zavis_webhook_secret').maybeSingle() : { data: null };
  const sig = signatureStatus(
    Object.fromEntries(req.headers.entries()), raw, String(secretRow?.value ?? '').trim() || null,
    (key, msg) => createHmac('sha256', key).update(msg).digest('hex'),
  );
  console.log(`[zavis-webhook] received ${eventOf(payload)} · signature ${sig}`);

  after(async () => {
    const db = getSupabaseAdmin();
    if (!db) return;
    const event = eventOf(payload);
    const lead = leadOf(payload);
    const ad = adSourceOf(payload);
    await db.from('zavis_webhook_events').insert({
      event, conversation_id: lead.conversationId, contact_id: lead.contactId, from_ad: ad.fromAd, ad_detail: ad.detail, payload,
    });
    // One alert per conversation, on the patient's first message.
    if (!isIncomingPatientMessage(payload) || lead.conversationId == null) return;
    const { data: modeRow } = await db.from('app_secrets').select('value').eq('key', 'zavis_alert_mode').maybeSingle();
    const raw = String(modeRow?.value ?? 'test').trim() as AlertMode;
    const mode: AlertMode = MODES.includes(raw) ? raw : 'test';
    const d = decide(mode, ad);
    if (!d.send || !d.to || !emailConfigured()) return;
    // Claim the conversation first: a second message never sends a second email.
    const { data: claimed } = await db.from('zavis_lead_alerts')
      .upsert({ conversation_id: lead.conversationId, mode, from_ad: ad.fromAd }, { onConflict: 'conversation_id', ignoreDuplicates: true })
      .select('conversation_id');
    if (!claimed?.length) return;
    await loadStoredEmails(db);
    const to = emailsOf(d.to);
    if (!to.length) return;
    const { subject, html } = buildLeadEmail(lead, ad, mode);
    const r = await sendEmail({ to, cc: d.to === 'luvi' ? emailsOf('fahad') : [], subject, html, from: OPS_ALERT_FROM });
    await db.from('zavis_lead_alerts').update({ sent_at: new Date().toISOString(), ok: r.ok, recipients: to }).eq('conversation_id', lead.conversationId);
  });

  return NextResponse.json({ ok: true });
}
