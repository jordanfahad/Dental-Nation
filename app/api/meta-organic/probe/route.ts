import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth/role';
import { syncMetaOrganic } from '@/lib/sync/adapters/meta-organic-adapter';
import { isMetaOrganicConfigured } from '@/config/meta-organic';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Meta ORGANIC manual-sync endpoint. Authorised by CRON_SECRET OR a signed-in
 * admin. Writes only lane_e.social_insights. Examples:
 *   GET /api/meta-organic/probe?secret=<CRON_SECRET>                     → trailing 30 days
 *   GET /api/meta-organic/probe?from=2026-06-01&to=2026-07-16   (admin)  → backfill
 * Returns { ok, stored, channels, notes } — `notes` lists any per-metric skips.
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
  if (!isMetaOrganicConfigured()) {
    return NextResponse.json(
      { error: 'Meta organic not configured — set META_ORGANIC_TOKEN (or META_ACCESS_TOKEN) + META_FB_PAGE_ID and/or META_IG_USER_ID' },
      { status: 503 },
    );
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });

  const sp = req.nextUrl.searchParams;
  const from = sp.get('from') ?? undefined;
  const to = sp.get('to') ?? undefined;
  const days = sp.get('days') ? Number(sp.get('days')) : undefined;
  const result = await syncMetaOrganic(supabase, { from, to, days });
  return NextResponse.json(result, { status: result.ok || result.stored > 0 ? 200 : 502 });
}
