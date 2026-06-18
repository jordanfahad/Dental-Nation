/**
 * Shared-secret session with a ROLE (§12). The auth cookie is an HMAC-signed
 * token: `<expiryMs>.<role>.<base64url(hmac(expiry.role))>`. Two roles:
 *   - admin  : full access (manager — create/update/approve/delete)
 *   - viewer : read-only (the CEO + coordinator can navigate + open evidence)
 * The role is inside the signed payload, so it cannot be tampered with.
 *
 * Uses Web Crypto so it runs in BOTH the Edge middleware and Node route
 * handlers / server actions.
 */
export type Role = 'admin' | 'viewer';

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

/** Create a signed token (carrying the role) valid for SESSION_TTL_MS. */
export async function createSessionToken(secret: string, role: Role = 'admin'): Promise<string> {
  const payload = `${Date.now() + SESSION_TTL_MS}.${role}`;
  const sig = await hmac(payload, secret);
  return `${payload}.${sig}`;
}

/** Verify signature + expiry; returns the session (with role) or null. */
export async function verifySession(
  token: string | undefined,
  secret: string,
): Promise<{ role: Role } | null> {
  if (!token || !secret) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [expiry, role, sig] = parts;
  if (role !== 'admin' && role !== 'viewer') return null;
  const expected = await hmac(`${expiry}.${role}`, secret);
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;
  const expiryMs = Number(expiry);
  if (!Number.isFinite(expiryMs) || expiryMs <= Date.now()) return null;
  return { role: role as Role };
}

/** Boolean convenience (any valid role). */
export async function verifySessionToken(
  token: string | undefined,
  secret: string,
): Promise<boolean> {
  return (await verifySession(token, secret)) !== null;
}
