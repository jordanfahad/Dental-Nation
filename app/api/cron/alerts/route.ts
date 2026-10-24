import { NextRequest, NextResponse } from 'next/server';
import { runDailyAlerts } from '@/lib/alerts/run';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Daily 09:00 Dubai alert emails (lib/alerts/registry.ts), every 15 minutes.
 * Sends previews to Fahad when requested, and the live emails only between
 * 09:00 and 10:59 Dubai from LIVE_FROM. Same CRON_SECRET check as
 * /api/cron/sync: Vercel sends `Authorization: Bearer <CRON_SECRET>`;
 * external schedulers may pass `?secret=<CRON_SECRET>`.
 */
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // never run unprotected
  const auth = req.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;
  const qs = req.nextUrl.searchParams.get('secret');
  return qs === secret;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const results = await runDailyAlerts();
    return NextResponse.json({ results });
  } catch {
    // No raw exception text in the response: upstream errors can contain row contents.
    return NextResponse.json({ error: 'Daily alerts run failed' }, { status: 500 });
  }
}
