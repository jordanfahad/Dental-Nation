import { getFormEntries } from '@/lib/ops/formEntries';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import { ownerFor } from '@/config/data-gap-owners';

/**
 * Live ArabyAds offer-form leads on the Araby Ads tab — the "Offer form Leads"
 * sheet rows, lane-tagged by the campaign parser and deduped per person (same
 * read layer as the Clinical Ops panel, so the two views can never disagree).
 *
 * This is a THIRD population, distinct from the two the tab already shows:
 * widget bookings stamped ArabyAds (the money signal above) and the manual
 * lead-status sheet ArabyAds maintains (the validation summary). These are
 * the raw form submissions arriving from the campaign landing pages, minutes
 * old — the earliest signal the campaign produces.
 */

const int = (n: number) => Math.round(n).toLocaleString('en-US');

export async function ArabyOfferFormLeads({ range }: { range?: { from?: string; to?: string } }) {
  const data = await getFormEntries(range ?? {});
  const laneRows = data.rows.filter((r) => r.laneKey);
  const kpis: KpiItem[] = [
    { label: 'People (deduped)', value: int(laneRows.length), hint: 'lane-tagged form submissions' },
    ...data.byLane.map((l) => ({ label: l.label, value: int(l.count) })),
    {
      label: 'Also in widget list',
      value: int(laneRows.filter((r) => r.alsoInWidget).length),
      hint: 'same phone in the booking-widget worklist',
    },
  ];

  return (
    <Card>
      <SectionHeader
        tag="A5b"
        eyebrow="Enquiries · live offer forms"
        title="Offer-form leads (campaign landing pages)"
        right={<span className="text-[11px] text-ink-faint">live · synced every 15 min</span>}
      />
      <div className="px-5 pb-5 pt-4">
        {data.source === 'empty' || laneRows.length === 0 ? (
          <DataGapInline detail="no lane-tagged offer-form leads in range" owner={ownerFor('clinic')} />
        ) : (
          <>
            <KpiBand items={kpis} />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-[12.5px]">
                <thead>
                  <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                    <th className="py-2 pr-3">Received</th>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Phone</th>
                    <th className="py-2 pr-3">Offer / treatment</th>
                    <th className="py-2 pr-3">Lane</th>
                    <th className="py-2 pl-3">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {laneRows.map((r) => (
                    <tr key={r.key} className="border-b border-line/60 align-top">
                      <td className="py-2.5 pr-3 whitespace-nowrap text-ink-soft">
                        {r.submittedIso ? r.submittedIso.slice(0, 16).replace('T', ' ') : '—'}
                      </td>
                      <td className="py-2.5 pr-3 font-medium text-ink">{r.name ?? '—'}</td>
                      <td className="py-2.5 pr-3 whitespace-nowrap tabular-nums">{r.phone ?? '—'}</td>
                      <td className="py-2.5 pr-3">{r.treatment ?? '—'}</td>
                      <td className="py-2.5 pr-3">
                        <span className="inline-block rounded bg-panel px-1.5 py-0.5 text-[10.5px] font-medium text-ink">{r.laneLabel}</span>
                      </td>
                      <td className="py-2.5 pl-3">
                        {r.submissions > 1 ? (
                          <span className="mr-2 inline-block rounded bg-panel px-1.5 py-0.5 text-[10.5px] text-ink-soft">×{r.submissions} submissions</span>
                        ) : null}
                        {r.alsoInWidget ? (
                          <span className="inline-block rounded bg-watch/10 px-1.5 py-0.5 text-[10.5px] font-medium text-watch">also in widget list</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Takeaway>
              Raw submissions from the campaign landing-page offer forms, deduped per person — the earliest signal the
              campaign produces, ahead of widget bookings (A3) and the manual validation sheet ArabyAds maintains. The
              same entries are worked from Clinical Operations, where reception logs the calls.
            </Takeaway>
          </>
        )}
      </div>
    </Card>
  );
}
