/**
 * DN Ortho dashboard (/next/ortho): Dr Luvi's live view of the lead funnel,
 * spend, enquiries, appointments, treatment starts and revenue, by week and
 * by segment. Every figure comes from readOrthoDashboard (lib/ortho/dashboard.ts),
 * the read the Monday DN Ortho email uses, and opens its proof in the drawer.
 * A source that cannot be read is "Unavailable", never 0. Server component.
 */
import { dayLabel } from '@/lib/alerts/shell';
import type { OrthoDashboard, Funnel } from '@/lib/ortho/dashboard';
import { DNO_SEARCH_CAMPAIGN } from '@/lib/ortho/dashboard';
import { marketingLink, growthLink, practoLink, type Range } from '@/lib/alerts/links';
import { dayMonthYear, rangeDates } from '@/lib/overview/format';
import type { ViewRange } from '@/lib/overview/range';
import type { MetricId } from '@/lib/metrics/registry';
import { Figure, UNAVAILABLE, fmtAed, fmtCount } from '../Figure';
import { DateRangeControl } from '../DateRangeControl';

const NO_LINK =
  'Practo cannot link a patient to a lead or a campaign, so these are all orthodontist patients, whatever brought them.';
const META_NOTE = 'People who started a chat (or sent a form) from a Meta ortho ad; "real" means they sent at least two messages.';
const LEADS_NOTE = 'Lead tracker lead tabs whose Campaign / Offer or Service text names ortho work. The opened Growth view counts all enquiries.';

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

