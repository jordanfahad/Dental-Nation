import { getExecutiveReport, type ExecQuery } from '@/lib/executive/report';
import { dubaiDateLabel } from '@/lib/dates';
import { ExecHero } from './ExecHero';
import { ExecKpiBand } from './ExecKpiBand';
import { ExecAcquisition } from './ExecAcquisition';
import { ExecPipeline } from './ExecPipeline';
import { ClinicJourney } from '@/components/sections/shared/ClinicJourney';
import { ExecMonthlyTrend } from './ExecMonthlyTrend';
import { ExecMixRow } from './ExecMixRow';
import { ExecClinicSplit } from './ExecClinicSplit';
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
export async function ExecutiveDashboard({ query }: { query?: ExecQuery }) {
  const report = await getExecutiveReport(query);

  const meta = report.adFreshness;

  return (
    <div className="space-y-5">
      <ExecHero report={report} />
      {meta.metaStale ? (
        <div className="rounded-card border border-watch/40 bg-watch/5 px-4 py-3 text-[12.5px] leading-snug text-ink-soft">
          <span className="font-medium text-watch">Meta spend feed is stale.</span>{' '}
          Meta insights last synced {meta.metaLatest ? dubaiDateLabel(meta.metaLatest) : '—'}
          {meta.googleLatest ? ` (Google is current to ${dubaiDateLabel(meta.googleLatest)})` : ''} — so recent
          windows show Google spend only. Regenerate the Meta access token (system-user, ads_read) and update
          <span className="font-mono text-[11.5px]"> META_ACCESS_TOKEN</span> in Vercel; the next sync backfills.
          <span className="text-ink-faint"> ArabyAds spend is billed separately and isn’t in this figure.</span>
        </div>
      ) : null}
      <ExecKpiBand report={report} />
      <ExecAcquisition report={report} />
      <ExecClinicSplit report={report} />
      <ExecPipeline report={report} />
      <ClinicJourney
        range={report.range}
        clinic={query?.clinic}
        eyebrow="Executive dashboard · patient journey"
      />
      <ExecMonthlyTrend report={report} />
      <ExecMixRow report={report} />
      <ExecRevenueDeepDive report={report} />
      <ExecWebsite report={report} />
      <ExecOperations report={report} />
      <ExecClosing report={report} />
    </div>
  );
}
