import { NextRequest, NextResponse } from 'next/server';
import { runSync } from '@/lib/sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Pro allows up to ~300s; sync stays within budget.

/**
 * Scheduled sync endpoint (§11). GET-only (Vercel cron is GET). Rejects any
 * request lacking the secret: Vercel sends `Authorization: Bearer <CRON_SECRET>`;
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
  const summary = await runSync('cron');
  const httpStatus = summary.status === 'failed' ? 502 : 200;
  return NextResponse.json(summary, { status: httpStatus });
}
