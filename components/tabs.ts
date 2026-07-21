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
  { key: 'group', label: 'Group Revenue', adminOnly: true },
  { key: 'report', label: 'Board Report', adminOnly: true },
  { key: 'status', label: 'Status & Rules', adminOnly: true },
  { key: 'users', label: 'Users', adminOnly: true },
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
 * Tabs granted to a role BEYOND the standard set — i.e. specific ops / admin-only
 * tabs a restricted role is allowed to see. Lets us hand individual people access
 * to a single gated tab without opening the whole admin/viewer surface:
 *  - clinician (Dr Luvi) → Clinical Operations + Group Revenue.
 *  - opsstaff  (Gautam)  → Clinical Operations only.
 */
function extraGrantsFor(role: Role | null | undefined): Set<string> {
  switch (role) {
    case 'clinician':
      return new Set<string>(['clinical-ops', 'group']);
    case 'opsstaff':
      return new Set<string>(['clinical-ops']);
    default:
      return new Set<string>();
  }
}

/**
 * Which tabs a role may see:
 *  - receptionist → ONLY the Clinical Operations tab (nothing else).
 *  - staff        → everything except admin-only AND ops tabs.
 *  - clinician    → staff tabs + Clinical Operations + Group Revenue.
 *  - opsstaff     → staff tabs + Clinical Operations.
 *  - viewer       → everything except admin-only (includes Clinical Operations).
 *  - admin        → everything.
 */
export function visibleTabsFor(role: Role | null | undefined): TabKey[] {
  if (role === 'receptionist') return TABS.filter((t) => isOpsTab(t.key)).map((t) => t.key);
  const extra = extraGrantsFor(role);
  return TABS.filter((t) => {
    if (isAdminOnlyTab(t.key)) return role === 'admin' || extra.has(t.key);
    if (isOpsTab(t.key)) return role === 'admin' || role === 'viewer' || extra.has(t.key);
    return true; // standard tabs: admin / viewer / staff / clinician / opsstaff
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

/**
 * A specific user's effective tabs: the base role's tabs, PLUS per-user
 * `extra_tabs`, MINUS per-user `removed_tabs`. `admin` always keeps every tab
 * (its access can't be trimmed from the directory — an admin is an admin).
 */
/**
 * Security-sensitive tabs that are admin-only and can NEVER be granted to a
 * non-admin via extra_tabs (granting Users would let someone escalate their own
 * access; Status exposes internal config). Group Revenue / Board Report ARE
 * grantable — those are the intended per-person grants.
 */
export const UNGRANTABLE_TABS = new Set<string>(['users', 'status']);

export function effectiveVisibleTabs(
  role: Role | null | undefined,
  extra: readonly string[] = [],
  removed: readonly string[] = [],
): TabKey[] {
  if (role === 'admin') return TABS.map((t) => t.key);
  const known = new Set<string>(TABS.map((t) => t.key));
  const set = new Set<string>(visibleTabsFor(role));
  for (const t of extra) if (known.has(t) && !UNGRANTABLE_TABS.has(t)) set.add(t);
  for (const t of removed) set.delete(t);
  return TABS.filter((t) => set.has(t.key)).map((t) => t.key);
}

/** Tabs an admin may hand out per-user in the Users tab (everything grantable). */
export function grantableTabs(): { key: TabKey; label: string }[] {
  return TABS.filter((t) => !UNGRANTABLE_TABS.has(t.key)).map((t) => ({ key: t.key, label: t.label }));
}

/** Resolve ?tab= against an explicit visible-tab set (per-user); safe fallback. */
export function resolveTabInSet(
  tab: string | undefined,
  visible: readonly TabKey[],
  role: Role | null | undefined,
): TabKey {
  const wanted = resolveTab(tab);
  if (visible.includes(wanted)) return wanted;
  const dflt = defaultTabFor(role);
  if (visible.includes(dflt)) return dflt;
  return visible[0] ?? DEFAULT_TAB;
}
