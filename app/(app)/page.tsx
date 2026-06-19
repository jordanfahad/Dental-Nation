import { getRangeReport } from '@/lib/report';
import { resolveTab } from '@/components/tabs';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { TabBar } from '@/components/TabBar';
import { DailyControlReport } from '@/components/sections/daily/DailyControlReport';
import { WeeklyReview } from '@/components/sections/weekly/WeeklyReview';
import { CrmReport } from '@/components/sections/crm/CrmReport';
import { ExecutiveDashboard } from '@/components/sections/executive/ExecutiveDashboard';
import { PractoReport } from '@/components/sections/practo/PractoReport';
import { BookingsReport } from '@/components/sections/bookings/BookingsReport';
import { MarketingReport } from '@/components/sections/marketing/MarketingReport';

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
  }>;
}) {
  const sp = await searchParams;
  const report = await getRangeReport({
    from: sp.from,
    to: sp.to,
    preset: sp.preset,
    compare: sp.compare,
  });
  const tab = resolveTab(sp.tab);

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-6 md:px-8">
      <Header range={report.range} source={report.source} />
      <TabBar />

      {tab === 'executive' ? <ExecutiveDashboard /> : null}
      {tab === 'daily' ? <DailyControlReport reportDate={sp.from} /> : null}
      {tab === 'weekly' ? <WeeklyReview weekOf={sp.from} /> : null}
      {tab === 'crm' ? (
        <CrmReport range={{ from: report.range.from, to: report.range.to }} />
      ) : null}
      {tab === 'practo' ? <PractoReport /> : null}
      {tab === 'bookings' ? <BookingsReport /> : null}
      {tab === 'marketing' ? <MarketingReport sub={sp.mtab} /> : null}

      <Footer ingestion={report.ingestion} />
    </main>
  );
}
