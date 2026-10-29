/**
 * The DN-032 leadership Overview (mockup 01), on live figures. Server
 * component: everything is rendered from OverviewData (lib/overview/read.ts),
 * every number is a Figure button whose proof drawer carries the exact URL the
 * 09:00 email uses for the same figure, dates and clinic, and a missing value
 * is always the word "Unavailable", never 0.
 */
import { dayLabel } from '@/lib/alerts/shell';
import { AL_MAHER_PRACTO_FROM, type ClinicFilterKey } from '@/config/clinics';
import type { ClinicLens, OverviewData, OverviewMover } from '@/lib/overview/read';
import { dayMonthYear } from '@/lib/overview/format';
import { hrefWith, lastDayLabel, periodDates, rangeOfData, rangeParams, type ViewRange } from '@/lib/overview/range';
import { DateRangeControl } from './DateRangeControl';
import { Figure, UNAVAILABLE, fmtAed, fmtAedExact, fmtCount, fmtRating } from './Figure';

const LIVE_DATES = 'Live at the moment the page is opened';
const SHARED_SCOPE = 'All clinics together (shared channels, never split by clinic)';

const withYear = (label: string, iso: string) => `${label} ${iso.slice(0, 4)}`;

const CLINIC_CHIPS: { key: ClinicFilterKey; label: string }[] = [
  { key: 'all', label: 'All clinics' },
  { key: 'dental-nation', label: 'Al Wasl' },
  { key: 'dr-tosun', label: 'Dr Tosun' },
  { key: 'al-maher', label: 'Al Maher' },
];

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`min-w-0 rounded-[10px] border border-dn-line bg-white p-4 sm:p-5 ${className}`}>{children}</section>;
}

function TrendSvg({ prior7, last7, priorLabel, lastLabel }: { prior7: number; last7: number; priorLabel: string; lastLabel: string }) {
  const max = Math.max(prior7, last7, 1);
  const yOf = (v: number) => 142 - (v / max) * 95;
  const [x1, x2] = [110, 525];
  const [y1, y2] = [yOf(prior7), yOf(last7)];
  return (
    <svg
      viewBox="0 0 635 180"
      className="h-36 w-full sm:h-40"
      role="img"
      aria-label={`Enquiries: ${last7} in ${lastLabel} compared with ${prior7} in ${priorLabel}`}
    >
      <path d="M25 142H610 M25 92H610 M25 42H610" stroke="#DDE5E0" strokeWidth="1" fill="none" />
      <polygon points={`${x1},142 ${x1},${y1} ${x2},${y2} ${x2},142`} fill="#CFE2D0" opacity=".5" />
      <polyline points={`${x1},${y1} ${x2},${y2}`} fill="none" stroke="#244260" strokeWidth="3" />
      <circle cx={x1} cy={y1} r="5" fill="#244260" stroke="#fff" strokeWidth="3" />
      <circle cx={x2} cy={y2} r="5" fill="#244260" stroke="#fff" strokeWidth="3" />
      <text x={x1} y={y1 - 12} textAnchor="middle" fontSize="12" fill="#244260" fontWeight="650">{prior7}</text>
      <text x={x2} y={y2 - 12} textAnchor="middle" fontSize="12" fill="#244260" fontWeight="650">{last7}</text>
      <text x={x1} y={166} textAnchor="middle" fontSize="11" fill="#607178">{priorLabel}</text>
      <text x={x2} y={166} textAnchor="middle" fontSize="11" fill="#607178">{lastLabel}</text>
    </svg>
  );
}

