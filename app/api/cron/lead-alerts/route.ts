import { NextRequest, NextResponse } from 'next/server';
import { runLeadAlertPulse } from '@/lib/ops/leadAlertPulse';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // one sheet read + a handful of emails

/**
 * Every-minute lead-alert cron. Same auth contract as /api/cron/sync:
 * Vercel sends `Authorization: Bearer <CRON_SECRET>`; external schedulers
 * may pass `?secret=<CRON_SECRET>`. Never runs unprotected.
 */
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;
  return req.nextUrl.searchParams.get('secret') === secret;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runLeadAlertPulse();
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
