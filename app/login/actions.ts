'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AUTH_COOKIE, SESSION_TTL_MS, createSessionToken, type Role } from '@/lib/auth/session';
import { checkRateLimit } from '@/lib/auth/rate-limit';

/**
 * Verify a shared password, rate-limit attempts, and set the signed cookie with
 * the matching role. Two passwords:
 *   - DASHBOARD_PASSWORD → admin (manager: full access)
 *   - VIEWER_PASSWORD    → viewer (CEO + coordinator: read-only)
 */
export async function login(_prev: { error?: string } | undefined, formData: FormData) {
  const password = process.env.DASHBOARD_PASSWORD;
  const viewerPassword = process.env.VIEWER_PASSWORD;
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
  let role: Role | null = null;
  if (entered === password) role = 'admin';
  else if (viewerPassword && entered === viewerPassword) role = 'viewer';
  if (!role) {
    return { error: 'Incorrect password.' };
  }

  const token = await createSessionToken(secret!, role);
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
