import type { Metadata } from 'next';
import { InvestorViewer } from '@/components/investor/InvestorViewer';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dental Nation — How the growth machine works',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

/**
 * PHASE 1 — DESIGN REVIEW ONLY.
 *
 * This route renders the full viewer with SAMPLE DATA so the design can be
 * judged at both breakpoints before any data is wired (spec §10). Two things
 * are deliberately NOT here yet, and both land in Phase 2:
 *
 *   - token validation against report_share_links (scope 'funnel'), and
 *   - the real aggregate views (inv_*).
 *
 * Until then every screen carries the SAMPLE DATA banner, and the token is
 * used only to derive a display label so the per-recipient watermark can be
 * reviewed. No link generated now is a real credential.
 */
export default async function InvestorViewerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Phase 1 only: the token is a label, not a credential. Phase 2 replaces
  // this with a server-side lookup that 404s on unknown/revoked/expired.
  const recipientLabel = decodeURIComponent(token)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 60);

  return <InvestorViewer recipientLabel={recipientLabel || 'Design review'} />;
}
