import type { Metadata } from 'next';
import { PreviewShell } from '@/components/next/PreviewShell';
import { ExitHandoverView } from '@/components/next/handover/ExitHandoverView';

/**
 * Fahad's exit handover at /next/handover. Behind the password gate like
 * every other route. Static content from config/exit-handover.ts.
 */
export const metadata: Metadata = {
  title: 'Exit Handover',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

export default function NextHandoverPage() {
  return (
    <PreviewShell active="Projects">
      <main className="mx-auto max-w-[1100px] px-4 pb-6 pt-6 sm:px-8 sm:pt-7">
        <ExitHandoverView />
      </main>
    </PreviewShell>
  );
}
