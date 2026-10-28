import { getSupabaseAdmin } from '@/lib/supabase/server';
import { dubaiDay } from '@/lib/gbp/plan';
import { resolveClinic } from '@/config/clinics';
import { readOverview } from '@/lib/overview/read';
import { PreviewShell } from '@/components/next/PreviewShell';
import { OverviewView } from '@/components/next/OverviewView';
import { ProofDrawer } from '@/components/next/ProofDrawer';

/**
 * DN-032 preview: the new leadership Overview with a proof drawer, on live
 * figures, at /next. Reachable only by people who have the link - it is in no
 * nav, tab list or menu, and the password gate (middleware.ts) covers it like
 * every other route. Every figure comes from the same readers as the 09:00
 * emails (lib/overview/read.ts), so this page can never disagree with them.
 * ?clinic=all|dental-nation|dr-tosun|al-maher only moves the clinic lens.
 */
export const dynamic = 'force-dynamic';
// The read fans out over the same sources as the 09:00 email (Growth windows,
// Practo, ad spend, reviews, Search Console with its own 8s cap) - give it the
// same headroom as other heavy reads rather than the 60s default.
export const maxDuration = 120;

export default async function NextPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ clinic?: string | string[] }>;
}) {
  const params = await searchParams;
  // A repeated ?clinic= arrives as an array; anything but a known single value means 'all'.
  const clinic = resolveClinic(typeof params.clinic === 'string' ? params.clinic : undefined);
  const data = await readOverview(getSupabaseAdmin(), dubaiDay());
  return (
    <PreviewShell>
      <OverviewView data={data} clinic={clinic} />
      <ProofDrawer />
    </PreviewShell>
  );
}
