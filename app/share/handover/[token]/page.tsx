import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { bumpShareView, resolveShareToken } from '@/lib/board/shareLinks';
import { HandoverDoc } from '@/components/board/HandoverDoc';
import { PrintButton } from '@/components/board/PrintButton';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Marketing & Growth — Leave Handover',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

/**
 * Deliverable C — the handover link (spec §3).
 *
 * Public route, no login: the uuid token is the credential and is validated
 * server-side on every request, scoped to `handover`. A board token pasted here
 * 404s, so the two links stay independently revocable.
 *
 * SAFETY: this page performs NO data read beyond the token lookup. The document
 * is static content from config/handover.ts, which carries no patient records
 * and no credentials — so there is nothing here that could leak either.
 */
export default async function HandoverSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const link = await resolveShareToken(token, 'handover');
  if (!link) notFound();

  await bumpShareView(token);

  return (
    <main className="mx-auto max-w-[900px] px-4 py-8 sm:px-8 sm:py-10">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11.5px] text-ink-faint">
          Private link{link.label ? ` · ${link.label}` : ''} · read-only
        </p>
        <PrintButton label="Save as PDF" />
      </div>
      <HandoverDoc />
    </main>
  );
}
