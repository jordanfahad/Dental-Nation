/**
 * The DN-032 Channels page (mockup 02), on live figures. Server component:
 * everything is rendered from ChannelsData (lib/overview/channels.ts), every
 * number is a Figure button whose proof drawer carries the exact URL the
 * 09:00 emails use for the same figure and dates, and a missing value is
 * always the word "Unavailable", never 0. Paid search's cost per enquiry is
 * the one figure the Growth table marks approximate (it counts modelled
 * phone enquiries), so here it shows Unavailable with the reason - an
 * estimate never sits in a headline (DN-032 decision 4).
 *
 * Deviation 8 from 02-channels.html: the total row's cost per enquiry is NOT
 * the mockup's paid-only figure. It divides all recorded ad spend by all
 * measured enquiries, including channels with no spend, the same rule the
 * Overview already shows (M08), because this page adds no new arithmetic. The
 * total row's label and the table caption state that denominator.
 */
import { dayLabel, rangeLabel } from '@/lib/alerts/shell';
import type { ChannelRow, ChannelsData } from '@/lib/overview/channels';
import { Figure, UNAVAILABLE, fmtAed, fmtAedExact, fmtCount } from '../Figure';

const SHARED_SCOPE = 'All clinics together (shared channels, never split by clinic)';
const GBP_SCOPE = 'All connected clinics together';

const withYear = (label: string, iso: string) => `${label} ${iso.slice(0, 4)}`;

/** Sub-tabs of the Channels section. Enquiries and Local & social are sections of this page; the rest come after approval. */
const SUBNAV: { name: string; hash?: string }[] = [
  { name: 'Enquiries', hash: '#enquiries' },
  { name: 'Paid media' },
  { name: 'Local & social', hash: '#local' },
  { name: 'Website & SEO' },
  { name: 'Partners' },
];

function SubnavComingSoon({ name }: { name: string }) {
  return (
    <details className="inline-block">
      <summary className="cursor-pointer list-none text-[#58656b] [&::-webkit-details-marker]:hidden">{name}</summary>
      <div className="absolute left-4 top-full z-20 mt-1 w-56 rounded-md border border-dn-line bg-white p-3 text-xs text-dn-ink shadow-lg sm:left-8">
        <strong className="text-dn-navy">{name}</strong> is coming after approval. In this preview the Channels page has its
        Enquiries and Local &amp; social sections.
      </div>
    </details>
  );
}

function Panel({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`min-w-0 rounded-[10px] border border-dn-line bg-white p-4 sm:p-5 ${className}`}>
      {children}
    </section>
  );
}

/** The share-of-enquiries bar under a channel name; pure presentation of the row's own figure. */
function ShareBar({ enquiries, max }: { enquiries: number; max: number }) {
  if (max <= 0) return null;
  return (
    <div className="mt-1.5 h-1.5 max-w-[130px] rounded-[3px] bg-[#e6eeeb]" aria-hidden="true">
      <div className="h-full rounded-[3px] bg-dn-soft" style={{ width: `${(enquiries / max) * 100}%` }} />
    </div>
  );
}

const ESTIMATE_NOTE =
  'The Growth table marks this channel’s cost per enquiry approximate because it counts modelled phone enquiries. An estimate never sits in a headline, so the figure here is unavailable; the labelled approximate figure stays on the Growth table the button below opens.';

