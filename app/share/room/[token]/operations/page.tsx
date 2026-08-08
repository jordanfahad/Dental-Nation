import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { bumpShareView, resolveShareToken } from '@/lib/board/shareLinks';
import { OpsReport } from '@/components/sections/opsreport/OpsReport';
import { RoomSectionBar } from '@/components/room/EvidenceRoom';
import { PlatformModelBlock } from '@/components/room/PlatformModel';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const metadata: Metadata = {
  title: 'Dental Nation — Operating Platform',
  description: 'Operating Platform report — the Dental Nation operating model, live.',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

/** The operations report, read-only, opened from the Evidence Room. */
export default async function RoomOperationsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await resolveShareToken(token, 'room');
  if (!link) notFound();
  await bumpShareView(token);

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-8 sm:py-8">
      <RoomSectionBar backHref={`/share/room/${token}`} section="Operating Platform reports" />

      {/* The section as the blueprint frames it: the platform model first
          (one-page summary, evolution infographic, comparison), then the
          LIVE operating report as its evidence. */}
      <h1 className="text-[20px] font-semibold text-ink">Operating Platform reports</h1>
      <p className="mb-5 mt-1 max-w-[820px] text-[12px] leading-snug text-ink-soft">
        The operating model, and the live report that proves it is running. The narrative below is the platform
        blueprint; the report that follows is maintained live by the Operations Director.
      </p>
      <PlatformModelBlock />

      <div className="my-8 border-t border-line" />

      <OpsReport editable={false} />
    </main>
  );
}
