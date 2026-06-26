import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  LEAVE_COOKIE,
  LEAVE_TTL_MS,
  createLeaveToken,
} from '@/lib/auth/leave-session';

export const runtime = 'nodejs';

/**
 * Leave Calendar auth endpoint.
 *  POST  { email, password }  → verify via public.leave_verify_login (service role).
 *        Only CEO / super-admin pass → set `dn_leave_access` cookie, redirect to
 *        /Leave-Calendar. Otherwise redirect back with an error.
 *  GET   ?logout=1            → clear the cookie, back to the login screen.
 */
function redirectTo(req: NextRequest, query = ''): NextResponse {
  return NextResponse.redirect(new URL(`/Leave-Calendar${query}`, req.url), { status: 303 });
}

export async function POST(req: NextRequest) {
  const secret = process.env.AUTH_SESSION_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !url || !serviceKey) {
    return redirectTo(req, '?error=invalid');
  }

  const form = await req.formData();
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!email || !password) return redirectTo(req, '?error=invalid');

  const supabase = createClient(url, serviceKey, {
    db: { schema: 'public' },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc('leave_verify_login', {
    p_email: email,
    p_password: password,
  });

  if (error) return redirectTo(req, '?error=invalid');

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || !row.employee_id) return redirectTo(req, '?error=invalid'); // bad email/password
  if (!row.authorized) return redirectTo(req, '?error=denied'); // valid login, but not allowed

  const token = await createLeaveToken(secret, { email, role: row.role ?? 'viewer' });
  const res = redirectTo(req);
  res.cookies.set(LEAVE_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(LEAVE_TTL_MS / 1000),
  });
  return res;
}

export async function GET(req: NextRequest) {
  const res = redirectTo(req, '?expired=0');
  res.cookies.set(LEAVE_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
