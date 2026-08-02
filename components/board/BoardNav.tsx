'use client';

import { useEffect, useState } from 'react';

/**
 * Sticky two-part table of contents. Collapses to a single scrollable strip on
 * a phone (board members open this on their phones) and expands to a rail on
 * desktop. Hidden entirely in print — a PDF has page numbers, not nav.
 *
 * Scroll-spy is plain IntersectionObserver rather than a scroll handler, so it
 * costs nothing while the reader is just reading.
 */

const PART1 = [
  { id: 's-summary', label: 'Executive summary' },
  { id: 's-timeline', label: 'Growth timeline' },
  { id: 's-acq', label: 'Acquisition engine' },
  { id: 's-web', label: 'dentalnation.com' },
  { id: 's-creative', label: 'Creative engine' },
  { id: 's-mos', label: 'Marketing OS' },
  { id: 's-smile', label: 'Smile Club' },
  { id: 's-demand', label: 'Demand generation' },
  { id: 's-next', label: 'Continuity & next 90' },
  { id: 's-appendix', label: 'KPI appendix' },
];

const PART2 = [
  { id: 's-glance', label: 'At a glance' },
  { id: 's-model', label: 'Operating model' },
  { id: 's-office', label: 'Growth Office' },
  { id: 's-engine', label: 'Demand engine' },
  { id: 's-lanes', label: 'The 13 lanes' },
  { id: 's-own', label: 'OWN lanes' },
  { id: 's-targets', label: 'Targets vs. market' },
  { id: 's-portfolio', label: 'BUILD · PILOT · RUN' },
  { id: 's-scorecard', label: 'Portfolio scorecard' },
  { id: 's-revops', label: 'RevOps control room' },
  { id: 's-chapters', label: 'Chapters & pods' },
  { id: 's-retention', label: 'Retention engine' },
  { id: 's-channels', label: 'Channel map' },
  { id: 's-ppp', label: 'PPP & institutional' },
  { id: 's-structure', label: 'Group structure' },
  { id: 's-cadence', label: 'Operating cadence' },
  { id: 's-open', label: 'Designed vs. to do' },
];

const ALL = [...PART1, ...PART2];

/**
 * Scroll-spy shared by both presentations.
 *
 * The mobile bar and the desktop rail are SEPARATE exports on purpose: the
 * rail is a flex item beside the report, and rendering the mobile bar from
 * the same place made it a second column on a phone — the report squeezed
 * into ~170px next to a nav that was supposed to be a full-width strip above
 * it. They live in different places in the layout, so they ship as different
 * components.
 */
function useActiveSection() {
  const [active, setActive] = useState<string>('s-summary');

  useEffect(() => {
    const seen = new Map<string, number>();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.intersectionRatio);
        let best = '';
        let bestRatio = 0;
        for (const [id, ratio] of seen) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = id;
          }
        }
        if (best) setActive(best);
      },
      { rootMargin: '-80px 0px -55% 0px', threshold: [0, 0.25, 0.5, 1] },
    );
    for (const s of ALL) {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, []);

  return active;
}

/** Phone: a full-width sticky strip that opens a sheet. Renders ABOVE the report. */
export function BoardNavMobile() {
  const active = useActiveSection();
  const [open, setOpen] = useState(false);

  const go = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setOpen(false);
  };

  const activeLabel = ALL.find((s) => s.id === active)?.label ?? 'Contents';
  const inPart2 = PART2.some((s) => s.id === active);

  return (
    <>
      <div className="no-print sticky top-0 z-30 -mx-4 mb-5 border-b border-line bg-surface/95 px-4 py-2 backdrop-blur sm:-mx-8 sm:px-8 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <span className="min-w-0">
            <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint">
              {inPart2 ? 'Part 2 · Operating system' : 'Part 1 · Execution'}
            </span>
            <span className="block truncate text-[13px] font-semibold text-ink">{activeLabel}</span>
          </span>
          <span aria-hidden className="shrink-0 text-[11px] text-ink-faint">
            {open ? '▲' : '▼'}
          </span>
        </button>
        {open ? (
          <div className="mt-2 max-h-[60vh] overflow-y-auto pb-2">
            <NavGroup title="Part 1 · Execution" items={PART1} active={active} onGo={go} />
            <NavGroup title="Part 2 · Operating system" items={PART2} active={active} onGo={go} />
          </div>
        ) : null}
      </div>
    </>
  );
}

/** Desktop: a rail beside the report that follows the reader. */
export function BoardNavRail() {
  const active = useActiveSection();
  const go = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <nav className="no-print sticky top-6 hidden max-h-[calc(100vh-3rem)] w-[212px] shrink-0 overflow-y-auto lg:block">
      <NavGroup title="Part 1 · Execution" items={PART1} active={active} onGo={go} />
      <NavGroup title="Part 2 · Operating system" items={PART2} active={active} onGo={go} />
    </nav>
  );
}

function NavGroup({
  title,
  items,
  active,
  onGo,
}: {
  title: string;
  items: { id: string; label: string }[];
  active: string;
  onGo: (id: string) => void;
}) {
  return (
    <div className="mb-4">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">{title}</p>
      <ul className="space-y-[1px]">
        {items.map((s) => {
          const on = s.id === active;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onGo(s.id)}
                className={`block w-full border-l-2 py-[3px] pl-2.5 text-left text-[11.5px] leading-snug transition ${
                  on
                    ? 'border-l-accent font-semibold text-ink'
                    : 'border-l-line text-ink-faint hover:border-l-accent-400 hover:text-ink-soft'
                }`}
              >
                {s.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
