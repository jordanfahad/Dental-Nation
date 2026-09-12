import { readFile } from 'fs/promises';
import path from 'path';
import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/docs/Breadcrumbs';
import { Markdown } from '@/components/docs/Markdown';
import { OperatingModelApp } from '@/components/docs/opmodel/OperatingModelApp';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Fahad Know-How — Operating Model Reference' };

/**
 * Fahad's know-how library — reference documents for the leadership team,
 * behind the dashboard login. Nested under the interactive system map at /Fahad-know-how. This entry: the e-commerce operating model
 * (Al Tayer / Bloomingdale's reference case) with its read-across to a
 * multi-clinic dental group. Rendered from content/*.md so the document can
 * be updated without touching components.
 */
export default async function FahadKnowHowPage() {
  const source = await readFile(
    path.join(process.cwd(), 'content', 'fahad-know-how-operating-model.md'),
    'utf8',
  );
  return (
    <main className="mx-auto max-w-[880px] px-4 py-6 md:px-8">
      <header className="mb-4 border-b border-line pb-4">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/' },
            { label: 'Growth Projects', href: '/impact' },
            { label: 'Know-How map', href: '/Fahad-know-how' },
            { label: 'Operating model' },
          ]}
        />
        <p className="eyebrow text-accent">Fahad · Know-How</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink">
          How a large-scale omni-channel retail business runs
        </h1>
        <p className="mt-1 max-w-[680px] text-[12.5px] leading-snug text-ink-soft">
          Interactive reference operating model (Al Tayer Group / Bloomingdale&apos;s case) — prepared for Mr Akbar.
          Explore the structure, hand-offs, cadence and scenarios, then flip the view to see the whole model
          relabelled as a multi-clinic dental group.
        </p>
      </header>
      <OperatingModelApp />
      <details className="mt-8 rounded-card border border-line bg-panel/30 p-4">
        <summary className="cursor-pointer text-[13px] font-semibold text-ink">
          Full source document — department profiles, interaction map, scenarios, RACI
        </summary>
        <div className="mt-3"><Markdown source={source} /></div>
      </details>
    </main>
  );
}
