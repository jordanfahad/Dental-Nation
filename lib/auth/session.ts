/**
 * Shared-secret session for the single trusted reviewer (§12). The auth cookie
 * is an HMAC-signed token: `<expiryMs>.<base64url(hmac)>`. Uses Web Crypto so it
 * runs in BOTH the Edge middleware and Node route handlers / server actions.
 *
 * If named users or audit logging are ever needed, swap to Supabase Auth — the
 * schema already lives there (noted in BUILD_NOTES).
 */
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

/** Create a signed token valid for SESSION_TTL_MS. */
export async function createSessionToken(secret: string): Promise<string> {
  const expiry = String(Date.now() + SESSION_TTL_MS);
  const sig = await hmac(expiry, secret);
  return `${expiry}.${sig}`;
}

/** Constant-ish time verify: checks signature AND expiry. */
export async function verifySessionToken(
  token: string | undefined,
  secret: string,
): Promise<boolean> {
  if (!token || !secret) return false;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return false;
  const expiry = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmac(expiry, secret);
  if (sig.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return false;
  const expiryMs = Number(expiry);
  return Number.isFinite(expiryMs) && expiryMs > Date.now();
}
