import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { bumpShareView, resolveShareToken } from '@/lib/board/shareLinks';
import { TokenDashboard, type DashSearchParams } from '@/components/share/TokenDashboard';
import { RoomSectionBar } from '@/components/room/EvidenceRoom';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export const metadata: Metadata = {
  title: 'Dental Nation — Live Dashboard',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

/** The live dashboard behind an Evidence Room token — same allowlist as the board dash. */
export default async function RoomDashPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<DashSearchParams>;
}) {
  const { token } = await params;
  const link = await resolveShareToken(token, 'room');
  if (!link) notFound();
  await bumpShareView(token);
  const sp = await searchParams;
  return (
    <TokenDashboard
      link={link}
      sp={sp}
      dashBase={`/share/room/${token}/dash`}
      backHref={`/share/room/${token}/growth`}
      backLabel="Back to the Growth report"
      roomNav={<RoomSectionBar backHref={`/share/room/${token}`} section="Live dashboard" />}
    />
  );
}
