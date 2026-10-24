import { loadTracker } from '@/lib/smileclub/tracker';
import { SmileClubOptimization } from '@/components/sections/smileclub/SmileClubOptimization';

/**
 * Server entry for the Smile Club plan: loads live task progress, then renders the client plan.
 * `initial` opens a panel from a link (?tab=smileclub&sc=team|scripts, used by the 09:00 emails).
 */
export async function SmileClubPlan({ initial }: { initial?: 'team' | 'scripts' } = {}) {
  const tracker = await loadTracker();
  return <SmileClubOptimization tracker={tracker} initial={initial} />;
}
