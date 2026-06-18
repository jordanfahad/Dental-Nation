import 'server-only';

/**
 * Google Ads API config. All from env (never committed):
 *   GOOGLE_ADS_DEVELOPER_TOKEN
 *   GOOGLE_ADS_CLIENT_ID
 *   GOOGLE_ADS_CLIENT_SECRET
 *   GOOGLE_ADS_REFRESH_TOKEN
 *   GOOGLE_ADS_CUSTOMER_ID        the ad account (10 digits, no dashes; "id1,id2" ok)
 *   GOOGLE_ADS_LOGIN_CUSTOMER_ID  the MCC/manager (10 digits, no dashes)
 *   GOOGLE_ADS_API_VERSION        optional, default v17
 */
export interface GoogleAdsConfig {
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  customerIds: string[];
  loginCustomerId: string;
  version: string;
}

const digits = (s: string) => s.replace(/[^0-9]/g, '');

export function getGoogleAdsConfig(): GoogleAdsConfig | null {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim();
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN?.trim();
  const customerRaw = process.env.GOOGLE_ADS_CUSTOMER_ID?.trim();
  const loginRaw = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.trim();
  if (!developerToken || !clientId || !clientSecret || !refreshToken || !customerRaw) return null;
  const customerIds = customerRaw.split(',').map((s) => digits(s)).filter(Boolean);
  if (customerIds.length === 0) return null;
  return {
    developerToken,
    clientId,
    clientSecret,
    refreshToken,
    customerIds,
    loginCustomerId: loginRaw ? digits(loginRaw) : digits(customerIds[0]),
    version: process.env.GOOGLE_ADS_API_VERSION?.trim() || 'v25',
  };
}

export function isGoogleAdsConfigured(): boolean {
  return getGoogleAdsConfig() !== null;
}
