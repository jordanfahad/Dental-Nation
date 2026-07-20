import { getLeadForms, type LeadOutcome } from '@/lib/ops/leadForms';
import { OPS_ALERT_EMAILS } from '@/config/ops';
import { Card, SectionHeader } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import { ownerFor } from '@/config/data-gap-owners';
import { dubaiDateLabel } from '@/lib/dates';

const int = (n: number) => Math.round(n).toLocaleString('en-US');

const OUTCOME: Record<LeadOutcome, { label: string; cls: string }> = {
  attended: { label: 'Attended', cls: 'bg-good/10 text-good' },
  booked: { label: 'Booked', cls: 'bg-accent/10 text-accent' },
  noshow: { label: 'No-show', cls: 'bg-watch/10 text-watch' },
  cancelled: { label: 'Cancelled', cls: 'bg-panel-2 text-ink-soft' },
  notfound: { label: 'Not in Practo', cls: 'bg-stop/10 text-stop' },
};

/** "3m ago" / "2h ago" / "4d ago" from an epoch-ms. */
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
 * Clinical Operations tab — the reception + ops desk view. Live website
 * booking-widget lead forms with the contact + requested-appointment details to
 * follow up, and whether each has reached Practo yet. New submissions also fire
 * an email alert to the ops inbox (see the notice below).
 */
export async function ClinicalOps({ range }: { range?: { from?: string; to?: string } }) {
  const data = await getLeadForms(range ?? {});

  const kpis: KpiItem[] = [
    { label: 'New today', value: int(data.today), hint: 'last 24 hours' },
    { label: 'Last 7 days', value: int(data.last7d) },
    { label: 'Total (range)', value: int(data.total), hint: 'non-test lead forms' },
    { label: 'Reached Practo', value: int(data.reachedPracto), hint: 'matched by phone' },
    { label: 'Needs follow-up', value: int(data.notInPracto), hint: 'not in Practo yet' },
  ];

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader
          tag="OPS"
          eyebrow="Reception & operations"
          title="Website lead forms"
          right={<span className="text-[11px] text-ink-faint">live · booking widget</span>}
        />
        <div className="px-5 pb-5 pt-4">
          <p className="text-[12.5px] leading-snug text-ink-soft">
            Every lead form submitted on the website booking widget, newest first — with the contact details and requested
            appointment to follow up, and whether it has reached Practo yet.{' '}
            <span className="font-medium text-ink-soft">Needs follow-up</span> = the phone isn&apos;t in Practo, so it still needs
            booking.
          </p>
          <p className="mt-2 rounded-card border border-line bg-panel/40 px-3 py-2 text-[11.5px] text-ink-soft">
            🔔 New submissions alert:{' '}
            <span className="font-medium text-ink">{OPS_ALERT_EMAILS.join(', ')}</span>
          </p>
        </div>
      </Card>

      <Card>
        <SectionHeader tag="OPS1" eyebrow="At a glance" title="Lead volume" />
        <div className="px-5 pb-5 pt-4">
          <KpiBand items={kpis} />
        </div>
      </Card>

      <Card>
        <SectionHeader tag="OPS2" eyebrow="Inbox" title="Lead forms to action" />
        <div className="px-5 pb-5 pt-4">
          {data.source === 'empty' ? (
            <DataGapInline detail="No website lead forms in this period." owner={ownerFor('clinic')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-[12.5px]">
                <thead>
                  <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                    <th className="py-2 pr-3">Received</th>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Phone</th>
                    <th className="py-2 pr-3">Treatment</th>
                    <th className="py-2 pr-3">Preferred clinic</th>
                    <th className="py-2 pr-3">Requested</th>
                    <th className="py-2 pr-3">Lane</th>
                    <th className="py-2 pl-3">Practo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => {
                    const o = OUTCOME[r.outcome];
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
                          <span className="block">{r.treatment ?? '—'}</span>
                          {r.details ? <span className="block max-w-[200px] truncate text-[10.5px] text-ink-faint" title={r.details}>{r.details}</span> : null}
                        </td>
                        <td className="py-2.5 pr-3 text-ink-soft">
                          <span className="block">{r.clinic ?? '—'}</span>
                          {r.doctor ? <span className="block text-[10.5px] text-ink-faint">{r.doctor}</span> : null}
                        </td>
                        <td className="py-2.5 pr-3 whitespace-nowrap text-ink-soft">{r.requestedDate ?? '—'}</td>
                        <td className="py-2.5 pr-3 text-ink-soft">{r.lane ?? '—'}</td>
                        <td className="py-2.5 pl-3">
                          <span className={`inline-block rounded px-1.5 py-0.5 text-[10.5px] font-medium ${o.cls}`}>{o.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
