import { getMarketingPerformance } from '@/lib/opsreport/marketingPerformance';
import { MarketingPerformanceView } from './MarketingPerformanceView';

export async function MarketingPerformance() {
  return <MarketingPerformanceView report={await getMarketingPerformance()} />;
}

export default MarketingPerformance;
