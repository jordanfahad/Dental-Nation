import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { bumpShareView, resolveShareToken } from '@/lib/board/shareLinks';
import { RoomSectionBar } from '@/components/room/EvidenceRoom';
import { MarketingPerformance } from '@/components/sections/opsreport/MarketingPerformance';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export const metadata: Metadata = {
  title: 'Dental Nation | Marketing performance, 2025 and 2026',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

/** Internal room links use the same access gate as the live dashboard. */
export default async function RoomMarketingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await resolveShareToken(token, 'room');
  if (!link) notFound();
  if (link.sections?.dash === false) notFound();
  await bumpShareView(token);

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-8 sm:py-8">
      <RoomSectionBar
        backHref={`/share/room/${token}`}
        section="Marketing performance"
        active="marketing"
        showMarketing
      />
      <MarketingPerformance />
    </main>
  );
}
