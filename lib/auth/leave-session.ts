/**
 * Dedicated signed-cookie session for the standalone Leave Calendar at
 * /Leave-Calendar. Independent of the dashboard's shared-password gate: only
 * Mr Akbar (CEO) and the Super Admin pass `leave_verify_login`, and this token
 * proves it. HMAC-SHA256 over `<expiry>.<role>.<email>` with AUTH_SESSION_SECRET
 * (context-separated from the dashboard cookie so the two can't be swapped).
 *
 * Web Crypto only, so it runs in both Edge and Node.
 */
export const LEAVE_COOKIE = 'dn_leave_access';
export const LEAVE_TTL_MS = 12 * 60 * 60 * 1000; // 12h — leadership re-auths daily

const CTX = 'leave-calendar.v1.'; // domain-separation prefix

export interface LeaveSession {
  email: string;
  role: string; // 'ceo' | super-admin manager etc.
}

function b64url(input: string): string {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(input: string): string {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  return atob(input.replace(/-/g, '+').replace(/_/g, '/') + pad);
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
  const bytes = new Uint8Array(sig);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return b64url(bin);
}

export async function createLeaveToken(secret: string, s: LeaveSession): Promise<string> {
  const payload = `${Date.now() + LEAVE_TTL_MS}.${s.role}.${b64url(s.email)}`;
  const sig = await hmac(CTX + payload, secret);
  return `${payload}.${sig}`;
}

export async function verifyLeaveToken(
  token: string | undefined,
  secret: string,
): Promise<LeaveSession | null> {
  if (!token || !secret) return null;
  const parts = token.split('.');
  if (parts.length !== 4) return null;
  const [expiry, role, emailB64, sig] = parts;
  const expected = await hmac(CTX + `${expiry}.${role}.${emailB64}`, secret);
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;
  const expiryMs = Number(expiry);
  if (!Number.isFinite(expiryMs) || expiryMs <= Date.now()) return null;
  try {
    return { email: fromB64url(emailB64), role };
  } catch {
    return null;
  }
}
