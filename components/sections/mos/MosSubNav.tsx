'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

/**
 * Pill sub-navigation inside Marketing OS. Sets `?mpipe=` while preserving the
 * rest of the query (tab=group&gtab=mos + date params), mirroring GroupSubNav
 * so deep links stay shareable and the date filter carries across views.
 */
export const MOS_VIEWS = [
  { key: '', label: 'Overview' },
  { key: 'organic', label: '1 · Organic Engine' },
  { key: 'smile-club', label: '2 · Smile Club' },
  { key: 'creative', label: '3 · Creative' },
  { key: 'crm', label: '4 · CRM & Segments' },
  { key: 'infra', label: '5 · Infrastructure' },
  { key: 'approvals', label: 'Approval Queue' },
  { key: 'risk', label: 'Risk Register' },
] as const;

export function MosSubNav({ active }: { active: string }) {
  const params = useSearchParams();
  const hrefFor = (view: string) => {
    const next = new URLSearchParams(params.toString());
    next.set('tab', 'group');
    next.set('gtab', 'mos');
    if (view) next.set('mpipe', view);
    else next.delete('mpipe');
    return `/?${next.toString()}`;
  };

  return (
    <nav className="no-print">
      <ul className="flex flex-wrap gap-1.5">
        {MOS_VIEWS.map((v) => {
          const isActive = v.key === active;
          return (
            <li key={v.key}>
              <Link
                href={hrefFor(v.key)}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-block rounded-full border px-3 py-1 text-[11.5px] font-medium transition ${
                  isActive
                    ? 'border-accent bg-accent text-white'
                    : 'border-line bg-card text-ink-soft hover:border-accent/40 hover:text-ink'
                }`}
              >
                {v.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
