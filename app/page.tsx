import { getRangeReport } from '@/lib/report';
import { resolveTab } from '@/components/TabBar';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { TabBar } from '@/components/TabBar';
import { ExecutiveTab } from '@/components/sections/range/ExecutiveTab';
import { PaidTab } from '@/components/sections/range/PaidTab';
import { WebsiteTab } from '@/components/sections/range/WebsiteTab';
import { InquiriesTab } from '@/components/sections/range/InquiriesTab';
import { BookingsTab } from '@/components/sections/range/BookingsTab';

export const dynamic = 'force-dynamic';

/**
 * The single server-rendered route. Reads searchParams (from/to/preset/compare/
 * tab), assembles the range-aware report once, then renders only the active
 * tab's content. Navigating (presets, custom range, compare toggle, tabs) just
 * changes the params — the whole page re-renders server-side.
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

      {tab === 'executive' ? <ExecutiveTab report={report} /> : null}
      {tab === 'paid' ? <PaidTab report={report} /> : null}
      {tab === 'website' ? <WebsiteTab report={report} /> : null}
      {tab === 'inquiries' ? <InquiriesTab report={report} /> : null}
      {tab === 'bookings' ? <BookingsTab report={report} /> : null}

      <Footer ingestion={report.ingestion} />
    </main>
  );
}
