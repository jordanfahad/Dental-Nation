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
