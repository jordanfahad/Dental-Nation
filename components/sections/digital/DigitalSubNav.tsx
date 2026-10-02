'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { DIGITAL_SUBTABS, type DigitalSubTab } from './subtabs';

/** Pill sub-navigation under the Digital & SEO tab. Sets `?dtab=` and keeps the rest of the query. */
export function DigitalSubNav({ active }: { active: DigitalSubTab }) {
  const params = useSearchParams();
  const hrefFor = (sub: DigitalSubTab) => {
    const next = new URLSearchParams(params.toString());
    next.set('tab', 'digital');
    next.set('dtab', sub);
    return `/?${next.toString()}`;
  };

  return (
    <nav className="no-print">
      <ul className="flex flex-wrap gap-1.5">
        {DIGITAL_SUBTABS.map((t) => {
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
