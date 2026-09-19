import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { bumpShareView, resolveShareToken } from '@/lib/board/shareLinks';
import { RoomSectionBar } from '@/components/room/EvidenceRoom';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dental Nation — Smile Club Membership Programme',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

const C = {
  navyDeep: '#152A4A',
  navyMid: '#2b5a8a',
  rule: '#d9d3c6',
  ink: '#1a2433',
  inkSoft: '#3a4148',
  inkFaint: '#8a8578',
  gold: '#B99145',
};

/**
 * Smile Club — the membership programme section of the Investor Evidence
 * Room. Curated from the programme's 12 Sep 2026 management progress update
 * and the 17 Sep activation mandate; investor-safe (no patient data, no
 * per-campaign contact lists) and deliberately honest about the FIX/HOLD
 * decision — the governance story IS the story.
 */
export default async function RoomSmileClubPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await resolveShareToken(token, 'room');
  if (!link) notFound();
  await bumpShareView(token);
  const base = `/share/room/${token}`;

  const status: [string, 'GREEN' | 'AMBER' | 'FIX / HOLD', string][] = [
    ['Product & plan architecture', 'GREEN', 'Four plans, pricing, benefits and positioning established; live member website with an online joining route.'],
    ['Member terms & governance', 'GREEN', 'Comprehensive Member Agreement (v1.3): eligibility, family structure, payments, cancellation, failed-payment and benefit rules.'],
    ['Clinic & reception enablement', 'GREEN', 'Reception deck, conversion guide with a defined sales methodology, objection handling, value-discovery training — in English and Emirati Arabic.'],
    ['Partnership go-to-market', 'AMBER', 'Bilingual community-partnership decks and organisation-specific proposals complete; partner outreach active, first activations being scheduled.'],
    ['Broad outbound acquisition', 'FIX / HOLD', 'Early doctor-endorsed campaigns generated engagement that proved appointment-led rather than membership-led. Management held further cohorts rather than scaling an unproven channel.'],
    ['Commercial scale readiness', 'AMBER', 'A winning channel is proven only on paid, active, first-booked member outcomes — not on message volume or replies. Controlled tests precede scale.'],
  ];

  const pill = (s: string) =>
    s === 'GREEN'
      ? { background: '#e7efe6', color: '#2C5E3F' }
      : s === 'AMBER'
        ? { background: '#f5ecd8', color: '#8a6a1e' }
        : { background: '#f7e8e4', color: '#a04a38' };

  return (
    <main className="mx-auto max-w-[880px] px-4 py-6 sm:px-8 sm:py-8">
      <RoomSectionBar backHref={base} section="Smile Club — Membership Programme" active="smileclub" />

      <header className="rounded-lg px-5 py-5 text-white sm:px-6" style={{ background: C.navyDeep }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: '#c9d6e6' }}>
          Recurring revenue · Membership
        </p>
        <h1 className="mt-1 text-[20px] font-semibold leading-tight sm:text-[24px]">Smile Club — the group&apos;s membership programme</h1>
        <p className="mt-1.5 text-[12px]" style={{ color: '#c9d6e6' }}>
          Build and readiness substantially complete; now in disciplined commercial activation under a 30-day
          management mandate. Position as of the 12 September management update and the 17 September mandate.
        </p>
      </header>

      <section className="mt-4 rounded-lg border bg-white p-4" style={{ borderColor: C.rule }}>
        <h2 className="text-[13.5px] font-semibold" style={{ color: C.ink }}>Programme position</h2>
        <div className="mt-2 space-y-2">
          {status.map(([area, s, note]) => (
            <div key={area} className="flex flex-wrap items-start gap-2 border-b pb-2 last:border-0" style={{ borderColor: '#efece4' }}>
              <span className="w-[200px] shrink-0 text-[12px] font-semibold" style={{ color: C.ink }}>{area}</span>
              <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={pill(s)}>{s}</span>
              <span className="min-w-[200px] flex-1 text-[11.5px] leading-snug" style={{ color: C.inkSoft }}>{note}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-lg border bg-white p-4" style={{ borderColor: C.rule }}>
        <h2 className="text-[13.5px] font-semibold" style={{ color: C.ink }}>Why the hold is the headline</h2>
        <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: C.inkSoft }}>
          The programme&apos;s early outbound campaigns produced measurable engagement — and the contact-centre review
          showed that engagement was booking-intent, not membership-intent. Rather than spend into an unproven
          channel, management held the remaining campaign cohorts, closed out the test with a full reconciliation
          against payment records, and set a zero target and zero budget for broad outbound messaging. Acquisition
          now concentrates on high-intent moments: the clinic checkout conversation, doctor-to-reception handoffs,
          open treatment plans, due preventive visits, and partner channels — each with a mandatory source code.
        </p>
      </section>

      <section className="mt-4 rounded-lg border bg-white p-4" style={{ borderColor: C.rule }}>
        <h2 className="text-[13.5px] font-semibold" style={{ color: C.ink }}>The activation mandate now in execution</h2>
        <ul className="mt-2 space-y-1.5 text-[12px] leading-snug" style={{ color: C.inkSoft }}>
          <li>· <span className="font-medium" style={{ color: C.ink }}>Outcome mandated, method delegated</span> — the programme owner sets the paid-membership requirement and guardrails; marketing owns channel and creative choices within them.</li>
          <li>· <span className="font-medium" style={{ color: C.ink }}>Weekly management checkpoints</span> with minimum thresholds; a missed minimum triggers a recovery plan the next business day.</li>
          <li>· <span className="font-medium" style={{ color: C.ink }}>One funnel, one source of truth</span> — enquiry → qualified → checkout → paid → card active → booked → attended, with ≥98% source attribution required and funding released in evidence-gated stages.</li>
          <li>· <span className="font-medium" style={{ color: C.ink }}>Members counted honestly</span> — paid, active, non-refunded contracts only; activation measured as first booking and first completed visit.</li>
        </ul>
      </section>

      <p className="mt-4 text-[11px]" style={{ color: C.inkFaint }}>
        Sources: Smile Club management progress update (12 Sep 2026, prepared for group leadership) and the
        30-day activation mandate (17 Sep 2026). Membership economics join the{' '}
        <Link href={`${base}/finance`} className="font-semibold no-underline" style={{ color: C.navyMid }}>
          financial reports
        </Link>{' '}
        as paid cohorts mature.
      </p>

      <footer className="mt-6 border-t pt-3 text-[10.5px]" style={{ borderColor: C.rule, color: C.inkFaint }}>
        Dental Nation Group · Confidential — prepared for invited investors.
      </footer>
    </main>
  );
}
