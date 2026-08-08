import { headers } from 'next/headers';
import { currentRole } from '@/lib/auth/role';
import { listShareLinks } from '@/lib/board/shareLinks';
import { getManualMetrics, type ManualMetric } from '@/lib/board/metrics';
import { BoardReport } from '@/components/board/BoardReport';
import { ShareAdmin } from '@/components/board/ShareAdmin';
import { ManualMetricsForm } from '@/components/board/ManualMetricsForm';
import { HandoverDoc } from '@/components/board/HandoverDoc';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Deliverable A — the internal Growth Report, plus the admin controls for both
 * share links (spec §1, and the admin surface for §2/§3).
 *
 * NOTE ON ROUTING: the spec named /reports/growth for this page, but that route
 * already serves the live Growth Platform print edition (linked from the
 * dashboard's Download-PDF button). Overwriting it would have broken a working
 * feature, so the board report lives here at /reports/board and the existing
 * page is untouched.
 */
export default async function BoardReportAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const [role, growthLinks, handoverLinks, opsLinks, roomLinks, manual, h] = await Promise.all([
    currentRole(),
    listShareLinks('growth'),
    listShareLinks('handover'),
    listShareLinks('operations'),
    listShareLinks('room'),
    getManualMetrics(),
    headers(),
  ]);

  const isAdmin = role === 'admin';
  const host = h.get('host') ?? '';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const origin = host ? `${proto}://${host}` : '';

  const existing: Record<string, ManualMetric | undefined> = {};
  for (const [k, v] of manual) existing[k] = v;

  const showHandover = sp.view === 'handover';

  return (
    <main className="mx-auto max-w-[1240px] px-4 py-6 sm:px-8">
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="eyebrow text-accent">Reports</p>
          <h1 className="mt-0.5 text-[19px] font-semibold tracking-tight text-ink">
            Board Growth Report &amp; share links
          </h1>
        </div>
        <div className="flex gap-1.5">
          <TabLink href="/reports/board" label="Growth report" on={!showHandover} />
          <TabLink href="/reports/board?view=handover" label="Leave handover" on={showHandover} />
        </div>
      </div>

      {isAdmin ? (
        <div className="no-print mb-7 grid gap-4 lg:grid-cols-2">
          <ShareAdmin
            scope="growth"
            links={growthLinks}
            origin={origin}
            title="Board share links"
            blurb="Read-only, no login. Safe to open in a board meeting or forward to an investor — the page carries aggregate metrics only, never patient data."
          />
          <ShareAdmin
            scope="handover"
            links={handoverLinks}
            origin={origin}
            title="Handover links (Mr. Akbar only)"
            blurb="A separate token for the leave handover, revocable independently of the board link. Not for board circulation — it references vendor and commercial matters."
          />
          <ShareAdmin
            scope="operations"
            links={opsLinks}
            origin={origin}
            title="Head of Operations dashboard links"
            blurb="Read-only, no login — the operational-excellence report maintained by the Operations Director. Edits made on the Head of Operations tab appear on these links immediately."
          />
          <ShareAdmin
            scope="room"
            links={roomLinks}
            origin={origin}
            title="Investor Evidence Room links"
            blurb="THE link for investors: one landing page opening every report — the Growth Department Live Dashboard, the Operating Platform report and Financial reports — under a single token. Revoking it closes the whole room at once."
          />
          {!showHandover ? (
            <div className="lg:col-span-2">
              <ManualMetricsForm existing={existing} />
            </div>
          ) : null}
        </div>
      ) : (
        <p className="no-print mb-6 rounded-card border border-line bg-panel/60 px-4 py-3 text-[12px] text-ink-soft">
          You are signed in with read-only access. Share links and manual metric entry are admin-only; the report
          itself is below.
        </p>
      )}

      {showHandover ? <HandoverDoc /> : <BoardReport searchParams={sp} basePath="/reports/board" />}
    </main>
  );
}

function TabLink({ href, label, on }: { href: string; label: string; on: boolean }) {
  return (
    <a
      href={href}
      className={`rounded-md border px-3 py-1.5 text-[12.5px] font-medium transition ${
        on ? 'border-accent bg-accent text-white' : 'border-line bg-card text-ink-soft hover:bg-panel'
      }`}
    >
      {label}
    </a>
  );
}
