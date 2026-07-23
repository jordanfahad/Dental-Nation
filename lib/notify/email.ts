import 'server-only';
import { sendEmail as sendViaResend, type SendResult } from './resend';
import { sendEmailSmtp, smtpConfigured } from './smtp';

/**
 * Unified email sender. Prefers the clinic's own SMTP mailbox (SMTP_* env — e.g.
 * Microsoft 365) when configured, otherwise falls back to Resend
 * (RESEND_API_KEY). If neither is set it reports `skipped`, so alerts stay a
 * safe no-op until email is deliberately enabled in Vercel.
 */

export type { SendResult };

/** True when SOME email transport is configured. */
export function emailConfigured(): boolean {
  return smtpConfigured() || Boolean(process.env.RESEND_API_KEY);
}

/** Which transport is active (for diagnostics). */
export function emailTransport(): 'smtp' | 'resend' | 'none' {
  if (smtpConfigured()) return 'smtp';
  if (process.env.RESEND_API_KEY) return 'resend';
  return 'none';
}

export async function sendEmail(opts: { to: string[]; subject: string; html: string; from: string }): Promise<SendResult> {
  if (smtpConfigured()) return sendEmailSmtp(opts);
  return sendViaResend(opts);
}
