/**
 * Digital & SEO sub-tab definitions + resolver — a PLAIN module (NOT 'use
 * client'), so the server page resolves the active sub-tab while the client
 * sub-nav imports the same definitions (mirrors the Practo subtabs).
 */
export const DIGITAL_SUBTABS = [
  { key: 'seo', label: 'Digital & SEO' },
  { key: 'competitors', label: 'Competitor analysis' },
] as const;

export type DigitalSubTab = (typeof DIGITAL_SUBTABS)[number]['key'];

export function resolveDigitalSub(v: string | undefined): DigitalSubTab {
  return (DIGITAL_SUBTABS.find((t) => t.key === v)?.key as DigitalSubTab) ?? 'seo';
}
