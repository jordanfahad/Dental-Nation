import 'server-only';

/**
 * Meta (Facebook/Instagram) Ads — Marketing API config. A long-lived system-user
 * token + ad account id(s) come from env (never committed). Multiple accounts can
 * be comma-separated in META_AD_ACCOUNT_ID.
 *
 * Required env (set in Vercel):
 *   META_ACCESS_TOKEN     long-lived system-user token (ads_read)
 *   META_AD_ACCOUNT_ID    e.g. 1247589323360661  (or "id1,id2"; "act_" optional)
 *   META_API_VERSION      optional, default v21.0
 */
export interface MetaConfig {
  token: string;
  /** Ad account ids WITHOUT the "act_" prefix. */
  accountIds: string[];
  version: string;
}

export function getMetaConfig(): MetaConfig | null {
  const token = process.env.META_ACCESS_TOKEN?.trim();
  const raw = process.env.META_AD_ACCOUNT_ID?.trim();
  if (!token || !raw) return null;
  const accountIds = raw
    .split(',')
    .map((s) => s.trim().replace(/^act_/i, ''))
    .filter(Boolean);
  if (accountIds.length === 0) return null;
  return { token, accountIds, version: process.env.META_API_VERSION?.trim() || 'v21.0' };
}

export function isMetaConfigured(): boolean {
  return getMetaConfig() !== null;
}

/** Action types that count as a "lead" for Dental Nation — includes click-to-
 *  WhatsApp / messaging conversations + standard lead events. Best-effort until
 *  the live actions[] shape is confirmed via the probe. */
/**
 * Manual Meta pause date, or null. Meta ran from 3 Sep 2026 after the April
 * to August pause, so this is null: the Growth view now reads whether Meta
 * delivered from the spend rows and the sync log (lastDelivery), not from a
 * fixed date. Only the retired performance brief still reads it.
 */
export const META_ADS_PAUSED_SINCE: string | null = null;

export const META_LEAD_ACTION_TYPES = [
  'lead',
  'leadgen_grouped',
  'onsite_conversion.lead_grouped',
  'offsite_conversion.fb_pixel_lead',
  'onsite_conversion.messaging_conversation_started_7d',
  'onsite_conversion.total_messaging_connection',
];
