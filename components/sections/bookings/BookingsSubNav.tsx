'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BOOKINGS_SUBTABS, type BookingsSubTab } from './subtabs';

/**
 * Pill sub-navigation under the Website Bookings tab. Sets `?btab=` while
 * preserving the rest of the query (tab=bookings, date params), mirroring the
 * Marketing sub-nav so deep links stay shareable.
 */
export function BookingsSubNav({ active }: { active: BookingsSubTab }) {
  const params = useSearchParams();
  const hrefFor = (sub: BookingsSubTab) => {
    const next = new URLSearchParams(params.toString());
    next.set('tab', 'bookings');
    next.set('btab', sub);
    return `/?${next.toString()}`;
  };

  return (
    <nav className="no-print">
      <ul className="flex flex-wrap gap-1.5">
        {BOOKINGS_SUBTABS.map((t) => {
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
