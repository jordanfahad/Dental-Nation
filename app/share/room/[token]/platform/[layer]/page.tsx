import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { bumpShareView, resolveShareToken } from '@/lib/board/shareLinks';
import { RoomSectionBar } from '@/components/room/EvidenceRoom';
import { LayerPage } from '@/components/room/PlatformLayers';
import { layerBySlug } from '@/config/platform-layers';
import { C } from '@/components/board/design';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const metadata: Metadata = {
  title: 'Dental Nation — Platform Layer',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

/** One platform layer: overview + its capability pages (one page component). */
export default async function RoomPlatformLayerPage({
  params,
}: {
  params: Promise<{ token: string; layer: string }>;
}) {
  const { token, layer: slug } = await params;
  const link = await resolveShareToken(token, 'room');
  if (!link) notFound();
  const layer = layerBySlug(slug);
  if (!layer) notFound();
  await bumpShareView(token);

  const base = `/share/room/${token}`;
  return (
    <main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-8 sm:py-8">
      <RoomSectionBar backHref={base} section={`Platform layer ${layer.n}`} active="platform" />
      <p className="mb-3 text-[11.5px]">
        <Link href={`${base}/platform`} className="font-semibold no-underline" style={{ color: C.navyMid }}>
          ← All six layers
        </Link>
      </p>
      <LayerPage base={base} layer={layer} />
    </main>
  );
}
