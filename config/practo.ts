import 'server-only';

/**
 * Practo Insta (HMS) API config. Credentials come from env (never hard-coded /
 * committed). The login uses an `x-insta-auth: <user>:<password>` header and
 * returns a short-lived `request_handler_key` we cache in lane_e.practo_token.
 *
 * Required env (set in Vercel):
 *   PRACTO_BASE_URL   e.g. https://api.instahealthsolutions.com
 *   PRACTO_HOSPITAL   the schema / hospital name
 *   PRACTO_AUTH       <user>:<password>  — REAL VALUES LIVE ONLY IN VERCEL.
 *
 * This repository is public: never write an actual credential here, not even
 * as an "example". (A real password appeared in this comment before 31 Aug
 * 2026 — scrubbed; the credential must be rotated with Practo.)
 */
export interface PractoConfig {
  baseUrl: string;
  hospital: string;
  auth: string;
}

export function getPractoConfig(): PractoConfig | null {
  const baseUrl = process.env.PRACTO_BASE_URL?.replace(/\/+$/, '');
  const hospital = process.env.PRACTO_HOSPITAL;
  const auth = process.env.PRACTO_AUTH;
  if (!baseUrl || !hospital || !auth) return null;
  return { baseUrl, hospital, auth };
}

export function isPractoConfigured(): boolean {
  return getPractoConfig() !== null;
}

/** Minutes a request_handler_key is treated as valid before we proactively
 *  re-login. Vendor (Sagar, 2026-07-31): the key is a short-lived SESSION token
 *  expiring in ~8 minutes — never a static credential — so we cache it only
 *  briefly and mint a fresh one when stale. (The 1001 re-login retry remains
 *  the backstop either way.) */
export const PRACTO_TOKEN_TTL_MINUTES = 5;

/** Practo's "login again" sentinel — triggers a single re-login + retry. */
export const PRACTO_RELOGIN_CODE = '1001';
