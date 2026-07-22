/**
 * The manually-maintained Araby Ads lead-status sheet (the client keeps Lead
 * Status + Reason for Rejection up to date by hand). Read-only, via the same
 * Google service account used for GA4 / Search Console — so the sheet MUST be
 * shared (Viewer is enough) with GOOGLE_SERVICE_ACCOUNT_EMAIL.
 *
 * Override the id / tab without a redeploy via env if it ever moves.
 */
export const ARABY_LEADS_SHEET = {
  // Confirm this matches the sheet you shared with the service account.
  spreadsheetId: process.env.ARABY_LEADS_SHEET_ID || '1h44HbEimnbHqayYOZYQbLqeeKVgUjWXKteJOu_epHoI',
  // Optional: exact tab title. If blank we use the gid, else the first tab.
  sheetTab: process.env.ARABY_LEADS_SHEET_TAB || '',
  sheetGid: process.env.ARABY_LEADS_SHEET_GID ? Number(process.env.ARABY_LEADS_SHEET_GID) : 1596657498,
};

/** The campaign lanes shown in the summary (in order). Matched on "Lane <X>". */
export const ARABY_LANES: { key: string; label: string }[] = [
  { key: 'D', label: 'Lane D — SOS' },
  { key: 'J', label: 'Lane J — Scan' },
  { key: 'E', label: 'Lane E — Glow Up' },
];
