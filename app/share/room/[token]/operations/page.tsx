import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { bumpShareView, resolveShareToken } from '@/lib/board/shareLinks';
import { OpsReport } from '@/components/sections/opsreport/OpsReport';
import { RoomSectionBar } from '@/components/room/EvidenceRoom';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const metadata: Metadata = {
  title: 'Dental Nation — Operating Platform',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

/** The Head of Operations report, read-only, opened from the Evidence Room. */
export default async function RoomOperationsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await resolveShareToken(token, 'room');
  if (!link) notFound();
  await bumpShareView(token);

  return (
    <main className="mx-auto max-w-[1080px] px-4 py-6 sm:px-8 sm:py-8">
      <RoomSectionBar backHref={`/share/room/${token}`} section="Operating Platform reports" />
      <OpsReport editable={false} />
      <p className="mt-4 text-center text-[10px] text-ink-ghost">Prepared for {link.label}</p>
    </main>
  );
}
