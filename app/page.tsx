import { getReportView } from '@/lib/data';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ExecutiveSummary } from '@/components/sections/ExecutiveSummary';
import { ChannelActivation } from '@/components/sections/ChannelActivation';
import { TrackingIntegrity } from '@/components/sections/TrackingIntegrity';
import { DailyFunnel } from '@/components/sections/DailyFunnel';
import { WebsiteGa4 } from '@/components/sections/WebsiteGa4';
import { ContentPerformance } from '@/components/sections/ContentPerformance';
import { PacFeedback } from '@/components/sections/PacFeedback';
import { BlockersFixes } from '@/components/sections/BlockersFixes';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const view = await getReportView(date);

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-6 md:px-8">
      <Header
        dates={view.availableDates}
        currentDate={view.snapshot.report_date}
        source={view.source}
      />

      <div className="space-y-5">
        <ExecutiveSummary view={view} />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <ChannelActivation channels={view.channels} />
          <TrackingIntegrity view={view} />
        </div>

        <div className="print-break">
          <DailyFunnel view={view} />
        </div>

        <WebsiteGa4 ga4={view.ga4} />

        <ContentPerformance content={view.content} />
        <PacFeedback pac={view.pac} />
        <BlockersFixes blockers={view.blockers} />
      </div>

      <Footer ingestion={view.ingestion} />
    </main>
  );
}
