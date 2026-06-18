import { google } from 'googleapis';
import type { analyticsdata_v1beta, sheets_v4 } from 'googleapis';

/**
 * Service-account JWT auth for read-only Sheets access.
 *
 * GOTCHA (#1 cause of "invalid_grant"): GOOGLE_PRIVATE_KEY is stored with
 * literal `\n` escape sequences in the env var. We MUST turn them back into real
 * newlines before handing the key to the JWT client. Documented in BUILD_NOTES.
 */
export const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
export const ANALYTICS_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

export function isGoogleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY,
  );
}

function privateKey(): string {
  const raw = process.env.GOOGLE_PRIVATE_KEY ?? '';
  // The crucial replacement. Without it: "error:1E08010C:DECODER routines" /
  // "invalid_grant".
  return raw.replace(/\\n/g, '\n');
}

export function getSheetsClient(): sheets_v4.Sheets {
  if (!isGoogleConfigured()) {
    throw new Error(
      'Google service account not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY.',
    );
  }
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey(),
    scopes: [SHEETS_SCOPE],
  });
  return google.sheets({ version: 'v4', auth });
}

/**
 * GA4 Data API client. Same service account / private key as Sheets, but with
 * the read-only Analytics scope. The service account must have at least Viewer
 * access on the GA4 property (see config/ga4.ts for the property id).
 */
export function getAnalyticsClient(): analyticsdata_v1beta.Analyticsdata {
  if (!isGoogleConfigured()) {
    throw new Error(
      'Google service account not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY.',
    );
  }
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey(),
    scopes: [ANALYTICS_SCOPE],
  });
  return google.analyticsdata({ version: 'v1beta', auth });
}
