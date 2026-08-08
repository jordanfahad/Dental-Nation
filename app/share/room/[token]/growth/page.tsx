import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { bumpShareView, resolveShareToken } from '@/lib/board/shareLinks';
import { CommandDeck } from '@/components/deck/CommandDeck';
import { RoomSectionBar } from '@/components/room/EvidenceRoom';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const metadata: Metadata = {
  title: 'Dental Nation — Growth Department Investor Report',
  description: 'Growth Department Investor Report — live performance dashboard.',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

/** The Growth Department Investor Report, opened from the Evidence Room. */
export default async function RoomGrowthPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const { token } = await params;
  const link = await resolveShareToken(token, 'room');
  if (!link) notFound();
  await bumpShareView(token);
  const sp = await searchParams;
  const base = `/share/room/${token}`;

  return (
    <main className="mx-auto max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8">
      <RoomSectionBar backHref={base} section="Growth Department Live Dashboard" />
      <CommandDeck
        searchParams={sp}
        basePath={`${base}/growth`}
        recipientLabel={link.label}
        dashBasePath={`${base}/dash`}
      />
    </main>
  );
}
