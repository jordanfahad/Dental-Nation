import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/role';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { readGmbSecrets } from '@/config/gmb';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GMB one-time OAuth consent helper — turns the "mint a refresh token" dance
 * into two URL visits, using the Desktop OAuth client already stored in
 * app_secrets (gmb_client_id / gmb_client_secret):
 *
 *   1. GET /api/gmb/oauth            → returns the Google consent URL to open.
 *      Sign in with the Google account that MANAGES the clinic listings.
 *      The browser lands on http://localhost/?code=4/… (a dead page — expected);
 *      copy the code value from the address bar.
 *   2. GET /api/gmb/oauth?code=4/…   → exchanges the code and stores the
 *      refresh token in app_secrets (gmb_refresh_token). From then on the
 *      sync self-sustains; next stop /api/gmb/locations?store=1.
 *
 * Admin- or CRON_SECRET-gated like the other GMB routes.
 */
const REDIRECT_URI = 'http://localhost';
const SCOPE = 'https://www.googleapis.com/auth/business.manage';

function hasSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;
  return req.nextUrl.searchParams.get('secret') === secret;
}

export async function GET(req: NextRequest) {
  if (!hasSecret(req) && !(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });

  const stored = await readGmbSecrets(supabase);
  const clientId = process.env.GMB_CLIENT_ID?.trim() || stored.get('gmb_client_id');
  const clientSecret = process.env.GMB_CLIENT_SECRET?.trim() || stored.get('gmb_client_secret');
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'gmb_client_id / gmb_client_secret not stored yet' }, { status: 503 });
  }

  const code = req.nextUrl.searchParams.get('code')?.trim();

  // ── Step 1: no code yet — hand back the consent URL. ────────────────────
  if (!code) {
    const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    auth.searchParams.set('client_id', clientId);
    auth.searchParams.set('redirect_uri', REDIRECT_URI);
    auth.searchParams.set('response_type', 'code');
    auth.searchParams.set('scope', SCOPE);
    auth.searchParams.set('access_type', 'offline');
    auth.searchParams.set('prompt', 'consent');
    return NextResponse.json({
      step: 1,
      open_this_url: auth.toString(),
      then: 'Sign in with the Google account that manages the clinic listings and approve. The browser will land on a dead http://localhost/?code=… page — copy the code value (starts with 4/) from the address bar and open /api/gmb/oauth?code=THE_CODE',
    });
  }

  // ── Step 2: exchange the code and persist the refresh token. ────────────
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => ({}))) as {
    refresh_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.refresh_token) {
    return NextResponse.json(
      {
        error: `Code exchange failed (${res.status}): ${data.error_description ?? data.error ?? 'no refresh_token returned'}`,
        hint: 'Codes are single-use and expire in minutes — rerun step 1 for a fresh one.',
      },
      { status: 502 },
    );
  }

  const { error } = await supabase
    .from('app_secrets')
    .upsert({ key: 'gmb_refresh_token', value: data.refresh_token }, { onConflict: 'key' });
  if (error) return NextResponse.json({ error: `Stored exchange failed: ${error.message}` }, { status: 500 });

  return NextResponse.json({
    step: 2,
    stored: 'gmb_refresh_token',
    next: 'Open /api/gmb/locations?store=1 to discover and store the clinic location ids, then /api/gmb/probe?from=2026-01-01 to backfill.',
  });
}
