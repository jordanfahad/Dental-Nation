import Link from 'next/link';
import { C } from '@/components/board/design';
import { ROOM } from '@/config/evidence-room';

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
                Open the report →
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Platform overview ────────────────────────────────────────────── */}
      <section className="rounded-lg border bg-white p-5" style={{ borderColor: C.rule }}>
        <h2 className="text-[15px] font-semibold">{ROOM.overviewTitle}</h2>
        <p className="mt-2 max-w-[880px] text-[12.5px] leading-relaxed" style={{ color: C.inkSoft }}>
          {ROOM.overview}
        </p>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-wider" style={{ color: C.navyMid }}>
          {ROOM.whyTitle}
        </p>
        <p className="mt-1.5 max-w-[880px] text-[12.5px] leading-relaxed" style={{ color: C.inkSoft }}>
          {ROOM.why}
        </p>
      </section>

      {/* ── Comparison ───────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-[15px] font-semibold">{ROOM.comparisonTitle}</h2>
        <p className="mt-1 max-w-[860px] text-[11.5px] leading-snug" style={{ color: C.inkSoft }}>
          {ROOM.comparisonSub}
        </p>
        <div className="scroll-x mt-3 overflow-x-auto rounded-lg border" style={{ borderColor: C.rule }}>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr style={{ background: C.navy }}>
                {ROOM.comparisonHeaders.map((h, i) => (
                  <th
                    key={h}
                    className={`px-3.5 py-2.5 text-[10.5px] font-semibold uppercase tracking-wider text-white ${i === 3 ? 'bg-white/10' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROOM.comparison.map((row, ri) => (
                <tr key={row[0]} className="align-top" style={{ background: ri % 2 ? C.panel : C.paper }}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`px-3.5 py-3 text-[11.5px] leading-snug ${
                        ci === 0 ? 'font-semibold' : ci === 3 ? 'font-medium' : ''
                      }`}
                      style={{
                        color: ci === 0 ? C.ink : ci === 3 ? C.navyDeep : C.inkSoft,
                        background: ci === 3 ? C.navyWash : undefined,
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="border-t pt-3 text-[10.5px]" style={{ borderColor: C.rule, color: C.inkFaint }}>
        Dental Nation Group · {ROOM.cover.confidential} · Prepared for {recipientLabel}
      </footer>
    </div>
  );
}

/** Slim bar shown at the top of every section opened from the room. */
export function RoomSectionBar({ backHref, section }: { backHref: string; section: string }) {
  return (
    <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-2.5" style={{ borderColor: C.rule, background: C.panel }}>
      <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: C.inkFaint }}>
        Dental Nation · Investor Evidence Room — {section}
      </p>
      <Link
        href={backHref}
        className="rounded-md border bg-white px-3 py-1.5 text-[11.5px] font-semibold no-underline"
        style={{ borderColor: C.rule, color: C.navyMid }}
      >
        ← Back to the Evidence Room
      </Link>
    </div>
  );
}
