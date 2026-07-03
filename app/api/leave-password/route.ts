import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LEAVE_COOKIE, verifyLeaveToken } from '@/lib/auth/leave-session';

export const runtime = 'nodejs';

/** Self-service password change for the signed-in user. Email comes from the
 *  signed cookie; the DB function re-checks the current password. */
export async function POST(req: NextRequest) {
  const secret = process.env.AUTH_SESSION_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const session = secret ? await verifyLeaveToken(req.cookies.get(LEAVE_COOKIE)?.value, secret) : null;
  if (!session) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  if (!url || !key) return NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 });

  const body = await req.json().catch(() => null);
  const current = String(body?.current ?? '');
  const next = String(body?.new ?? '');
  if (!current || !next) return NextResponse.json({ ok: false, error: 'Fill in both password fields' }, { status: 400 });

  const sb = createClient(url, key, { db: { schema: 'public' }, auth: { persistSession: false } });
  const { data, error } = await sb.rpc('leave_change_password', {
    p_email: session.email,
    p_current: current,
    p_new: next,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
