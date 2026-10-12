import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth/role';
import { syncGmb } from '@/lib/sync/adapters/gmb-adapter';
import { resolveGmbConfig } from '@/config/gmb';
import { currentUser } from '@/lib/auth/role';
import { backfillGmb, validGmbBackfillDate } from '@/lib/sync/gmb-backfill';
import { revalidatePath } from 'next/cache';

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
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  const config = await resolveGmbConfig(supabase);
  if (!config) {
    return NextResponse.json(
      { error: 'GMB not configured — set GMB_CLIENT_ID / GMB_CLIENT_SECRET / GMB_REFRESH_TOKEN / GMB_LOCATION_IDS (env or app_secrets)' },
      { status: 503 },
    );
  }

  const sp = req.nextUrl.searchParams;
  const from = sp.get('from') ?? undefined;
  const to = sp.get('to') ?? undefined;
  const days = sp.get('days') ? Number(sp.get('days')) : undefined;
  if ((from != null && !validGmbBackfillDate(from)) || (to != null && !validGmbBackfillDate(to)) ||
      (from && to && from > to) || (days != null && (!Number.isInteger(days) || days < 1 || days > 548))) {
    return NextResponse.json({ error: 'Invalid sync date range' }, { status: 400 });
  }
  const result = await syncGmb(supabase, { from, to, days, config });
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

/** The Status form requires an authenticated, currently active admin. No cron
 * credential or open-scaffold admin fallback is accepted for this action. */
export async function POST(req: NextRequest) {
  if (!process.env.AUTH_SESSION_SECRET || !process.env.DASHBOARD_PASSWORD || (await currentUser())?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const origin = req.headers.get('origin');
  if (!origin || origin !== req.nextUrl.origin) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }
  const input = await req.json().catch(() => null);
  if (!validGmbBackfillDate(input?.from)) {
    return NextResponse.json({ error: 'Choose a valid start date on or before today.' }, { status: 400 });
  }
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  const config = await resolveGmbConfig(db);
  if (!config) return NextResponse.json({ error: 'Business Profile configuration is missing or invalid.' }, { status: 503 });
  try {
    const result = await backfillGmb(db, config, input.from);
    revalidatePath('/');
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch {
    return NextResponse.json({ error: 'Business Profile backfill failed. Retry from the same date.' }, { status: 502 });
  }
}
