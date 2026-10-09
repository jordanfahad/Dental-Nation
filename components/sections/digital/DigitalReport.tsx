import { DigitalSeo } from './DigitalSeo';
import { CompetitorAnalysis } from './CompetitorAnalysis';
import { DigitalSubNav } from './DigitalSubNav';
import { resolveDigitalSub } from './subtabs';

/** Digital & SEO tab: the organic report, and Competitor analysis (added 2 Oct 2026). */
export async function DigitalReport({ range, sub, comp }: { range?: { from?: string; to?: string }; sub?: string; comp?: string }) {
  const active = resolveDigitalSub(sub);
  return (
    <div className="space-y-4">
      <DigitalSubNav active={active} />
      {active === 'competitors' ? <CompetitorAnalysis comp={comp} /> : <DigitalSeo range={range} />}
    </div>
  );
}
