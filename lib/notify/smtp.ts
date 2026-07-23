import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';
import type { SendResult } from './resend';

/**
 * SMTP email sender (nodemailer) — for sending through the clinic's own mailbox
 * (e.g. Microsoft 365: smtp.office365.com:587 STARTTLS). Gated on SMTP_HOST +
 * SMTP_USER + SMTP_PASS; with any missing it is a no-op that reports `skipped`,
 * so callers never throw and nothing sends until it's deliberately configured
 * in Vercel env. Credentials live ONLY in Vercel env — never in code or the DB.
 *
 * Runs in the Node runtime (cron/sync), never the Edge runtime.
 */

export function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let cached: Transporter | null = null;
function transporter(): Transporter {
  if (cached) return cached;
  const port = Number(process.env.SMTP_PORT || 587);
  // secure=true only for implicit TLS (465). For 587 we use STARTTLS (secure=false
  // + requireTLS) — the Microsoft 365 submission setup.
  const secure = String(process.env.SMTP_SECURE ?? '').toLowerCase() === 'true' || port === 465;
  cached = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    requireTLS: !secure,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return cached;
}

export async function sendEmailSmtp(opts: { to: string[]; subject: string; html: string; from: string }): Promise<SendResult> {
  if (!smtpConfigured()) return { ok: false, skipped: true, error: 'SMTP not configured' };
  if (opts.to.length === 0) return { ok: false, error: 'no recipients' };
  try {
    await transporter().sendMail({
      from: opts.from || process.env.SMTP_FROM || process.env.SMTP_USER,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message.slice(0, 300) };
  }
}
