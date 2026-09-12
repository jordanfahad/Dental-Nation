import { readFile } from 'fs/promises';
import path from 'path';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentRole } from '@/lib/auth/role';
import { canSeeGrowthProjects } from '@/lib/auth/session';
import { Markdown } from '@/components/docs/Markdown';
import { ZavisGraphVisuals } from '@/components/docs/ZavisGraphVisuals';

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
        <p className="eyebrow text-accent">Growth Projects · ZAVIS</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink">
          Dental Nation Marketing Knowledge Graph
        </h1>
        <p className="mt-1 max-w-[680px] text-[12.5px] leading-snug text-ink-soft">
          The complete ZAVIS knowledge base of the marketing system — platforms, channels, assets, campaigns,
          strategies and their relationships. Prepared by ZAVIS, 11 September 2026.
        </p>
        <p className="mt-2 text-[11px] text-ink-faint">
          <Link href="/impact" className="text-accent underline-offset-2 hover:underline">← Back to Growth Projects</Link>
        </p>
      </header>
      <ZavisGraphVisuals />
      <details className="mt-8 rounded-card border border-line bg-panel/30 p-4">
        <summary className="cursor-pointer text-[13px] font-semibold text-ink">
          Full source document — ontology, every node and relationship, constraints, open questions
        </summary>
        <div className="mt-3"><Markdown source={source} /></div>
      </details>
    </main>
  );
}
