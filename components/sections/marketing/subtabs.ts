/**
 * Marketing sub-tab definitions + resolver — a PLAIN module (NOT 'use client'),
 * so the server page can resolve the active sub-tab while the client sub-nav
 * imports the same definitions (mirrors components/tabs.ts).
 */
export const MARKETING_SUBTABS = [
  { key: 'overview', label: 'Channel Tree' },
  { key: 'google', label: 'Google Ads Performance' },
  { key: 'meta', label: 'Meta Ads Performance' },
  { key: 'demand', label: 'Demand to desk' },
  // Everything planned with Mohan, week by week (Ms Shadi's columns, 9 Oct 2026).
  { key: 'calendar', label: 'Content calendar' },
  // The former Overview: spend → reported → tracked leakage + three-lens
  // triangulation. Kept whole — the tree links to it, never replaces it.
  { key: 'recon', label: 'Reconciliation' },
] as const;

export type MarketingSubTab = (typeof MARKETING_SUBTABS)[number]['key'];

/** Sub-tabs with internal working detail (names, owners, notes): never shown on the no-login share links. */
export const INTERNAL_MARKETING_SUBTABS: MarketingSubTab[] = ['calendar'];

export function resolveMarketingSub(v: string | undefined): MarketingSubTab {
  return (MARKETING_SUBTABS.find((t) => t.key === v)?.key as MarketingSubTab) ?? 'overview';
}
