import { getWeeklyReport } from '@/lib/report';
import { prepareWeekly } from './prepare';
import { SectionAExecutive } from './SectionAExecutive';
import { SectionBChannels } from './SectionBChannels';
import { SectionCFunnel } from './SectionCFunnel';
import { SectionDLearning } from './SectionDLearning';
import { SectionEActions } from './SectionEActions';

/**
 * The Weekly All Lanes Performance Review (§A–E). A server component: it reads
 * the weekly range report directly (7-day window + prior-week comparison) and
 * renders the five sections in order. Every field with no real source is an
 * explicit, owned data gap (§ honesty) — never a fabricated 0.
 *
 * The week defaults to the last 7 days ending at the latest data date. Pass a
 * YYYY-MM-DD `weekOf` (e.g. from ?from=) to anchor a different week's end.
 */
export async function WeeklyReview({ weekOf }: { weekOf?: string }) {
  const report = await getWeeklyReport(weekOf);
  const model = prepareWeekly(report);

  return (
    <div className="space-y-5">
      <SectionAExecutive report={report} model={model} />
      <SectionBChannels model={model} />
      <SectionCFunnel report={report} model={model} />
      <SectionDLearning report={report} model={model} />
      <SectionEActions report={report} model={model} />
    </div>
  );
}
