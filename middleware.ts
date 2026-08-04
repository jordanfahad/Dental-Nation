import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_COOKIE,
  SESSION_TTL_MS,
  canSeeGrowthProjects,
  createSessionToken,
  isReceptionist,
  safeEqual,
  verifySession,
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
  const session = await verifySession(token, secret);
  if (session) {
    // Receptionist is locked to the dashboard root (which itself shows ONLY the
    // Clinical Operations tab) — any other in-app route bounces home.
    if (isReceptionist(session.role) && req.nextUrl.pathname !== '/') {
      const home = req.nextUrl.clone();
      home.pathname = '/';
      home.search = '';
      return NextResponse.redirect(home);
    }
    // Restricted staff (Dr Luvi & Gautam) cannot open Growth Projects (/impact).
    // The Leave Calendar has its own separate gate and is hidden from their nav.
    if (!canSeeGrowthProjects(session.role) && req.nextUrl.pathname.startsWith('/impact')) {
      const home = req.nextUrl.clone();
      home.pathname = '/';
      home.search = '';
      return NextResponse.redirect(home);
    }
    return NextResponse.next();
  }

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
  // Carry the FULL deep link (path + query) through the login page. Pathname
  // alone destroyed shared links: "/?tab=group&gtab=growth" became "/" after a
  // successful login, landing the person on the default Executive tab — which
  // reads as "I still have the old view" even though their access is correct.
  url.search = '';
  url.searchParams.set('from', req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except login, the cron + practo endpoints (CRON_SECRET-gated),
  // the standalone Leave Calendar (Leave-Calendar + api/leave-auth — it runs its
  // own CEO/super-admin-only gate), the tokenized board + handover share links
  // (share/* — the uuid token IS the credential and is validated server-side on
  // every request against lane_e.report_share_links; a password prompt there
  // would defeat the point of a link the CEO can open in a board meeting or
  // forward to an investor), the investor funnel viewer (i/* — same tokenized
  // model, aimed at investors and the board), the board deck itself
  // (board-assets/* — it is the download button ON that link, and without this
  // exclusion a board member gets the login page delivered as a .pptx), Next
  // internals and static files.
  matcher: ['/((?!login|share/|i/|board-assets/|reports/arabyads|api/cron|api/practo|api/meta|api/google-ads|api/notify|api/widget-health|api/widget-probe|Leave-Calendar|api/leave-|_next/static|_next/image|favicon.ico).*)'],
};
