'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { TABS, resolveTab, type TabKey } from '@/components/tabs';

/**
 * Tab navigation (Step 3). Five tabs; the active one comes from `?tab=`
 * (default Executive). Links PRESERVE the date params (from/to/preset/compare)
 * so switching tabs keeps the selected range. The tab definitions + resolveTab
 * live in ./tabs (a plain, non-client module) so the SERVER page can call
 * resolveTab without crossing the RSC boundary (that was the prod crash).
 */

export function TabBar() {
  const params = useSearchParams();
  const active = resolveTab(params.get('tab') ?? undefined);

  const hrefFor = (tab: TabKey) => {
    const next = new URLSearchParams(params.toString());
    next.set('tab', tab);
    return `/?${next.toString()}`;
  };

  return (
    <nav className="no-print mb-5 border-b border-line">
      <ul className="flex flex-wrap gap-1">
        {TABS.map((t) => {
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
