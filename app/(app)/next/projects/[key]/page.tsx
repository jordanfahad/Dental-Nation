import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { dubaiDay } from '@/lib/gbp/plan';
import { addDaysIso, SMILE_CLUB_COMPANIES, smileClubLink, socialLink } from '@/lib/alerts/links';
import { parseRange, rangeParams, type ViewRange } from '@/lib/overview/range';
import { readActivation } from '@/lib/overview/activation';
import { ORTHO_FROM, readOrthoCreatives, readOrthoDashboard } from '@/lib/ortho/dashboard';
import { isProjectKey, PROJECT_NAMES, readSnapshotParts, type ProjectKey } from '@/lib/projects/snapshot';
import { PreviewShell, type PreviewSection } from '@/components/next/PreviewShell';
import { ProjectHeader, ProjectOverview } from '@/components/next/projects/ProjectsView';
import { GbpGoogleTable } from '@/components/next/projects/GbpGoogleTable';
import { ActivationView } from '@/components/next/activation/ActivationView';
import { OrthoView } from '@/components/next/ortho/OrthoView';
import { ProofDrawer } from '@/components/next/ProofDrawer';

/**
 * One page per project (Ms Shadi, 14 Nov 2026: "each project should have one
 * dedicated section containing all its relevant information"), at
 * /next/projects/<key>. Same order on every page: status, targets and
 * progress, milestones and activities, bottlenecks, then the project's own
 * detailed figures, which used to sit on the Clinic Activation and DN Ortho
 * pages. Status, targets and activities come from the 09:00 snapshot's read
 * (lib/projects/snapshot.ts); the detailed figures from the same readers as
 * the pages they came from, so nothing can disagree.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const NAV: Record<ProjectKey, PreviewSection> = {
  'clinic-activation': 'Clinic Activation', ortho: 'DN Ortho', gbp: 'Google Business Profile', 'smile-club': 'Smile Club',
};

function Detail({ children, sub }: { children: React.ReactNode; sub: string }) {
  return (
    <section id="figures" className="mt-8 min-w-0 scroll-mt-4">
      <p className="m-0 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-dn-navy">4 · Detailed figures</p>
      <h2 className="m-0 mb-1 text-base font-bold tracking-[-0.3px] text-dn-navy sm:text-lg">The figures behind the results</h2>
      <p className="m-0 mb-2 text-xs text-[#617075]">{sub}</p>
      {children}
    </section>
  );
}

export default async function ProjectPage({
  params, searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ from?: string | string[]; to?: string | string[]; preset?: string | string[] }>;
}) {
  const { key } = await params;
  if (!isProjectKey(key)) notFound();
  const db = getSupabaseAdmin();
  if (!db) {
    return (
      <PreviewShell active={NAV[key]}>
        <p className="mx-auto my-6 max-w-[1440px] px-4 text-sm text-dn-navy sm:px-8">The database is not configured, so {PROJECT_NAMES[key]} cannot be read.</p>
      </PreviewShell>
    );
  }
  const today = dubaiDay();
  const parsed = parseRange(await searchParams, today);
  const path = `/next/projects/${key}`;
  const parts = await readSnapshotParts(db, today);
  const p = parts.snapshot.projects.find((x) => x.key === key)!;

  let detail: React.ReactNode;
  if (key === 'ortho') {
    // As the DN Ortho dashboard: with no dates chosen, from the first DN Ortho campaign (1 Sep 2026) to yesterday.
    const range: ViewRange = parsed.preset === 'default' ? { ...parsed, from: ORTHO_FROM, to: addDaysIso(today, -1) } : parsed;
    const [data, creatives] = await Promise.all([readOrthoDashboard(db, range), readOrthoCreatives(db, range)]);
    detail = (
      <Detail sub="Spend, enquiries, appointments, treatment starts and billing, week by week and by segment, and the ads running now.">
        <p className="m-0 mb-2 text-xs">
          <a className="font-semibold text-dn-navy underline" href="/next/calendar">Open the content calendar</a>
        </p>
        <OrthoView data={data} range={range} creatives={creatives} embedPath={path} />
      </Detail>
    );
  } else {
    const activation = parsed.isDefault ? parts.activation : await readActivation(db, today, parsed);
    if (key === 'clinic-activation') {
      detail = (
        <Detail sub="Leads per clinic, and billed revenue per clinic and per doctor, each with its source.">
          <ActivationView data={activation} range={parsed} only={['leads', 'revenue']} embedPath={path} />
        </Detail>
      );
    } else if (key === 'gbp') {
      detail = (
        <Detail sub="Google's own figures per clinic, then the reviews, photos and videos the front office collects.">
          <section className="my-4 min-w-0 rounded-[10px] border border-dn-line bg-white p-4 sm:p-5">
            <p className="m-0 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-dn-navy">Google Business Profile · Google</p>
            <h3 className="m-0 mb-2 text-base font-bold tracking-[-0.3px] text-dn-navy sm:text-lg">Calls, directions, clicks, views and reviews per clinic</h3>
            <GbpGoogleTable data={parts.gbp} href={socialLink('all', parts.snapshot.window)} />
          </section>
          <ActivationView data={activation} range={parsed} only={['gbp']} embedPath={path} />
        </Detail>
      );
    } else {
      detail = (
        <Detail sub="Smile Club enquiries, follow-ups and conversions per clinic.">
          <p className="m-0 mb-2 text-xs">
            <a className="font-semibold text-dn-navy underline" href={SMILE_CLUB_COMPANIES}>Partner companies by stage</a>
            {' · '}
            <a className="font-semibold text-dn-navy underline" href={smileClubLink()}>Smile Club workspace</a>
          </p>
          <ActivationView data={activation} range={parsed} only={['smile-club']} embedPath={path} />
        </Detail>
      );
    }
  }

  return (
    <PreviewShell active={NAV[key]} rangeParams={rangeParams(parsed)}>
      <main className="mx-auto max-w-[1440px] px-4 pb-6 pt-6 sm:px-8 sm:pt-7">
        <ProjectHeader p={p} data={parts.snapshot} />
        <ProjectOverview p={p} today={parts.snapshot.today} tasksRead={parts.snapshot.tasksRead} />
        {detail}
      </main>
      <ProofDrawer />
    </PreviewShell>
  );
}
