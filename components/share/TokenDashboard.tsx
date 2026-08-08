import Link from 'next/link';
import { Suspense } from 'react';
import type { ShareLink } from '@/lib/board/shareLinks';
import { getRangeReport } from '@/lib/report';
import { TabSkeleton } from '@/components/TabSkeleton';
import { GoogleAnalyticsReport } from '@/components/sections/analytics/GoogleAnalyticsReport';
import { DigitalSeo } from '@/components/sections/digital/DigitalSeo';
import { MarketingReport } from '@/components/sections/marketing/MarketingReport';
import { SocialReport } from '@/components/sections/social/SocialReport';
import { GroupRevenue } from '@/components/sections/clinics/GroupRevenue';
import { ClinicalOps } from '@/components/sections/ops/ClinicalOps';

/**
 * The live dashboard, reachable from a Command Deck link — token, no login.
 *
 * Every widget on the deck links "logically" into the live dashboard view
 * behind it. A board member cannot be asked to log in, so the deck's own
 * share token is the credential here too: it is validated (scope `growth`)
 * on every request, and the browser's back button returns to the deck because
 * this is an ordinary same-origin navigation.
 *
 * 🔒 THE ALLOWLIST IS THE POINT. Only tabs that render aggregate-level
 * surfaces are reachable: analytics, digital/SEO, marketing, social, group
 * revenue / growth platform, and clinical operations (uptime). The tabs that
 * carry patient-level records — CRM conversations, Practo appointments,
 * bookings, the ArabyAds lead worklist — are NOT in this list and must never
 * be added to it: a share token is a weaker credential than a login, and the
 * deck's PII promise ("no patient data behind board links") extends to every
 * click away from it.
 */
const DASH_TABS = [
  { key: 'group', label: 'Growth Platform & Group Revenue' },
  { key: 'marketing', label: 'Marketing — paid media' },
  { key: 'analytics', label: 'Google Analytics' },
  { key: 'digital', label: 'Digital & SEO' },
  { key: 'social', label: 'Social & Local' },
  { key: 'clinical-ops', label: 'Clinical Operations' },
] as const;

type DashTab = (typeof DASH_TABS)[number]['key'];

export interface DashSearchParams {
  tab?: string;
  from?: string;
  to?: string;
  preset?: string;
  compare?: string;
  mtab?: string;
  mscope?: string;
  gtab?: string;
  gchan?: string;
  gclinic?: string;
  mpipe?: string;
}

export async function TokenDashboard({
  link,
  sp,
  dashBase,
  backHref: backHrefIn,
  backLabel,
}: {
  link: ShareLink;
  sp: DashSearchParams;
  /** e.g. /share/growth/<token>/dash — tab links are built on this. */
  dashBase: string;
  backHref: string;
  backLabel: string;
}) {
  const tab: DashTab = (DASH_TABS.find((t) => t.key === sp.tab)?.key as DashTab) ?? 'group';

  // Resolve the window exactly as the internal dashboard does, so a date
  // filter carried over from the deck means the same thing here.
  const shell = await getRangeReport({
    from: sp.from,
    to: sp.to,
    preset: sp.preset,
    compare: sp.compare,
    skipGa4: true,
  });
  const range = { from: shell.range.from, to: shell.range.to };

  const dateQs = [
    sp.from ? `from=${encodeURIComponent(sp.from)}` : '',
    sp.to ? `to=${encodeURIComponent(sp.to)}` : '',
    sp.preset ? `preset=${encodeURIComponent(sp.preset)}` : '',
  ]
    .filter(Boolean)
    .join('&');
  const href = (t: string) => `${dashBase}?tab=${t}${dateQs ? `&${dateQs}` : ''}`;
  const backHref = `${backHrefIn}${dateQs ? `${backHrefIn.includes('?') ? '&' : '?'}${dateQs}` : ''}`;

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-6 md:px-8">
      {/* Slim masthead — this is a drill-down, not a destination. */}
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-faint">
            Dental Nation · live dashboard — read-only
          </p>
          <h1 className="mt-0.5 text-[17px] font-semibold tracking-tight text-ink">
            {DASH_TABS.find((t) => t.key === tab)?.label}
          </h1>
        </div>
        <Link
          href={backHref}
          className="rounded-md border border-line px-3 py-1.5 text-[12px] font-medium text-ink-soft hover:bg-panel"
        >
          ← {backLabel}
        </Link>
      </div>

      <nav className="no-print mb-5 flex flex-wrap gap-1.5">
        {DASH_TABS.map((t) => (
          <Link
            key={t.key}
            href={href(t.key)}
            className={`rounded-md px-2.5 py-1.5 text-[11.5px] font-medium ${
              t.key === tab ? 'bg-ink text-card' : 'border border-line text-ink-soft hover:bg-panel'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <Suspense
        key={`${tab}|${sp.from ?? ''}|${sp.to ?? ''}|${sp.preset ?? ''}|${sp.mtab ?? ''}|${sp.gtab ?? ''}|${sp.gchan ?? ''}|${sp.gclinic ?? ''}|${sp.mpipe ?? ''}|${sp.mscope ?? ''}`}
        fallback={<TabSkeleton />}
      >
        {tab === 'group' ? (
          <GroupRevenue
            range={{ from: shell.range.from, to: shell.range.to, preset: shell.range.preset }}
            sub={sp.gtab}
            gchan={sp.gchan}
            gclinic={sp.gclinic}
            mpipe={sp.mpipe}
            compare={shell.range.compare === 'prev'}
          />
        ) : null}
        {tab === 'marketing' ? <MarketingReport sub={sp.mtab} range={range} mscope={sp.mscope} /> : null}
        {tab === 'analytics' ? <GoogleAnalyticsReport range={range} /> : null}
        {tab === 'digital' ? <DigitalSeo range={range} /> : null}
        {tab === 'social' ? <SocialReport range={range} /> : null}
        {tab === 'clinical-ops' ? <ClinicalOps range={range} /> : null}
      </Suspense>

      <p className="mt-6 border-t border-line pt-3 text-center text-[10px] text-ink-ghost">
        Prepared for {link.label} · read-only · aggregate figures only — no patient-level data is reachable from this
        link
      </p>
    </main>
  );
}
