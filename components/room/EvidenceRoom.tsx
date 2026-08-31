import Link from 'next/link';
import { C } from '@/components/board/design';
import { ROOM } from '@/config/evidence-room';
import { PlatformModelBlock } from '@/components/room/PlatformModel';
import { LayerCardsGrid } from '@/components/room/PlatformLayers';

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
export function EvidenceRoom({ base }: { base: string }) {
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
        </div>
      </header>

      {/* ── The platform IS the structure (Ms Shadi's direction): after the
          cover, introduce the platform, then the six layers as the PRIMARY
          navigation. Operations, Growth, Finance and Branding contribute
          their reports INTO the layers — they are not parallel categories. */}
      <section className="rounded-lg px-5 py-4 sm:px-6" style={{ background: '#FAF5ED' }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: '#B99145' }}>
          {ROOM.overviewTitle}
        </p>
        <p className="mt-1.5 max-w-[880px] text-[12.5px] leading-snug" style={{ color: C.inkSoft }}>
          {ROOM.overview}
        </p>
        <p className="mt-2 max-w-[880px] text-[12.5px] leading-snug" style={{ color: C.inkSoft }}>
          The platform is built from <span className="font-bold" style={{ color: C.navyDeep }}>six layers</span>. Every
          report and capability in this room lives inside one of them — open a layer to see what has been built, its
          owners, its live reports and its evidence. Everything is live: figures update as the business trades.
        </p>
      </section>

      <LayerCardsGrid base={`${base}`} />

      <p className="text-[11px]" style={{ color: C.inkFaint }}>
        Direct report access:{' '}
        {ROOM.sections.map((sct, i) => (
          <span key={sct.key}>
            {i > 0 ? ' · ' : ''}
            <Link href={`${base}/${sct.key}`} className="font-medium no-underline" style={{ color: C.navyMid }}>
              {sct.title}
            </Link>
          </span>
        ))}
        {' · '}
        <Link href={`${base}/platform`} className="font-medium no-underline" style={{ color: C.navyMid }}>
          All capability pages
        </Link>
      </p>

      {/* ── Platform overview + platform model (A and B, shared block) ───── */}
      <PlatformModelBlock />

      <footer className="border-t pt-3 text-[10.5px]" style={{ borderColor: C.rule, color: C.inkFaint }}>
        Dental Nation Group · {ROOM.cover.confidential}
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
export function RoomSectionBar({ backHref, section, active }: { backHref: string; section: string; active?: string }) {
  const items = [
    { label: 'Overview', href: backHref, key: 'overview' },
    { label: 'Platform', href: `${backHref}/platform`, key: 'platform' },
    { label: 'Growth', href: `${backHref}/growth`, key: 'growth' },
    { label: 'Operations', href: `${backHref}/operations`, key: 'operations' },
    { label: 'Finance', href: `${backHref}/finance`, key: 'finance' },
  ];
  // "platform" is never inferred from the section label — the Operations
  // section is titled "Operating Platform reports" and must not match it.
  const activeKey =
    active ??
    (items.find((i) => i.key !== 'overview' && i.key !== 'platform' && section.toLowerCase().includes(i.key))?.key ?? null);
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
