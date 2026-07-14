'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  ARABY_COOKIE,
  ARABY_COOKIE_PATH,
  ARABY_TTL_MS,
  checkArabyPassword,
  createArabyToken,
} from '@/lib/auth/araby-report';
import { checkRateLimit } from '@/lib/auth/rate-limit';

/** Verify the Araby Ads report password, rate-limit attempts, set the cookie. */
export async function arabyLogin(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const hdrs = await headers();
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = checkRateLimit(`araby-report:${ip}`);
  if (!rl.allowed) return { error: `Too many attempts. Try again in ${rl.retryAfterSec}s.` };

  const entered = String(formData.get('password') ?? '');
  if (!(await checkArabyPassword(entered))) return { error: 'Incorrect password.' };

  const jar = await cookies();
  jar.set(ARABY_COOKIE, await createArabyToken(), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: ARABY_COOKIE_PATH,
    maxAge: Math.floor(ARABY_TTL_MS / 1000),
  });
  redirect('/reports/arabyads');
}

/** Clear the report session. */
export async function arabyLogout(): Promise<void> {
  const jar = await cookies();
  jar.set(ARABY_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: ARABY_COOKIE_PATH,
    maxAge: 0,
  });
  redirect('/reports/arabyads');
}
