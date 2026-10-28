/**
 * The DN-032 Programmes page (mockup 04), on live figures. Server component:
 * everything is rendered from ProgrammesData (lib/overview/programmes.ts),
 * every number is a Figure button whose proof drawer carries the exact URL
 * the 09:00 emails use for the same figure, dates and clinic, and a missing
 * value is always the word "Unavailable", never 0.
 *
 * Honesty rules on this page (DN-032):
 *  - programme outcomes (M23, M24, M25) stay Unavailable with the missing
 *    evidence named; campaign activity never stands in for them;
 *  - the campaign proof opens the marketing Google view filtered to the exact
 *    campaign, and the drawer warns that the opened page's HEADLINE counts
 *    the whole account while the campaign's own figures are its table row;
 *  - partnership activity (M20, M21, M22) carries the proxy warning: it does
 *    not prove paid membership, and shared enquiries are never split by clinic.
 */
import { dayLabel, rangeLabel } from '@/lib/alerts/shell';
import { metricDef } from '@/lib/metrics/registry';
import type { ProgrammesData } from '@/lib/overview/programmes';
import { Figure, UNAVAILABLE, fmtAed, fmtCount } from '../Figure';

const withYear = (label: string, iso: string) => `${label} ${iso.slice(0, 4)}`;

const LIVE_DATES = 'Live at the moment the page is opened';
const CAMPAIGN_SCOPE = 'Whole group (one shared Google Ads account), filtered to the exact DN Ortho campaign';
const PROGRAMME_SCOPE = 'DN Ortho programme, across its clinics';
const SHARED_SCOPE = 'All clinics together (shared channel, never split by clinic)';
const CONNECTED_SCOPE = 'All connected clinics together';
const COMPANIES_SCOPE = 'All partner companies, group-wide';
const REVIEWERS_SCOPE = 'Smile Club reviewers, group-wide';

/**
 * Drawer note on M31 and M32 (a DN-032 finding): the linked view's headline
 * KPIs count the whole Google Ads account even when a campaign filter is in
 * the URL; the campaign's own figures are its filtered row in the table.
 */
const ACCOUNT_HEADLINE_NOTE =
  'On the opened view, the headline figures count the whole Google Ads account; this campaign’s own spend and clicks are its filtered row in the campaign table below them.';

const PROXY_NOTE =
  'Partnership activity does not prove paid membership: this is the Partnerships (Smile Club) channel row, not a count of paying members.';

/** Why each programme outcome stays Unavailable (the DN-032 audit's missing evidence). */
const M23_NOTE =
  'No enquiry record carries a DN Ortho programme tag yet (campaign-to-patient linkage is missing), so campaign clicks and the clinics’ general enquiries are not substituted.';
const M24_NOTE =
  'No appointment is linked to the DN Ortho programme yet, so the orthodontists’ overall appointments are not substituted.';
const M25_NOTE =
  'No bill is linked to the DN Ortho programme, and the conducting doctor is missing on about 99% of priced lines, so the orthodontists’ charge-line proxy is not substituted for programme revenue.';

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`min-w-0 rounded-[10px] border border-dn-line bg-white p-4 sm:p-5 ${className}`}>{children}</section>;
}

function MetricLine({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-dn-line py-3 text-xs">
      <span>{label}</span>
      {children}
    </div>
  );
}

