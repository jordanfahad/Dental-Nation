import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { bumpShareView, resolveShareToken } from '@/lib/board/shareLinks';
import { EvidenceRoom } from '@/components/room/EvidenceRoom';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const metadata: Metadata = {
  title: 'Dental Nation — Investor Evidence Room',
  description: 'The Dental Nation Investor Evidence Room — live reports across growth, operations and finance.',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

/**
 * The Investor Evidence Room — one token, every report (Mr Akbar's blueprint).
 *
 * The landing page is navigation and narrative; every section behind it is a
 * live report rendered under THIS route tree with THIS token as the
 * credential, validated per request. Revoking the room link closes the whole
 * room at once, without touching any board or operations link issued
 * separately.
 */
export default async function EvidenceRoomPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await resolveShareToken(token, 'room');
  if (!link) notFound();
  await bumpShareView(token);

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-7 sm:px-8 sm:py-9">
      <EvidenceRoom base={`/share/room/${token}`} />
    </main>
  );
}
