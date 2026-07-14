import 'server-only';
import { safeEqual } from './session';

/**
 * Standalone password gate for the Araby Ads live report (/reports/arabyads).
 * Deliberately SEPARATE from the main dashboard login: the Araby Ads team gets
 * ONLY this page, never the whole dashboard.
 *
 * The share password is verified against a stored SHA-256 hash, so the plaintext
 * is never committed to the (public) repo. Rotate it without a redeploy by
 * setting ARABY_REPORTS_PASSWORD in Vercel (compared as plaintext when present).
 *
 * The session cookie is an HMAC-signed token NAMESPACED to `araby`, so it can't
 * be copied into the main dashboard cookie to gain wider access. It also carries
 * its own cookie path so it's scoped to this route.
 */
export const ARABY_COOKIE = 'araby_report_auth';
export const ARABY_COOKIE_PATH = '/reports/arabyads';
export const ARABY_TTL_MS = 30 * 24 * 60 * 60 * 1000; // ~30 days

// SHA-256 of the default share password ("ArabyadsxDN@123"). Env override wins.
const PASSWORD_SHA256 = 'af4206dd45921371e6755ce1fac232d79aa29052c1d6c637c00989852b07e890';

/** Cookie-signing secret: reuse the dashboard secret when set; otherwise a fixed
 *  fallback so the gate still works before AUTH_SESSION_SECRET is configured. */
function signingSecret(): string {
  return process.env.AUTH_SESSION_SECRET || 'araby-report-signing-key-v1';
}

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
  return b64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
}
async function sha256hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** True when the submitted password matches (env override, else the baked hash). */
export async function checkArabyPassword(input: string): Promise<boolean> {
  const override = process.env.ARABY_REPORTS_PASSWORD;
  if (override) return safeEqual(input, override);
  return safeEqual(await sha256hex(input), PASSWORD_SHA256);
}

/** Signed, `araby`-namespaced session token valid for ARABY_TTL_MS. */
export async function createArabyToken(): Promise<string> {
  const payload = `${Date.now() + ARABY_TTL_MS}.araby`;
  return `${payload}.${await hmac(payload, signingSecret())}`;
}

/** Verify the report cookie: namespace + signature + not expired. */
export async function verifyArabyToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [expiry, ns, sig] = parts;
  if (ns !== 'araby') return false;
  const expected = await hmac(`${expiry}.${ns}`, signingSecret());
  if (!safeEqual(sig, expected)) return false;
  const expiryMs = Number(expiry);
  return Number.isFinite(expiryMs) && expiryMs > Date.now();
}
