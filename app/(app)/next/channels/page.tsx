import { getSupabaseAdmin } from '@/lib/supabase/server';
import { dubaiDay } from '@/lib/gbp/plan';
import { readChannels } from '@/lib/overview/channels';
import { PreviewShell } from '@/components/next/PreviewShell';
import { ChannelsView } from '@/components/next/channels/ChannelsView';
import { ProofDrawer } from '@/components/next/ProofDrawer';

/**
 * DN-032 preview: the Channels page (marketing workspace) with a proof
 * drawer, on live figures, at /next/channels. Linked from the preview's own
 * nav (PreviewShell); nothing outside the /next preview links here, and the
 * password gate (middleware.ts) covers it like every other route. Every figure comes from
 * the same readers as the 09:00 emails (lib/overview/channels.ts), so this
 * page can never disagree with them.
 */
export const dynamic = 'force-dynamic';
// The read fans out over the same sources as the 09:00 emails (Growth
// windows, ad spend, Search Console with its own 8s cap, Google Business
// Profile days) - give it the same headroom as the Overview preview.
export const maxDuration = 120;

export default async function NextChannelsPage() {
  const data = await readChannels(getSupabaseAdmin(), dubaiDay());
  return (
    <PreviewShell active="Channels">
      <ChannelsView data={data} />
      <ProofDrawer />
    </PreviewShell>
  );
}
