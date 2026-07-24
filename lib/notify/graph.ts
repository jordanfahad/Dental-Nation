import 'server-only';
import type { SendResult } from './resend';

/**
 * Microsoft Graph email sender (OAuth client-credentials — "modern auth").
 *
 * This is the Microsoft-sanctioned way for an app to send mail and it works
 * with tenant Security Defaults ON — unlike SMTP AUTH, which Security Defaults
 * blocks for every user with no per-user exclusion possible. IT creates an app
 * registration with the Mail.Send application permission (admin-consented) and
 * we exchange its client secret for a token, then post sendMail as the alerts
 * mailbox. No mailbox password involved.
 *
 * Gated on MS_GRAPH_TENANT_ID + MS_GRAPH_CLIENT_ID + MS_GRAPH_CLIENT_SECRET;
 * with any missing it is a no-op that reports `skipped`. The sender mailbox is
 * MS_GRAPH_SENDER (falls back to SMTP_USER so the two setups share config) —
 * NOT the `from` argument: Graph identifies the sender by the mailbox in the
 * sendMail URL, so `from` only contributes its display name, and only when its
 * address IS that mailbox (a different address would need Send As rights).
 * Rotate MS_GRAPH_SENDER, not OPS_ALERT_FROM, to change the sender here.
 * Credentials live ONLY in Vercel env — never in code or the DB.
 */

export function graphConfigured(): boolean {
  return Boolean(process.env.MS_GRAPH_TENANT_ID && process.env.MS_GRAPH_CLIENT_ID && process.env.MS_GRAPH_CLIENT_SECRET);
}

function senderMailbox(): string {
  return (process.env.MS_GRAPH_SENDER || process.env.SMTP_USER || 'alerts@dentalnation.com').trim();
}

/** Split `"Name <addr>"` / `Name <addr>` / bare `addr` into its parts. */
function parseFrom(from: string): { address: string; name?: string } {
  const m = from.match(/^\s*(?:"?([^"<]*?)"?\s*)?<([^>]+)>\s*$/);
  return { address: (m ? m[2] : from).trim(), name: m?.[1]?.trim() || undefined };
}

// Token cache — client-credentials tokens last ~60–90 min; refresh 60s early.
let cachedToken: { value: string; expiresAtMs: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAtMs) return cachedToken.value;
  const tenant = process.env.MS_GRAPH_TENANT_ID!;
  const res = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.MS_GRAPH_CLIENT_ID!,
      client_secret: process.env.MS_GRAPH_CLIENT_SECRET!,
      scope: 'https://graph.microsoft.com/.default',
    }),
    cache: 'no-store',
  });
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !body.access_token) {
    throw new Error(`Graph token: ${res.status} ${(body.error_description || '').slice(0, 200)}`);
  }
  cachedToken = { value: body.access_token, expiresAtMs: Date.now() + (Number(body.expires_in) || 3600) * 1000 - 60_000 };
  return cachedToken.value;
}

function postSendMail(token: string, opts: { to: string[]; subject: string; html: string; from: string }): Promise<Response> {
  const sender = senderMailbox();
  const from = parseFrom(opts.from || '');
  const keepDisplayName = from.name && from.address.toLowerCase() === sender.toLowerCase();
  return fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        subject: opts.subject,
        body: { contentType: 'HTML', content: opts.html },
        toRecipients: opts.to.map((address) => ({ emailAddress: { address } })),
        ...(keepDisplayName ? { from: { emailAddress: { address: sender, name: from.name } } } : {}),
      },
      saveToSentItems: true,
    }),
    cache: 'no-store',
  });
}

export async function sendEmailGraph(opts: { to: string[]; subject: string; html: string; from: string }): Promise<SendResult> {
  if (!graphConfigured()) return { ok: false, skipped: true, error: 'Graph not configured' };
  if (opts.to.length === 0) return { ok: false, error: 'no recipients' };
  try {
    let res = await postSendMail(await getToken(), opts);
    if (res.status === 401) {
      // Cached token revoked before its local expiry (CAE / policy change).
      // 401 means nothing was sent, so re-auth once and retry — no duplicate
      // risk, and the alert batch isn't stalled by a transient rejection.
      cachedToken = null;
      res = await postSendMail(await getToken(), opts);
    }
    // Success is 202 Accepted with an empty body.
    if (res.status === 202) return { ok: true };
    // 401 after a fresh token = real auth problem. 403 = token may predate the
    // Mail.Send admin consent (no roles claim) — either way drop the cache so
    // the next attempt re-auths instead of replaying a doomed token for ~1h.
    if (res.status === 401 || res.status === 403) cachedToken = null;
    return { ok: false, error: `Graph sendMail: ${res.status} ${(await res.text()).slice(0, 300)}` };
  } catch (err) {
    // Token-endpoint or network failure — the cached token (if any) is still
    // fine, so keep it; genuine staleness is handled on the 401/403 path above.
    return { ok: false, error: (err as Error).message.slice(0, 300) };
  }
}
