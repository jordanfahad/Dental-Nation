import type { ReactNode } from 'react';

/**
 * The exhibit — the unit a strategy deck is actually built from.
 *
 * Structure, top to bottom:
 *   EXHIBIT 3 · ACQUISITION          ← number + kicker, small caps
 *   Bookings nearly doubled while     ← ACTION TITLE: the finding as a
 *   cost per booking halved             sentence, not a label
 *   [ the chart ]
 *   Source: … · Note: …               ← provenance, always
 *
 * The action title is the whole trick. A reader who skims only the titles
 * should still receive the argument in order. "Cost per booking" tells them
 * nothing; "Cost per booking fell 49% while bookings nearly doubled" is the
 * point of the page.
 */
export function Exhibit({
  n,
  kicker,
  title,
  children,
  source,
  note,
  tall = false,
  id,
}: {
  n: number;
  kicker: string;
  title: ReactNode;
  children: ReactNode;
  source?: string;
  note?: string;
  /** Reserve more vertical room and keep the exhibit whole across a page break. */
  tall?: boolean;
  id?: string;
}) {
  return (
    <figure
      id={id}
      className={`print-avoid-break scroll-mt-24 border-t border-ink pt-3 ${tall ? 'mt-10' : 'mt-9'}`}
    >
      <figcaption className="mb-4">
        <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-accent">
          Exhibit {n} <span className="text-ink-ghost">·</span>{' '}
          <span className="text-ink-faint">{kicker}</span>
        </p>
        <h3 className="mt-1.5 max-w-[62ch] text-[17px] font-semibold leading-[1.3] tracking-[-0.011em] text-ink sm:text-[19px]">
          {title}
        </h3>
      </figcaption>

      {children}

      {source || note ? (
        <div className="mt-3 border-t border-line pt-2">
          {note ? <p className="text-[10.5px] leading-relaxed text-ink-faint">{note}</p> : null}
          {source ? (
            <p className="mt-0.5 text-[10px] leading-relaxed text-ink-ghost">Source: {source}</p>
          ) : null}
        </div>
      ) : null}
    </figure>
  );
}

/**
 * Chapter divider. Gives the document structure you can feel when scrolling
 * and gives the printed version a clean page start.
 */
export function ChapterDivider({
  part,
  title,
  standfirst,
  contents,
  id,
  breakBefore = false,
}: {
  part: string;
  title: string;
  standfirst: string;
  contents?: string[];
  id?: string;
  breakBefore?: boolean;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-24 ${breakBefore ? 'print-break' : ''} mt-12 border-t-[3px] border-accent pt-6 first:mt-0`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">{part}</p>
      <h2 className="mt-2 max-w-[22ch] text-[30px] font-semibold leading-[1.08] tracking-[-0.022em] text-ink sm:text-[40px]">
        {title}
      </h2>
      <p className="mt-3 max-w-[72ch] text-[13.5px] leading-relaxed text-ink-soft">{standfirst}</p>
      {contents?.length ? (
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-3">
          {contents.map((c, i) => (
            <li key={c} className="flex items-baseline gap-1.5 text-[11px] text-ink-faint">
              <span className="tnum font-semibold text-accent">{String(i + 1).padStart(2, '0')}</span>
              {c}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/**
 * A takeaway bar under an exhibit — the "so what" in one line. Used where the
 * chart alone could be read two ways.
 */
export function Takeaway({ children }: { children: ReactNode }) {
  return (
    <p className="print-avoid-break mt-3 border-l-[3px] border-l-accent bg-watch-50 px-3.5 py-2.5 text-[12.5px] font-medium leading-relaxed text-ink">
      {children}
    </p>
  );
}

/** Small caps section label used inside exhibits. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
      {children}
    </p>
  );
}
