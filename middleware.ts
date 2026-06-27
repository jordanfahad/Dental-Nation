import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_COOKIE,
  SESSION_TTL_MS,
  createSessionToken,
  safeEqual,
  verifySessionToken,
} from '@/lib/auth/session';

/** Query param carrying the read-only share token (the CEO's private link). */
const ACCESS_PARAM = 'access';

/**
 * Password gate (§12). Protects everything except /login, /api/cron/* and static
 * assets. If DASHBOARD_PASSWORD / AUTH_SESSION_SECRET are not configured, the
 * gate is OPEN (so the scaffold is viewable before secrets are set) — documented
 * in BUILD_NOTES. Set both env vars to activate the gate.
 *
 * Private viewer link: a visit carrying `?access=<VIEWER_LINK_TOKEN>` is issued a
 * read-only (viewer) session WITHOUT a password — for the CEO + coordinator — and
 * the token is then stripped from the URL. Rotate/revoke by changing or clearing
 * VIEWER_LINK_TOKEN (cleared = link dead; live cookies still expire after the TTL).
 */
export async function middleware(req: NextRequest) {
  const secret = process.env.AUTH_SESSION_SECRET;
  const password = process.env.DASHBOARD_PASSWORD;

  // Unconfigured → gate disabled.
  if (!secret || !password) return NextResponse.next();

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const authed = await verifySessionToken(token, secret);
  if (authed) return NextResponse.next();

  // Private, no-password viewer link → grant a viewer session, then strip the token.
  // Trim the env value so an accidental trailing space/newline from pasting it into
  // the dashboard doesn't silently break the link (a common gotcha).
  const linkToken = process.env.VIEWER_LINK_TOKEN?.trim();
  const provided = req.nextUrl.searchParams.get(ACCESS_PARAM)?.trim();
  if (linkToken && provided && safeEqual(provided, linkToken)) {
    const clean = req.nextUrl.clone();
    clean.searchParams.delete(ACCESS_PARAM); // keep the token out of the address bar / history
    const res = NextResponse.redirect(clean);
    res.cookies.set(AUTH_COOKIE, await createSessionToken(secret, 'viewer'), {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    });
    return res;
  }

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('from', req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except login, the cron + practo endpoints (CRON_SECRET-gated),
  // the standalone Leave Calendar (Leave-Calendar + api/leave-auth — it runs its
  // own CEO/super-admin-only gate), Next internals and static files.
  matcher: ['/((?!login|api/cron|api/practo|api/meta|api/google-ads|Leave-Calendar|api/leave-|_next/static|_next/image|favicon.ico).*)'],
};
