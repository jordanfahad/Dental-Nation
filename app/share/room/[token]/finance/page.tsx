import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { bumpShareView, resolveShareToken } from '@/lib/board/shareLinks';
import { RoomSectionBar } from '@/components/room/EvidenceRoom';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dental Nation — Financial Reports',
  description: 'Financial reports — status and live figures.',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

/**
 * Financial reports — honestly IN PREPARATION, not padded.
 *
 * The room's rule is the platform's rule: no page pretends to be more than it
 * is. This one says exactly what exists today (and links to it live) and what
 * the finance pack will add when the finance team's feed lands.
 */
export default async function RoomFinancePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await resolveShareToken(token, 'room');
  if (!link) notFound();
  await bumpShareView(token);
  const base = `/share/room/${token}`;

  return (
    <main className="mx-auto max-w-[880px] px-4 py-6 sm:px-8 sm:py-8">
      <RoomSectionBar backHref={base} section="Financial reports" />

      <h1 className="text-[20px] font-semibold text-ink">Financial reports</h1>
      <p className="mt-1 rounded bg-watch-50 px-3 py-1.5 text-[11.5px] font-medium text-watch" style={{ display: 'inline-block' }}>
        In preparation with the finance team
      </p>

      <div className="mt-5 space-y-4">
        <section className="rounded-lg border border-line bg-card p-4">
          <h2 className="text-[13.5px] font-semibold text-ink">Available live today</h2>
          <ul className="mt-2 space-y-1.5 text-[12px] leading-snug text-ink-soft">
            <li>
              · <span className="font-medium text-ink">Clinic-level billed revenue</span> for all three clinics, with
              monthly trend —{' '}
              <Link href={`${base}/dash?tab=group`} className="font-semibold text-accent underline-offset-2 hover:underline">
                open the live Group Revenue view →
              </Link>
            </li>
            <li>
              · <span className="font-medium text-ink">Growth economics</span> — revenue vs growth investment, monthly,
              inside the{' '}
              <Link href={`${base}/growth`} className="font-semibold text-accent underline-offset-2 hover:underline">
                Growth dashboard&apos;s P&amp;L bridge →
              </Link>
            </li>
          </ul>
        </section>

        <section className="rounded-lg border border-dashed border-line bg-panel/40 p-4">
          <h2 className="text-[13.5px] font-semibold text-ink">The consolidated pack will add</h2>
          <ul className="mt-2 space-y-1 text-[12px] leading-snug text-ink-soft">
            <li>· Consolidated group P&amp;L — monthly, reconciled to the branch ledgers</li>
            <li>· Branch-level margin trajectories (the finance-reported figures in the Operating Platform report)</li>
            <li>· Cash position and working-capital view</li>
            <li>· Budget vs actual, once the FY2027 budget is set</li>
          </ul>
          <p className="mt-3 text-[11px] leading-snug text-ink-faint">
            This platform shows only figures with a live feed behind them. Rather than re-typing finance&apos;s numbers
            here — where they would age the moment they were pasted — this section stays honest about its status until
            the finance feed is connected.
          </p>
        </section>
      </div>
    </main>
  );
}
