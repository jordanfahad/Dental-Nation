import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LEAVE_COOKIE, verifyLeaveToken } from '@/lib/auth/leave-session';

export const runtime = 'nodejs';

/** Record a manual attendance entry (hours worked for a person on a date). The
 *  DB function enforces that the actor may only record for themselves or their
 *  team. Actor comes from the signed cookie. */
export async function POST(req: NextRequest) {
  const secret = process.env.AUTH_SESSION_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const session = secret ? await verifyLeaveToken(req.cookies.get(LEAVE_COOKIE)?.value, secret) : null;
  if (!session) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  if (!url || !key) return NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 });

  const body = await req.json().catch(() => null);
  const hours = Number(body?.hours);
  if (!body?.target || !body?.date || !Number.isFinite(hours)) {
    return NextResponse.json({ ok: false, error: 'Pick a person, date and hours' }, { status: 400 });
  }

  const sb = createClient(url, key, { db: { schema: 'public' }, auth: { persistSession: false } });
  const { data, error } = await sb.rpc('leave_record_attendance', {
    p_email: session.email,
    p_target: String(body.target),
    p_date: String(body.date),
    p_hours: hours,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
