'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MARKETING_SUBTABS, type MarketingSubTab } from './subtabs';

/**
 * Pill sub-navigation rendered under the Marketing tab. Sets `?mtab=` while
 * preserving the rest of the query (tab=marketing, date params), mirroring the
 * top TabBar pattern so deep links stay shareable.
 */
export function MarketingSubNav({ active }: { active: MarketingSubTab }) {
  const params = useSearchParams();
  const hrefFor = (sub: MarketingSubTab) => {
    const next = new URLSearchParams(params.toString());
    next.set('tab', 'marketing');
    next.set('mtab', sub);
    return `/?${next.toString()}`;
  };

  return (
    <nav className="no-print">
      <ul className="flex flex-wrap gap-1.5">
        {MARKETING_SUBTABS.map((t) => {
          const isActive = t.key === active;
          return (
            <li key={t.key}>
              <Link
                href={hrefFor(t.key)}
                aria-current={isActive ? 'page' : undefined}
                className="inline-block rounded-full px-3.5 py-1.5 text-[11.5px] font-bold transition"
                style={isActive ? { backgroundColor: '#244260', color: 'white' } : { backgroundColor: '#F1F1EA', color: '#767769' }}
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
