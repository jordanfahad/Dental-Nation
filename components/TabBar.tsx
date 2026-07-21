'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { TABS, resolveTabForRole, resolveTabInSet, visibleTabsFor, type TabKey } from '@/components/tabs';
import type { Role } from '@/lib/auth/session';

/**
 * Tab navigation. The active tab comes from `?tab=` (default Executive). Links
 * PRESERVE the date params (from/to/preset/compare) so switching tabs keeps the
 * selected range. Tabs are filtered by ROLE — admin-only (Status & Rules) and
 * ops tabs (Clinical Operations) show only where allowed, and a receptionist
 * sees ONLY Clinical Operations. The tab definitions live in ./tabs (a plain,
 * non-client module) so the SERVER page can resolve tabs without crossing the
 * RSC boundary.
 */

export function TabBar({ role = null, visibleTabs }: { role?: Role | null; visibleTabs?: TabKey[] }) {
  const params = useSearchParams();
  // A per-user visible set (from the server) wins; otherwise fall back to the
  // plain role-based set so the component still works without the prop.
  const visibleList = visibleTabs ?? visibleTabsFor(role);
  const active = visibleTabs
    ? resolveTabInSet(params.get('tab') ?? undefined, visibleList, role)
    : resolveTabForRole(params.get('tab') ?? undefined, role);
  const visible = new Set<string>(visibleList);
  const tabs = TABS.filter((t) => visible.has(t.key));

  const hrefFor = (tab: TabKey) => {
    const next = new URLSearchParams(params.toString());
    next.set('tab', tab);
    return `/?${next.toString()}`;
  };

  return (
    <nav className="no-print mb-5 border-b border-line">
      <ul className="flex flex-wrap gap-1">
        {tabs.map((t) => {
          const isActive = t.key === active;
          return (
            <li key={t.key}>
              <Link
                href={hrefFor(t.key)}
                aria-current={isActive ? 'page' : undefined}
                className={`-mb-px inline-block border-b-2 px-3 py-2.5 text-[13px] font-medium transition ${
                  isActive
                    ? 'border-accent text-accent'
                    : 'border-transparent text-ink-faint hover:border-line hover:text-ink-soft'
                }`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
