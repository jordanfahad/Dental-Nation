import { getSupabaseAdmin } from '@/lib/supabase/server';
import { dubaiDay } from '@/lib/gbp/plan';
import { readSnapshot } from '@/lib/projects/snapshot';
import { PreviewShell } from '@/components/next/PreviewShell';
import { ProjectsView } from '@/components/next/projects/ProjectsView';

/**
 * Projects page (Ms Shadi, 12 Nov 2026) at /next/projects: the detail behind
 * the 09:00 daily snapshot email, from the same read (lib/projects/snapshot.ts).
 * Every project's figures against target, bottlenecks and tasks. Behind the
 * password gate like every other route.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export default async function NextProjectsPage() {
  const db = getSupabaseAdmin();
  if (!db) {
    return (
      <PreviewShell active="Projects">
        <p className="my-6 text-sm text-dn-navy">The database is not configured, so the projects cannot be read.</p>
      </PreviewShell>
    );
  }
  const data = await readSnapshot(db, dubaiDay());
  return (
    <PreviewShell active="Projects">
      <ProjectsView data={data} />
    </PreviewShell>
  );
}
