import { getExecutiveReport } from '@/lib/executive/report';
import { ExecHero } from './ExecHero';
import { ExecKpiBand } from './ExecKpiBand';
import { ExecPipeline } from './ExecPipeline';
import { ExecMonthlyTrend } from './ExecMonthlyTrend';
import { ExecMixRow } from './ExecMixRow';
import { ExecRevenueDeepDive } from './ExecRevenueDeepDive';
import { ExecWebsite } from './ExecWebsite';
import { ExecOperations } from './ExecOperations';
import { ExecClosing } from './ExecClosing';

/**
 * Executive Dashboard — the investor-grade hero tab. An async server component
 * that reads the all-source executive report and composes it into a dense,
 * chart-heavy landing page: from ad spend through website, leads, CRM/AI booking
 * and clinic revenue. Honest by construction — every unsourced metric renders an
 * explicit owned data gap (never a fabricated 0), so the page renders fully in
 * both the live and mock/empty states.
 */
export async function ExecutiveDashboard() {
  const report = await getExecutiveReport();

  return (
    <div className="space-y-5">
      <ExecHero report={report} />
      <ExecKpiBand report={report} />
      <ExecPipeline report={report} />
      <ExecMonthlyTrend report={report} />
      <ExecMixRow report={report} />
      <ExecRevenueDeepDive report={report} />
      <ExecWebsite report={report} />
      <ExecOperations report={report} />
      <ExecClosing report={report} />
    </div>
  );
}
