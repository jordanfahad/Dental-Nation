import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { bumpShareView, resolveShareToken } from '@/lib/board/shareLinks';
import { BoardReport } from '@/components/board/BoardReport';

export const dynamic = 'force-dynamic';
// Both parts plus the aggregate reads; give it headroom like the other reports.
export const maxDuration = 60;

export const metadata: Metadata = {
  title: 'Dental Nation — Growth Report',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

/**
 * Deliverable B — the board share view (spec §2).
 *
 * Public, no login: the uuid token is the credential, validated server-side on
 * every request and scoped to `growth`. Strictly read-only — there is no server
 * action, form or mutation reachable from this tree.
 *
 * 🔒 PII: the report renders exclusively from lib/board/metrics.ts, which reads
 * only the aggregate-only views (lane_e.board_daily_kpis / board_monthly_kpis).
 * No patient name, phone number, message body or appointment-level record can
 * reach this route — the data surface it reads has no such column.
 */
export default async function GrowthSharePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const { token } = await params;
  const link = await resolveShareToken(token, 'growth');
  if (!link) notFound();

  await bumpShareView(token);
  const sp = await searchParams;

  return (
    <main className="mx-auto max-w-[1240px] px-4 py-7 sm:px-8 sm:py-10">
      <BoardReport searchParams={sp} basePath={`/share/growth/${token}`} publicView />
    </main>
  );
}
