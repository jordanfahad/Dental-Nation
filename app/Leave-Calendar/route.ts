import { cookies } from 'next/headers';
import { LEAVE_COOKIE, verifyLeaveToken } from '@/lib/auth/leave-session';
import { LEAVE_HTML_B64 } from './content';
import { LOGIN_HTML } from './login';

/**
 * Leave Calendar — standalone, self-contained page (like /Fahad-know-how), but
 * locked to leadership: only Mr Akbar (CEO) and the Super Admin can view it.
 *
 * This route is EXCLUDED from the dashboard's shared-password middleware (see
 * middleware.ts) and enforces its own gate: a valid `dn_leave_access` cookie
 * (issued by /api/leave-auth after `leave_verify_login`). No cookie → the
 * standalone login screen is served instead of the calendar.
 */
export async function GET() {
  const secret = process.env.AUTH_SESSION_SECRET;
  const token = (await cookies()).get(LEAVE_COOKIE)?.value;
  const session = secret ? await verifyLeaveToken(token, secret) : null;

  const html = session
    ? Buffer.from(LEAVE_HTML_B64, 'base64').toString('utf8')
    : LOGIN_HTML;

  return new Response(html, {
    status: session ? 200 : 401,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex',
    },
  });
}
