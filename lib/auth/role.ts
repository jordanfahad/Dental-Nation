import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, verifySession, type Role } from '@/lib/auth/session';
import { getUserById } from '@/lib/auth/users';

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

export interface CurrentUser {
  role: Role;
  uid: string | null;
  name: string | null;
  extraTabs: string[];
  removedTabs: string[];
}

/**
 * The current request's full access context: base role plus any per-user tab
 * tweaks from the dashboard_users directory (looked up live, so an admin's
 * edits take effect without a re-login). Cached per request. Returns null when
 * signed out; an all-access admin when the gate is unconfigured.
 */
export const currentUser = cache(async (): Promise<CurrentUser | null> => {
  const secret = process.env.AUTH_SESSION_SECRET;
  const password = process.env.DASHBOARD_PASSWORD;
  if (!secret || !password) return { role: 'admin', uid: null, name: null, extraTabs: [], removedTabs: [] };
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const session = await verifySession(token, secret);
  if (!session) return null;
  let role: Role = session.role;
  let name: string | null = null;
  let extraTabs: string[] = [];
  let removedTabs: string[] = [];
  if (session.uid) {
    const u = await getUserById(session.uid);
    if (!u || !u.active) return null; // user deleted or deactivated → treat as signed out
    role = u.baseRole;
    name = u.name;
    extraTabs = u.extraTabs;
    removedTabs = u.removedTabs;
  }
  return { role, uid: session.uid, name, extraTabs, removedTabs };
});

/** True only for the manager/admin role — the gate for every mutation. */
export async function isAdmin(): Promise<boolean> {
  return (await currentRole()) === 'admin';
}

export const READ_ONLY_ERROR = 'Read-only access — sign in with the admin password to make changes.';
