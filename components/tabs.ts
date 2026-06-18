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
  { key: 'daily', label: 'Daily Control' },
  { key: 'weekly', label: 'Weekly Review' },
] as const;

export type TabKey = (typeof TABS)[number]['key'];

export const DEFAULT_TAB: TabKey = 'daily';

/** Normalise an arbitrary ?tab= value to a known tab (default Executive). */
export function resolveTab(tab: string | undefined): TabKey {
  return (TABS.find((t) => t.key === tab)?.key as TabKey) ?? DEFAULT_TAB;
}
