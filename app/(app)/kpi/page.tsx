import { redirect } from 'next/navigation';
import Link from 'next/link';
import { currentUser } from '@/lib/auth/role';
import { getKpiComparisons, fmtKpiValue, fmtVariance, type KpiComparison } from '@/lib/room/kpiTargets';
import { PLATFORM_LAYERS } from '@/config/platform-layers';

export const dynamic = 'force-dynamic';

/**
 * LEVEL 3 — Target vs Actual ("are we achieving what we said we would?").
 *
 * Deliberately a SEPARATE page from the live reporting, and more sensitive:
 * it lives behind the dashboard login (middleware) AND a role check here —
 * admin and viewer (leadership) only; staff and receptionist roles are
 * redirected. The share-room token has NO route to this data: the room's
 * "KPI performance" CTA points at this URL, which serves nothing without an
 * authorised session — nothing sensitive is shipped client-side.
 */
export default async function KpiTargetsPage({
  searchParams,
}: {
  searchParams: Promise<{ layer?: string }>;
}) {
  const me = await currentUser();
  if (!me || (me.role !== 'admin' && me.role !== 'viewer')) redirect('/');

  const sp = await searchParams;
  const layerFilter = sp.layer || undefined;
  const rows = await getKpiComparisons(layerFilter);
  const anyExample = rows.some((r) => r.example);
  const layerName = (slug: string) => PLATFORM_LAYERS.find((l) => l.slug === slug)?.title ?? slug;
  const layerNo = (slug: string) => PLATFORM_LAYERS.find((l) => l.slug === slug)?.n ?? '';

  const bySlug = new Map<string, KpiComparison[]>();
  for (const r of rows) {
    if (!bySlug.has(r.layerSlug)) bySlug.set(r.layerSlug, []);
    bySlug.get(r.layerSlug)!.push(r);
  }

  const STATUS: Record<KpiComparison['status'], { label: string; cls: string }> = {
    ahead: { label: 'Ahead', cls: 'bg-good/10 text-good' },
    'on-target': { label: 'On target', cls: 'bg-panel text-ink-soft' },
    behind: { label: 'Behind', cls: 'bg-stop/10 text-stop' },
    'no-data': { label: 'Awaiting data', cls: 'bg-panel text-ink-faint' },
  };

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-6 md:px-8">
      <div className="mb-4 border-b border-line pb-3">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-faint">
          Platform performance · restricted — leadership access
        </p>
        <h1 className="mt-0.5 text-[17px] font-semibold tracking-tight text-ink">
          KPI performance — target vs actual{layerFilter ? ` · ${layerName(layerFilter)}` : ''}
        </h1>
        <p className="mt-1 max-w-[760px] text-[12px] leading-snug text-ink-soft">
          The live reports answer &ldquo;what is happening?&rdquo;. This page answers &ldquo;are we achieving what we
          said we would achieve?&rdquo; — each KPI against its management-set target, with variance and status.
        </p>
        {layerFilter ? (
          <p className="mt-2 text-[11.5px]">
            <Link href="/kpi" className="font-medium text-accent no-underline">← All layers</Link>
          </p>
        ) : null}
      </div>

      {anyExample ? (
        <p className="mb-4 rounded-card border border-dashed border-watch/50 bg-watch/5 px-4 py-3 text-[12px] leading-snug text-ink-soft">
          <span className="font-semibold text-ink">Illustrative examples.</span> The rows below marked
          &ldquo;example&rdquo; show the comparison logic only — they are NOT real performance data. They will be
          replaced as management supplies the target dataset (each row is one record in the
          <span className="font-mono text-[11px]"> platform_kpi_targets</span> table; targets and actuals can be
          updated there at any time without a deployment).
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="rounded-card border border-dashed border-line bg-panel/40 px-4 py-8 text-center text-[12.5px] text-ink-soft">
          No KPI targets recorded{layerFilter ? ' for this layer' : ''} yet — management supplies targets into the
          platform_kpi_targets table and they appear here immediately.
        </p>
      ) : (
        <div className="space-y-6">
          {[...bySlug.entries()].map(([slug, list]) => (
            <section key={slug} className="rounded-card border border-line bg-card">
              <div className="flex items-start justify-between gap-4 px-5 pt-4">
                <h2 className="text-[14px] font-semibold text-ink">
                  <span className="mr-2 tabular-nums text-ink-faint">{layerNo(slug)}</span>
                  {layerName(slug)}
                </h2>
              </div>
              <div className="overflow-x-auto px-5 pb-5 pt-3">
                <table className="w-full min-w-[720px] text-[12.5px]">
                  <thead>
                    <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                      <th className="py-2 pr-3">KPI</th>
                      <th className="py-2 pr-3 text-right">Target</th>
                      <th className="py-2 pr-3 text-right">Actual</th>
                      <th className="py-2 pr-3 text-right">Variance</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Period</th>
                      <th className="py-2 pl-3">Source of actual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((r) => (
                      <tr key={`${r.layerSlug}-${r.kpi}`} className="border-b border-line/60">
                        <td className="py-2 pr-3 text-ink">
                          {r.kpi}
                          {r.example ? (
                            <span className="ml-1.5 rounded bg-watch/10 px-1 py-[1px] text-[9px] font-bold uppercase text-watch">
                              example
                            </span>
                          ) : null}
                          {r.note ? <span className="block text-[10.5px] text-ink-faint">{r.note}</span> : null}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{fmtKpiValue(r.target, r.unit)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums font-medium text-ink">{fmtKpiValue(r.actual, r.unit)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{fmtVariance(r)}</td>
                        <td className="py-2 pr-3">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10.5px] font-medium ${STATUS[r.status].cls}`}>
                            {STATUS[r.status].label}
                          </span>
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap text-ink-soft">
                          {r.period ?? '—'}
                          {r.deadline ? <span className="block text-[10.5px] text-ink-faint">due {r.deadline}</span> : null}
                        </td>
                        <td className="py-2 pl-3 text-[11.5px] text-ink-faint">{r.actualSource ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="mt-6 border-t border-line pt-3 text-[10.5px] text-ink-ghost">
        Restricted — visible to leadership roles only (admin · viewer). Live reporting and the Evidence Room do not
        carry this comparison.
      </p>
    </main>
  );
}