export function ProgrammesView({ data }: { data: ProgrammesData }) {
  const mtdDates = withYear(rangeLabel(data.mtd.from, data.mtd.to), data.mtd.to);
  const { ortho, smileClub, delivery } = data;

  const campaignUnavailableNote = ortho.read
    ? 'The campaign has no reported activity on these days yet, so no amount is shown rather than AED 0.'
    : 'The stored Google Ads rows could not be read when this page was opened.';
  const campaignNote = (ortho.spendMtd == null ? `${campaignUnavailableNote} ` : '') + ACCOUNT_HEADLINE_NOTE;

  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-6 pt-6 sm:px-8 sm:pt-7">
      <div className="mb-4">
        <p className="m-0 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-dn-navy">Programmes</p>
        <h1 className="m-0 mb-2 text-[27px] font-bold leading-tight tracking-[-1.1px] text-dn-navy sm:text-[32px]">
          Is the work turning into results?
        </h1>
        <p className="m-0 text-xs text-[#617075]">Programme outcomes stay separate from campaign activity and task completion.</p>
      </div>

      <div className="my-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-dn-line bg-white px-2.5 py-1.5 text-xs text-dn-navy">
            Month to yesterday · {mtdDates}
          </span>
          <span className="rounded-md border border-dn-line bg-white px-2.5 py-1.5 text-xs text-dn-navy">All connected clinics</span>
        </div>
        <span className="text-xs text-[#617075]">Dubai time · Live figures, opened {withYear(dayLabel(data.today), data.today)}</span>
      </div>

      <div className="my-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel className="border-t-4 border-t-dn-navy">
          <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-start sm:gap-3.5">
            <div>
              <p className="m-0 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-dn-navy">DN Ortho</p>
              <h2 className="m-0 mb-1 text-base font-bold tracking-[-0.3px] text-dn-navy sm:text-lg">Campaign activity is visible</h2>
            </div>
            <span className="inline-block self-start rounded bg-[#e8f1e8] px-2 py-1 text-[11px] text-dn-navy">
              {ortho.live ? 'Live campaign activity' : 'No campaign activity yet'}
            </span>
          </div>
          <p className="m-0 mb-3 text-[11px] text-[#617075]">
            The Google campaign has been live since 23 Oct 2026, so earlier October days have nothing to report.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <article className="min-w-0 rounded-md bg-[#f8faf8] px-3.5 pb-3.5 pt-4">
              <p className="m-0 mb-2 text-[11px] font-semibold text-[#526269]">Campaign spend</p>
              <Figure
                id="M31"
                display={fmtAed(ortho.spendMtd)}
                dates={mtdDates}
                scope={CAMPAIGN_SCOPE}
                url={ortho.url}
                note={campaignNote}
                size="large"
              />
              <p className="m-0 mt-1.5 text-[10px] text-[#617075]">Google Search, exact campaign</p>
            </article>
            <article className="min-w-0 rounded-md bg-[#f8faf8] px-3.5 pb-3.5 pt-4">
              <p className="m-0 mb-2 text-[11px] font-semibold text-[#526269]">Campaign clicks</p>
              <Figure
                id="M32"
                display={fmtCount(ortho.clicksMtd)}
                dates={mtdDates}
                scope={CAMPAIGN_SCOPE}
                url={ortho.url}
                note={campaignNote}
                size="large"
              />
              <p className="m-0 mt-1.5 text-[10px] text-[#617075]">Clicks are not patient enquiries</p>
            </article>
          </div>
          <div className="mt-2">
            <MetricLine label="Programme enquiries">
              <Figure id="M23" display={UNAVAILABLE} dates={mtdDates} scope={PROGRAMME_SCOPE} url={ortho.enquiriesUrl} note={M23_NOTE} align="end" />
            </MetricLine>
            <MetricLine label="Programme appointments">
              <Figure id="M24" display={UNAVAILABLE} dates={mtdDates} scope={PROGRAMME_SCOPE} url={ortho.appointmentsUrl} note={M24_NOTE} align="end" />
            </MetricLine>
            <MetricLine label="Programme billed revenue">
              <Figure id="M25" display={UNAVAILABLE} dates={mtdDates} scope={PROGRAMME_SCOPE} url={ortho.billingUrl} note={M25_NOTE} align="end" />
            </MetricLine>
          </div>
          <div className="mt-4 rounded-[7px] bg-dn-beige p-3.5 text-xs">
            <strong className="text-dn-navy">What is missing?</strong>
            <p className="m-0 mt-1 text-[#5c6c72]">
              Campaign-to-patient linkage. The orthodontists&apos; charge lines are an incomplete provider proxy, not programme
              revenue, so no lookalike number stands in for the three figures above.
            </p>
          </div>
        </Panel>

        <Panel className="border-t-4 border-t-dn-soft">
          <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-start sm:gap-3.5">
            <div>
              <p className="m-0 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-dn-navy">Smile Club</p>
              <h2 className="m-0 mb-1 text-base font-bold tracking-[-0.3px] text-dn-navy sm:text-lg">Members and partnership activity</h2>
            </div>
            <span className="inline-block self-start rounded bg-[#e8f1e8] px-2 py-1 text-[11px] text-dn-navy">Company-reported</span>
          </div>
          <article className="min-w-0 rounded-md bg-[#f8faf8] px-3.5 pb-3.5 pt-4">
            <p className="m-0 mb-2 text-[11px] font-semibold text-[#526269]">Members reported by companies</p>
            <Figure
              id="M19"
              display={fmtCount(smileClub.members)}
              dates={LIVE_DATES}
              scope={COMPANIES_SCOPE}
              url={smileClub.membersUrl}
              size="large"
            />
            <p className="m-0 mt-1.5 text-[10px] text-[#617075]">Snapshot when opened · payment status not verified by billing</p>
          </article>
          <div className="mt-2">
            <MetricLine label="Partnership enquiries · shared">
              <Figure id="M20" display={fmtCount(smileClub.enquiries)} dates={mtdDates} scope={SHARED_SCOPE} url={smileClub.growthUrl} note={PROXY_NOTE} align="end" />
            </MetricLine>
            <MetricLine label="Partnership appointments">
              <Figure id="M21" display={fmtCount(smileClub.booked)} dates={mtdDates} scope={CONNECTED_SCOPE} url={smileClub.growthUrl} note={PROXY_NOTE} align="end" />
            </MetricLine>
            <MetricLine label="Partnership attended appointments">
              <Figure id="M22" display={fmtCount(smileClub.attended)} dates={mtdDates} scope={CONNECTED_SCOPE} url={smileClub.growthUrl} note={PROXY_NOTE} align="end" />
            </MetricLine>
          </div>
          <div className="mt-4 rounded-[7px] bg-dn-beige p-3.5 text-xs">
            <strong className="text-dn-navy">Keep the proxy visible</strong>
            <p className="m-0 mt-1 text-[#5c6c72]">
              The partnership channel is used for this activity view. It does not prove that every appointment belongs to a paid
              member, and shared enquiries are never split by clinic.
            </p>
          </div>
        </Panel>
      </div>

      <Panel className="my-4">
        <h2 className="m-0 mb-1 text-base font-bold tracking-[-0.3px] text-dn-navy sm:text-lg">Plans, scripts and follow-up work</h2>
        <p className="m-0 mb-3 text-xs text-[#617075]">
          Team, scripts, company pipeline and the content calendar keep their existing panels and permissions; this page only
          links to them.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <article className="min-w-0 rounded-md bg-[#f4f7f5] p-3.5">
            <p className="m-0 mb-2 text-[11px] font-semibold text-[#526269]">{metricDef('M34').name}</p>
            {delivery.scriptsWaiting != null ? (
              <p className="m-0 mb-2 flex flex-wrap items-center gap-1.5 text-xs text-[#5c6c72]">
                <Figure
                  id="M34"
                  display={fmtCount(delivery.scriptsWaiting)}
                  dates={LIVE_DATES}
                  scope={REVIEWERS_SCOPE}
                  url={delivery.scriptsUrl}
                  size="large"
                />
                review assignments
              </p>
            ) : (
              <p className="m-0 mb-2 text-xs text-[#5c6c72]">The script reviews could not be read, so no count is shown.</p>
            )}
            <a className="text-xs font-semibold text-dn-navy underline underline-offset-4" href={delivery.scriptsUrl}>
              Open the scripts panel
            </a>
          </article>
          <article className="min-w-0 rounded-md bg-[#f4f7f5] p-3.5">
            <p className="m-0 mb-2 text-[11px] font-semibold text-[#526269]">{metricDef('M33').name}</p>
            <p className="m-0 mb-2 text-xs text-[#5c6c72]">The stage counts live on the company pipeline panel itself.</p>
            <a className="text-xs font-semibold text-dn-navy underline underline-offset-4" href={delivery.companiesUrl}>
              Open the company pipeline
            </a>
          </article>
          <article className="min-w-0 rounded-md bg-[#f4f7f5] p-3.5">
            <p className="m-0 mb-2 text-[11px] font-semibold text-[#526269]">Content calendar</p>
            <p className="m-0 mb-2 text-xs text-[#5c6c72]">Planned posts and shoots: work in progress, never an outcome.</p>
            <a className="text-xs font-semibold text-dn-navy underline underline-offset-4" href={delivery.calendarUrl}>
              Open the content calendar
            </a>
          </article>
        </div>
        <p className="m-0 mt-3 text-[11px] text-[#627277]">
          The programme result cards above never count tasks as outcomes. Registry: M33 {metricDef('M33').name.toLowerCase()},
          M34 {metricDef('M34').name.toLowerCase()}, M35 {metricDef('M35').name.toLowerCase()}.
        </p>
      </Panel>
    </main>
  );
}
