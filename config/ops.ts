/**
 * Clinical Operations config — the alert recipients for new website lead forms
 * and the email sender. Recipients + sender are env-overridable (CSV / string)
 * so they rotate without a deploy; defaults are the reception + ops inbox.
 *
 * Email delivery prefers Microsoft Graph (MS_GRAPH_* env — modern auth, works
 * with tenant Security Defaults on), then the clinic's own SMTP mailbox
 * (SMTP_* env), then Resend (RESEND_API_KEY). Until one is set in Vercel,
 * alerts are safely skipped (the Clinical Operations tab still works — it
 * reads the same lead forms live).
 */
/** These two receive EVERY alert, irrespective of route or env override —
 *  withOwner() is applied to every recipient list this file exports. */
const FAHAD = ['fa.siddiqui@dentalnation.com']; // confirmed by Fahad, 1 Aug
const ALWAYS = [
  ...FAHAD,
  'mj.torreta@dentalnation.com', // requested by Fahad, 17 Aug
];
const withOwner = (emails: string[]): string[] => [...new Set([...emails, ...ALWAYS])];

export const OPS_ALERT_EMAILS: string[] = withOwner(
  (
    process.env.OPS_ALERT_EMAILS ||
    ['lu.kaprani@dentalnation.com', 'la.dayag@dentalnation.com', 'fa.siddiqui@dentalnation.com'].join(',')
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
);

/**
 * From address for alert emails. Honored by the SMTP and Resend transports
 * (Resend needs the domain verified). The Microsoft Graph transport always
 * sends as the MS_GRAPH_SENDER mailbox and takes only the display name from
 * here — rotate MS_GRAPH_SENDER, not this, to change the sender on that path.
 */
export const OPS_ALERT_FROM = process.env.OPS_ALERT_FROM?.trim() || 'Dental Nation Alerts <alerts@dentalnation.com>';

/** Max alert emails per sync run — a backstop against a burst re-blasting the inbox. */
export const OPS_ALERT_MAX_PER_RUN = 15;

/* ─── Per-clinic lead-alert routing (Fahad, 1 Aug 2026) ─────────────────────
 * A new lead form alerts the CLINIC it is for, not one shared inbox. Each
 * route is env-overridable (CSV) so recipients rotate without a deploy.
 * Every list passes through withOwner(), so Fahad cannot be dropped by an
 * env override.
 */
const csv = (env: string | undefined, dflt: string[]): string[] =>
  withOwner(
    (env || dflt.join(','))
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );

const DR_LUVI = 'lu.kaprani@dentalnation.com'; // confirmed by Fahad, 1 Aug

export interface LeadAlertRoute {
  key: 'dr-tosun' | 'al-maher' | 'dn-alwasl';
  label: string;
  /** Tested against the form's "Clinic Name". Order matters — first match wins. */
  match: RegExp;
  emails: string[];
}

export const LEAD_ALERT_ROUTES: LeadAlertRoute[] = [
  {
    key: 'dr-tosun',
    label: 'Dr Tosun Dental Clinic',
    match: /tosun/i,
    emails: csv(process.env.LEAD_ALERT_TOSUN, [
      DR_LUVI,
      'mj.torreta@dentalnation.com',
      'reception.drtosun@dentalnation.com',
      ...FAHAD,
    ]),
  },
  {
    key: 'al-maher',
    label: 'Al Maher Clinic (AMC)',
    match: /maher|\bamc\b/i,
    emails: csv(process.env.LEAD_ALERT_AMC, [DR_LUVI, 'reception@almahermc.com', ...FAHAD]),
  },
  {
    // Live form values seen: "DENTAL NATION GENERAL DENTAL CLINIC L.L.C S.O.C"
    // and the truncated "GENERAL DENTAL CLINIC L.L.C S.O.C" — both are Al Wasl.
    key: 'dn-alwasl',
    label: 'Dental Nation Al Wasl',
    match: /dental nation|general dental/i,
    emails: csv(process.env.LEAD_ALERT_ALWASL, [DR_LUVI, 'reception.alwasl@dentalnation.com', ...FAHAD]),
  },
];

/** Leads whose clinic is missing/unrecognised — no reception can be picked. */
export const LEAD_ALERT_FALLBACK: string[] = csv(process.env.LEAD_ALERT_FALLBACK, [
  DR_LUVI,
  'mj.torreta@dentalnation.com',
  ...FAHAD,
]);

/** Resolve a form's "Clinic Name" to its alert route. */
export function leadAlertRecipients(clinic: string): { emails: string[]; label: string | null } {
  const route = LEAD_ALERT_ROUTES.find((r) => r.match.test(clinic));
  return route ? { emails: route.emails, label: route.label } : { emails: LEAD_ALERT_FALLBACK, label: null };
}

/**
 * Website / booking-widget DOWN alerts (transition-triggered, from the
 * availability monitor): sent when a CONCLUSIVE verdict flips up→down, with a
 * recovery email when it flips back. Monitor errors (inconclusive) never page
 * anyone. syed@zavis.ai is the vendor contact — the booking system is theirs.
 */
export const UPTIME_ALERT_EMAILS: string[] = csv(process.env.UPTIME_ALERT_EMAILS, [
  'am@dentalnation.com', // Mr Akbar
  'gautam.n@dentalnation.com', // Gautam
  DR_LUVI,
  ...FAHAD,
  'syed@zavis.ai', // Zavis (vendor)
]);

/**
 * Extra sheet tabs watched for new rows (beyond the booking-widget Bookings tab,
 * which alerts via the raw_zavis path). Identified by gid so a tab rename never
 * breaks the watch — the sync resolves the current title at run time and emails
 * every new row's filled-in fields to OPS_ALERT_EMAILS. If a watched gid turns
 * out to be a tab the raw_zavis alerts already cover, it is skipped (no dupes).
 */
export interface WatchedTab {
  spreadsheetId: string;
  gid: number;
}
export const OPS_WATCHED_TABS: WatchedTab[] = [
  { spreadsheetId: '1CtfSiGONthczH6YVOLfAZvOdmFfGP26uVBZJoYjxRQQ', gid: 119899925 },
  { spreadsheetId: '1CtfSiGONthczH6YVOLfAZvOdmFfGP26uVBZJoYjxRQQ', gid: 1172371132 },
];
