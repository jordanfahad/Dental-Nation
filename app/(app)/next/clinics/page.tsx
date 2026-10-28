import { getSupabaseAdmin } from '@/lib/supabase/server';
import { dubaiDay } from '@/lib/gbp/plan';
import { readClinics } from '@/lib/overview/clinics';
import { PreviewShell } from '@/components/next/PreviewShell';
import { ClinicsView } from '@/components/next/clinics/ClinicsView';
import { ProofDrawer } from '@/components/next/ProofDrawer';

/**
 * DN-032 preview: the Clinics page (mockup 03), on live figures, at
 * /next/clinics. Linked from the preview's own nav (PreviewShell); nothing
 * outside the /next preview links here, and the password gate
 * (middleware.ts) covers it like every other route. Every figure comes
 * from the readers behind the existing surfaces (lib/overview/clinics.ts), so
 * this page can never disagree with them.
 */
export const dynamic = 'force-dynamic';
// The read fans out over the email reader's sources plus the Growth report
// per clinic lens - give it the same headroom as the Overview preview rather
// than the 60s default.
export const maxDuration = 120;

export default async function NextClinicsPage() {
  const data = await readClinics(getSupabaseAdmin(), dubaiDay());
  return (
    <PreviewShell active="Clinics">
      <ClinicsView data={data} />
      <ProofDrawer />
    </PreviewShell>
  );
}
