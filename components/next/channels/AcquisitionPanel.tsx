/**
 * Cost per lead and cost per patient by channel (Ms Shadi, 17 Nov 2026), on
 * the Channels page. Data: lib/channels/acquisition.ts. Server component.
 * A missing or not-computable figure reads "not yet", never 0.
 */
import type { Acquisition, AcqRow } from '@/lib/channels/acquisition';
import { MATCH_DAYS } from '@/lib/channels/acquisition';

const th = 'bg-[#f4f7f5] px-3 py-2.5 align-bottom text-[10px] font-semibold tracking-[0.025em] text-[#657275] text-right first:text-left';
const td = 'border-b border-[#e8eeea] px-3 py-2.5 align-top text-right tabular-nums whitespace-nowrap first:text-left first:whitespace-normal';
const fmt = (n: number, dp = 0) => n.toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp });
const dayMonth = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${iso}T12:00:00Z`));

function Aed({ v }: { v: number | null }) {
  return v == null ? <span className="text-[#8a9598]">not yet</span> : <>AED {fmt(v, v < 100 ? 2 : 0)}</>;
}

function Row({ r, total }: { r: AcqRow; total?: boolean }) {
  const b = total ? 'font-bold text-dn-navy' : '';
  return (
    <tr>
      <td className={`${td} ${total ? 'font-bold' : 'font-semibold'} text-dn-navy`}>{r.name}</td>
      <td className={`${td} ${b}`}><Aed v={r.spend} /></td>
      <td className={`${td} ${b}`}>{fmt(r.grossLeads)}</td>
      <td className={`${td} ${b}`}>{fmt(r.netLeads)}</td>
      <td className={`${td} ${b}`}><Aed v={r.cplGross} /></td>
      <td className={`${td} ${b}`}><Aed v={r.cplNet} /></td>
      <td className={`${td} ${b}`}>{fmt(r.booked)}</td>
      <td className={`${td} ${b}`}><Aed v={r.costPerBooking} /></td>
      <td className={`${td} ${b}`}>{fmt(r.attended)}</td>
      <td className={`${td} ${b}`}><Aed v={r.cac} /></td>
    </tr>
  );
}

export function AcquisitionPanel({ data }: { data: Acquisition }) {
  return (
    <section id="cpl-cac" className="mx-auto max-w-[1440px] scroll-mt-4 px-4 pb-6 sm:px-8">
      <div className="min-w-0 rounded-[10px] border border-dn-line bg-white p-4 sm:p-5">
        <p className="m-0 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-dn-navy">Acquisition cost</p>
        <h2 className="m-0 mb-1 text-base font-bold tracking-[-0.3px] text-dn-navy sm:text-lg">Cost per lead and cost per patient, by channel</h2>
        <p className="m-0 mb-3 text-xs text-[#617075]">
          {dayMonth(data.range.from)} to {dayMonth(data.range.to)}. Gross leads are every lead-tracker row; net leads are unique people by phone.
          Booked and attended come from Practo: a lead whose phone has an appointment within {MATCH_DAYS} days of the enquiry
          (attended = Arrived or Completed). CAC = spend per attended patient.
        </p>
        {!data.read ? (
          <p className="m-0 text-[12.5px] text-[#647578]">The lead tracker or Practo could not be read just now.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-[12.5px] text-dn-ink">
              <thead>
                <tr>
                  <th className={th}>Channel</th><th className={th}>Ad spend</th>
                  <th className={th}>Leads gross</th><th className={th}>Leads net</th>
                  <th className={th}>CPL gross</th><th className={th}>CPL net</th>
                  <th className={th}>Booked</th><th className={th}>Cost per booking</th>
                  <th className={th}>Attended</th><th className={th}>CAC</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => <Row key={r.channel} r={r} />)}
                <Row r={data.total} total />
              </tbody>
            </table>
          </div>
        )}
        <ul className="m-0 mt-3 list-disc pl-5 text-[11px] text-[#647578]">
          <li>Meta spend leaves out Smile Club campaigns. Google Ads leads are not logged per lead in the tracker yet, so Google shows spend with no cost per lead.</li>
          <li>Practo covers Al Wasl and Dr Tosun; patients booked at Al Maher are not matched yet, so bookings and CAC can be understated.</li>
          {data.noPhone ? <li>{fmt(data.noPhone)} tracker rows have no usable phone number and cannot be matched to Practo.</li> : null}
          <li>Leads from the last {MATCH_DAYS} days can still book, so recent figures will rise.</li>
        </ul>
      </div>
    </section>
  );
}
