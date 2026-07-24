import 'server-only';
import { sendEmail as sendViaResend, type SendResult } from './resend';
import { sendEmailSmtp, smtpConfigured } from './smtp';
import { sendEmailGraph, graphConfigured } from './graph';

/**
 * Unified email sender. Transport priority:
 *   1. Microsoft Graph (MS_GRAPH_* env) — modern auth; works with tenant
 *      Security Defaults ON, so it's the preferred Microsoft 365 path.
 *   2. SMTP (SMTP_* env) — the mailbox's own SMTP AUTH; blocked whenever the
 *      tenant has Security Defaults enabled.
 *   3. Resend (RESEND_API_KEY) — third-party fallback.
 * If none is set it reports `skipped`, so alerts stay a safe no-op until email
 * is deliberately enabled in Vercel.
 */

export type { SendResult };

/** True when SOME email transport is configured. */
export function emailConfigured(): boolean {
  return graphConfigured() || smtpConfigured() || Boolean(process.env.RESEND_API_KEY);
}

/** Which transport is active (for diagnostics). */
export function emailTransport(): 'graph' | 'smtp' | 'resend' | 'none' {
  if (graphConfigured()) return 'graph';
  if (smtpConfigured()) return 'smtp';
  if (process.env.RESEND_API_KEY) return 'resend';
  return 'none';
}

export async function sendEmail(opts: { to: string[]; subject: string; html: string; from: string }): Promise<SendResult> {
  if (graphConfigured()) return sendEmailGraph(opts);
  if (smtpConfigured()) return sendEmailSmtp(opts);
  return sendViaResend(opts);
}
