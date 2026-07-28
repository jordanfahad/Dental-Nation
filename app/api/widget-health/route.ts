import { NextRequest, NextResponse } from 'next/server';
import { recordWidgetCheck } from '@/lib/ops/widgetHealth';
import { authorizeService } from '@/lib/auth/serviceToken';

export const dynamic = 'force-dynamic';

/**
 * Ingest for the synthetic booking-widget check (the "robot patient" GitHub
 * Action). POST-only, guarded by WIDGET_HEALTH_SECRET or CRON_SECRET.
 *
 * The route self-authorizes; middleware excludes it from the password gate,
 * exactly like /api/notify.
 */
export async function POST(req: NextRequest) {
  if (!authorizeService(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  if (typeof b.ok !== 'boolean') {
    return NextResponse.json({ error: '`ok` (boolean) is required' }, { status: 400 });
  }

  const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null);
  const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 500) : null);

  const res = await recordWidgetCheck({
    ok: b.ok,
    slotsFound: num(b.slotsFound),
    stage: str(b.stage),
    detail: str(b.detail),
    durationMs: num(b.durationMs),
  });

  return res.ok
    ? NextResponse.json({ recorded: true })
    : NextResponse.json({ error: res.error ?? 'save failed' }, { status: 500 });
}
