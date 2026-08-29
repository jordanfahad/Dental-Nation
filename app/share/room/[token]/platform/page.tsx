import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { bumpShareView, resolveShareToken } from '@/lib/board/shareLinks';
import { RoomSectionBar } from '@/components/room/EvidenceRoom';
import { PlatformHome } from '@/components/room/PlatformLayers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const metadata: Metadata = {
  title: 'Dental Nation — Operating Platform',
  description: 'The Dental Nation operating platform — six layers, live evidence.',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

/** Platform Home — the six-layer navigation (Mr Akbar's link-page blueprint). */
export default async function RoomPlatformPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await resolveShareToken(token, 'room');
  if (!link) notFound();
  await bumpShareView(token);

  const base = `/share/room/${token}`;
  return (
    <main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-8 sm:py-8">
      <RoomSectionBar backHref={base} section="Operating Platform — six layers" active="platform" />
      <PlatformHome base={base} />
    </main>
  );
}
