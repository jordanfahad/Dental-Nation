import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/role';
import { sendEmail, emailTransport, emailConfigured } from '@/lib/notify/email';
import { OPS_ALERT_EMAILS, OPS_ALERT_FROM } from '@/config/ops';

export const runtime = 'nodejs'; // nodemailer needs the Node runtime, not Edge
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Admin test-send for the alert email pipeline. Confirms the SMTP (or Resend)
 * transport actually delivers before we rely on it for new-lead alerts.
 *   GET /api/notify/test                      → send to the ops inbox (admin session)
 *   GET /api/notify/test?to=you@dentalnation.com
 *   GET /api/notify/test?secret=<CRON_SECRET>&to=…   (no session needed)
 * Never exposes the credentials — only which transport is active + the result.
 */
async function authorized(req: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (req.headers.get('authorization') === `Bearer ${secret}`) return true;
    if (req.nextUrl.searchParams.get('secret') === secret) return true;
  }
  return isAdmin();
}

export async function GET(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const transport = emailTransport();
  if (!emailConfigured()) {
    return NextResponse.json({
      ok: false,
      transport,
      error: 'No email transport configured — set SMTP_HOST / SMTP_USER / SMTP_PASS (or RESEND_API_KEY) in Vercel env.',
    });
  }

  const toParam = req.nextUrl.searchParams.get('to');
  const to = toParam ? toParam.split(',').map((s) => s.trim()).filter(Boolean) : OPS_ALERT_EMAILS;

  const res = await sendEmail({
    to,
    subject: 'Dental Nation — email alert test',
    html:
      '<div style="font:14px sans-serif;color:#111"><p><strong>Test email</strong> from the Dental Nation dashboard.</p>' +
      '<p>If you can read this, new-lead alerts are wired up and delivering.</p></div>',
    from: OPS_ALERT_FROM,
  });

  return NextResponse.json({ transport, to, ...res });
}
