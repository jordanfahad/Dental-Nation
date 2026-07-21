import { Suspense } from 'react';
import { getRangeReport } from '@/lib/report';
import { effectiveVisibleTabs, resolveTabInSet } from '@/components/tabs';
import { currentUser } from '@/lib/auth/role';
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
import { SocialReport } from '@/components/sections/social/SocialReport';
import { GoogleAnalyticsReport } from '@/components/sections/analytics/GoogleAnalyticsReport';
import { ClarityReport } from '@/components/sections/clarity/ClarityReport';
import { StatusReport } from '@/components/sections/status/StatusReport';
import { ClinicalOps } from '@/components/sections/ops/ClinicalOps';
import { BoardReport } from '@/components/sections/report/BoardReport';
import { DigitalSeo } from '@/components/sections/digital/DigitalSeo';
import { GroupRevenue } from '@/components/sections/clinics/GroupRevenue';
import { UserManagement } from '@/components/sections/users/UserManagement';

export const dynamic = 'force-dynamic';
// The Marketing deep-dive sub-tabs make several live Meta/Google ad-API calls,
// and the "Refresh now" server action runs the full sync (~60–70s, like the
// cron) from this route — so give it the same headroom as /api/cron/sync (300s)
// rather than the 60s that was killing the manual refresh mid-run.
export const maxDuration = 300;

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
    btab?: string;
    ptab?: string;
    gtab?: string;
    rdate?: string;
    rcad?: string;
    rcmp?: string;
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
  const me = await currentUser();
  const role = me?.role ?? null;
  const isAdmin = role === 'admin';
  // Per-user access: base role's tabs, plus any individual grants / removals from
  // the Users directory. The active tab resolves within THAT effective set.
  const visibleTabs = effectiveVisibleTabs(role, me?.extraTabs, me?.removedTabs);
  const tab = resolveTabInSet(sp.tab, visibleTabs, role);
  const clinic = resolveClinic(sp.clinic);
  const query = { from: sp.from, to: sp.to, preset: sp.preset, compare: sp.compare, clinic };
  const range = { from: shell.range.from, to: shell.range.to };
  // Clinic-aware tabs: Executive / CRM / Practo split by clinic. Acquisition
  // tabs (bookings/araby/marketing/analytics) are shared across both clinics.
  const clinicAware = tab === 'executive' || tab === 'crm' || tab === 'practo';

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-6 md:px-8">
      <Header range={shell.range} source={shell.source} />
      <TabBar role={role} visibleTabs={visibleTabs} />
      {clinicAware ? <ClinicFilter active={clinic} /> : null}

      {/* Stream the active tab. Keying on tab+params re-arms the boundary on
          navigation so the skeleton shows immediately instead of the shell
          hanging on the tab's data. */}
      <Suspense
        key={`${tab}|${sp.tab ?? ''}|${sp.from ?? ''}|${sp.to ?? ''}|${sp.preset ?? ''}|${sp.compare ?? ''}|${sp.mtab ?? ''}|${sp.btab ?? ''}|${sp.ptab ?? ''}|${sp.gtab ?? ''}|${sp.rdate ?? ''}|${sp.rcad ?? ''}|${sp.rcmp ?? ''}|${clinic}`}
        fallback={<TabSkeleton />}
      >
        {tab === 'executive' ? <ExecutiveDashboard query={query} /> : null}
        {tab === 'clinical-ops' ? <ClinicalOps range={range} /> : null}
        {tab === 'daily' ? <DailyControlReport reportDate={sp.from} /> : null}
        {tab === 'weekly' ? <WeeklyReview weekOf={sp.from} /> : null}
        {tab === 'crm' ? <CrmReport range={{ ...range, clinic }} /> : null}
        {tab === 'practo' ? <PractoReport range={{ ...range, clinic }} sub={sp.ptab} /> : null}
        {tab === 'bookings' ? <BookingsReport report={shell} sub={sp.btab} /> : null}
        {tab === 'arabyads' ? <ArabyAdsReport range={range} /> : null}
        {tab === 'marketing' ? <MarketingReport sub={sp.mtab} range={range} /> : null}
        {tab === 'social' ? <SocialReport range={range} /> : null}
        {tab === 'analytics' ? <GoogleAnalyticsReport range={range} /> : null}
        {tab === 'digital' ? <DigitalSeo range={range} /> : null}
        {tab === 'clarity' ? <ClarityReport /> : null}
        {/* Group Revenue + Board Report are grantable per-user: resolveTabInSet
            already restricts `tab` to the viewer's effective set, so membership
            alone gates them (no extra isAdmin check). Status + Users stay hard
            admin-only (ungrantable — see UNGRANTABLE_TABS). */}
        {tab === 'group' ? (
          <GroupRevenue range={{ from: shell.range.from, to: shell.range.to, preset: shell.range.preset }} sub={sp.gtab} />
        ) : null}
        {tab === 'report' ? <BoardReport date={sp.rdate} cadence={sp.rcad} compare={sp.rcmp === '1'} clinic={clinic} /> : null}
        {tab === 'status' && isAdmin ? <StatusReport /> : null}
        {tab === 'users' && isAdmin ? <UserManagement /> : null}
      </Suspense>

      <Footer ingestion={shell.ingestion} />
    </main>
  );
}
