import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/role';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GMB location DISCOVERY — lists every Business Profile account and location
 * the connected Google account manages, so GMB_LOCATION_IDS can be filled in
 * by copy-paste instead of spelunking the Business Profile UI.
 *
 * Needs only GMB_CLIENT_ID / GMB_CLIENT_SECRET / GMB_REFRESH_TOKEN (i.e. it
 * works BEFORE GMB_LOCATION_IDS is set — that is its whole purpose). Uses the
 * Account Management + Business Information APIs; enable both in the project
 * alongside the Business Profile Performance API.
 *
 *   GET /api/gmb/locations                    (signed in as admin)
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

interface Account {
  name?: string;
  accountName?: string;
  type?: string;
}
interface Location {
  name?: string;
  title?: string;
  storefrontAddress?: { addressLines?: string[]; locality?: string };
}

export async function GET(req: NextRequest) {
  if (!hasSecret(req) && !(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const clientId = process.env.GMB_CLIENT_ID?.trim();
  const clientSecret = process.env.GMB_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GMB_REFRESH_TOKEN?.trim();
  if (!clientId || !clientSecret || !refreshToken) {
    return NextResponse.json(
      { error: 'Set GMB_CLIENT_ID, GMB_CLIENT_SECRET and GMB_REFRESH_TOKEN first — GMB_LOCATION_IDS is what this route helps you find.' },
      { status: 503 },
    );
  }

  let token: string;
  try {
    token = await accessToken(clientId, clientSecret, refreshToken);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
  const headers = { Authorization: `Bearer ${token}` };

  const acctRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
    headers,
    cache: 'no-store',
  });
  const acctData = (await acctRes.json().catch(() => ({}))) as { accounts?: Account[]; error?: { message?: string } };
  if (!acctRes.ok) {
    return NextResponse.json(
      { error: `Account Management API ${acctRes.status}: ${acctData.error?.message ?? 'request failed'} — is the "My Business Account Management API" enabled in the project?` },
      { status: 502 },
    );
  }

  const out: { account: string; accountName: string; locations: { id: string; title: string; address: string }[] }[] = [];
  for (const acct of acctData.accounts ?? []) {
    if (!acct.name) continue;
    const locRes = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${acct.name}/locations?readMask=name,title,storefrontAddress&pageSize=100`,
      { headers, cache: 'no-store' },
    );
    const locData = (await locRes.json().catch(() => ({}))) as { locations?: Location[]; error?: { message?: string } };
    out.push({
      account: acct.name,
      accountName: acct.accountName ?? acct.type ?? acct.name,
      locations: locRes.ok
        ? (locData.locations ?? []).map((l) => ({
            id: l.name ?? '',
            title: l.title ?? '(untitled)',
            address: [...(l.storefrontAddress?.addressLines ?? []), l.storefrontAddress?.locality ?? '']
              .filter(Boolean)
              .join(', '),
          }))
        : [{ id: '', title: `ERROR ${locRes.status}: ${locData.error?.message ?? 'is the "My Business Business Information API" enabled?'}`, address: '' }],
    });
  }

  return NextResponse.json({
    hint: 'Copy each locations/… id into GMB_LOCATION_IDS (comma-separated) and matching names into GMB_LOCATION_LABELS.',
    accounts: out,
  });
}
