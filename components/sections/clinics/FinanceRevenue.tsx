import { Card, SectionHeader } from '@/components/ui/Card';
import { getFinanceRevenue } from '@/lib/finance/revenue';

/**
 * Finance 2026 — the finance section of the Mega Board Report, from the
 * CFO-side workbook handover (Jawad, Data Drop). GROSS BILLED per Zoho
 * invoice lines, aggregated clinic x month x doctor x department. Deliberately
 * separate from the Group Revenue clinic cards: those are historical PMS
 * imports with mixed money measures; this is one consistent measure for 2026.
 */

const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`;
const aedK = (n: number) =>
  n >= 1_000_000 ? `AED ${(n / 1_000_000).toFixed(2)}M` : `AED ${Math.round(n / 1000).toLocaleString('en-US')}K`;
const pct = (n: number) => `${(n * 100).toFixed(n >= 0.1 ? 0 : 1)}%`;
const monthLabel = (ym: string) =>
  new Date(`${ym}-01T00:00:00Z`).toLocaleString('en-GB', { month: 'short', year: undefined, timeZone: 'UTC' });

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-card border border-line bg-panel/30 px-4 py-3">
      <p className="text-[10.5px] uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-1 text-[20px] font-semibold tabular-nums tracking-tight text-ink">{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-ink-faint">{sub}</p> : null}
    </div>
  );
}

function ShareBar({ share }: { share: number }) {
  return (
    <div className="h-1.5 w-full max-w-[160px] rounded-full bg-panel">
      <div className="h-1.5 rounded-full bg-accent" style={{ width: `${Math.max(2, Math.round(share * 100))}%` }} />
    </div>
  );
}

export async function FinanceRevenue() {
  const data = await getFinanceRevenue();

  if (!data.available) {
    return (
      <Card>
        <SectionHeader eyebrow="Finance" title="Finance — group revenue" />
        <div className="px-5 pb-5 pt-4">
          <p className="rounded-card border border-dashed border-line bg-panel/40 px-4 py-6 text-center text-[12.5px] text-ink-soft">
            {data.note ?? 'No finance data loaded yet.'}
          </p>
        </div>
      </Card>
    );
  }

  const rangeLabel =
    data.firstYm && data.lastYm ? `${monthLabel(data.firstYm)}–${monthLabel(data.lastYm)} 2026` : '2026';
  const maxMonth = Math.max(...data.months.map((m) => m.total), 1);

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader
          eyebrow="Finance"
          title={`DN Group revenue — ${rangeLabel}`}
          right={<span className="text-[11px] text-ink-faint">gross billed · Zoho invoice lines</span>}
        />
        <div className="px-5 pb-5 pt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Total billed" value={aedK(data.total)} sub={`${data.lineCount.toLocaleString('en-US')} invoice lines`} />
            <Tile label="Monthly average" value={aedK(data.monthlyAvg)} sub={`${data.months.length} months`} />
            <Tile
              label="Best month"
              value={data.bestMonth ? aedK(data.bestMonth.total) : '—'}
              sub={data.bestMonth ? `${monthLabel(data.bestMonth.ym)} 2026` : undefined}
            />
            <Tile
              label="Top clinic"
              value={data.clinicTotals[0]?.label ?? '—'}
              sub={data.clinicTotals[0] ? `${aedK(data.clinicTotals[0].value)} · ${pct(data.clinicTotals[0].share)} of group` : undefined}
            />
          </div>

          {/* Monthly trend, clinic-by-clinic */}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-faint">
                  <th className="py-2 pr-3 text-left font-medium">Month</th>
                  {data.clinics.map((c) => (
                    <th key={c} className="py-2 pr-3 text-right font-medium">{c}</th>
                  ))}
                  <th className="py-2 pr-3 text-right font-medium">Group</th>
                  <th className="py-2 pl-2 text-left font-medium" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {data.months.map((m) => (
                  <tr key={m.ym} className="border-b border-line/60">
                    <td className="py-2 pr-3 font-medium text-ink">{monthLabel(m.ym)}</td>
                    {data.clinics.map((c) => (
                      <td key={c} className="py-2 pr-3 text-right tabular-nums text-ink-soft">
                        {m.byClinic[c] ? Math.round(m.byClinic[c]).toLocaleString('en-US') : '—'}
                      </td>
                    ))}
                    <td className="py-2 pr-3 text-right font-semibold tabular-nums text-ink">
                      {Math.round(m.total).toLocaleString('en-US')}
                    </td>
                    <td className="py-2 pl-2">
                      <div className="h-2 rounded-full bg-accent/80" style={{ width: `${Math.max(3, Math.round((m.total / maxMonth) * 100))}px` }} />
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="py-2 pr-3 font-semibold text-ink">Total</td>
                  {data.clinics.map((c) => {
                    const t = data.clinicTotals.find((x) => x.label === c);
                    return (
                      <td key={c} className="py-2 pr-3 text-right font-semibold tabular-nums text-ink">
                        {t ? Math.round(t.value).toLocaleString('en-US') : '—'}
                      </td>
                    );
                  })}
                  <td className="py-2 pr-3 text-right font-semibold tabular-nums text-ink">
                    {Math.round(data.total).toLocaleString('en-US')}
                  </td>
                  <td className="py-2 pl-2" />
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10.5px] leading-snug text-ink-faint">
            All figures AED, gross billed from the clinics&apos; Zoho invoice lines — shared by Finance (Jawad) via the
            Data Drop, {data.loadedAt ? `loaded ${new Date(data.loadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'loaded'}.
            Group total reconciled against the workbook&apos;s own dashboard to the fils. Distinct from the Group Revenue
            clinic cards (historical PMS imports, mixed collected/billed measures) — this view is one consistent
            measure for 2026. DIFC is in the workbook but has no invoice lines yet.
          </p>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Finance" title="Revenue by department" />
          <div className="px-5 pb-5 pt-4">
            <table className="w-full border-collapse text-[12.5px]">
              <tbody>
                {data.deptMix.map((d) => (
                  <tr key={d.label} className="border-b border-line/60">
                    <td className="py-2 pr-3 text-ink-soft">{d.label}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-ink">{aed(d.value)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-ink-faint">{pct(d.share)}</td>
                    <td className="py-2 pl-2"><ShareBar share={d.share} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[10.5px] leading-snug text-ink-faint">
              Department split computed from the raw invoice lines. Note for Finance: the workbook&apos;s own
              department pivot is stale for July–August (e.g. Endodontics shows 0 while its raw lines total
              ~AED 67.6K in July) — this view follows the lines.
            </p>
          </div>
        </Card>

        <Card>
          <SectionHeader eyebrow="Finance" title="Top doctors by billed revenue" />
          <div className="px-5 pb-5 pt-4">
            <table className="w-full border-collapse text-[12.5px]">
              <tbody>
                {data.topDoctors.map((d) => (
                  <tr key={`${d.doctor}-${d.clinic}`} className="border-b border-line/60">
                    <td className="py-2 pr-3 font-medium text-ink">{d.doctor}</td>
                    <td className="py-2 pr-3 text-ink-faint">{d.clinic}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-ink">{aed(d.gross)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
