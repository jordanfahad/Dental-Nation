import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth/role';
import { syncGmb } from '@/lib/sync/adapters/gmb-adapter';
import { isGmbConfigured } from '@/config/gmb';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // a multi-month backfill spans many rows.

/**
 * GMB manual-sync endpoint. Authorised by CRON_SECRET OR a signed-in admin
 * (CRON_SECRET is Sensitive/hidden in Vercel). Read-only against Google; writes
 * only lane_e.social_insights. Examples:
 *   GET /api/gmb/probe?secret=<CRON_SECRET>                        → pull trailing 30 days
 *   GET /api/gmb/probe?secret=<CRON_SECRET>&from=2026-04-01&to=2026-07-15  → backfill
 *   GET /api/gmb/probe   (while signed in as admin)                → pull trailing 30 days
 */
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
  if (!isGmbConfigured()) {
    return NextResponse.json(
      { error: 'GMB not configured — set GMB_CLIENT_ID / GMB_CLIENT_SECRET / GMB_REFRESH_TOKEN / GMB_LOCATION_IDS' },
      { status: 503 },
    );
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });

  const sp = req.nextUrl.searchParams;
  const from = sp.get('from') ?? undefined;
  const to = sp.get('to') ?? undefined;
  const days = sp.get('days') ? Number(sp.get('days')) : undefined;
  const result = await syncGmb(supabase, { from, to, days });
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
