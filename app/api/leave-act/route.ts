import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LEAVE_COOKIE, verifyLeaveToken } from '@/lib/auth/leave-session';

export const runtime = 'nodejs';

/** Approve / reject / escalate a leave request. Actor is taken from the signed
 *  leave cookie; the DB function enforces that the actor is the current
 *  approver, CEO, or super-admin. */
export async function POST(req: NextRequest) {
  const secret = process.env.AUTH_SESSION_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const session = secret ? await verifyLeaveToken(req.cookies.get(LEAVE_COOKIE)?.value, secret) : null;
  if (!session) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  if (!url || !key) return NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 });

  const body = await req.json().catch(() => null);
  const action = body?.action;
  if (!body?.request_id || !['approve', 'reject', 'escalate'].includes(action)) {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }

  const sb = createClient(url, key, { db: { schema: 'public' }, auth: { persistSession: false } });
  const { data, error } = await sb.rpc('leave_act_request', {
    p_email: session.email,
    p_request_id: String(body.request_id),
    p_action: String(action),
    p_comment: body.comment ? String(body.comment) : null,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
