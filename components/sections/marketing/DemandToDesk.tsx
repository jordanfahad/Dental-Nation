import { demandRange } from '@/lib/analytics/demandToDesk';
import { getDemandToDesk } from '@/lib/analytics/demandToDesk.server';
import { DemandToDeskView } from './DemandToDeskView';

export async function DemandToDesk({ range }: { range?: { from: string; to: string } }) {
  const report = await getDemandToDesk(demandRange(range));
  return <DemandToDeskView report={report} />;
}
