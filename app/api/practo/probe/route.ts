import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { practoProbe, syncPracto } from '@/lib/sync/adapters/practo-adapter';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // a full-history backfill spans many 7-day windows.

/**
 * Practo shape-discovery + manual-sync endpoint. Protected by CRON_SECRET (the
 * container can't reach Practo; this runs on Vercel). Examples:
 *   GET /api/practo/probe?secret=<CRON_SECRET>                       → return one raw bill (shape discovery)
 *   GET /api/practo/probe?secret=<CRON_SECRET>&sync=1                → pull the trailing 14 days
 *   GET /api/practo/probe?secret=<CRON_SECRET>&sync=1&from=2026-01-01&to=2026-06-18  → BACKFILL history
 *   GET /api/practo/probe?secret=<CRON_SECRET>&sync=1&days=180       → trailing N days
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
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });

  if (req.nextUrl.searchParams.get('sync') === '1') {
    const sp = req.nextUrl.searchParams;
    const from = sp.get('from') ?? undefined;
    const to = sp.get('to') ?? undefined;
    const daysRaw = sp.get('days');
    const days = daysRaw ? Number(daysRaw) : undefined;
    const result = await syncPracto(supabase, { from, to, days });
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  }
  const probe = await practoProbe(supabase);
  return NextResponse.json(probe, { status: probe.ok ? 200 : 502 });
}
