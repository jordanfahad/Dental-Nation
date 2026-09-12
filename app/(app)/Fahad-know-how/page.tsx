import { readFile } from 'fs/promises';
import path from 'path';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Markdown } from '@/components/docs/Markdown';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Fahad Know-How — Operating Model Reference' };

/**
 * Fahad's know-how library — reference documents for the leadership team,
 * behind the dashboard login. First entry: the e-commerce operating model
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
        <p className="eyebrow text-accent">Fahad · Know-How</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink">
          How a large-scale omni-channel retail business runs
        </h1>
        <p className="mt-1 max-w-[680px] text-[12.5px] leading-snug text-ink-soft">
          Reference operating model (Al Tayer Group / Bloomingdale&apos;s case) with a full read-across to a
          multi-clinic dental group — prepared for Mr Akbar. Section 9 is the build specification for the future
          interactive version of this page.
        </p>
        <p className="mt-2 text-[11px] text-ink-faint">
          <Link href="/" className="text-accent underline-offset-2 hover:underline">← Back to dashboard</Link>
        </p>
      </header>
      <Markdown source={source} />
    </main>
  );
}
