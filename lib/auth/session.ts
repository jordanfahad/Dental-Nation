/**
 * Shared-secret session with a ROLE (§12). The auth cookie is an HMAC-signed
 * token: `<expiryMs>.<role>.<base64url(hmac(expiry.role))>`. Roles:
 *   - admin  : full access (manager — create/update/approve/delete)
 *   - viewer : read-only (the CEO + coordinator can navigate + open evidence)
 *   - staff  : read-only, restricted — same as viewer EXCEPT no Growth Projects
 *              (/impact) and no Leave Calendar.
 *   - clinician : staff access PLUS the Clinical Operations and Group Revenue
 *              tabs (Dr Luvi).
 *   - opsstaff  : staff access PLUS the Clinical Operations tab, but NOT Group
 *              Revenue (Gautam).
 *   - receptionist : read-only, sees ONLY the Clinical Operations tab (reception
 *              desk — la.dayag). Nothing else in the dashboard.
 * The role is inside the signed payload, so it cannot be tampered with.
 *
 * Uses Web Crypto so it runs in BOTH the Edge middleware and Node route
 * handlers / server actions.
 */
export type Role = 'admin' | 'viewer' | 'staff' | 'clinician' | 'opsstaff' | 'receptionist';

const VALID_ROLES: readonly Role[] = ['admin', 'viewer', 'staff', 'clinician', 'opsstaff', 'receptionist'];

/** Areas that a restricted role cannot see. Only admin + viewer see all. */
export function canSeeGrowthProjects(role: Role | null | undefined): boolean {
  return role === 'admin' || role === 'viewer';
}
export function canSeeLeaveCalendar(role: Role | null | undefined): boolean {
  return role === 'admin' || role === 'viewer';
}
/** Receptionist is locked to the Clinical Operations tab — no other route/tab. */
export function isReceptionist(role: Role | null | undefined): boolean {
  return role === 'receptionist';
}

export const AUTH_COOKIE = 'lane_e_auth';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // ~30 days

function b64url(bytes: ArrayBuffer): string {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return b64url(sig);
}

/**
 * Create a signed token carrying the role and (optionally) the dashboard_users
 * id, valid for SESSION_TTL_MS. Token shape: `<expiry>.<role>[.<uid>].<sig>` —
 * the uid segment is present only for table-backed users (env admin/viewer omit
 * it), and old 3-part tokens stay valid (uid → null).
 */
export async function createSessionToken(
  secret: string,
  role: Role = 'admin',
  uid?: string | number | null,
): Promise<string> {
  const base = `${Date.now() + SESSION_TTL_MS}.${role}`;
  const payload = uid != null && String(uid) !== '' ? `${base}.${uid}` : base;
  const sig = await hmac(payload, secret);
  return `${payload}.${sig}`;
}

/** Verify signature + expiry; returns the session (role + optional uid) or null. */
export async function verifySession(
  token: string | undefined,
  secret: string,
): Promise<{ role: Role; uid: string | null } | null> {
  if (!token || !secret) return null;
  const parts = token.split('.');
  if (parts.length < 3 || parts.length > 4) return null;
  const sig = parts[parts.length - 1];
  const payload = parts.slice(0, -1).join('.');
  const expiry = parts[0];
  const role = parts[1];
  const uid = parts.length === 4 ? parts[2] : null;
  if (!VALID_ROLES.includes(role as Role)) return null;
  const expected = await hmac(payload, secret);
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;
  const expiryMs = Number(expiry);
  if (!Number.isFinite(expiryMs) || expiryMs <= Date.now()) return null;
  return { role: role as Role, uid };
}

/** Boolean convenience (any valid role). */
export async function verifySessionToken(
  token: string | undefined,
  secret: string,
): Promise<boolean> {
  return (await verifySession(token, secret)) !== null;
}

/** Constant-time string equality — avoids leaking the match via comparison timing. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
