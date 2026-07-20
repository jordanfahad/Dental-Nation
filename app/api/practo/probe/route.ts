import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth/role';
import {
  practoAppointmentsProbe,
  practoDiscover,
  practoProbe,
  syncPracto,
  syncPractoAppointments,
} from '@/lib/sync/adapters/practo-adapter';

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
  const sp = req.nextUrl.searchParams;
  const wantsDiscover = sp.get('discover') === '1';
  const wantsApptProbe = sp.get('appointments') === '1';
  const wantsApptSync = sp.get('appt_sync') === '1';
  // Read-only discovery/probes may run from the browser as a signed-in admin
  // (no CRON_SECRET needed). The appointments backfill only upserts into a fresh
  // bronze table (non-destructive, idempotent), so we let an admin trigger it
  // too; the bills sync/backfill still requires the secret.
  const adminOk = (wantsDiscover || wantsApptProbe || wantsApptSync) && (await isAdmin());
  const ok = authorized(req) || adminOk;
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });

  if (wantsDiscover) {
    const result = await practoDiscover(supabase);
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  }

  if (wantsApptProbe) {
    const result = await practoAppointmentsProbe(supabase);
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  }

  if (wantsApptSync) {
    const from = sp.get('from') ?? undefined;
    const to = sp.get('to') ?? undefined;
    const daysRaw = sp.get('days');
    const days = daysRaw ? Number(daysRaw) : undefined;
    const result = await syncPractoAppointments(supabase, { from, to, days });
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  }

  if (sp.get('sync') === '1') {
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
