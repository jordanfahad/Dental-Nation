import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { bumpShareView, resolveShareToken } from '@/lib/board/shareLinks';
import { RoomSectionBar } from '@/components/room/EvidenceRoom';
import { FinanceRevenue } from '@/components/sections/clinics/FinanceRevenue';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dental Nation — Financial Reports',
  description: 'Financial reports — status and live figures.',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

/**
 * Financial reports — the finance team's feed is now live (first Data Drop
 * handover, Sep 2026): the 2026 group revenue section renders here from the
 * same lane_e.finance_revenue_monthly the internal dashboard uses, so the room
 * and the dashboard can never disagree. The consolidated-pack items still in
 * preparation stay honestly labelled below — no page pretends to be more than
 * it is.
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
      <p className="mt-1 text-[12px] leading-snug text-ink-soft">
        2026 group revenue below is live from the finance team&apos;s reported figures; the consolidated pack items
        further down remain in preparation.
      </p>

      <div className="mt-5 space-y-4">
        <FinanceRevenue />

        <section className="rounded-lg border border-line bg-card p-4">
          <h2 className="text-[13.5px] font-semibold text-ink">Available live today</h2>
          <ul className="mt-2 space-y-1.5 text-[12px] leading-snug text-ink-soft">
            <li>
              · <span className="font-medium text-ink">Historical clinic revenue</span> (pre-2026 PMS imports), with
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
            This platform shows only figures with a live feed behind them. The 2026 revenue section above is exactly
            that — the finance team&apos;s reported invoice figures, loaded through the group&apos;s data-handover lane
            and reconciled to their workbook. The consolidated-pack items listed here stay honestly labelled until
            their feeds land the same way.
          </p>
        </section>
      </div>
    </main>
  );
}
