import { loadTracker } from '@/lib/smileclub/tracker';
import { SmileClubOptimization } from '@/components/sections/smileclub/SmileClubOptimization';

/** Server entry for the Smile Club plan: loads live task progress, then renders the client plan. */
export async function SmileClubPlan() {
  const tracker = await loadTracker();
  return <SmileClubOptimization tracker={tracker} />;
}
