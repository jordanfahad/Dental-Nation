import type { Role } from '@/lib/auth/session';

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
  { key: 'clinical-ops', label: 'Clinical Operations', opsTab: true },
  { key: 'daily', label: 'Daily Control' },
  { key: 'weekly', label: 'Weekly Review' },
  { key: 'crm', label: 'CRM — Zavis' },
  { key: 'practo', label: 'Practo Insta' },
  { key: 'bookings', label: 'Website Bookings' },
  { key: 'arabyads', label: 'Araby Ads' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'social', label: 'Social & Local' },
  { key: 'analytics', label: 'Google Analytics' },
  { key: 'digital', label: 'Digital & SEO' },
  { key: 'clarity', label: 'Heatmaps & Recordings' },
  { key: 'report', label: 'Board Report', adminOnly: true },
  { key: 'status', label: 'Status & Rules', adminOnly: true },
] as const;

export type TabKey = (typeof TABS)[number]['key'];

export const DEFAULT_TAB: TabKey = 'executive';

/** Admin-only tab keys — hidden from viewer/staff and blocked server-side. */
const ADMIN_ONLY = new Set<string>(
  TABS.filter((t) => (t as { adminOnly?: boolean }).adminOnly).map((t) => t.key),
);
export const isAdminOnlyTab = (tab: string): boolean => ADMIN_ONLY.has(tab);

/** Operations tabs (Clinical Operations) — for reception + the ops team. */
const OPS_TABS = new Set<string>(TABS.filter((t) => (t as { opsTab?: boolean }).opsTab).map((t) => t.key));
export const isOpsTab = (tab: string): boolean => OPS_TABS.has(tab);

/** Normalise an arbitrary ?tab= value to a known tab (default Executive). */
export function resolveTab(tab: string | undefined): TabKey {
  return (TABS.find((t) => t.key === tab)?.key as TabKey) ?? DEFAULT_TAB;
}

/**
 * Which tabs a role may see:
 *  - receptionist → ONLY the Clinical Operations tab (nothing else).
 *  - staff        → everything except admin-only AND ops tabs.
 *  - viewer       → everything except admin-only (includes Clinical Operations).
 *  - admin        → everything.
 */
export function visibleTabsFor(role: Role | null | undefined): TabKey[] {
  if (role === 'receptionist') return TABS.filter((t) => isOpsTab(t.key)).map((t) => t.key);
  return TABS.filter((t) => {
    if (isAdminOnlyTab(t.key)) return role === 'admin';
    if (isOpsTab(t.key)) return role === 'admin' || role === 'viewer';
    return true; // standard tabs: admin / viewer / staff
  }).map((t) => t.key);
}

/** The landing tab for a role (receptionist lands on Clinical Operations). */
export function defaultTabFor(role: Role | null | undefined): TabKey {
  return role === 'receptionist' ? 'clinical-ops' : DEFAULT_TAB;
}

/** Resolve ?tab= against what the role may see; fall back to the role's default. */
export function resolveTabForRole(tab: string | undefined, role: Role | null | undefined): TabKey {
  const wanted = resolveTab(tab);
  return visibleTabsFor(role).includes(wanted) ? wanted : defaultTabFor(role);
}
