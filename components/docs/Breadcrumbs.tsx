import Link from 'next/link';
import { Fragment } from 'react';

/**
 * Breadcrumb trail for the standalone reference pages (know-how library,
 * knowledge graph) so there is always a visible way back to the dashboard —
 * these pages live outside the app shell's header navigation.
 */
export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px]">
      {items.map((it, i) => (
        <Fragment key={`${it.label}-${i}`}>
          {i > 0 && <span aria-hidden className="text-ink-faint">/</span>}
          {it.href ? (
            <Link href={it.href} className="text-accent underline-offset-2 hover:underline">
              {it.label}
            </Link>
          ) : (
            <span className="font-medium text-ink-soft">{it.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
