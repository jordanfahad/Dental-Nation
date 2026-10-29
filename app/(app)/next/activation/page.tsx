import { getSupabaseAdmin } from '@/lib/supabase/server';
import { dubaiDay } from '@/lib/gbp/plan';
import { parseRange, rangeParams } from '@/lib/overview/range';
import { readActivation } from '@/lib/overview/activation';
import { PreviewShell } from '@/components/next/PreviewShell';
import { ActivationView } from '@/components/next/activation/ActivationView';
import { ProofDrawer } from '@/components/next/ProofDrawer';

/**
 * Clinic Activation (Dr Luvi's daily report), on live figures, at
 * /next/activation. Linked from the preview's own nav (PreviewShell) and from
 * the Clinic Activation 09:00 email; the password gate (middleware.ts) covers
 * it like every other route. Every figure comes from readClinicActivation
 * (lib/activation/read.ts), the same read the email uses, so the page and the
 * email can never disagree.
 */
// ?from=&to= (YYYY-MM-DD) or ?preset= picks the dates (lib/overview/range.ts);
// nothing given means month to yesterday.
export const dynamic = 'force-dynamic';
// The read fans out over the lead tracker, the GMB copies, the AMC sheet,
// Practo (eight summaries) and the DN Ortho sources: same headroom as the
// other previews rather than the 60s default.
export const maxDuration = 120;

export default async function NextActivationPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[]; to?: string | string[]; preset?: string | string[] }>;
}) {
  const today = dubaiDay();
  const range = parseRange(await searchParams, today);
  const data = await readActivation(getSupabaseAdmin(), today, range);
  return (
    <PreviewShell active="Clinic Activation" rangeParams={rangeParams(range)}>
      <ActivationView data={data} range={range} />
      <ProofDrawer />
    </PreviewShell>
  );
}
