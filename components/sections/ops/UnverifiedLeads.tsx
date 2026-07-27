import { getUnverifiedLeads, type LeadState } from '@/lib/ops/unverifiedLeads';
import { Card, SectionHeader } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import { ownerFor } from '@/config/data-gap-owners';
import { dubaiDateLabel } from '@/lib/dates';

const int = (n: number) => Math.round(n).toLocaleString('en-US');

const STATE: Record<LeadState, { label: string; cls: string; hint: string }> = {
  converted: { label: 'Converted', cls: 'bg-good/10 text-good', hint: 'later booked (verified)' },
  inpracto: { label: 'In Practo', cls: 'bg-accent/10 text-accent', hint: 'appointment exists' },
  open: { label: 'Needs call', cls: 'bg-stop/10 text-stop', hint: 'no booking yet' },
};

function ago(ms: number | null): string {
  if (ms == null) return '—';
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function dateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const t = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai' });
  return `${dubaiDateLabel(iso.slice(0, 10))} ${t}`;
}

/**
 * Unverified enquiries (the booking sheet's "Leads" tab) — people who started
 * the booking flow and requested an OTP but never completed WhatsApp
 * verification. Separate population from the verified bookings above; shown as
 * a call-centre worklist, with whether each person later booked anyway.
 */
export async function UnverifiedLeads({ range }: { range?: { from?: string; to?: string } }) {
  const data = await getUnverifiedLeads(range ?? {});

  const kpis: KpiItem[] = [
    { label: 'New today', value: int(data.today), hint: 'last 24 hours' },
    { label: 'Last 7 days', value: int(data.last7d) },
    { label: 'Total (range)', value: int(data.total), hint: 'unverified enquiries' },
    { label: 'Converted later', value: int(data.converted), hint: 'same phone, verified booking' },
    { label: 'Needs a call', value: int(data.open), hint: 'no booking anywhere' },
  ];

  return (
    <Card>
      <SectionHeader
        tag="OPS3"
        eyebrow="Call-centre worklist"
        title="Unverified enquiries"
        right={<span className="text-[11px] text-ink-faint">live · booking widget → Leads</span>}
      />
      <div className="px-5 pb-5 pt-4">
        <p className="text-[12.5px] leading-snug text-ink-soft">
          People who started a booking and gave their details but never completed WhatsApp/OTP verification — so they never
          became a booking. Lower intent, but real demand worth calling.{' '}
          <span className="font-medium text-ink-soft">Needs a call</span> = the phone has no verified booking and no Practo
          appointment.
        </p>

        <div className="mt-4">
          <KpiBand items={kpis} />
        </div>

        <div className="mt-4">
          {data.source === 'missing' ? (
            <DataGapInline
              detail="Unverified-lead feed not set up yet — run migration 0011_unverified_leads.sql, then the next sync fills it."
              owner={ownerFor('clinic')}
            />
          ) : data.source === 'empty' ? (
            <DataGapInline detail="No unverified enquiries in this period." owner={ownerFor('clinic')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-[12.5px]">
                <thead>
                  <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                    <th className="py-2 pr-3">Received</th>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Phone</th>
                    <th className="py-2 pr-3">Service / treatment</th>
                    <th className="py-2 pr-3">Preferred clinic</th>
                    <th className="py-2 pr-3">Requested</th>
                    <th className="py-2 pr-3">Widget status</th>
                    <th className="py-2 pl-3">Follow-up</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => {
                    const st = STATE[r.state];
                    return (
                      <tr key={r.key} className="border-b border-line/60 align-top">
                        <td className="py-2.5 pr-3 whitespace-nowrap">
                          <span className="block font-medium text-ink">{ago(r.submittedMs)}</span>
                          <span className="block text-[10.5px] text-ink-faint">{dateTime(r.submittedIso)}</span>
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className="block font-medium text-ink">{r.name ?? '—'}</span>
                          {r.email ? <span className="block text-[10.5px] text-ink-faint">{r.email}</span> : null}
                        </td>
                        <td className="py-2.5 pr-3 whitespace-nowrap">
                          {r.phone ? (
                            <a href={`tel:${r.phone.replace(/\s/g, '')}`} className="font-mono text-[12px] text-accent hover:underline">
                              {r.phone}
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-2.5 pr-3 text-ink-soft">
                          <span className="block">{r.service ?? '—'}</span>
                          {r.treatment ? (
                            <span className="block max-w-[200px] truncate text-[10.5px] text-ink-faint" title={r.treatment}>
                              {r.treatment}
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2.5 pr-3 text-ink-soft">
                          <span className="block">{r.clinic ?? '—'}</span>
                          {r.doctor ? <span className="block text-[10.5px] text-ink-faint">{r.doctor}</span> : null}
                        </td>
                        <td className="py-2.5 pr-3 whitespace-nowrap text-ink-soft">{r.requestedDate ?? '—'}</td>
                        <td className="py-2.5 pr-3 text-ink-soft">{r.status ?? '—'}</td>
                        <td className="py-2.5 pl-3">
                          <span className={`inline-block rounded px-1.5 py-0.5 text-[10.5px] font-medium ${st.cls}`} title={st.hint}>
                            {st.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
