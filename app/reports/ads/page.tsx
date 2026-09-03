import { currentRole } from '@/lib/auth/role';
import { GoogleAdsPerformance } from '@/components/sections/marketing/GoogleAdsPerformance';
import { MetaAdsPerformance } from '@/components/sections/marketing/MetaAdsPerformance';
import { Card, SectionHeader } from '@/components/ui/Card';
import { ActionLog, CampaignSpecs, LandingPagePlan, OrthoPlan } from './plans';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Ads Command — the standalone paid-media section under /reports: monitor
 * Google Ads + Meta Ads live (reusing the marketing tab's API-backed deep
 * dives), jump straight into either platform to manage, and keep the paid-media
 * playbook (landing-page plan, DN Ortho brief) and the change log in one place.
 *
 * Honesty: campaign EDITS happen in the platforms themselves (deep-linked
 * below) — this page never pretends to write to the ad accounts. What it owns
 * is the monitoring view and the decision log.
 */

const VIEWS = [
  { key: 'google', label: 'Google Ads' },
  { key: 'meta', label: 'Meta Ads' },
  { key: 'plan', label: 'Playbook & plans' },
] as const;
type AdsView = (typeof VIEWS)[number]['key'];
const resolveView = (v: string | undefined): AdsView =>
  (VIEWS.find((t) => t.key === v)?.key as AdsView) ?? 'google';

/** Deep links into the platforms (management happens there, not here). */
const GOOGLE_ADS_URL = 'https://ads.google.com/aw/campaigns?ocid=7831008844';
const META_ADS_URL = 'https://business.facebook.com/adsmanager/manage/campaigns';

export default async function AdsCommandPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const [sp, role] = await Promise.all([searchParams, currentRole()]);
  const view = resolveView(sp.view);
  const isAdmin = role === 'admin';

  return (
    <main className="mx-auto max-w-[1240px] px-4 py-6 sm:px-8">
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="eyebrow text-accent">Reports</p>
          <h1 className="mt-0.5 text-[19px] font-semibold tracking-tight text-ink">
            Ads Command — Google &amp; Meta
          </h1>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {VIEWS.map((t) => (
            <a
              key={t.key}
              href={`/reports/ads${t.key === 'google' ? '' : `?view=${t.key}`}`}
              className={`rounded-md border px-3 py-1.5 text-[12.5px] font-medium transition ${
                view === t.key
                  ? 'border-accent bg-accent text-white'
                  : 'border-line bg-card text-ink-soft hover:bg-panel'
              }`}
            >
              {t.label}
            </a>
          ))}
        </div>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Manage" title="Open the ad platforms" />
          <div className="px-5 pb-5 pt-3">
            <p className="text-[12.5px] leading-snug text-ink-soft">
              Monitoring lives here; campaign edits (budgets, pausing, keywords, creative) are made in
              the platforms themselves. Every meaningful change is recorded in the change log below so
              the board view and the ad accounts never drift apart silently.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={GOOGLE_ADS_URL}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-accent px-3 py-1.5 text-[12.5px] font-medium text-accent transition hover:bg-accent hover:text-white"
              >
                Google Ads → Dental Nation (451-999-6986)
              </a>
              <a
                href={META_ADS_URL}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-accent px-3 py-1.5 text-[12.5px] font-medium text-accent transition hover:bg-accent hover:text-white"
              >
                Meta Ads Manager
              </a>
            </div>
            {!isAdmin ? (
              <p className="mt-3 rounded-card border border-line bg-panel/60 px-3 py-2 text-[11.5px] text-ink-soft">
                You are viewing read-only. The platform links require their own Google / Meta logins.
              </p>
            ) : null}
          </div>
        </Card>
        <ActionLog />
      </div>

      {view === 'google' ? (
        <div className="space-y-5">
          <GoogleAdsPerformance />
          <CampaignSpecs />
        </div>
      ) : null}
      {view === 'meta' ? <MetaAdsPerformance /> : null}
      {view === 'plan' ? (
        <div className="space-y-5">
          <LandingPagePlan />
          <OrthoPlan />
        </div>
      ) : null}
    </main>
  );
}
