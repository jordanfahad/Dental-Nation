import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { bumpShareView, resolveShareToken } from '@/lib/board/shareLinks';
import { OpsReport } from '@/components/sections/opsreport/OpsReport';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const metadata: Metadata = {
  title: 'Dental Nation — Head of Operations',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

/**
 * The Head of Operations report, shared by token — no login.
 *
 * Same pattern as the board link: the uuid IS the credential, validated
 * server-side on every request and scoped to `operations`; revoking the link
 * kills the page instantly. Strictly read-only — `editable` is false, so the
 * tree renders no form and imports no action. Content edits made by the
 * Operations Director on the internal tab appear here immediately (the route
 * is force-dynamic).
 *
 * 🔒 PII: the report renders lane_e.ops_report_sections only — narrative
 * content authored by the Operations Office. No patient-level surface is
 * reachable from this tree.
 */
export default async function OperationsSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const link = await resolveShareToken(token, 'operations');
  if (!link) notFound();

  await bumpShareView(token);

  return (
    <main className="mx-auto max-w-[1080px] px-4 py-7 sm:px-8 sm:py-10">
      <OpsReport editable={false} />
      <p className="mt-4 text-center text-[10px] text-ink-ghost">Prepared for {link.label}</p>
    </main>
  );
}
