import type { Metadata } from 'next';
import Link from 'next/link';
import { CommandDeck } from '@/components/deck/CommandDeck';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const metadata: Metadata = {
  title: 'Dental Nation — Growth Department Investor Report',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

/**
 * Internal preview of the Command Deck — exactly what a board link renders,
 * behind the dashboard password gate. Use it to check a window before issuing
 * a link; mint and revoke the links themselves on /reports/board.
 */
export default async function DeckPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  return (
    <main className="mx-auto max-w-[1240px] px-4 py-7 sm:px-8 sm:py-10">
      <p className="no-print mb-4 rounded-card border border-dashed border-line px-3 py-2 text-[11.5px] text-ink-soft">
        Internal preview — this is exactly what a board link shows.{' '}
        <Link href="/reports/board" className="font-medium text-accent underline-offset-2 hover:underline">
          Create or revoke board links →
        </Link>
      </p>
      <CommandDeck searchParams={sp} basePath="/reports/deck" recipientLabel="internal preview" />
    </main>
  );
}
