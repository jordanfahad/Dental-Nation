/**
 * Marketing sub-tab definitions + resolver — a PLAIN module (NOT 'use client'),
 * so the server page can resolve the active sub-tab while the client sub-nav
 * imports the same definitions (mirrors components/tabs.ts).
 */
export const MARKETING_SUBTABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'google', label: 'Google Ads Performance' },
  { key: 'meta', label: 'Meta Ads Performance' },
] as const;

export type MarketingSubTab = (typeof MARKETING_SUBTABS)[number]['key'];

export function resolveMarketingSub(v: string | undefined): MarketingSubTab {
  return (MARKETING_SUBTABS.find((t) => t.key === v)?.key as MarketingSubTab) ?? 'overview';
}
