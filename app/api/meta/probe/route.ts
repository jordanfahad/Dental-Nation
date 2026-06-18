import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { metaProbe, syncMeta } from '@/lib/sync/adapters/meta-adapter';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // a multi-month backfill spans many rows.

/**
 * Meta shape-discovery + manual-sync endpoint. CRON_SECRET-gated (Meta is only
 * reachable from Vercel). Examples:
 *   GET /api/meta/probe?secret=<CRON_SECRET>                          → sample row (shape discovery)
 *   GET /api/meta/probe?secret=<CRON_SECRET>&sync=1                   → pull trailing 30 days
 *   GET /api/meta/probe?secret=<CRON_SECRET>&sync=1&from=2026-01-01&to=2026-06-18  → backfill
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

  const sp = req.nextUrl.searchParams;
  if (sp.get('sync') === '1') {
    const from = sp.get('from') ?? undefined;
    const to = sp.get('to') ?? undefined;
    const days = sp.get('days') ? Number(sp.get('days')) : undefined;
    const result = await syncMeta(supabase, { from, to, days });
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  }
  const probe = await metaProbe(supabase);
  return NextResponse.json(probe, { status: probe.ok ? 200 : 502 });
}
