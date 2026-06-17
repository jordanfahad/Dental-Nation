import type { ReactNode } from 'react';

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

export function Card({
  children,
  className = '',
  highlight = false,
}: {
  children: ReactNode;
  className?: string;
  highlight?: boolean;
}) {
  return (
    <section
      className={`card print-avoid-break ${
        highlight ? 'border-watch ring-1 ring-watch/30' : ''
      } ${className}`}
    >
      {children}
    </section>
  );
}

/** Section eyebrow + title + optional letter tag (A–G) and right-side slot. */
export function SectionHeader({
  tag,
  eyebrow,
  title,
  right,
}: {
  tag?: string;
  eyebrow: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5">
      <div className="flex items-start gap-3">
        {tag ? (
          <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/5 text-[11px] font-semibold text-accent">
            {tag}
          </span>
        ) : null}
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="mt-0.5 text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
        </div>
      </div>
      {right ? <div className="no-print shrink-0">{right}</div> : null}
    </div>
  );
}

/** One-line plain-English takeaway under a chart (the insight, not the picture). */
export function Takeaway({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-[12.5px] leading-snug text-ink-soft">{children}</p>;
}
