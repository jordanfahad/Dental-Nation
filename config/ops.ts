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
export const OPS_ALERT_EMAILS: string[] = (
  process.env.OPS_ALERT_EMAILS ||
  ['lu.kaprani@dentalnation.com', 'la.dayag@dentalnation.com', 'fa.siddiqui@dentalnation.com'].join(',')
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * From address for alert emails. Honored by the SMTP and Resend transports
 * (Resend needs the domain verified). The Microsoft Graph transport always
 * sends as the MS_GRAPH_SENDER mailbox and takes only the display name from
 * here — rotate MS_GRAPH_SENDER, not this, to change the sender on that path.
 */
export const OPS_ALERT_FROM = process.env.OPS_ALERT_FROM?.trim() || 'Dental Nation Alerts <alerts@dentalnation.com>';

/** Max alert emails per sync run — a backstop against a burst re-blasting the inbox. */
export const OPS_ALERT_MAX_PER_RUN = 15;
