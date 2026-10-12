import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/role';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { readGmbSecrets } from '@/config/gmb';
import { discoverGmbLocations, gmbDiscoveryValues } from '@/lib/sync/gmb-discovery';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Read-only discovery across the connected accounts. Returns only matching
 * dental-group locations as three aligned values for manual review/storage.
 *
 * Needs only GMB_CLIENT_ID / GMB_CLIENT_SECRET / GMB_REFRESH_TOKEN (i.e. it
 * works BEFORE GMB_LOCATION_IDS is set — that is its whole purpose). Uses the
 * Account Management + Business Information APIs; enable both in the project
 * alongside the Business Profile Performance API.
 *
 *   GET /api/gmb/locations                    (signed in as admin)
 *   GET /api/gmb/locations?store=1            legacy alias; read-only, never stores
 *   GET /api/gmb/locations?secret=<CRON_SECRET>
 */
function hasSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;
  return req.nextUrl.searchParams.get('secret') === secret;
}

async function accessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; error_description?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(`OAuth token exchange failed (${res.status}): ${data.error_description ?? 'no access_token'}`);
  }
  return data.access_token;
}

export async function GET(req: NextRequest) {
  if (!hasSecret(req) && !(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const stored = await readGmbSecrets(getSupabaseAdmin());
  const clientId = process.env.GMB_CLIENT_ID?.trim() || stored.get('gmb_client_id');
  const clientSecret = process.env.GMB_CLIENT_SECRET?.trim() || stored.get('gmb_client_secret');
  const refreshToken = process.env.GMB_REFRESH_TOKEN?.trim() || stored.get('gmb_refresh_token');
  if (!clientId || !clientSecret || !refreshToken) {
    return NextResponse.json(
      { error: 'Set gmb_client_id, gmb_client_secret and gmb_refresh_token first (env or app_secrets) — the location ids are what this route helps you find.' },
      { status: 503 },
    );
  }

  let token: string;
  try {
    token = await accessToken(clientId, clientSecret, refreshToken);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
  try {
    const discovery = await discoverGmbLocations(token);
    const values = discovery.failedAccounts ? null : gmbDiscoveryValues(discovery.accounts);
    return NextResponse.json({
      hint: 'Read-only discovery. The store option has been removed. Review the dental-group matches and paste all three aligned values into app_secrets; unrelated locations are excluded.',
      app_secrets: values,
      warning: values ? null : 'Discovery is incomplete, ambiguous, or has no dental-group matches. Resolve this before changing configuration.',
    });
  } catch {
    return NextResponse.json({ error: 'Business Profile discovery failed' }, { status: 502 });
  }
}