export function OrthoView({ data, range }: { data: OrthoDashboard; range: ViewRange }) {
  const dates = rangeDates(range);
  const proof = (r: Range) => ({
    google: marketingLink('google', r, { gcamp: DNO_SEARCH_CAMPAIGN }),
    meta: marketingLink('meta', r),
    leads: growthLink(r),
    appts: practoLink('appointments', r),
    bills: practoLink('revenue', r),
  });
  const p = proof(range);

  const fig = (id: MetricId, v: number | null, kind: 'count' | 'aed', d: string, url: string, note?: string, size: 'small' | 'large' = 'small') => (
    <Figure id={id} display={kind === 'aed' ? fmtAed(v) : fmtCount(v)} dates={d} scope="DN Ortho, all clinics" url={url} note={note} size={size} />
  );

  const t = data.total;
  const tiles: { label: string; node: React.ReactNode; sub?: string }[] = [
    { label: 'Ad spend', node: fig('O01', t.spend, 'aed', dates, p.google, undefined, 'large'), sub: `Google ${fmtAed(t.googleSpend)} · Meta ${fmtAed(t.metaSpend)}` },
    { label: 'Meta chats, real', node: fig('O05', t.metaRealPeople, 'count', dates, p.meta, META_NOTE, 'large'), sub: `${fmtCount(t.metaPeople)} started a chat` },
    { label: 'Google clicks', node: fig('O03', t.googleClicks, 'count', dates, p.google, undefined, 'large'), sub: `${fmtCount(t.googleImpressions)} impressions` },
    { label: 'Ortho enquiries', node: fig('O06', t.leads, 'count', dates, p.leads, LEADS_NOTE, 'large'), sub: `${fmtCount(t.leadsBooked)} booked or arrived` },
    { label: 'Orthodontist visits attended', node: fig('O08', t.attended, 'count', dates, p.appts, NO_LINK, 'large'), sub: `${fmtCount(t.newAttended)} new patients` },
    { label: 'Assessments', node: fig('O10', t.assessments, 'count', dates, p.bills, NO_LINK, 'large'), sub: 'Pre-orthodontic visits billed' },
    { label: 'Treatment starts', node: fig('O11', t.starts, 'count', dates, p.bills, NO_LINK, 'large'), sub: fmtAed(t.startsAed) },
    { label: 'Ortho billing', node: fig('O12', t.orthoBilled, 'aed', dates, p.bills, NO_LINK, 'large'), sub: 'All ortho bill lines' },
  ];

  const weekRow = (label: string, r: Range, f: Funnel, total = false) => {
    const cls = total ? tdTotal : td;
    const d = rangeDates(r);
    const w = proof(r);
    return (
      <tr key={label}>
        <td className={`${cls} whitespace-nowrap font-semibold text-dn-navy`}>{label}</td>
        <td className={cls}>{fig('O01', f.spend, 'aed', d, w.google)}</td>
        <td className={cls}>{fig('O03', f.googleClicks, 'count', d, w.google)}</td>
        <td className={cls}>{fig('O05', f.metaRealPeople, 'count', d, w.meta, META_NOTE)}</td>
        <td className={cls}>{fig('O06', f.leads, 'count', d, w.leads, LEADS_NOTE)}</td>
        <td className={cls}>{fig('O07', f.leadsBooked, 'count', d, w.leads, LEADS_NOTE)}</td>
        <td className={cls}>{fig('O08', f.attended, 'count', d, w.appts, NO_LINK)}</td>
        <td className={cls}>{fig('O09', f.newAttended, 'count', d, w.appts, NO_LINK)}</td>
        <td className={cls}>{fig('O10', f.assessments, 'count', d, w.bills, NO_LINK)}</td>
        <td className={cls}>{fig('O11', f.starts, 'count', d, w.bills, NO_LINK)}</td>
        <td className={cls}>{fig('O12', f.orthoBilled, 'aed', d, w.bills, NO_LINK)}</td>
      </tr>
    );
  };

  const liveLine = (what: string, day: string | null) =>
    day == null ? `${what}: no spend in these dates` : day >= range.to ? `${what}: live` : `${what}: last spend ${dayMonthYear(day)}`;

  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-6 pt-6 sm:px-8 sm:pt-7">
      <div className="mb-4">
        <p className="m-0 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-dn-navy">DN Ortho</p>
        <h1 className="m-0 mb-2 text-[27px] font-bold leading-tight tracking-[-1.1px] text-dn-navy sm:text-[32px]">
          Is DN Ortho turning ad spend into patients?
        </h1>
        <p className="m-0 text-xs text-[#617075]">
          Spend, enquiries, appointments, treatment starts and billing, week by week and by segment. The Monday DN Ortho email uses the same figures.
        </p>
      </div>

      <div className="my-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeControl range={range} path="/next/ortho" />
          <span className="rounded-md border border-dn-line bg-white px-2.5 py-1.5 text-xs text-dn-navy">{liveLine('Google Search', data.live.google)}</span>
          <span className="rounded-md border border-dn-line bg-white px-2.5 py-1.5 text-xs text-dn-navy">{liveLine('Meta', data.live.meta)}</span>
        </div>
        <span className="text-xs text-[#617075]">Dubai time · {dates}</span>
      </div>

      <Panel id="funnel" className="border-t-4 border-t-dn-navy">
        <Head kicker="Funnel" title="From ad spend to treatment" sub={dates} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {tiles.map((x) => (
            <div key={x.label} className="min-w-0 rounded-lg border border-dn-line p-3">
              <p className="m-0 mb-1 text-[11px] font-semibold text-[#5c6c72]">{x.label}</p>
              {x.node}
              {x.sub && <p className="m-0 mt-1 text-[11px] text-[#647578]">{x.sub}</p>}
            </div>
          ))}
        </div>
        <Note>
          Ads and enquiries are DN Ortho only. Visits, assessments, starts and billing are every orthodontist patient in Practo, because Practo cannot
          yet link a patient to a lead or a campaign.
        </Note>
      </Panel>

      <Panel id="weeks">
        <Head kicker="Week by week" title="Monday to Sunday" sub={dates} />
        <Table
          label="DN Ortho by week"
          minWidth="min-w-[980px]"
          head={['Week', 'Ad spend', 'Google clicks', 'Meta chats, real', 'Enquiries', 'Booked or arrived', 'Visits attended', 'New patients', 'Assessments', 'Starts', 'Ortho billing']}
        >
          {data.weeks.map((w) => weekRow(rangeDates(w.range), w.range, w.funnel))}
          {weekRow('Total', range, t, true)}
        </Table>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel id="segments" className="my-0">
          <Head kicker="Segments" title="S1 adults, S2 after braces, S3 parents" sub={dates} />
          <Table label="DN Ortho by segment" minWidth="min-w-[420px]" head={['Segment', 'Google Search spend', 'Share', 'Enquiries with the segment code']}>
            {data.segments.map((s) => {
              const sum = data.segments.reduce((a, x) => a + (x.googleSpend ?? 0), 0);
              return (
                <tr key={s.key}>
                  <td className={`${td} font-semibold text-dn-navy`}>{s.name}</td>
                  <td className={td}>{fig('O02', s.googleSpend, 'aed', dates, p.google)}</td>
                  <td className={td}>{s.googleSpend == null || !sum ? UNAVAILABLE : `${Math.round((s.googleSpend / sum) * 100)}%`}</td>
                  <td className={td}>{fig('O06', s.leadsTagged, 'count', dates, p.leads, 'Enquiries whose row carries the code DNO-S1, DNO-S2 or DNO-S3.')}</td>
                </tr>
              );
            })}
          </Table>
          <Note>
            Spend is the DN Ortho Search campaign, split by ad group. Enquiries get a segment once the WhatsApp message carries a code such as
            DNO-S1 and the front office keeps it in the tracker; until then this column stays at 0.
          </Note>
        </Panel>

        <Panel id="leads" className="my-0">
          <Head kicker="Enquiries" title="What happened to ortho enquiries" sub={dates} />
          {data.outcomes == null ? (
            <p className="m-0 text-xs text-[#617075]">{UNAVAILABLE}: the lead tracker could not be read.</p>
          ) : (
            <Table label="Ortho enquiry outcomes" minWidth="min-w-[320px]" head={['Status in the lead tracker', 'Enquiries', 'Share']}>
              {data.outcomes.map((o) => {
                const all = data.outcomes!.reduce((a, x) => a + x.count, 0);
                return (
                  <tr key={o.key}>
                    <td className={`${td} font-semibold text-dn-navy`}>{o.label}</td>
                    <td className={td}>{fig(o.key === 'booked' ? 'O07' : 'O06', o.count, 'count', dates, p.leads, LEADS_NOTE)}</td>
                    <td className={td}>{all ? `${Math.round((o.count / all) * 100)}%` : '0%'}</td>
                  </tr>
                );
              })}
            </Table>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel id="meta">
          <Head kicker="Meta" title="Ortho ad sets" sub={dates} />
          {data.metaAdSets == null ? (
            <p className="m-0 text-xs text-[#617075]">{UNAVAILABLE}: Meta Ads could not be read.</p>
          ) : (
            <Table label="Meta ortho ad sets" minWidth="min-w-[460px]" head={['Ad set or campaign', 'Spend', 'Chats started / real', 'AED per real chat', 'Last spend']}>
              {data.metaAdSets.map((m) => (
                <tr key={m.name}>
                  <td className={`${td} font-semibold text-dn-navy`}>{m.name}</td>
                  <td className={td}>{fig('O04', m.spend, 'aed', dates, p.meta)}</td>
                  <td className={td}>{fig('O05', m.realPeople, 'count', dates, p.meta, `${m.people} started a chat. ${META_NOTE}`)}</td>
                  <td className={td}>{m.realPeople ? `AED ${Math.round(m.spend / m.realPeople)}` : 'None yet'}</td>
                  <td className={td}>{dayLabel(m.lastDay)}</td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>

        <Panel id="clinic">
          <Head kicker="Clinics" title="Orthodontist appointments" sub={dates} />
          <Table label="Orthodontist appointments" minWidth="min-w-[420px]" head={['Orthodontist', 'Clinic', 'Appointments', 'Attended', 'New patients']}>
            {data.doctors.map((d) => (
              <tr key={d.name}>
                <td className={`${td} font-semibold text-dn-navy`}>{d.name}</td>
                <td className={td}>{d.clinic}</td>
                <td className={td}>{fig('O08', d.appointments, 'count', dates, p.appts, NO_LINK)}</td>
                <td className={td}>{fig('O08', d.attended, 'count', dates, p.appts, NO_LINK)}</td>
                <td className={td}>{fig('O09', d.newAttended, 'count', dates, p.appts, NO_LINK)}</td>
              </tr>
            ))}
          </Table>
          <Note>Al Maher appointments are in Practo from 22 Oct 2026. {NO_LINK}</Note>
        </Panel>
      </div>
    </main>
  );
}
