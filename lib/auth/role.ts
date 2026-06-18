import 'server-only';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, verifySession, type Role } from '@/lib/auth/session';

/**
 * The current request's role, read from the signed cookie (server components,
 * actions, route handlers). When the gate is unconfigured (no password/secret)
 * the app is open for the scaffold, so we treat that as full `admin`.
 */
export async function currentRole(): Promise<Role | null> {
  const secret = process.env.AUTH_SESSION_SECRET;
  const password = process.env.DASHBOARD_PASSWORD;
  if (!secret || !password) return 'admin'; // gate disabled → full access
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const session = await verifySession(token, secret);
  return session?.role ?? null;
}

/** True only for the manager/admin role — the gate for every mutation. */
export async function isAdmin(): Promise<boolean> {
  return (await currentRole()) === 'admin';
}

export const READ_ONLY_ERROR = 'Read-only access — sign in with the admin password to make changes.';
