'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

/**
 * Tab navigation (Step 3). Five tabs; the active one comes from `?tab=`
 * (default Executive). Links PRESERVE the date params (from/to/preset/compare)
 * so switching tabs keeps the selected range. Clean underlined consulting style.
 */
export const TABS = [
  { key: 'executive', label: 'Executive' },
  { key: 'paid', label: 'Paid acquisition' },
  { key: 'website', label: 'Website' },
  { key: 'inquiries', label: 'Inquiries' },
  { key: 'bookings', label: 'Bookings' },
] as const;

export type TabKey = (typeof TABS)[number]['key'];

export const DEFAULT_TAB: TabKey = 'executive';

/** Normalise an arbitrary ?tab= value to a known tab (default Executive). */
export function resolveTab(tab: string | undefined): TabKey {
  return (TABS.find((t) => t.key === tab)?.key as TabKey) ?? DEFAULT_TAB;
}

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
