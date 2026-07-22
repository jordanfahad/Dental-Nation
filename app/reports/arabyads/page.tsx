import { cookies } from 'next/headers';
import { getRangeReport } from '@/lib/report';
import { dubaiDateLabel, dubaiToday } from '@/lib/dates';
import { ARABY_COOKIE, verifyArabyToken } from '@/lib/auth/araby-report';
import { ArabyAdsReport } from '@/components/sections/arabyads/ArabyAdsReport';
import { ArabyLeadStatus } from '@/components/sections/arabyads/ArabyLeadStatus';
import { DateRangeControl } from '@/components/DateRangeControl';
import { ArabyReportLogin } from './ArabyReportLogin';
import { arabyLogout } from './actions';

export const dynamic = 'force-dynamic';
// The report makes live GA4 + booking-widget reads; give it headroom.
export const maxDuration = 60;

/**
 * Standalone, password-gated live view of the Araby Ads lead campaign — a
 * shareable version of the dashboard's Araby Ads tab for the external ads team.
 * Its own gate (verifyArabyToken) means the team sees ONLY this page. Every load
 * is force-dynamic, so the figures are current on each visit / refresh.
 */
export default async function ArabyReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; preset?: string; compare?: string }>;
}) {
  const jar = await cookies();
  if (!(await verifyArabyToken(jar.get(ARABY_COOKIE)?.value))) {
    return <ArabyReportLogin />;
  }

  const sp = await searchParams;
  // The ArabyAds campaign launched 1 Jul 2026, so THIS report defaults to
  // 1 Jul → today (the whole dashboard keeps its own all-time default). The
  // date control still overrides it: once the viewer picks a preset or a custom
  // range, honor that instead of re-injecting the July default.
  const CAMPAIGN_START = '2026-07-01';
  const chosen = Boolean(sp.from || sp.to || sp.preset);
  const shell = await getRangeReport({
    from: chosen ? sp.from : CAMPAIGN_START,
    to: chosen ? sp.to : dubaiToday(),
    preset: chosen ? sp.preset : 'custom',
    compare: sp.compare,
    skipGa4: true,
  });
  const range = { from: shell.range.from, to: shell.range.to };

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-6 md:px-8">
      <header className="no-print flex flex-col gap-3 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow text-accent">Dental Nation · Araby Ads</p>
            <h1 className="text-xl font-semibold tracking-tight text-ink">Live Campaign Report</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="tnum hidden text-[11.5px] text-ink-faint sm:inline">
              {dubaiDateLabel(range.from)} → {dubaiDateLabel(range.to)}
            </span>
            <form action={arabyLogout}>
              <button className="rounded-md border border-line px-3 py-1.5 text-[13px] text-ink-soft transition hover:bg-panel">
                Sign out
              </button>
            </form>
          </div>
        </div>

        <DateRangeControl range={shell.range} basePath="/reports/arabyads" />
      </header>

      <ArabyAdsReport range={range} />

      {/* Lead validation status — from the team's manually-maintained sheet.
          Independent of the date control (it's the full running lead list). */}
      <ArabyLeadStatus />

      <footer className="mt-6 border-t border-line pt-3 text-[11.5px] text-ink-faint">
        Live figures — reload to refresh. Dental Nation · Araby Ads lead campaign.
      </footer>
    </main>
  );
}
