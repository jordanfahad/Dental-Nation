import { getFormEntries } from '@/lib/ops/formEntries';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import { ownerFor } from '@/config/data-gap-owners';

/**
 * Campaign / site form entries (the watched sheet tabs) — the entries behind
 * the "New entry" alert emails, as a workable list. One row per person:
 * repeat submissions collapse with a count, and a phone already in the
 * booking-widget worklist above is flagged so nobody calls the same lead
 * twice. ArabyAds-lane tags use the same source parser as every araby panel.
 */

const int = (n: number) => Math.round(n).toLocaleString('en-US');

function ago(ms: number | null): string {
  if (!ms) return '—';
  const h = (Date.now() - ms) / 3600_000;
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m ago`;
  if (h < 24) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export async function FormEntriesPanel({ range }: { range?: { from?: string; to?: string } }) {
  const data = await getFormEntries(range ?? {});

  const kpis: KpiItem[] = [
    { label: 'People (deduped)', value: int(data.total), hint: `${int(data.rawEntries)} submissions` },
    { label: 'Last 7 days', value: int(data.last7d) },
    ...data.byLane.map((l) => ({ label: `ArabyAds · ${l.label}`, value: int(l.count), hint: 'lane-tagged' })),
    { label: 'Already in widget list', value: int(data.alsoInWidget), hint: 'same phone above — no second call' },
  ];

  return (
    <Card>
      <SectionHeader
        tag="OPS3"
        eyebrow="Inbox · watched form tabs"
        title="Campaign & site form entries"
        right={<span className="text-[11px] text-ink-faint">live · synced every 15 min</span>}
      />
      <div className="px-5 pb-5 pt-4">
        {data.source === 'empty' ? (
          <DataGapInline
            detail="No form entries synced yet — the watched tabs fill this automatically on the next sync run."
            owner={ownerFor('clinic')}
          />
        ) : (
          <>
            <KpiBand items={kpis} />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[860px] text-[12.5px]">
                <thead>
                  <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                    <th className="py-2 pr-3">Received</th>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Phone</th>
                    <th className="py-2 pr-3">Treatment / interest</th>
                    <th className="py-2 pr-3">Form</th>
                    <th className="py-2 pr-3">Campaign</th>
                    <th className="py-2 pl-3">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.key} className="border-b border-line/60 align-top">
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        <span className="block font-medium text-ink">{ago(r.submittedMs)}</span>
                        {r.submittedIso ? (
                          <span className="block text-[10.5px] text-ink-faint">{r.submittedIso.slice(0, 16).replace('T', ' ')}</span>
                        ) : null}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="block font-medium text-ink">{r.name ?? '—'}</span>
                        {r.email ? <span className="block text-[10.5px] text-ink-faint">{r.email}</span> : null}
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap tabular-nums">{r.phone ?? '—'}</td>
                      <td className="py-2.5 pr-3">{r.treatment ?? '—'}</td>
                      <td className="py-2.5 pr-3">{r.tab ?? '—'}</td>
                      <td className="py-2.5 pr-3">
                        {r.laneLabel ? (
                          <span className="inline-block rounded bg-panel px-1.5 py-0.5 text-[10.5px] font-medium text-ink">
                            ArabyAds · {r.laneLabel}
                          </span>
                        ) : (
                          <span className="text-[11px] text-ink-faint">{r.source ?? '—'}</span>
                        )}
                      </td>
                      <td className="py-2.5 pl-3">
                        {r.submissions > 1 ? (
                          <span className="mr-2 inline-block rounded bg-panel px-1.5 py-0.5 text-[10.5px] text-ink-soft">
                            ×{r.submissions} submissions
                          </span>
                        ) : null}
                        {r.alsoInWidget ? (
                          <span className="inline-block rounded bg-watch/10 px-1.5 py-0.5 text-[10.5px] font-medium text-watch">
                            already in widget list
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Takeaway>
              Entries from the watched form tabs, one row per person — repeat submissions collapse into a count, and{' '}
              <strong>already in widget list</strong> means the same phone appears in the booking-widget worklist above, so
              it does not need a second call. ArabyAds campaign tags use the same source rule as the araby panels
              {data.untagged > 0 ? <> ({int(data.untagged)} entries carry no campaign tag)</> : null}. New entries also
              email the ops alert list the moment they arrive.
            </Takeaway>
          </>
        )}
      </div>
    </Card>
  );
}
