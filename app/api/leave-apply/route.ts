import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LEAVE_COOKIE, verifyLeaveToken } from '@/lib/auth/leave-session';

export const runtime = 'nodejs';

/** Submit a leave request for the signed-in user. Actor is taken from the
 *  signed leave cookie — never trusted from the client. */
export async function POST(req: NextRequest) {
  const secret = process.env.AUTH_SESSION_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const session = secret ? await verifyLeaveToken(req.cookies.get(LEAVE_COOKIE)?.value, secret) : null;
  if (!session) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  if (!url || !key) return NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 });

  const body = await req.json().catch(() => null);
  if (!body || !body.type_code || !body.start || !body.end) {
    return NextResponse.json({ ok: false, error: 'Missing leave type or dates' }, { status: 400 });
  }

  const sb = createClient(url, key, { db: { schema: 'public' }, auth: { persistSession: false } });
  const { data, error } = await sb.rpc('leave_submit_request', {
    p_email: session.email,
    p_type_code: String(body.type_code),
    p_start: String(body.start),
    p_end: String(body.end),
    p_half_start: !!body.half_start,
    p_half_end: !!body.half_end,
    p_reason: body.reason ? String(body.reason) : null,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
