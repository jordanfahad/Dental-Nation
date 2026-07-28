import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { authorizeService } from '@/lib/auth/serviceToken';

export const dynamic = 'force-dynamic';

/**
 * Ingest for the one-off booking-widget discovery run. Same guard as
 * /api/widget-health; middleware excludes it from the password gate.
 *
 * Stores the capture verbatim as jsonb — it's diagnostic output whose shape is
 * still being learned, so imposing a schema here would only lose detail.
 */
export async function POST(req: NextRequest) {
  if (!authorizeService(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: 'Supabase not configured.' }, { status: 500 });

  const { error } = await db.from('widget_probe').insert({ payload });
  return error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json({ recorded: true });
}
