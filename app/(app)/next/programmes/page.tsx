import { getSupabaseAdmin } from '@/lib/supabase/server';
import { dubaiDay } from '@/lib/gbp/plan';
import { parseRange, rangeParams } from '@/lib/overview/range';
import { readProgrammes } from '@/lib/overview/programmes';
import { PreviewShell } from '@/components/next/PreviewShell';
import { ProgrammesView } from '@/components/next/programmes/ProgrammesView';
import { ProofDrawer } from '@/components/next/ProofDrawer';

/**
 * DN-032 preview: the Programmes page (mockup 04), on live figures, at
 * /next/programmes. Linked from the preview's own nav (PreviewShell);
 * nothing outside the /next preview links here, and the password gate
 * (middleware.ts) covers it like every other route. Every figure comes
 * from the readers behind the 09:00 DN Ortho and Smile Club emails
 * (lib/overview/programmes.ts), so this page can never disagree with them.
 */
// ?from=&to= (YYYY-MM-DD) or ?preset= picks the dates (lib/overview/range.ts);
// nothing given means month to yesterday.
export const dynamic = 'force-dynamic';
// The read fans out over the two email readers' sources (Google Ads rows,
// Practo bills, Growth windows per clinic, the Smile Club tracker) - give it
// the same headroom as the other previews rather than the 60s default.
export const maxDuration = 120;

export default async function NextProgrammesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[]; to?: string | string[]; preset?: string | string[] }>;
}) {
  const today = dubaiDay();
  const range = parseRange(await searchParams, today);
  const data = await readProgrammes(getSupabaseAdmin(), today, range);
  return (
    <PreviewShell active="Programmes" rangeParams={rangeParams(range)}>
      <ProgrammesView data={data} range={range} />
      <ProofDrawer />
    </PreviewShell>
  );
}
