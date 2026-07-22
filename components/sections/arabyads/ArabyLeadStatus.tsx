import { getArabyLeadStatus, type LeadStatus, type LaneSummary } from '@/lib/arabyads/leadStatus';
import { Card, SectionHeader } from '@/components/ui/Card';

/**
 * Lead validation view for the external Araby Ads report — the two tables the
 * ads team asked for, from the client's manually-maintained status sheet:
 *   1. Lane summary (total / valid / invalid / validation rate / booked)
 *   2. Per-lead detail (status + reason for rejection + notes)
 */

const int = (n: number) => Math.round(n).toLocaleString('en-US');
const pct = (n: number | null) => (n == null ? '—' : `${Math.round(n * 100)}%`);

const STATUS_CLS: Record<LeadStatus, string> = {
  Valid: 'bg-good/10 text-good',
  Invalid: 'bg-stop/10 text-stop',
  Pending: 'bg-watch/10 text-watch',
};

function SummaryRow({ s, strong }: { s: LaneSummary; strong?: boolean }) {
  return (
    <tr className={`border-b border-line/60 ${strong ? 'font-semibold text-ink' : ''}`}>
      <td className="py-2 pr-3 text-left">{s.label}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{int(s.total)}</td>
      <td className="py-2 pr-3 text-right tabular-nums text-good">{int(s.valid)}</td>
      <td className="py-2 pr-3 text-right tabular-nums text-stop">{int(s.invalid)}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{pct(s.validationRate)}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{int(s.booked)}</td>
    </tr>
  );
}

export async function ArabyLeadStatus() {
  const data = await getArabyLeadStatus();

  if (!data.available) {
    return (
      <Card className="mt-5">
        <SectionHeader eyebrow="Leads" title="Lead validation status" />
        <div className="px-5 pb-5 pt-4">
          <p className="rounded-card border border-dashed border-line bg-panel/40 px-4 py-6 text-center text-[12.5px] text-ink-soft">
            {data.note ?? 'Lead status is not available yet.'}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="mt-5 space-y-5">
      {/* Summary */}
      <Card>
        <SectionHeader
          eyebrow="Leads"
          title="Lead validation summary"
          right={<span className="text-[11px] text-ink-faint">by campaign lane</span>}
        />
        <div className="px-5 pb-5 pt-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-faint">
                  <th className="py-2 pr-3 text-left font-medium">Campaign Lane / Offer</th>
                  <th className="py-2 pr-3 text-right font-medium">Total Leads</th>
                  <th className="py-2 pr-3 text-right font-medium">Valid</th>
                  <th className="py-2 pr-3 text-right font-medium">Invalid</th>
                  <th className="py-2 pr-3 text-right font-medium">Validation Rate</th>
                  <th className="py-2 pr-3 text-right font-medium">Booked</th>
                </tr>
              </thead>
              <tbody>
                {data.lanes.map((l) => (
                  <SummaryRow key={l.key} s={l} />
                ))}
                <SummaryRow s={data.totals} strong />
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10.5px] leading-snug text-ink-faint">
            Validation Rate = Valid ÷ (Valid + Invalid) — Pending leads are excluded until reviewed. Booked = the lead has an
            appointment noted. Status is maintained by the Dental Nation team.
          </p>
        </div>
      </Card>

      {/* Detail */}
      <Card>
        <SectionHeader
          eyebrow="Leads"
          title="Lead status detail"
          right={<span className="text-[11px] text-ink-faint">{int(data.leads.length)} leads · newest first</span>}
        />
        <div className="px-5 pb-5 pt-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-faint">
                  <th className="py-2 pr-3 text-left font-medium">Lead ID</th>
                  <th className="py-2 pr-3 text-left font-medium">Date &amp; Time</th>
                  <th className="py-2 pr-3 text-left font-medium">Patient</th>
                  <th className="py-2 pr-3 text-left font-medium">Phone</th>
                  <th className="py-2 pr-3 text-left font-medium">Clinic</th>
                  <th className="py-2 pr-3 text-left font-medium">Lane / Service</th>
                  <th className="py-2 pr-3 text-left font-medium">Status</th>
                  <th className="py-2 pr-3 text-left font-medium">Reason (if invalid)</th>
                  <th className="py-2 pr-3 text-left font-medium">Notes / Appt.</th>
                </tr>
              </thead>
              <tbody>
                {data.leads.map((l, i) => (
                  <tr key={`${l.leadId}-${i}`} className="border-b border-line/60 align-top">
                    <td className="py-2 pr-3 font-medium text-ink">{l.leadId}</td>
                    <td className="py-2 pr-3 whitespace-nowrap text-ink-soft">{l.dateTime || '—'}</td>
                    <td className="py-2 pr-3 text-ink-soft">{l.patient || '—'}</td>
                    <td className="py-2 pr-3 whitespace-nowrap text-ink-soft">{l.phone || '—'}</td>
                    <td className="py-2 pr-3 text-ink-soft">{l.clinic || '—'}</td>
                    <td className="py-2 pr-3 text-ink-soft">{l.service || '—'}</td>
                    <td className="py-2 pr-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLS[l.status]}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-ink-soft">{l.reason || (l.status === 'Invalid' ? '—' : '')}</td>
                    <td className="py-2 pr-3 text-ink-soft">
                      {l.notes || '—'}
                      {l.booked ? <span className="ml-1 rounded bg-accent/10 px-1 py-0.5 text-[10px] text-accent">booked</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}
