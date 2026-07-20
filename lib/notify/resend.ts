import 'server-only';

/**
 * Minimal Resend email sender (no SDK — a single fetch). Gated on RESEND_API_KEY:
 * with no key configured it is a no-op that reports `skipped`, so callers never
 * throw and nothing is sent until email is deliberately enabled in Vercel.
 */
export interface SendResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

export async function sendEmail(opts: {
  to: string[];
  subject: string;
  html: string;
  from: string;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: true, error: 'RESEND_API_KEY not set' };
  if (opts.to.length === 0) return { ok: false, error: 'no recipients' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: opts.from, to: opts.to, subject: opts.subject, html: opts.html }),
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: `${res.status} ${(await res.text()).slice(0, 300)}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
