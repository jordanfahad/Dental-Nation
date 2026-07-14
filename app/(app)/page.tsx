import { Suspense } from 'react';
import { getRangeReport } from '@/lib/report';
import { resolveTab } from '@/components/tabs';
import { resolveClinic } from '@/config/clinics';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { TabBar } from '@/components/TabBar';
import { ClinicFilter } from '@/components/ClinicFilter';
import { TabSkeleton } from '@/components/TabSkeleton';
import { DailyControlReport } from '@/components/sections/daily/DailyControlReport';
import { WeeklyReview } from '@/components/sections/weekly/WeeklyReview';
import { CrmReport } from '@/components/sections/crm/CrmReport';
import { ExecutiveDashboard } from '@/components/sections/executive/ExecutiveDashboard';
import { PractoReport } from '@/components/sections/practo/PractoReport';
import { BookingsReport } from '@/components/sections/bookings/BookingsReport';
import { ArabyAdsReport } from '@/components/sections/arabyads/ArabyAdsReport';
import { MarketingReport } from '@/components/sections/marketing/MarketingReport';
import { GoogleAnalyticsReport } from '@/components/sections/analytics/GoogleAnalyticsReport';
import { ClarityReport } from '@/components/sections/clarity/ClarityReport';

export const dynamic = 'force-dynamic';
// The Marketing deep-dive sub-tabs make several live Meta/Google ad-API calls;
// give the function headroom beyond the 10s default so they never truncate.
export const maxDuration = 60;

/**
 * The single server-rendered route. Reads searchParams (from/to/preset/compare/
 * tab), assembles the range-aware report once (for the Header date control + sync
 * footer), then renders the active tab:
 *  - daily  → the canonical Daily Control Report (§A–G) for the selected date
 *  - weekly → the Weekly All Lanes Performance Review (§A–E), 7-day window
 * The selected daily report date is `?from` (a single day); default = latest.
 * For weekly, `?from` anchors the week's end (default = latest data date).
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    preset?: string;
    compare?: string;
    tab?: string;
    mtab?: string;
    clinic?: string;
  }>;
}) {
  const sp = await searchParams;
  // Lightweight SHELL read: range control + sync footer only. It skips the live
  // GA4 fetch (the shell never shows GA4) so the header, tab bar and footer paint
  // fast on every tab click. The active tab's own (heavier) data streams in below
  // behind a <Suspense> boundary, so navigation is never blocked on it.
  const shell = await getRangeReport({
    from: sp.from,
    to: sp.to,
    preset: sp.preset,
    compare: sp.compare,
    skipGa4: true,
  });
  const tab = resolveTab(sp.tab);
  const clinic = resolveClinic(sp.clinic);
  const query = { from: sp.from, to: sp.to, preset: sp.preset, compare: sp.compare, clinic };
  const range = { from: shell.range.from, to: shell.range.to };
  // Clinic-aware tabs: Executive / CRM / Practo split by clinic. Acquisition
  // tabs (bookings/araby/marketing/analytics) are shared across both clinics.
  const clinicAware = tab === 'executive' || tab === 'crm' || tab === 'practo';

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-6 md:px-8">
      <Header range={shell.range} source={shell.source} />
      <TabBar />
      {clinicAware ? <ClinicFilter active={clinic} /> : null}

      {/* Stream the active tab. Keying on tab+params re-arms the boundary on
          navigation so the skeleton shows immediately instead of the shell
          hanging on the tab's data. */}
      <Suspense
        key={`${tab}|${sp.tab ?? ''}|${sp.from ?? ''}|${sp.to ?? ''}|${sp.preset ?? ''}|${sp.compare ?? ''}|${sp.mtab ?? ''}|${clinic}`}
        fallback={<TabSkeleton />}
      >
        {tab === 'executive' ? <ExecutiveDashboard query={query} /> : null}
        {tab === 'daily' ? <DailyControlReport reportDate={sp.from} /> : null}
        {tab === 'weekly' ? <WeeklyReview weekOf={sp.from} /> : null}
        {tab === 'crm' ? <CrmReport range={{ ...range, clinic }} /> : null}
        {tab === 'practo' ? <PractoReport range={{ ...range, clinic }} /> : null}
        {tab === 'bookings' ? <BookingsReport report={shell} /> : null}
        {tab === 'arabyads' ? <ArabyAdsReport range={range} /> : null}
        {tab === 'marketing' ? <MarketingReport sub={sp.mtab} /> : null}
        {tab === 'analytics' ? <GoogleAnalyticsReport /> : null}
        {tab === 'clarity' ? <ClarityReport /> : null}
      </Suspense>

      <Footer ingestion={shell.ingestion} />
    </main>
  );
}
