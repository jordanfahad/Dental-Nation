import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { googleAdsDebug, googleAdsProbe, syncGoogleAds } from '@/lib/sync/adapters/google-ads-adapter';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Google Ads probe + manual/backfill sync. CRON_SECRET-gated.
 *   GET /api/google-ads/probe?secret=…                                  → credential/shape probe
 *   GET /api/google-ads/probe?secret=…&sync=1                           → trailing 30 days
 *   GET /api/google-ads/probe?secret=…&sync=1&from=2026-01-01&to=2026-06-18  → backfill
 */
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;
  return req.nextUrl.searchParams.get('secret') === secret;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  if (sp.get('sync') === '1') {
    const supabase = getSupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    const result = await syncGoogleAds(supabase, {
      from: sp.get('from') ?? undefined,
      to: sp.get('to') ?? undefined,
      days: sp.get('days') ? Number(sp.get('days')) : undefined,
      version: sp.get('version') ?? undefined,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  }
  if (sp.get('debug') === '1') {
    const dbg = await googleAdsDebug(sp.get('version') ?? undefined, sp.get('lcid') ?? undefined);
    return NextResponse.json(dbg, { status: dbg.ok ? 200 : 502 });
  }
  const probe = await googleAdsProbe(sp.get('version') ?? undefined);
  return NextResponse.json(probe, { status: probe.ok ? 200 : 502 });
}
