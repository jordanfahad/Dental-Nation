'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AUTH_COOKIE, SESSION_TTL_MS, createSessionToken } from '@/lib/auth/session';
import { checkRateLimit } from '@/lib/auth/rate-limit';

/** Verify the shared password, rate-limit attempts, and set the signed cookie. */
export async function login(_prev: { error?: string } | undefined, formData: FormData) {
  const password = process.env.DASHBOARD_PASSWORD;
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!password || !secret) {
    redirect('/'); // gate disabled — nothing to log into
  }

  const hdrs = await headers();
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = checkRateLimit(`login:${ip}`);
  if (!rl.allowed) {
    return { error: `Too many attempts. Try again in ${rl.retryAfterSec}s.` };
  }

  const entered = String(formData.get('password') ?? '');
  if (entered !== password) {
    return { error: 'Incorrect password.' };
  }

  const token = await createSessionToken(secret!);
  const jar = await cookies();
  jar.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });

  const from = String(formData.get('from') ?? '/');
  redirect(from.startsWith('/') ? from : '/');
}
