import { getSupabaseAdmin } from '@/lib/supabase/server';
import { dubaiDay } from '@/lib/gbp/plan';
import { addDaysIso } from '@/lib/alerts/links';
import { parseRange, rangeParams, type ViewRange } from '@/lib/overview/range';
import { ORTHO_FROM, readOrthoDashboard, buildOrthoDashboard } from '@/lib/ortho/dashboard';
import { PreviewShell } from '@/components/next/PreviewShell';
import { OrthoView } from '@/components/next/ortho/OrthoView';
import { ProofDrawer } from '@/components/next/ProofDrawer';

/**
 * DN Ortho dashboard (Dr Luvi, 30 Oct 2026) at /next/ortho, behind the
 * password gate like every other route. Every figure comes from
 * readOrthoDashboard (lib/ortho/dashboard.ts), the read the Monday DN Ortho
 * email uses. With no dates chosen it shows 1 Sep 2026 (the first DN Ortho
 * campaign) to yesterday.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export default async function NextOrthoPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[]; to?: string | string[]; preset?: string | string[] }>;
}) {
  const today = dubaiDay();
  const parsed = parseRange(await searchParams, today);
  const range: ViewRange = parsed.preset === 'default' ? { ...parsed, from: ORTHO_FROM, to: addDaysIso(today, -1) } : parsed;
  const db = getSupabaseAdmin();
  const data = db ? await readOrthoDashboard(db, range) : buildOrthoDashboard(
    { google: null, googleAds: null, meta: null, leads: null, appts: null, firstVisit: null, bills: null }, range,
  );
  return (
    <PreviewShell active="DN Ortho" rangeParams={rangeParams(parsed)}>
      <OrthoView data={data} range={range} />
      <ProofDrawer />
    </PreviewShell>
  );
}
