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
import { WidgetHealth } from '@/components/sections/ops/WidgetHealth';
import { GrowthPlatform } from '@/components/sections/growth/GrowthPlatform';

/**
 * Executive Dashboard — the investor-grade hero tab. An async server component
 * that reads the all-source executive report and composes it into a dense,
 * chart-heavy landing page: from ad spend through website, leads, CRM/AI booking
 * and clinic revenue. Honest by construction — every unsourced metric renders an
 * explicit owned data gap (never a fabricated 0), so the page renders fully in
 * both the live and mock/empty states.
 */
export async function ExecutiveDashboard({ query, gclinic }: { query?: ExecQuery; gclinic?: string }) {
  const report = await getExecutiveReport(query);

  const meta = report.adFreshness;

  return (
    <div className="space-y-5">
      <ExecHero report={report} />
      {meta.metaStale ? (
        <div className="rounded-card border border-line bg-panel/40 px-4 py-3 text-[12.5px] leading-snug text-ink-soft">
          <span className="font-medium text-ink">Meta campaigns are paused.</span>{' '}
          No Meta ads have run since {meta.metaLatest ? dubaiDateLabel(meta.metaLatest) : 'late April'} — the Meta
          spend shown is complete, not a stale feed
          {meta.googleLatest ? ` (Google Ads is live and current to ${dubaiDateLabel(meta.googleLatest)})` : ''}.
          If Meta campaigns resume, the access token will likely need renewing before spend syncs again.
          <span className="text-ink-faint"> ArabyAds spend is billed separately and isn’t in this figure.</span>
        </div>
      ) : null}
      <ExecKpiBand report={report} />
      <ExecAcquisition report={report} />

      {/* 🦷⭐ The Dental Nation star — the full Growth Platform mirrored onto
          the CEO's first screen: channel P&L, attribution and phone path, on
          the same date range. The Group tab stays its canonical home. */}
      <GrowthPlatform range={{ from: report.range.from, to: report.range.to }} gclinic={gclinic} />

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

      {/* Can patients actually book online right now? Compact here — status and
          uptime only; the incident log lives where someone acts on it. */}
      <WidgetHealth compact />

      <ExecOperations report={report} />
      <ExecClosing report={report} />
    </div>
  );
}
