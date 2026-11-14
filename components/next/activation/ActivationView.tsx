/**
 * The Clinic Activation page (Dr Luvi's daily report), on live figures, in
 * the DN-032 design. Server component: everything is rendered from
 * ActivationData (lib/overview/activation.ts), every number is a Figure
 * button whose proof drawer carries the detail view built with the 09:00
 * email link builders, and a missing value is always "Unavailable" (or
 * "Not yet" for DN Ortho billing, or the date daily copies start for the
 * front office GMB tab), never 0.
 *
 * Five sections, in order, each showing yesterday (the last selected day)
 * and the selected window: Leads, Smile Club, Google Business Profile (front
 * office), Revenue (Practo and the AMC daily sheet, kept apart) and DN Ortho.
 */
import { dayLabel } from '@/lib/alerts/shell';
import type { ActivationData, GmbLine } from '@/lib/overview/activation';
import { amcMonthFileLine, CONVERTED_RULE, DOCTOR_RULE, SNAPSHOT_NOTE, TOSUN_LEADS_NOTE } from '@/lib/overview/activationCopy';
import { dayMonthYear, rangeDates } from '@/lib/overview/format';
import { lastDayLabel, periodDates, rangeOfData, type ViewRange } from '@/lib/overview/range';
import type { MetricId } from '@/lib/metrics/registry';
import { Figure, NOT_YET_LABEL, UNAVAILABLE, fmtAed, fmtCount } from '../Figure';
import { DateRangeControl } from '../DateRangeControl';

const withYear = (label: string, iso: string) => `${label} ${iso.slice(0, 4)}`;

/** Text where the front office GMB tab has no daily copy yet; never 0. */
const GMB_NO_COPY = 'Daily copies start 29 Oct 2026';

const LEADS_NOTE =
  'Counted from the lead tabs of the Inhouse Lead Tracker (Smile Club, GMB and website tabs left out). The opened Growth view counts enquiries with its own rules, so its total can differ.';
const SMILE_NOTE =
  'Counted from the Smile Club tab of the Inhouse Lead Tracker. The opened Growth view shows the Partnerships (Smile Club) channel row, which counts with its own rules, so it can differ.';
const GBP_NOTE =
  'As entered by the front office in the lead tracker GMB tab, snapshotted daily. The opened Social & Local view shows Google’s own review count for comparison.';
const AMC_NOTE =
  'From Al Maher’s daily sheet (Dr Luvi’s Revenue AMC sheet, one Report tab per day), not Practo. The button opens that sheet.';
const ORTHO_REASON =
  'Practo does not record the treating doctor on almost all billed work, so a doctor with no named figure on Revenue by conducting doctor shows not yet, never 0.';
const TOGETHER_NOTE =
  'Al Wasl and Dr Tosun added together. The opened Executive view’s group total also includes Al Maher’s Practo bills, so it can be higher.';
const FO_CLINIC: Record<string, string> = { 'dental-nation': 'Al Wasl', 'dr-tosun': 'Dr Tosun', 'al-maher': 'Al Maher' };
const UNREAD = (what: string) => `The ${what} could not be read when this page was opened.`;

function Panel({ id, children, className = '' }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`my-4 min-w-0 scroll-mt-4 rounded-[10px] border border-dn-line bg-white p-4 sm:p-5 ${className}`}>
      {children}
    </section>
  );
}

function Head({ kicker, title, sub }: { kicker: string; title: string; sub: string }) {
  return (
    <div className="mb-3">
      <p className="m-0 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-dn-navy">{kicker}</p>
      <h2 className="m-0 mb-1 text-base font-bold tracking-[-0.3px] text-dn-navy sm:text-lg">{title}</h2>
      <p className="m-0 text-xs text-[#617075]">{sub}</p>
    </div>
  );
}