export function OverviewView({ data, clinic, range }: { data: OverviewData; clinic: ClinicFilterKey; range?: ViewRange }) {
  const { windows, labels } = data;
  // The range the data was read for; without one it is the default month to yesterday.
  const r = range ?? rangeOfData(windows.mtd, data.today);
  const mtdDates = periodDates(r);
  const yDates = withYear(dayLabel(windows.yesterday.from), windows.yesterday.from);
  const last7Dates = withYear(labels.last7, windows.last7.to);
  const prior7Dates = withYear(labels.prior7, windows.prior7.to);
  const maherFrom = dayMonthYear(AL_MAHER_PRACTO_FROM);

  const lensKey = clinic === 'all' ? 'group' : clinic;
  const lens = data.clinics.find((c) => c.key === lensKey) ?? data.clinics[data.clinics.length - 1];
  const lensScope = clinic === 'all' ? 'Connected clinics' : lens.name;
  const clinicChosen = clinic !== 'all';

  const moverMin = data.movers?.min ?? 3;
  const moverLine = (m: OverviewMover | null, dir: 'rose' | 'fell') => {
    if (!m) return <p className="m-0 text-xs text-[#5c6c72]">No channel {dir} by {moverMin} or more enquiries between the two weeks.</p>;
    return (
      <p className="m-0 flex flex-wrap items-center gap-1 text-xs text-[#5c6c72]">
        {m.name} enquiries {dir} to
        <Figure id="M01" display={fmtCount(m.now)} dates={last7Dates} scope={SHARED_SCOPE} url={data.trend.urlLast7} />
        from
        <Figure id="M01" display={fmtCount(m.before)} dates={prior7Dates} scope={SHARED_SCOPE} url={data.trend.urlPrior7} />
      </p>
    );
  };

  const tile = (
    label: string,
    note: string,
    big: React.ReactNode,
    day: React.ReactNode,
  ) => (
    <article className="min-w-0 rounded-[10px] border border-dn-line bg-white px-3 pb-3.5 pt-4 sm:px-4">
      <p className="m-0 mb-2 text-[11px] font-semibold text-[#526269] sm:text-xs">{label}</p>
      {big}
      <p className="m-0 mb-3 mt-1.5 min-h-[28px] text-[10px] text-[#617075]">{note}</p>
      <div className="flex items-center justify-between gap-2 border-t border-dn-line pt-2 text-[10px] text-[#657275]">
        <span>{lastDayLabel(r)}</span>
        {day}
      </div>
    </article>
  );

  const unavailableSpendNote = r.isDefault
    ? 'The spend reader on this page reports the month to date only, so there is no yesterday figure.'
    : 'The spend reader on this page reports the whole selected range only, so there is no figure for its last day.';
  const costNote =
    data.costPerEnquiry.mtd == null
      ? 'Spend or measured enquiries are unavailable, so no cost is calculated or estimated.'
      : undefined;

  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-6 pt-6 sm:px-8 sm:pt-7">
      <div className="mb-4">
        <p className="m-0 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-dn-navy">Your daily view</p>
        <h1 className="m-0 mb-2 text-[27px] font-bold leading-tight tracking-[-1.1px] text-dn-navy sm:text-[32px]">
          How is the group doing?
        </h1>
        <p className="m-0 text-xs text-[#617075]">
          {r.isDefault ? 'Yesterday and the month so far' : 'The selected dates and their last day'}, with the evidence one click away.
        </p>
      </div>

      <div className="my-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeControl range={r} path="/next" keep={{ clinic: clinic === 'all' ? undefined : clinic }} />
          <span className="flex flex-wrap gap-1.5" role="group" aria-label="Clinic lens">
            {CLINIC_CHIPS.map((c) => (
              <a
                key={c.key}
                href={hrefWith('/next', { clinic: c.key === 'all' ? undefined : c.key, ...rangeParams(r) })}
                aria-current={c.key === clinic ? 'true' : undefined}
                className={`rounded-md border px-2.5 py-1.5 text-xs no-underline ${
                  c.key === clinic
                    ? 'border-dn-navy bg-dn-navy font-semibold text-white'
                    : 'border-dn-line bg-white text-dn-navy'
                }`}
              >
                {c.label}
              </a>
            ))}
          </span>
        </div>
        <span className="text-xs text-[#617075]">Dubai time · Live figures, opened {withYear(dayLabel(data.today), data.today)}</span>
      </div>

      <div className="mb-4 rounded-[2px] border border-l-[3px] border-dn-line border-l-dn-soft bg-white p-3 text-[11px] text-[#526269] sm:p-3.5 sm:text-xs">
        <strong className="text-dn-navy">Coverage:</strong> patient outcomes cover Al Wasl, Dr Tosun and Al Maher (Al Maher&apos;s
        feed starts {maherFrom}, so its October figures cover part of the month). Enquiries and advertising are shared across
        the clinics and are never split. Google profile data is shown through its own reported day.
        {clinicChosen ? (
          <>
            {' '}
            <strong className="text-dn-navy">You are viewing {lens.name}:</strong> booked, attended and billed show that
            clinic; enquiries, spend and cost per enquiry stay group-wide because their channels are shared.
          </>
        ) : null}
      </div>

      <div className="my-4 grid grid-cols-2 gap-2.5 lg:grid-cols-3 lg:gap-3">
        {tile(
          'Enquiries',
          clinicChosen ? 'Shared channels, not split by clinic' : 'Shared channels · Counting rule in proof',
          <Figure id="M01" display={fmtCount(data.enquiries.mtd)} dates={mtdDates} scope={SHARED_SCOPE} url={data.enquiries.urlMtd} size="large" />,
          <Figure id="M01" display={fmtCount(data.enquiries.yesterday)} dates={yDates} scope={SHARED_SCOPE} url={data.enquiries.urlYesterday} align="end" />,
        )}
        {tile(
          'Appointments booked',
          `By appointment date · ${lensScope}`,
          <Figure id="M03" display={fmtCount(lens.booked.mtd)} dates={mtdDates} scope={lensScope} url={lens.urlMtd} size="large" />,
          <Figure id="M03" display={fmtCount(lens.booked.yesterday)} dates={yDates} scope={lensScope} url={lens.urlYesterday} align="end" />,
        )}
        {tile(
          'Appointments attended',
          `Arrived or completed · ${lensScope}`,
          <Figure id="M04" display={fmtCount(lens.attended.mtd)} dates={mtdDates} scope={lensScope} url={lens.urlMtd} size="large" />,
          <Figure id="M04" display={fmtCount(lens.attended.yesterday)} dates={yDates} scope={lensScope} url={lens.urlYesterday} align="end" />,
        )}
        {tile(
          'Billed revenue',
          `As the billing system stores bills · ${lensScope}`,
          <Figure id="M06" display={fmtAed(lens.billed.mtd)} dates={mtdDates} scope={lensScope} url={lens.urlMtd} size="large" />,
          <Figure id="M06" display={fmtAed(lens.billed.yesterday)} dates={yDates} scope={lensScope} url={lens.urlYesterday} align="end" />,
        )}
        {tile(
          'Advertising spend',
          clinicChosen ? 'Google and Meta · Shared accounts, not split' : 'Google and Meta · Shared accounts',
          <Figure id="M07" display={fmtAed(data.spend.mtd)} dates={mtdDates} scope={SHARED_SCOPE} url={data.spend.urlMtd} size="large" />,
          <Figure id="M07" display={UNAVAILABLE} dates={mtdDates} scope={SHARED_SCOPE} url={data.spend.urlMtd} note={unavailableSpendNote} align="end" />,
        )}
        {tile(
          'Cost per enquiry',
          'Paid channels · measured enquiries',
          <Figure id="M08" display={fmtAedExact(data.costPerEnquiry.mtd)} dates={mtdDates} scope={SHARED_SCOPE} url={data.costPerEnquiry.urlMtd} note={costNote} size="large" />,
          <Figure id="M08" display={UNAVAILABLE} dates={mtdDates} scope={SHARED_SCOPE} url={data.costPerEnquiry.urlMtd} note={unavailableSpendNote} align="end" />,
        )}
      </div>

      <div className="my-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Panel>
          <div className="mb-3">
            <h2 className="m-0 mb-1 text-base font-bold tracking-[-0.3px] text-dn-navy sm:text-lg">Enquiries, week against week</h2>
            <p className="m-0 text-xs text-[#617075]">
              {labels.last7} compared with {labels.prior7} · Same definition and scope
            </p>
          </div>
          {data.trend.last7 != null && data.trend.prior7 != null ? (
            <TrendSvg prior7={data.trend.prior7} last7={data.trend.last7} priorLabel={labels.prior7} lastLabel={labels.last7} />
          ) : (
            <p className="my-6 text-xs text-[#617075]">One of the two 7-day windows could not be read, so the comparison is unavailable.</p>
          )}
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-md bg-[#f4f7f5] p-3">
              <p className="m-0 mb-1 text-[11px] text-[#526269]">{r.isDefault ? 'Last 7 days' : '7 days to the last day'} · {last7Dates}</p>
              <Figure id="M01" display={fmtCount(data.trend.last7)} dates={last7Dates} scope={SHARED_SCOPE} url={data.trend.urlLast7} size="large" />
            </div>
            <div className="rounded-md bg-[#f4f7f5] p-3">
              <p className="m-0 mb-1 text-[11px] text-[#526269]">The 7 before · {prior7Dates}</p>
              <Figure id="M01" display={fmtCount(data.trend.prior7)} dates={prior7Dates} scope={SHARED_SCOPE} url={data.trend.urlPrior7} size="large" />
            </div>
          </div>
          <p className="m-0 mt-3 text-[11px] text-[#667478]">
            Enquiries · M01 · Shared acquisition · The two totals are the same measure over two 7-day windows, not a per-day series.
          </p>
        </Panel>

        <Panel>
          <p className="m-0 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-dn-navy">What changed and why</p>
          <h2 className="m-0 mb-2 text-base font-bold tracking-[-0.3px] text-dn-navy sm:text-lg">The week&apos;s biggest movers</h2>
          {data.movers ? (
            <>
              <div className="border-t border-dn-line py-3 first:border-t-0">
                <h3 className="m-0 mb-1 text-sm font-semibold text-dn-navy">Up</h3>
                {moverLine(data.movers.up, 'rose')}
              </div>
              <div className="border-t border-dn-line py-3">
                <h3 className="m-0 mb-1 text-sm font-semibold text-dn-navy">Down</h3>
                {moverLine(data.movers.down, 'fell')}
              </div>
              <p className="m-0 border-t border-dn-line pt-3 text-xs text-[#5c6c72]">
                These are comparable enquiry counts over the two windows above. They do not establish what caused the change.
              </p>
            </>
          ) : (
            <p className="m-0 py-2 text-xs text-[#5c6c72]">
              One of the two 7-day windows could not be read, so the movers are unavailable.
            </p>
          )}
          <div className="border-t border-dn-line py-3">
            <h3 className="m-0 mb-1 text-sm font-semibold text-dn-navy">Keep clinic gaps visible</h3>
            <p className="m-0 text-xs text-[#5c6c72]">
              Al Maher&apos;s patient feed starts {maherFrom}. Earlier days have no Al Maher rows, and that gap must not read as
              poor clinic performance.
            </p>
          </div>
          <div className="border-t border-dn-line pt-3">
            <h3 className="m-0 mb-1 text-sm font-semibold text-dn-navy">Google reports later</h3>
            <p className="m-0 text-xs text-[#5c6c72]">
              Google profile results carry their own available-through day. Days Google has not reported yet stay unavailable.
            </p>
          </div>
        </Panel>
      </div>

      <Panel className="my-4">
        <div className="mb-3">
          <h2 className="m-0 mb-1 text-base font-bold tracking-[-0.3px] text-dn-navy sm:text-lg">{r.isDefault ? 'Clinic activity this month' : 'Clinic activity in the selected dates'}</h2>
          <p className="m-0 text-xs text-[#617075]">
            {mtdDates} · Appointments and billing are separate period measures, not an enquiry conversion funnel.
          </p>
        </div>
        <p className="m-0 mb-2 text-[11px] text-[#617075] sm:hidden">Swipe the table to see every measure.</p>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Clinic activity">
          <table className="w-full min-w-[530px] border-collapse text-left text-xs">
            <thead>
              <tr>
                {['Clinic', 'Booked appointments', 'Attended appointments', 'Billed revenue'].map((h) => (
                  <th key={h} scope="col" className="bg-[#f4f7f5] px-3 py-2.5 align-bottom text-[10px] font-semibold tracking-[0.025em] text-[#657275]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.clinics.slice(0, 3).map((row: ClinicLens) => (
                <tr key={row.key}>
                  <td className="border-b border-[#e8eeea] px-3 py-3 font-semibold text-dn-navy">
                    {row.name}
                    <small className="block text-[10px] font-normal text-[#647478]">{row.feedNote}</small>
                  </td>
                  <td className="border-b border-[#e8eeea] px-3 py-3">
                    <Figure id="M03" display={fmtCount(row.booked.mtd)} dates={mtdDates} scope={row.name} url={row.urlMtd} />
                  </td>
                  <td className="border-b border-[#e8eeea] px-3 py-3">
                    <Figure id="M04" display={fmtCount(row.attended.mtd)} dates={mtdDates} scope={row.name} url={row.urlMtd} />
                  </td>
                  <td className="border-b border-[#e8eeea] px-3 py-3">
                    <Figure id="M06" display={fmtAed(row.billed.mtd)} dates={mtdDates} scope={row.name} url={row.urlMtd} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {data.clinics.slice(3).map((row: ClinicLens) => (
                <tr key={row.key}>
                  <td className="bg-[#eef4ef] px-3 py-3 font-bold text-dn-navy">{row.name}</td>
                  <td className="bg-[#eef4ef] px-3 py-3">
                    <Figure id="M03" display={fmtCount(row.booked.mtd)} dates={mtdDates} scope="Connected clinics" url={row.urlMtd} />
                  </td>
                  <td className="bg-[#eef4ef] px-3 py-3">
                    <Figure id="M04" display={fmtCount(row.attended.mtd)} dates={mtdDates} scope="Connected clinics" url={row.urlMtd} />
                  </td>
                  <td className="bg-[#eef4ef] px-3 py-3">
                    <Figure id="M06" display={fmtAed(row.billed.mtd)} dates={mtdDates} scope="Connected clinics" url={row.urlMtd} />
                  </td>
                </tr>
              ))}
            </tfoot>
          </table>
        </div>
        <p className="m-0 mt-3 text-[11px] text-[#627277]">
          Enquiries and advertising accounts are shared; they are not divided between clinics. Al Maher&apos;s figures start with
          its feed on {maherFrom}.
        </p>
      </Panel>

      <div className="my-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel>
          <div className="mb-2">
            <h2 className="m-0 mb-1 text-base font-bold tracking-[-0.3px] text-dn-navy sm:text-lg">Programmes</h2>
            <p className="m-0 text-xs text-[#617075]">Measured outcomes and missing evidence, side by side</p>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-dn-line py-3 text-xs">
            <span>Smile Club company-reported members</span>
            <Figure
              id="M19"
              display={fmtCount(data.smileClubMembers.value)}
              dates={LIVE_DATES}
              scope="All partner companies, group-wide"
              url={data.smileClubMembers.url}
              align="end"
            />
          </div>
          <div className="flex items-center justify-between gap-4 py-3 text-xs">
            <span>DN Ortho programme billing</span>
            <Figure
              id="M25"
              display={UNAVAILABLE}
              dates={mtdDates}
              scope="DN Ortho programme, across its clinics"
              url={data.orthoProgramme.url}
              note="No bill is linked to the DN Ortho programme yet, so programme billing cannot be proved; the orthodontists' charge lines are a different measure and are not substituted."
              align="end"
            />
          </div>
          <p className="m-0 mt-1 text-[11px] text-[#627277]">
            DN Ortho&apos;s Google campaign has been live since 23 Oct 2026. Its billing stays unavailable until bills are linked to the
            programme.
          </p>
        </Panel>

        <Panel>
          <div className="mb-2">
            <h2 className="m-0 mb-1 text-base font-bold tracking-[-0.3px] text-dn-navy sm:text-lg">Google reputation</h2>
            <p className="m-0 text-xs text-[#617075]">Live when opened · All connected profiles</p>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-dn-line py-3 text-xs">
            <span>Active reviews / average rating</span>
            <span className="flex items-center gap-3">
              <Figure id="M15" display={fmtCount(data.reviews.total)} dates={LIVE_DATES} scope="All connected clinics" url={data.reviews.url} align="end" />
              <Figure id="M16" display={fmtRating(data.reviews.average)} dates={LIVE_DATES} scope="All connected clinics" url={data.reviews.url} align="end" />
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 py-3 text-xs">
            <span>Written reviews awaiting a reply</span>
            <Figure id="M18" display={fmtCount(data.awaitingReply.value)} dates={LIVE_DATES} scope="All connected clinics" url={data.awaitingReply.url} align="end" />
          </div>
        </Panel>
      </div>
    </main>
  );
}
