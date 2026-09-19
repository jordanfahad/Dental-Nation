/**
 * Marketing sub-tab definitions + resolver — a PLAIN module (NOT 'use client'),
 * so the server page can resolve the active sub-tab while the client sub-nav
 * imports the same definitions (mirrors components/tabs.ts).
 */
export const MARKETING_SUBTABS = [
  { key: 'overview', label: 'Channel Tree' },
  { key: 'google', label: 'Google Ads Performance' },
  { key: 'meta', label: 'Meta Ads Performance' },
  // The former Overview: spend → reported → tracked leakage + three-lens
  // triangulation. Kept whole — the tree links to it, never replaces it.
  { key: 'recon', label: 'Reconciliation' },
] as const;

export type MarketingSubTab = (typeof MARKETING_SUBTABS)[number]['key'];

export function resolveMarketingSub(v: string | undefined): MarketingSubTab {
  return (MARKETING_SUBTABS.find((t) => t.key === v)?.key as MarketingSubTab) ?? 'overview';
}
