import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { googleAdsDebug, googleAdsListAccessible, googleAdsProbe, syncGoogleAds } from '@/lib/sync/adapters/google-ads-adapter';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Google Ads probe + manual/backfill sync. Secret-gated.
 *   GET /api/google-ads/probe?secret=…                                  → credential/shape probe
 *   GET /api/google-ads/probe?secret=…&sync=1                           → trailing 30 days
 *   GET /api/google-ads/probe?secret=…&sync=1&from=2026-01-01&to=2026-06-18  → backfill
 *
 * Accepts WIDGET_HEALTH_SECRET as well as CRON_SECRET (same policy as
 * lib/auth/serviceToken.ts): CRON_SECRET is stored write-only in Vercel, so
 * the operator may not KNOW its value — the backfill URL must be usable with
 * the secret they hold.
 */
function authorized(req: NextRequest): boolean {
  const accepted = [process.env.WIDGET_HEALTH_SECRET, process.env.CRON_SECRET].filter(
    (s): s is string => Boolean(s),
  );
  if (accepted.length === 0) return false;
  const auth = req.headers.get('authorization');
  const qs = req.nextUrl.searchParams.get('secret');
  return accepted.some((s) => auth === `Bearer ${s}` || qs === s);
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
  if (sp.get('mode') === 'accessible') {
    const list = await googleAdsListAccessible(sp.get('version') ?? undefined);
    return NextResponse.json(list, { status: list.ok ? 200 : 502 });
  }
  if (sp.get('debug') === '1') {
    const dbg = await googleAdsDebug(sp.get('version') ?? undefined, sp.get('lcid') ?? undefined);
    return NextResponse.json(dbg, { status: dbg.ok ? 200 : 502 });
  }
  const probe = await googleAdsProbe(sp.get('version') ?? undefined);
  return NextResponse.json(probe, { status: probe.ok ? 200 : 502 });
}
