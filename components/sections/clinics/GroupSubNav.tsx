'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { GROUP_SUBTABS, type GroupSubTab } from './subtabs';

/**
 * Pill sub-navigation under the Group Revenue tab. Sets `?gtab=` while
 * preserving the rest of the query (tab=group + the date params), mirroring the
 * Practo/Bookings sub-navs so deep links stay shareable and the date filter
 * carries across clinics.
 */
export function GroupSubNav({ active }: { active: GroupSubTab }) {
  const params = useSearchParams();
  const hrefFor = (sub: GroupSubTab) => {
    const next = new URLSearchParams(params.toString());
    next.set('tab', 'group');
    next.set('gtab', sub);
    return `/?${next.toString()}`;
  };

  return (
    <nav className="no-print mb-4">
      <ul className="flex flex-wrap gap-1.5">
        {GROUP_SUBTABS.map((t) => {
          const isActive = t.key === active;
          return (
            <li key={t.key}>
              <Link
                href={hrefFor(t.key)}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-block rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition ${
                  isActive
                    ? 'border-accent bg-accent text-white'
                    : 'border-line bg-card text-ink-soft hover:border-accent/40 hover:text-ink'
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
