import { getSupabaseAdmin } from '@/lib/supabase/server';
import { dubaiDay } from '@/lib/gbp/plan';
import { readSnapshot } from '@/lib/projects/snapshot';
import { PreviewShell } from '@/components/next/PreviewShell';
import { ProjectsView } from '@/components/next/projects/ProjectsView';

/**
 * Projects home (Ms Shadi, 12 and 14 Nov 2026) at /next/projects: every
 * project on one screen, each linking to its own page (/next/projects/<key>).
 * Same read as the 09:00 daily snapshot email (lib/projects/snapshot.ts). Behind the
 * password gate like every other route.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export default async function NextProjectsPage() {
  const db = getSupabaseAdmin();
  if (!db) {
    return (
      <PreviewShell active="Projects">
        <p className="mx-auto my-6 max-w-[1440px] px-4 text-sm text-dn-navy sm:px-8">The database is not configured, so the projects cannot be read.</p>
      </PreviewShell>
    );
  }
  const data = await readSnapshot(db, dubaiDay());
  return (
    <PreviewShell active="Projects">
      <main className="mx-auto max-w-[1440px] px-4 pb-6 pt-6 sm:px-8 sm:pt-7">
        <ProjectsView data={data} />
      </main>
    </PreviewShell>
  );
}
