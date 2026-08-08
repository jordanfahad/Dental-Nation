import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { bumpShareView, resolveShareToken } from '@/lib/board/shareLinks';
import { OpsReport } from '@/components/sections/opsreport/OpsReport';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const metadata: Metadata = {
  title: 'Dental Nation — Operating Platform Report',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

/**
 * The operations report, shared by token — no login.
 *
 * Same pattern as the board link: the uuid IS the credential, validated
 * server-side on every request and scoped to `operations`; revoking the link
 * kills the page instantly. Two kinds of link, decided at mint time:
 *
 *  · read-only (the default) — `editable` false, no form in the tree;
 *  · EDITOR — minted with can_edit for the Operations Director. The same page
 *    renders with the edit controls, every form carries the token, and every
 *    mutation re-validates it server-side. She opens the link, edits, and a
 *    refresh shows the change everywhere — no login involved. Revoking the
 *    link ends its editing on the next request.
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
      <OpsReport editable={link.canEdit} editorName={link.canEdit ? link.label : null} editToken={link.canEdit ? token : null} />
      <p className="mt-4 text-center text-[10px] text-ink-ghost">
        Prepared for {link.label}
        {link.canEdit ? ' · editor link — keep it private' : ''}
      </p>
    </main>
  );
}