export function ChannelsView({ data }: { data: ChannelsData }) {
  const mtdDates = withYear(rangeLabel(data.mtd.from, data.mtd.to), data.mtd.to);
  const td = 'border-b border-[#e8eeea] px-3 py-3';
  const th = 'bg-[#f4f7f5] px-3 py-2.5 align-bottom text-[10px] font-semibold tracking-[0.025em] text-[#657275]';

  const maxEnquiries = data.rows ? Math.max(0, ...data.rows.map((r) => r.enquiries)) : 0;

  /** The cost per enquiry cell: the Growth figure, or Unavailable with the reason when only an estimate exists. */
  const costCell = (row: ChannelRow) => {
    if (row.costIsEstimate) {
      return (
        <>
          <Figure id="M08" display={UNAVAILABLE} dates={mtdDates} scope={SHARED_SCOPE} url={data.urls.growthMtd} note={ESTIMATE_NOTE} />
          <small className="block text-[10px] text-[#9b400d]">only an estimate exists (counts modelled phone enquiries)</small>
        </>
      );
    }
    return (
      <Figure
        id="M08"
        display={fmtAedExact(row.costPerEnquiry)}
        dates={mtdDates}
        scope={SHARED_SCOPE}
        url={data.urls.growthMtd}
        note={row.costPerEnquiry == null ? 'The Growth table prints no cost for this channel: it has no recorded ad spend in this advertising measure.' : undefined}
      />
    );
  };

  const gbpDates = data.gbpCalls.range
    ? withYear(rangeLabel(data.gbpCalls.range.from, data.gbpCalls.range.to), data.gbpCalls.range.to)
    : 'Awaiting a reported day from Google';
  const gbpMissing = data.gbpCalls.missing.length
    ? ` Google has no reported data for ${data.gbpCalls.missing.join(' and ')}, so the total covers the other clinics only.`
    : '';

  return (
    <>
      {/* The nav itself must not scroll: it is the positioned ancestor of the
          "coming after approval" popovers, and an overflow-x-auto element also
          scroll-clips them vertically. The links scroll in an inner wrapper,
          whose overflow cannot clip a popover positioned against the nav. */}
      <nav className="relative border-b border-dn-line bg-white" aria-label="Channels sections">
        <div className="flex gap-4 overflow-x-auto whitespace-nowrap px-4 py-2.5 text-xs sm:gap-6 sm:px-8">
          {SUBNAV.map((s) =>
            s.hash ? (
              <a key={s.name} className="font-bold text-dn-navy no-underline" href={s.hash}>
                {s.name}
              </a>
            ) : (
              <SubnavComingSoon key={s.name} name={s.name} />
            ),
          )}
        </div>
      </nav>
      <main className="mx-auto max-w-[1440px] px-4 pb-6 pt-6 sm:px-8 sm:pt-7">
        <div className="mb-4">
          <p className="m-0 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-dn-navy">Marketing workspace</p>
          <h1 className="m-0 mb-2 text-[27px] font-bold leading-tight tracking-[-1.1px] text-dn-navy sm:text-[32px]">
            Which channels are bringing people in?
          </h1>
          <p className="m-0 text-xs text-[#617075]">
            Read enquiries, appointment activity and spending together. Open any figure to see what it counts.
          </p>
        </div>

        <div className="my-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-dn-line bg-white px-2.5 py-1.5 text-xs text-dn-navy">
              Month to yesterday · {mtdDates}
            </span>
            <span className="rounded-md border border-dn-line bg-white px-2.5 py-1.5 text-xs text-dn-navy">Shared channels</span>
          </div>
          <span className="text-xs text-[#617075]">Dubai time · Live figures, opened {withYear(dayLabel(data.today), data.today)}</span>
        </div>

        <div className="mb-4 rounded-[2px] border border-l-[3px] border-dn-line border-l-dn-soft bg-white p-3 text-[11px] text-[#526269] sm:p-3.5 sm:text-xs">
          <strong className="text-dn-navy">One counting rule per column.</strong> Enquiries are contact records, tracked for all
          clinics together and never split by clinic. Appointments are counted on appointment dates, so this table does not
          imply a cohort booking rate.
        </div>

        <Panel id="enquiries" className="my-4">
          <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-start sm:gap-3.5">
            <div>
              <h2 className="m-0 mb-1 text-base font-bold tracking-[-0.3px] text-dn-navy sm:text-lg">Channel performance</h2>
              <p className="m-0 text-xs text-[#617075]">Month to yesterday · Recorded spend and measured enquiries</p>
            </div>
            <span className="inline-block self-start rounded bg-[#e8f1e8] px-2 py-1 text-[11px] text-dn-navy">
              Modelled phone enquiries excluded
            </span>
          </div>
          <p className="m-0 mb-2 text-[11px] text-[#617075] sm:hidden">Swipe the table to see every measure.</p>
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Channel performance">
            <table className="w-full min-w-[530px] border-collapse text-left text-xs">
              <thead>
                <tr>
                  {['Channel', 'Enquiries', 'Appointments booked', 'Ad spend', 'Cost per enquiry'].map((h) => (
                    <th key={h} scope="col" className={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows ? (
                  data.rows.map((row) => (
                      <tr key={row.key}>
                        <td className={`${td} font-semibold text-dn-navy`}>
                          {row.name}
                          <ShareBar enquiries={row.enquiries} max={maxEnquiries} />
                        </td>
                        <td className={td}>
                          <Figure id="M01" display={fmtCount(row.enquiries)} dates={mtdDates} scope={SHARED_SCOPE} url={data.urls.growthMtd} />
                        </td>
                        <td className={td}>
                          <Figure id="M03" display={fmtCount(row.booked)} dates={mtdDates} scope={SHARED_SCOPE} url={data.urls.growthMtd} />
                        </td>
                        <td className={td}>
                          <Figure
                            id="M07"
                            display={fmtAed(row.spend)}
                            dates={mtdDates}
                            scope={SHARED_SCOPE}
                            url={data.urls.spendMtd}
                            note={row.spend == null ? 'This channel has no recorded Google or Meta ad spend: it is outside this advertising measure, which does not mean it has no operating cost.' : undefined}
                          />
                        </td>
                        <td className={td}>{costCell(row)}</td>
                      </tr>
                  ))
                ) : (
                  <tr>
                    <td className={td} colSpan={5}>
                      The Growth channel report could not be read this time, so the per-channel figures are unavailable rather
                      than shown as zero.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                    <tr>
                      <td className="bg-[#eef4ef] px-3 py-3 font-bold text-dn-navy">
                        Total, all measured channels
                        <small className="block text-[10px] font-normal text-[#647478]">spend over all measured enquiries</small>
                      </td>
                      <td className="bg-[#eef4ef] px-3 py-3">
                        <Figure id="M01" display={fmtCount(data.totals.enquiries)} dates={mtdDates} scope={SHARED_SCOPE} url={data.urls.growthMtd} />
                      </td>
                      <td className="bg-[#eef4ef] px-3 py-3">
                        <Figure id="M03" display={fmtCount(data.totals.booked)} dates={mtdDates} scope={SHARED_SCOPE} url={data.urls.growthMtd} />
                      </td>
                      <td className="bg-[#eef4ef] px-3 py-3">
                        <Figure id="M07" display={fmtAed(data.totals.spend)} dates={mtdDates} scope={SHARED_SCOPE} url={data.urls.spendMtd} />
                      </td>
                      <td className="bg-[#eef4ef] px-3 py-3">
                        <Figure
                          id="M08"
                          display={fmtAedExact(data.totals.costPerEnquiry)}
                          dates={mtdDates}
                          scope={SHARED_SCOPE}
                          url={data.urls.growthMtd}
                          note={data.totals.costPerEnquiry == null ? 'Spend or measured enquiries are unavailable, so no cost is calculated or estimated.' : undefined}
                        />
                      </td>
                    </tr>
              </tfoot>
            </table>
          </div>
          <p className="m-0 mt-3 text-[11px] text-[#627277]">
            Each channel&apos;s cost per enquiry uses that channel&apos;s measured enquiries only. The total row divides all
            recorded ad spend by all measured enquiries, including channels with no spend, the same rule as the Overview (M08).
            Unavailable spend means a channel is outside the Google and Meta advertising measure; it does not mean the channel
            has no operating cost.
          </p>
        </Panel>

        <div className="my-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel>
            <p className="m-0 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-dn-navy">Example drill-down</p>
            {data.biggest ? (
              <>
                <h2 className="m-0 mb-1 text-base font-bold tracking-[-0.3px] text-dn-navy sm:text-lg">
                  {data.biggest.name} enquiries
                </h2>
                <p className="m-0 mb-2 text-xs text-[#617075]">Same period, shared acquisition scope</p>
                <Figure
                  id="M01"
                  display={fmtCount(data.biggest.enquiries)}
                  dates={mtdDates}
                  scope={SHARED_SCOPE}
                  url={data.urls.growthMtd}
                  size="large"
                />
                <div className="mt-4 rounded-[7px] bg-dn-beige p-3.5 text-xs">
                  <strong className="text-dn-navy">What counts?</strong>
                  <p className="m-0 mt-1">
                    Tracked enquiries attributed to {data.biggest.name}, the largest channel by enquiries this month. Platform
                    conversions and estimated phone enquiries are separate measures and are not mixed in.
                  </p>
                </div>
                <p className="mb-3 mt-3 text-[11px] text-[#627277]">
                  Attribution can be tagged, inferred or unassigned. The patient list behind this figure keeps those labels and
                  the existing access checks.
                </p>
                <a
                  className="inline-block rounded-md border border-dn-navy bg-dn-navy px-3.5 py-2 text-xs font-semibold text-white no-underline"
                  href={data.biggest.patientsUrl}
                >
                  Open the patients behind this channel
                </a>
              </>
            ) : (
              <>
                <h2 className="m-0 mb-1 text-base font-bold tracking-[-0.3px] text-dn-navy sm:text-lg">Channel drill-down</h2>
                <p className="m-0 text-xs text-[#5c6c72]">
                  No channel has a measured enquiry this month, or the Growth report could not be read, so there is no
                  drill-down to show. Nothing is estimated in its place.
                </p>
              </>
            )}
          </Panel>

          <Panel id="local">
            <h2 className="m-0 mb-1 text-base font-bold tracking-[-0.3px] text-dn-navy sm:text-lg">Local visibility and brand</h2>
            <p className="m-0 mb-1 text-xs text-[#617075]">Different sources keep their own reporting dates.</p>
            <div className="flex items-center justify-between gap-4 border-b border-dn-line py-3 text-xs">
              <span>
                Google profile calls ·{' '}
                {data.gbpCalls.throughDay ? `through ${dayLabel(data.gbpCalls.throughDay)}` : 'no reported day yet'}
              </span>
              <Figure
                id="M11"
                display={fmtCount(data.gbpCalls.value)}
                dates={gbpDates}
                scope={GBP_SCOPE}
                url={data.gbpCalls.url}
                note={
                  data.gbpCalls.value == null
                    ? `Google has not reported a full day for every connected clinic, so the month-to-date calls are unavailable rather than counted as zero.${gbpMissing}`
                    : `Google reports a day a few days late; this covers the month up to the latest fully reported day.${gbpMissing}`
                }
                align="end"
              />
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-dn-line py-3 text-xs">
              <span>
                Brand share · sampled search clicks{data.share.range ? ` · ${withYear(rangeLabel(data.share.range.from, data.share.range.to), data.share.range.to)}` : ''}
              </span>
              <Figure
                id="M28"
                display={data.share.percent != null ? `${data.share.percent}%` : UNAVAILABLE}
                dates={data.share.range ? withYear(rangeLabel(data.share.range.from, data.share.range.to), data.share.range.to) : 'Awaiting a readable Search Console sample'}
                scope="The one group website, all clinics"
                url={data.share.url}
                note={data.share.percent != null ? undefined : 'The Search Console sample could not be read, or had no clicks, so the share is unavailable rather than estimated.'}
                align="end"
              />
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-dn-line py-3 text-xs">
              <span>Instagram followers · latest recorded in {mtdDates}</span>
              <Figure
                id="M29"
                display={fmtCount(data.instagram.followers)}
                dates={mtdDates}
                scope={"The group's one Instagram account"}
                url={data.instagram.url}
                note="The most recent recorded follower count inside the month to date; the source does not carry the exact observation day to this page."
                align="end"
              />
            </div>
            <div className="flex items-center justify-between gap-4 py-3 text-xs">
              <span>Instagram daily reach total · {mtdDates}</span>
              <Figure
                id="M30"
                display={fmtCount(data.instagram.reachMtd)}
                dates={mtdDates}
                scope={"The group's one Instagram account"}
                url={data.instagram.url}
                note="Daily reach figures added over the month; the same person reached on two days counts twice."
                align="end"
              />
            </div>
          </Panel>
        </div>
      </main>
    </>
  );
}
