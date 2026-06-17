import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, verifySessionToken } from '@/lib/auth/session';

/**
 * Password gate (§12). Protects everything except /login, /api/cron/* and static
 * assets. If DASHBOARD_PASSWORD / AUTH_SESSION_SECRET are not configured, the
 * gate is OPEN (so the scaffold is viewable before secrets are set) — documented
 * in BUILD_NOTES. Set both env vars to activate the gate.
 */
export async function middleware(req: NextRequest) {
  const secret = process.env.AUTH_SESSION_SECRET;
  const password = process.env.DASHBOARD_PASSWORD;

  // Unconfigured → gate disabled.
  if (!secret || !password) return NextResponse.next();

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const authed = await verifySessionToken(token, secret);
  if (authed) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('from', req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except login, the cron endpoint, Next internals and static files.
  matcher: ['/((?!login|api/cron|_next/static|_next/image|favicon.ico).*)'],
};
