'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AUTH_COOKIE, SESSION_TTL_MS, createSessionToken, safeEqual, type Role } from '@/lib/auth/session';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Restricted staff passwords (Dr Luvi & Gautam) live in lane_e.app_secrets under
 * keys staff_password_* — NOT env — so they can be added/rotated without a Vercel
 * deploy. Each person has a unique password. The password KEY maps to a role
 * (STAFF_ROLE_BY_KEY) so individuals can be granted specific gated tabs:
 *   - staff_password_luvi   → clinician (staff + Clinical Operations + Group Revenue)
 *   - staff_password_gautam → opsstaff  (staff + Clinical Operations)
 *   - any other staff_password_* → plain staff (restricted read-only)
 */
const STAFF_ROLE_BY_KEY: Record<string, Role> = {
  staff_password_luvi: 'clinician',
  staff_password_gautam: 'opsstaff',
};

/** Returns the matching app_secrets KEY for `entered` under `keyPrefix`, or null. */
async function matchSecretKey(entered: string, keyPrefix: string): Promise<string | null> {
  const db = getSupabaseAdmin();
  if (!db || !entered) return null;
  try {
    const { data } = await db.from('app_secrets').select('key, value').like('key', `${keyPrefix}%`);
    for (const row of (data ?? []) as { key: string; value: string }[]) {
      if (row.value && safeEqual(entered, row.value)) return row.key;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Verify a shared password, rate-limit attempts, and set the signed cookie with
 * the matching role. Passwords:
 *   - DASHBOARD_PASSWORD    → admin (manager: full access)
 *   - VIEWER_PASSWORD       → viewer (CEO + coordinator: read-only)
 *   - staff_password_*      → staff / clinician / opsstaff (per STAFF_ROLE_BY_KEY)
 *   - receptionist_password_* → receptionist (reception desk: ONLY the Clinical
 *     Operations tab). Passwords live in app_secrets so they rotate without a deploy.
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
  else {
    const staffKey = await matchSecretKey(entered, 'staff_password_');
    if (staffKey) role = STAFF_ROLE_BY_KEY[staffKey] ?? 'staff';
    else if (await matchSecretKey(entered, 'receptionist_password_')) role = 'receptionist';
  }
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
