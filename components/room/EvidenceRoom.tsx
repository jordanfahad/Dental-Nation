import Link from 'next/link';
import { C } from '@/components/board/design';
import { ROOM } from '@/config/evidence-room';
import { PlatformModelBlock } from '@/components/room/PlatformModel';

/**
 * The Investor Evidence Room landing page (Mr Akbar's blueprint) — the front
 * door investors walk through. Cover band, primary navigation into the live
 * reports, the platform-overview narrative and the three-way comparison.
 *
 * It renders NAVIGATION and NARRATIVE only. Every number an investor sees
 * lives in the reports behind the cards, which are the same live pages the
 * business runs on — the room never carries a second copy of a figure that
 * could drift out of date.
 */
export function EvidenceRoom({ base, recipientLabel }: { base: string; recipientLabel: string }) {
  const today = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6" style={{ color: C.ink }}>
      {/* ── Cover ────────────────────────────────────────────────────────── */}
      <header className="rounded-lg px-6 py-8 text-white sm:px-9 sm:py-10" style={{ background: C.navyDeep }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: C.navyPale }}>
          {ROOM.cover.kicker}
        </p>
        <h1 className="mt-2 max-w-[760px] text-[26px] font-semibold leading-tight sm:text-[32px]">{ROOM.cover.title}</h1>
        <p className="mt-3 max-w-[640px] text-[13.5px] leading-snug" style={{ color: C.navyPale }}>
          {ROOM.cover.sub}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px]" style={{ color: C.navyPale }}>
          <span className="rounded border px-2.5 py-1 font-medium" style={{ borderColor: 'rgba(255,255,255,0.25)' }}>
            {ROOM.cover.confidential}
          </span>
          <span>Reporting date: {today}</span>
          <span>Prepared for {recipientLabel}</span>
        </div>
      </header>

      {/* ── Primary navigation ───────────────────────────────────────────── */}
      <section>
        <h2 className="text-[15px] font-semibold">The reports</h2>
        <p className="mt-1 text-[11.5px]" style={{ color: C.inkSoft }}>
          Each section is a live report, not a document — the figures update as the business trades. Open a section and
          use your browser&apos;s Back button to return here.
        </p>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {ROOM.sections.map((sct) => (
            <Link
              key={sct.key}
              href={`${base}/${sct.key}`}
              className="group flex flex-col rounded-lg border bg-white p-4 no-underline transition hover:shadow-md"
              style={{ borderColor: C.rule }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[14px] font-semibold leading-tight" style={{ color: C.ink }}>
                  {sct.title}
                </p>
                {sct.status === 'live' ? (
                  <span className="mt-[1px] flex shrink-0 items-center gap-1 rounded px-1.5 py-[2px] text-[9px] font-bold uppercase tracking-wide" style={{ background: C.goodWash, color: C.good }}>
                    <span className="h-[6px] w-[6px] rounded-full" style={{ background: C.good }} />
                    Live
                  </span>
                ) : (
                  <span className="mt-[1px] shrink-0 rounded px-1.5 py-[2px] text-[9px] font-bold uppercase tracking-wide" style={{ background: C.amberWash, color: C.amber }}>
                    In preparation
                  </span>
                )}
              </div>
              <p className="mt-2 flex-1 text-[11.5px] leading-snug" style={{ color: C.inkSoft }}>
                {sct.blurb}
              </p>
              <p className="mt-3 text-[11.5px] font-semibold" style={{ color: C.navyMid }}>
                {sct.status === 'live' ? 'Open the report →' : 'See status & live figures →'}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Platform overview + platform model (A and B, shared block) ───── */}
      <PlatformModelBlock />

      <footer className="border-t pt-3 text-[10.5px]" style={{ borderColor: C.rule, color: C.inkFaint }}>
        Dental Nation Group · {ROOM.cover.confidential} · Prepared for {recipientLabel}
      </footer>
    </div>
  );
}

/**
 * The room's persistent navigation, shown at the top of every section — the
 * blueprint's "Primary navigation", carried with the reader (sticky) so an
 * investor can move Growth ↔ Operations ↔ Finance without returning to the
 * landing first.
 */
export function RoomSectionBar({ backHref, section }: { backHref: string; section: string }) {
  const items = [
    { label: 'Overview', href: backHref, key: 'overview' },
    { label: 'Growth', href: `${backHref}/growth`, key: 'growth' },
    { label: 'Operations', href: `${backHref}/operations`, key: 'operations' },
    { label: 'Finance', href: `${backHref}/finance`, key: 'finance' },
  ];
  const activeKey = items.find((i) => i.key !== 'overview' && section.toLowerCase().includes(i.key))?.key ?? null;
  return (
    <div
      className="no-print sticky top-2 z-20 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-2 shadow-sm"
      style={{ borderColor: C.rule, background: C.panel }}
    >
      <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: C.inkFaint }}>
        Dental Nation · Investor Evidence Room — {section}
      </p>
      <nav className="flex flex-wrap items-center gap-1.5">
        {items.map((i) => (
          <Link
            key={i.key}
            href={i.href}
            className="rounded-md border px-2.5 py-1 text-[11px] font-semibold no-underline"
            style={
              i.key === activeKey
                ? { borderColor: C.navy, background: C.navy, color: '#fff' }
                : { borderColor: C.rule, background: '#fff', color: C.navyMid }
            }
          >
            {i.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
