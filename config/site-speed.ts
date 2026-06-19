/**
 * Site Speed (Core Web Vitals) configuration. GA4 no longer reports page-load
 * speed, so the dashboard measures it with Google's PageSpeed Insights API
 * against the live site. URL is env-overridable; the PSI API key is optional
 * (PSI works keyless at low volume — the report is cached 6h so we stay well
 * under quota either way).
 */
export interface SiteSpeedConfig {
  url: string;
  apiKey: string | null;
}

export function siteSpeedConfig(): SiteSpeedConfig {
  return {
    url: process.env.SITE_SPEED_URL || 'https://dentalnation.com',
    apiKey: process.env.PAGESPEED_API_KEY || null,
  };
}
