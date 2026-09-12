import { readFile } from 'fs/promises';
import path from 'path';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentRole } from '@/lib/auth/role';
import { canSeeGrowthProjects } from '@/lib/auth/session';
import { Breadcrumbs } from '@/components/docs/Breadcrumbs';
import { Markdown } from '@/components/docs/Markdown';
import { ZavisKnowHowApp } from '@/components/docs/zavis/ZavisKnowHowApp';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'ZAVIS — Marketing Knowledge Graph' };

/**
 * The full ZAVIS marketing knowledge base — every platform, channel, asset,
 * campaign and strategy in the Dental Nation marketing system, structured as
 * a knowledge graph source document. Lives under Growth Projects (/impact)
 * with the same access rule as the rest of that dashboard.
 */
export default async function ZavisKnowHowPage() {
  const role = await currentRole();
  if (!canSeeGrowthProjects(role)) redirect('/');
  const source = await readFile(
    path.join(process.cwd(), 'content', 'zavis-marketing-knowledge-graph.md'),
    'utf8',
  );
  return (
    <main className="mx-auto max-w-[880px] px-4 py-6 md:px-8">
      <header className="mb-4 border-b border-line pb-4">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/' },
            { label: 'Growth Projects', href: '/impact' },
            { label: 'ZAVIS Knowledge Graph' },
          ]}
        />
        <p className="eyebrow text-accent">Growth Projects · ZAVIS</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink">
          Dental Nation Marketing Knowledge Graph
        </h1>
        <p className="mt-1 max-w-[680px] text-[12.5px] leading-snug text-ink-soft">
          The ZAVIS Marketing OS — the platform suite with live links and delivery status, the automated
          segment-to-broadcast loop, the paid and organic lead engines, the programmatic SEO factory and the pilot
          plan. Knowledge graph prepared by ZAVIS 11 Sep 2026; delivery status updated 12 Sep 2026.
        </p>
      </header>
      <ZavisKnowHowApp />
      <details className="mt-8 rounded-card border border-line bg-panel/30 p-4">
        <summary className="cursor-pointer text-[13px] font-semibold text-ink">
          Full source document — ontology, every node and relationship, constraints, open questions
        </summary>
        <div className="mt-3"><Markdown source={source} /></div>
      </details>
    </main>
  );
}