const th = 'bg-[#f4f7f5] px-3 py-2.5 align-bottom text-[10px] font-semibold tracking-[0.025em] text-[#657275]';
const td = 'border-b border-[#e8eeea] px-3 py-3 align-top';
const tdTotal = 'bg-[#eef4ef] px-3 py-3 align-top';
const muted = 'text-[11px] text-[#647578]';

function Table({ label, head, minWidth, children }: { label: string; head: string[]; minWidth: string; children: React.ReactNode }) {
  return (
    <>
      <p className="m-0 mb-2 text-[11px] text-[#617075] sm:hidden">Swipe the table to see every measure.</p>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={label}>
        <table className={`w-full ${minWidth} border-collapse text-left text-xs`}>
          <thead>
            <tr>
              {head.map((h, i) => (
                <th key={`${h}-${i}`} scope="col" className={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="m-0 mt-3 text-[11px] text-[#627277]">{children}</p>;
}

/** "1 to 26 Oct 2026, 28 Oct 2026": consecutive days folded into ranges. */
function dayRuns(days: string[]): string {
  const runs: { from: string; to: string }[] = [];
  for (const d of [...days].sort()) {
    const last = runs[runs.length - 1];
    const next = last ? new Date(`${last.to}T12:00:00Z`) : null;
    next?.setUTCDate(next.getUTCDate() + 1);
    if (last && next && next.toISOString().slice(0, 10) === d) last.to = d;
    else runs.push({ from: d, to: d });
  }
  return runs.map(rangeDates).join(', ');
}

/** The page's sections; a project page shows only its own (Ms Shadi, 14 Nov 2026: one home per project). */
export type ActivationPanel = 'leads' | 'smile-club' | 'gbp' | 'revenue' | 'ortho';

export function ActivationView({
  data, range, only, embedPath,
}: {
  data: ActivationData;
  range?: ViewRange;
  /** Sections to show, in page order; omitted = all five. */
  only?: readonly ActivationPanel[];
  /** Set when embedded in a project page: no page heading, and the date control stays on that page. */
  embedPath?: string;
}) {
  const show = (p: ActivationPanel) => !only || only.includes(p);
  // The range the data was read for; without one it is the default month to yesterday.
  const r = range ?? rangeOfData(data.window, data.today);
  const wDates = periodDates(r);
  const yDates = dayMonthYear(data.yesterday.to);
  const yHead = lastDayLabel(r);
  const wHead = r.isDefault ? 'Month to date' : 'Selected dates';
  const sub = `${yHead === 'Yesterday' ? `Yesterday, ${yDates}` : yHead} and ${wDates}`;

  /** One count or AED figure; null shows Unavailable with the reason in the drawer. */
  const fig = (
    id: MetricId, value: number | null, kind: 'count' | 'aed', dates: string, scope: string, url: string,
    note?: string, unavailableNote?: string,
  ) => (
    <Figure
      id={id}
      display={kind === 'aed' ? fmtAed(value) : fmtCount(value)}
      dates={dates}
      scope={scope}
      url={url}
      note={value == null && unavailableNote ? `${unavailableNote} ${note ?? ''}`.trim() : note}
    />
  );

  const { leads, smileClub, gbp, revenue, ortho } = data;
  const leadsUnread = leads.read ? undefined : UNREAD('lead tracker rows');
  const smileUnread = smileClub.read ? undefined : UNREAD('Smile Club tab rows');
  const gbpUnread = gbp.read ? undefined : UNREAD('daily copies of the GMB tab');
  const amc = revenue.amc;
  const amcUnread = amc.read ? undefined : UNREAD('AMC daily reports');
  const amcYNote = amc.read && !amc.yesterdayReported ? 'There is no Report tab for this day on the AMC daily sheet.' : undefined;
  const amcWNote = amc.read && amc.daysReported === 0 ? 'There is no Report tab in these dates on the AMC daily sheet.' : undefined;
  const practoUnavailable = 'Practo billed revenue was not available when this page was opened.';
  const campaignNote = !ortho.read
    ? UNREAD('stored Google Ads rows')
    : !ortho.live
      ? 'The campaign has no reported activity on these days yet, so no figure is shown rather than 0.'
      : undefined;
  const campaignYNote = ortho.live && ortho.spend.yesterday == null ? 'The campaign had no activity on this day.' : campaignNote;

  const gmbRow = (line: GmbLine) => {
    const cls = line.key === 'total' ? tdTotal : td;
    const s = line.latest;
    const w = line.window;
    const scope = line.key === 'total' ? 'All clinics, added together' : line.name;
    const copyDates = s ? dayMonthYear(s.snapshotDay) : '';
    const gf = (id: MetricId, v: number | null, dates: string) => fig(id, v, 'count', dates, scope, gbp.googleUrl, GBP_NOTE, gbpUnread);
    return (
      <tr key={line.key}>
        <td className={`${cls} font-semibold text-dn-navy`}>{line.key === 'total' ? 'All clinics' : line.name}</td>
        {line.key === 'total' ? (
          <td className={`${cls} ${muted}`} colSpan={6}>Latest copies are per clinic</td>
        ) : !gbp.read ? (
          <>
            <td className={`${cls} ${muted}`}>{UNAVAILABLE}</td>
            <td className={`${cls} ${muted}`}>{UNAVAILABLE}</td>
            <td className={cls}>{gf('A07', null, wDates)}</td>
            <td className={cls}>{gf('A08', null, wDates)}</td>
            <td className={cls}>{gf('A09', null, wDates)}</td>
            <td className={cls}>{gf('A10', null, wDates)}</td>
          </>
        ) : s ? (
          <>
            <td className={cls}>{s.foName ?? <span className={muted}>Not entered</span>}</td>
            <td className={cls}>{copyDates}</td>
            <td className={cls}>{gf('A07', s.reviewsToday, copyDates)}</td>
            <td className={cls}>{gf('A08', s.reviewsTotal, copyDates)}</td>
            <td className={cls}>{gf('A09', s.photos, copyDates)}</td>
            <td className={cls}>{gf('A10', s.videos, copyDates)}</td>
          </>
        ) : (
          <td className={`${cls} ${muted}`} colSpan={6}>{GMB_NO_COPY}</td>
        )}
        {gbp.read && w.days === 0 ? (
          <td className={`${cls} ${muted}`} colSpan={4}>{GMB_NO_COPY}</td>
        ) : (
          <>
            <td className={cls}>{gf('A11', gbp.read ? w.days : null, wDates)}</td>
            <td className={cls}>{gf('A07', w.reviewsToday, wDates)}</td>
            <td className={cls}>{gf('A09', w.photos, wDates)}</td>
            <td className={cls}>{gf('A10', w.videos, wDates)}</td>
          </>
        )}
      </tr>
    );
  };

  return (
    <Wrap embedded={!!embedPath}>
      {embedPath ? null : <div className="mb-4">
        <p className="m-0 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-dn-navy">Clinic Activation</p>
        <h1 className="m-0 mb-2 text-[27px] font-bold leading-tight tracking-[-1.1px] text-dn-navy sm:text-[32px]">
          Are the clinics turning activity into patients?
        </h1>
        <p className="m-0 text-xs text-[#617075]">
          Dr Luvi&apos;s daily report: leads, Smile Club, Google Business Profile, revenue and DN Ortho, each source named.
        </p>
      </div>}

      <div className="my-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeControl range={r} path={embedPath ?? '/next/activation'} />
          <span className="rounded-md border border-dn-line bg-white px-2.5 py-1.5 text-xs text-dn-navy">All clinics</span>
        </div>
        <span className="text-xs text-[#617075]">Dubai time · Live figures, opened {withYear(dayLabel(data.today), data.today)}</span>
      </div>

      {/* a. Leads */}
      {show('leads') && <Panel id="leads" className="border-t-4 border-t-dn-navy">
        <Head kicker="Leads" title="Leads per clinic" sub={sub} />
        <Table
          label="Leads per clinic"
          minWidth="min-w-[640px]"
          head={['Clinic', `Leads · ${yHead}`, `Leads · ${wHead}`, `Converted · ${yHead}`, `Converted · ${wHead}`, `Top platforms · ${wHead}`]}
        >
          {leads.lines.map((l) => {
            const cls = l.key === 'total' ? tdTotal : td;
            const scope = l.key === 'total' ? 'All clinics, with leads not assigned to a clinic' : l.name;
            return (
              <tr key={l.key}>
                <td className={`${cls} font-semibold text-dn-navy`}>{l.name}</td>
                <td className={cls}>{fig('A01', l.yesterday.leads, 'count', yDates, scope, l.urlYesterday, LEADS_NOTE, leadsUnread)}</td>
                <td className={cls}>{fig('A01', l.window.leads, 'count', wDates, scope, l.urlWindow, LEADS_NOTE, leadsUnread)}</td>
                <td className={cls}>{fig('A02', l.yesterday.converted, 'count', yDates, scope, l.urlYesterday, LEADS_NOTE, leadsUnread)}</td>
                <td className={cls}>{fig('A02', l.window.converted, 'count', wDates, scope, l.urlWindow, LEADS_NOTE, leadsUnread)}</td>
                <td className={cls}>
                  {!leads.read ? (
                    fig('A03', null, 'count', wDates, scope, l.urlWindow, LEADS_NOTE, leadsUnread)
                  ) : l.platforms.length ? (
                    <span className="flex flex-col gap-1">
                      {l.platforms.map((p) => (
                        <span key={p.label} className="flex items-center justify-between gap-3">
                          <span>{p.label}</span>
                          {fig('A03', p.count, 'count', wDates, `${scope} · ${p.label}`, l.urlWindow, LEADS_NOTE)}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className={muted}>No leads in these dates</span>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
        <Note>
          Source: the Inhouse Lead Tracker lead tabs, by enquiry date. Smile Club, GMB and website tabs are left out. {CONVERTED_RULE}{' '}
          {TOSUN_LEADS_NOTE} The proof opens the Growth enquiries for the same dates. {SNAPSHOT_NOTE}
        </Note>
      </Panel>}

      {/* b. Smile Club */}
      {show('smile-club') && <Panel id="smile-club" className="border-t-4 border-t-dn-soft">
        <Head kicker="Smile Club" title="Smile Club enquiries and follow-up" sub={sub} />
        <Table
          label="Smile Club enquiries per clinic"
          minWidth="min-w-[680px]"
          head={['Clinic', `Enquiries · ${yHead}`, `Enquiries · ${wHead}`, `Followed up · ${yHead}`, `Followed up · ${wHead}`, `Converted · ${yHead}`, `Converted · ${wHead}`]}
        >
          {smileClub.lines.map((l) => {
            const cls = l.key === 'total' ? tdTotal : td;
            const scope = l.key === 'total' ? 'All clinics, with enquiries not assigned to a clinic' : l.name;
            const f = (id: MetricId, v: number | null, y: boolean) =>
              fig(id, v, 'count', y ? yDates : wDates, scope, y ? l.urlYesterday : l.urlWindow, SMILE_NOTE, smileUnread);
            return (
              <tr key={l.key}>
                <td className={`${cls} font-semibold text-dn-navy`}>{l.name}</td>
                <td className={cls}>{f('A04', l.yesterday.enquiries, true)}</td>
                <td className={cls}>{f('A04', l.window.enquiries, false)}</td>
                <td className={cls}>{f('A05', l.yesterday.followedUp, true)}</td>
                <td className={cls}>{f('A05', l.window.followedUp, false)}</td>
                <td className={cls}>{f('A06', l.yesterday.converted, true)}</td>
                <td className={cls}>{f('A06', l.window.converted, false)}</td>
              </tr>
            );
          })}
        </Table>
        <Note>
          Source: the lead tracker&apos;s Smile Club tab. Followed up means a follow-up remark is entered; converted means the
          Status column says Booked or Arrived, or the Conversion column says booked.{smileClub.undated ? ' Rows with no readable date are left out.' : ''}{' '}
          <a className="font-semibold text-dn-navy underline underline-offset-4" href={smileClub.companiesUrl}>
            Open the company pipeline
          </a>
        </Note>
      </Panel>}

      {/* c. Google Business Profile (front office) */}
      {show('gbp') && <Panel id="gbp">
        <Head kicker="Google Business Profile · front office" title="Reviews, photos and videos as entered" sub={sub} />
        <div className="mb-3 rounded-[2px] border border-l-[3px] border-dn-line border-l-dn-soft bg-white p-3 text-[11px] text-[#526269] sm:text-xs">
          <strong className="text-dn-navy">As entered by the front office in the lead tracker GMB tab, snapshotted daily.</strong>{' '}
          The tab is overwritten every day, so the dashboard keeps one copy per day. {GMB_NO_COPY}.
        </div>
        <Table
          label="Front office GMB entries per clinic"
          minWidth="min-w-[900px]"
          head={['Clinic', 'Front office', 'Latest copy', 'Reviews today', 'Reviews total', 'Photos', 'Videos', `Days copied · ${wHead}`, `Reviews · ${wHead}`, `Photos · ${wHead}`, `Videos · ${wHead}`]}
        >
          {gbp.lines.map(gmbRow)}
        </Table>
        <Note>
          These are the front office&apos;s own entries, not Google&apos;s figures.{' '}
          <a className="font-semibold text-dn-navy underline underline-offset-4" href={gbp.googleUrl}>
            Open Google&apos;s own review count
          </a>
        </Note>
        {gbp.frontOffice.length > 0 && (
          <>
            <h3 className="m-0 mb-2 mt-5 text-sm font-bold text-dn-navy">Front office performance · {wHead}</h3>
            <Table label="Front office performance" minWidth="min-w-[480px]" head={['Front office', 'Clinic', 'Reviews collected', 'Photos', 'Videos', 'Days reported']}>
              {gbp.frontOffice.map((f) => (
                <tr key={`${f.clinic}-${f.foName}`}>
                  <td className={`${td} font-semibold text-dn-navy`}>{f.foName}</td>
                  <td className={td}>{FO_CLINIC[f.clinic]}</td>
                  <td className={td}>{fmtCount(f.reviewsToday)}</td>
                  <td className={td}>{fmtCount(f.photos)}</td>
                  <td className={td}>{fmtCount(f.videos)}</td>
                  <td className={td}>{fmtCount(f.days)}</td>
                </tr>
              ))}
            </Table>
            <Note>Per person, from the same GMB tab, added up over the selected dates.</Note>
          </>
        )}
      </Panel>}

      {/* d. Revenue: the same measures for every clinic, each row with its source (Dr Luvi, 9 Nov 2026) */}
      {show('revenue') && <Panel id="revenue">
        <Head kicker="Revenue" title="Billed revenue per clinic" sub={sub} />
        <Table label="Billed revenue per clinic" minWidth="min-w-[640px]" head={['Clinic', `Billed · ${yHead}`, `Billed · ${wHead}`, `Bills · ${wHead}`, 'Source']}>
          {revenue.rows.map((r) => {
            const cls = r.key === 'total' ? tdTotal : td;
            const id: MetricId = r.key === 'al-maher' ? 'A13' : r.key === 'total' ? 'A12' : 'M06';
            return (
              <tr key={r.key}>
                <td className={`${cls} font-semibold text-dn-navy`}>{r.name}</td>
                <td className={cls}>{fig(id, r.yesterday, 'aed', yDates, r.name, r.urlYesterday, r.source, r.key === 'al-maher' ? amcYNote ?? 'There is no AMC Report tab for this day.' : practoUnavailable)}</td>
                <td className={cls}>{fig(id, r.window, 'aed', wDates, r.name, r.urlWindow, r.source)}</td>
                <td className={cls}>{fmtCount(r.billsWindow)}</td>
                <td className={cls}>
                  <a className="text-[11px] font-semibold text-dn-navy underline underline-offset-4" href={r.sourceUrl}>{r.source}</a>
                </td>
              </tr>
            );
          })}
        </Table>
        <Note>
          Al Wasl and Dr Tosun from Practo bills; Al Maher from Dr Luvi&apos;s AMC daily sheet. Days with no AMC Report tab show as Unavailable, never 0.
          {' '}{AMC_NOTE}
          {amc.monthFile ? ` ${amcMonthFileLine(amc.monthFile)}` : ''}
        </Note>
        <p className="m-0 mt-2 flex flex-wrap items-center gap-1.5 text-xs text-[#5c6c72]">
          AMC days reported:
          <Figure
            id="A22"
            display={fmtCount(amc.daysReported)}
            dates={wDates}
            scope="Al Maher"
            url={amc.sheetUrl}
            note={amc.read ? AMC_NOTE : `${amcUnread} ${AMC_NOTE}`}
          />
        </p>
        <p className="m-0 mt-1 text-xs text-[#5c6c72]">
          Missing days:{' '}
          {amc.missingDays == null ? UNAVAILABLE : amc.missingDays.length ? dayRuns(amc.missingDays) : 'none'}
        </p>

        <h3 className="m-0 mb-2 mt-5 text-sm font-bold text-dn-navy">Revenue by doctor · {wHead}</h3>
        {revenue.doctors == null ? (
          <p className="m-0 text-xs text-[#617075]">{UNAVAILABLE}: doctor revenue could not be read.</p>
        ) : (
          <Table label="Revenue by doctor" minWidth="min-w-[640px]" head={['Doctor', 'Clinic', `Billed · ${yHead}`, `Billed · ${wHead}`, 'Bills', 'Source']}>
            {revenue.doctors.map((l) => (
              <tr key={`${l.clinicName}-${l.doctor}`}>
                <td className={`${td} font-semibold text-dn-navy`}>{l.doctor}</td>
                <td className={td}>{l.clinicName}</td>
                <td className={td}>{fmtAed(l.yesterday)}</td>
                <td className={td}>{fmtAed(l.window)}</td>
                <td className={td}>{fmtCount(l.billsWindow)}</td>
                <td className={td}>
                  <a className="text-[11px] font-semibold text-dn-navy underline underline-offset-4" href={l.sourceUrl}>{l.source}</a>
                </td>
              </tr>
            ))}
          </Table>
        )}
        <Note>{DOCTOR_RULE}</Note>

        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-semibold text-dn-navy">AMC daily sheet detail (appointments, payment split)</summary>
          <div className="mt-2">
            <Table label="AMC daily sheet" minWidth="min-w-[340px]" head={['Measure', yHead, wHead]}>
              {amc.measures.map((m) => (
                <tr key={m.id}>
                  <td className={`${td} font-semibold text-dn-navy`}>{m.label}</td>
                  <td className={td}>{fig(m.id, m.yesterday, m.unit === 'AED' ? 'aed' : 'count', yDates, 'Al Maher', amc.sheetUrl, AMC_NOTE, amcUnread ?? amcYNote)}</td>
                  <td className={td}>{fig(m.id, m.window, m.unit === 'AED' ? 'aed' : 'count', wDates, 'Al Maher', amc.sheetUrl, AMC_NOTE, amcUnread ?? amcWNote)}</td>
                </tr>
              ))}
            </Table>
          </div>
        </details>
      </Panel>}

      {/* e. DN Ortho */}
      {show('ortho') && <Panel id="ortho">
        <Head kicker="DN Ortho" title="Campaign and orthodontist billing" sub={sub} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="min-w-0">
            <h3 className="m-0 mb-2 text-sm font-bold text-dn-navy">Google Search campaign</h3>
            <Table label="DN Ortho campaign" minWidth="min-w-[340px]" head={['Measure', yHead, wHead]}>
              <tr>
                <td className={`${td} font-semibold text-dn-navy`}>Spend</td>
                <td className={td}>{fig('M31', ortho.spend.yesterday, 'aed', yDates, 'DN Ortho campaign', ortho.campaignUrlYesterday, undefined, campaignYNote)}</td>
                <td className={td}>{fig('M31', ortho.spend.window, 'aed', wDates, 'DN Ortho campaign', ortho.campaignUrlWindow, undefined, campaignNote)}</td>
              </tr>
              <tr>
                <td className={`${td} font-semibold text-dn-navy`}>Clicks</td>
                <td className={td}>{fig('M32', ortho.clicks.yesterday, 'count', yDates, 'DN Ortho campaign', ortho.campaignUrlYesterday, undefined, campaignYNote)}</td>
                <td className={td}>{fig('M32', ortho.clicks.window, 'count', wDates, 'DN Ortho campaign', ortho.campaignUrlWindow, undefined, campaignNote)}</td>
              </tr>
            </Table>
            <Note>{ortho.live ? 'The campaign is live.' : 'No campaign activity yet in these dates.'} The campaign has been live since 23 Oct 2026. Clicks are not patient enquiries.</Note>
          </div>
          <div className="min-w-0">
            <h3 className="m-0 mb-2 text-sm font-bold text-dn-navy">Orthodontist billing · {wHead.toLowerCase()}</h3>
            <Table label="Orthodontist billing" minWidth="min-w-[400px]" head={['Orthodontist', 'Clinic', `Billed · ${wHead}`]}>
              {ortho.doctors.map((d) => (
                <tr key={d.name}>
                  <td className={`${td} font-semibold text-dn-navy`}>{d.name}</td>
                  <td className={td}>{d.clinicLabel}</td>
                  <td className={td}>
                    <Figure
                      id="M26"
                      display={d.billed == null ? NOT_YET_LABEL : fmtAed(d.billed)}
                      dates={wDates}
                      scope={d.name}
                      url={d.url}
                      note={d.billed == null ? ORTHO_REASON : undefined}
                    />
                  </td>
                </tr>
              ))}
              <tr>
                <td className={`${tdTotal} font-bold text-dn-navy`} colSpan={2}>Three orthodontists together</td>
                <td className={tdTotal}>
                  <Figure
                    id="M26"
                    display={ortho.billedTotal == null ? NOT_YET_LABEL : fmtAed(ortho.billedTotal)}
                    dates={wDates}
                    scope="Dr Hasna Alsaeed, Dr Yasmin Youssef and Dr Yahya Tosun"
                    url={ortho.billingUrl}
                    note={ortho.billedTotal == null ? ORTHO_REASON : undefined}
                  />
                </td>
              </tr>
            </Table>
            <Note>
              Not yet means: {ORTHO_REASON} Billing is shown for the selected dates only. It is a proxy for the doctors&apos;
              activity, not DN Ortho programme revenue.
            </Note>
          </div>
        </div>
      </Panel>}
    </Wrap>
  );
}

/** The page's own <main>, or a plain block when embedded in a project page. */
function Wrap({ embedded, children }: { embedded: boolean; children: React.ReactNode }) {
  return embedded
    ? <div className="min-w-0">{children}</div>
    : <main className="mx-auto max-w-[1440px] px-4 pb-6 pt-6 sm:px-8 sm:pt-7">{children}</main>;
}
