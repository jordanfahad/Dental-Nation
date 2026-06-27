import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LEAVE_COOKIE, verifyLeaveToken } from '@/lib/auth/leave-session';
import { parseAttendanceCsv } from '@/lib/leave/csv';

export const runtime = 'nodejs';

/** Bulk attendance import from a CSV pasted/uploaded in the UI. Scoped to the
 *  signed-in user's team by the DB function. Body: { csv: string }. */
export async function POST(req: NextRequest) {
  const secret = process.env.AUTH_SESSION_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const session = secret ? await verifyLeaveToken(req.cookies.get(LEAVE_COOKIE)?.value, secret) : null;
  if (!session) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  if (!url || !key) return NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 });

  const body = await req.json().catch(() => null);
  const rows = parseAttendanceCsv(String(body?.csv ?? ''));
  if (!rows.length) return NextResponse.json({ ok: false, error: 'No valid rows found (expected: email, date, hours)' }, { status: 400 });

  const sb = createClient(url, key, { db: { schema: 'public' }, auth: { persistSession: false } });
  const { data, error } = await sb.rpc('leave_attendance_bulk', {
    p_actor_email: session.email,
    p_rows: rows,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
