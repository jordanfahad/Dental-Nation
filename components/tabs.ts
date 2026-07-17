/**
 * Tab definitions + resolver — a PLAIN module (intentionally NOT 'use client').
 *
 * The server component app/(app)/page.tsx calls resolveTab() at request time to
 * pick the active tab. resolveTab previously lived in TabBar.tsx ('use client'),
 * and calling a client-module function from a server component throws at runtime
 * ("Attempted to call resolveTab() from the server but it's on the client").
 * Keeping these here lets BOTH the server page and the client TabBar import them.
 */
export const TABS = [
  { key: 'executive', label: 'Executive Dashboard' },
  { key: 'daily', label: 'Daily Control' },
  { key: 'weekly', label: 'Weekly Review' },
  { key: 'crm', label: 'CRM — Zavis' },
  { key: 'practo', label: 'Practo Insta' },
  { key: 'bookings', label: 'Website Bookings' },
  { key: 'arabyads', label: 'Araby Ads' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'social', label: 'Social & Local' },
  { key: 'analytics', label: 'Google Analytics' },
  { key: 'clarity', label: 'Heatmaps & Recordings' },
  { key: 'status', label: 'Status & Rules', adminOnly: true },
] as const;

export type TabKey = (typeof TABS)[number]['key'];

export const DEFAULT_TAB: TabKey = 'executive';

/** Admin-only tab keys — hidden from viewer/staff and blocked server-side. */
const ADMIN_ONLY = new Set<string>(
  TABS.filter((t) => (t as { adminOnly?: boolean }).adminOnly).map((t) => t.key),
);
export const isAdminOnlyTab = (tab: string): boolean => ADMIN_ONLY.has(tab);

/** Normalise an arbitrary ?tab= value to a known tab (default Executive). */
export function resolveTab(tab: string | undefined): TabKey {
  return (TABS.find((t) => t.key === tab)?.key as TabKey) ?? DEFAULT_TAB;
}
