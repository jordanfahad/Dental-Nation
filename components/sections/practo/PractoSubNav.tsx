'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PRACTO_SUBTABS, type PractoSubTab } from './subtabs';

/**
 * Pill sub-navigation under the Practo Insta tab. Sets `?ptab=` while preserving
 * the rest of the query (tab=practo, date + clinic params), mirroring the
 * Bookings/Marketing sub-navs so deep links stay shareable.
 */
export function PractoSubNav({ active }: { active: PractoSubTab }) {
  const params = useSearchParams();
  const hrefFor = (sub: PractoSubTab) => {
    const next = new URLSearchParams(params.toString());
    next.set('tab', 'practo');
    next.set('ptab', sub);
    return `/?${next.toString()}`;
  };

  return (
    <nav className="no-print">
      <ul className="flex flex-wrap gap-1.5">
        {PRACTO_SUBTABS.map((t) => {
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
