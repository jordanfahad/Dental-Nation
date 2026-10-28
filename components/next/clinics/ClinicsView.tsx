/**
 * The DN-032 Clinics page (mockup 03), on live figures. Server component:
 * everything is rendered from ClinicsData (lib/overview/clinics.ts), every
 * number is a Figure button whose proof drawer carries the exact URL the
 * existing detail view uses for the same dates and clinic, and a missing
 * value is always the word "Unavailable", never 0.
 */
import { dayLabel, rangeLabel } from '@/lib/alerts/shell';
import { AL_MAHER_PRACTO_FROM } from '@/config/clinics';
import { metricDef } from '@/lib/metrics/registry';
import type { ClinicsData, ClinicsRow } from '@/lib/overview/clinics';
import { dayMonthYear } from '@/lib/overview/format';
import { Figure, fmtAed, fmtCount } from '../Figure';

const withYear = (label: string, iso: string) => `${label} ${iso.slice(0, 4)}`;

/**
 * Drawer note on every M05 figure: why no missed-visit rate sits beside the
 * count yet. Two different denominators are in use on today's dashboard, so
 * the registry fixes one definition in the redesign before a rate is shown.
 */
const MISSED_RATE_NOTE =
  'No missed-visit rate is shown yet: two different denominators are in use on the current dashboard, so the redesign fixes one definition in the metric registry before a rate appears.';

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`min-w-0 rounded-[10px] border border-dn-line bg-white p-4 sm:p-5 ${className}`}>{children}</section>;
}

export function ClinicsView({ data }: { data: ClinicsData }) {
  const mtdDates = withYear(rangeLabel(data.mtd.from, data.mtd.to), data.mtd.to);
  const maherFrom = dayMonthYear(AL_MAHER_PRACTO_FROM);
  const missedName = metricDef('M05').name;
  const proxyName = metricDef('M26').name;

  const cell = (row: ClinicsRow, id: 'M03' | 'M04' | 'M06', value: string) => (
    <Figure id={id} display={value} dates={mtdDates} scope={row.name} url={row.urlMtd} />
  );

  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-6 pt-6 sm:px-8 sm:pt-7">
      <div className="mb-4">
        <p className="m-0 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-dn-navy">Clinical leadership</p>
        <h1 className="m-0 mb-2 text-[27px] font-bold leading-tight tracking-[-1.1px] text-dn-navy sm:text-[32px]">
          How are the clinics performing?
        </h1>
        <p className="m-0 text-xs text-[#617075]">A clear view of connected clinic activity, with gaps shown in the open.</p>
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

      <div className="mb-4 rounded-[2px] border border-l-[3px] border-dn-line border-l-dn-soft bg-white p-3 text-[11px] text-[#526269] sm:p-3.5 sm:text-xs">
        <strong className="text-dn-navy">Patient outcomes cover the connected clinics.</strong> Al Maher&apos;s patient-system
        feed starts {maherFrom}, so its October figures begin then. Shared enquiries live in Channels and are never split by
        clinic, because the channels serve the group as a whole.
      </div>

      <Panel>
        <div className="mb-3">
          <h2 className="m-0 mb-1 text-base font-bold tracking-[-0.3px] text-dn-navy sm:text-lg">Appointments and operating billing</h2>
          <p className="m-0 text-xs text-[#617075]">{mtdDates} · Same period and definition in every row</p>
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
              {data.rows.slice(0, 3).map((row) => (
                <tr key={row.key}>
                  <td className="border-b border-[#e8eeea] px-3 py-3 font-semibold text-dn-navy">
                    {row.name}
                    <small className="block text-[10px] font-normal text-[#647478]">{row.feedNote}</small>
                  </td>
                  <td className="border-b border-[#e8eeea] px-3 py-3">{cell(row, 'M03', fmtCount(row.booked))}</td>
                  <td className="border-b border-[#e8eeea] px-3 py-3">{cell(row, 'M04', fmtCount(row.attended))}</td>
                  <td className="border-b border-[#e8eeea] px-3 py-3">{cell(row, 'M06', fmtAed(row.billed))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {data.rows.slice(3).map((row) => (
                <tr key={row.key}>
                  <td className="bg-[#eef4ef] px-3 py-3 font-bold text-dn-navy">{row.name}</td>
                  <td className="bg-[#eef4ef] px-3 py-3">{cell(row, 'M03', fmtCount(row.booked))}</td>
                  <td className="bg-[#eef4ef] px-3 py-3">{cell(row, 'M04', fmtCount(row.attended))}</td>
                  <td className="bg-[#eef4ef] px-3 py-3">{cell(row, 'M06', fmtAed(row.billed))}</td>
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

      <div className="my-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {data.missed.map((card) => (
          <Panel key={card.key}>
            <p className="m-0 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-dn-navy">{card.name}</p>
            <h2 className="m-0 mb-2 text-base font-bold tracking-[-0.3px] text-dn-navy sm:text-lg">Follow up missed visits</h2>
            <div className="flex items-center justify-between gap-4 border-b border-dn-line py-3 text-xs">
              <span>{missedName}</span>
              <Figure
                id="M05"
                display={fmtCount(card.missed)}
                dates={mtdDates}
                scope={card.name}
                url={card.url}
                note={MISSED_RATE_NOTE}
                align="end"
              />
            </div>
            <p className="m-0 mt-3 text-[11px] text-[#627277]">
              Appointments with an explicit no-show status on the appointment day; cancellations are counted separately.
              {card.key === 'al-maher' ? ` Al Maher's feed starts ${maherFrom}, so earlier days have no appointments to count.` : ''}
            </p>
          </Panel>
        ))}
      </div>

      <div className="my-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="m-0 mb-2 text-base font-bold tracking-[-0.3px] text-dn-navy sm:text-lg">Clinical Operations</h2>
          <p className="m-0 mb-2 text-xs text-[#5c6c72]">
            Reception keeps its existing worklists and call logging. The start view changes only for people who choose another
            landing page.
          </p>
          <p className="m-0 text-[11px] text-[#627277]">Patient records, contact details and staff identities are not part of this preview.</p>
        </Panel>
        <Panel>
          <h2 className="m-0 mb-2 text-base font-bold tracking-[-0.3px] text-dn-navy sm:text-lg">Billing has one basis</h2>
          <p className="m-0 mb-2 text-xs text-[#5c6c72]">
            Operating billing shows bills exactly as the billing system stores them, so bills later marked cancelled are still
            included until the finance cancellation policy is agreed. Cash collected and reconciled Finance reports are
            separately named reports, not this figure.
          </p>
          <p className="m-0 mb-3 text-[11px] text-[#627277]">
            The buttons open Revenue by conducting doctor, pinned to the same dates and clinic. Its charge lines follow the
            same per-doctor rule as the {proxyName} (M26) but cover every conducting doctor, not only the DN Ortho
            orthodontists, and they are a different measure from billed revenue (M06).
          </p>
          <div className="flex flex-wrap gap-2">
            {data.billing.map((b) => (
              <a
                key={b.key}
                className="inline-block rounded-md border border-dn-line bg-white px-3.5 py-2 text-xs font-semibold text-dn-navy no-underline"
                href={b.url}
              >
                {b.name} billing proof
              </a>
            ))}
          </div>
        </Panel>
      </div>
    </main>
  );
}
