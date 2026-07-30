import Link from 'next/link';
import { getChannelPerformance } from '@/lib/growth/channelPerformance';
import { getChannelTrace } from '@/lib/growth/channelTrace';
import { isBlockAppt } from '@/lib/growth/attribution';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { FunnelViz } from '@/components/charts/FunnelViz';

/**
 * Channel-scoped clinic outcome for the Google / Meta performance pages: ONLY
 * patients the attribution waterfall assigns to that channel (gclid / campaign
 * tag / lead-form trace …) — never the whole clinic. This is the default lens
 * on those pages; the all-channel journey is one pill away, clearly labelled.
 * Google additionally shows the Markov-chain phone-path figures, ≈-marked.
 */

const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`;
const aedShort = (n: number) =>
  n >= 1_000_000 ? `AED ${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `AED ${(n / 1_000).toFixed(1)}k` : `AED ${Math.round(n)}`;
const int = (n: number) => Math.round(n).toLocaleString('en-US');

export async function ChannelOutcome({
  channelKey,
  label,
  range,
}: {
  channelKey: 'paid-search' | 'paid-social';
  label: string;
  range: { from: string; to: string };
}) {
  const [report, trace] = await Promise.all([
    getChannelPerformance(range),
    getChannelTrace(channelKey, range),
  ]);
  const p = report.channels.find((c) => c.key === channelKey);
  if (!p) return null;
  // Belt-and-braces: the trace layer already excludes reception calendar
  // blocks; filter again at render so a block row can never reach the CEO.
  const realPatients = trace.patients.filter((x) => !isBlockAppt(x.patientName));
  const shown = realPatients.slice(0, 50);
  const tracedRevenue = realPatients.reduce((a, x) => a + x.revenue, 0);
  // The ≈ figures are DRAWN FROM real untraced DN patients — show that pool,
  // or "≈AED 4k revenue, 0 patients" reads as a contradiction.
  const est0 = channelKey === 'paid-search' ? (p.estExtraBookings ?? 0) : 0;
  const poolTrace = est0 > 0 ? await getChannelTrace('direct-walkin', range, 'dn-alwasl') : null;
  const poolPatients = (poolTrace?.patients ?? []).filter((x) => !isBlockAppt(x.patientName));
  const poolShown = poolPatients.slice(0, 30);
  const poolRevenue = poolPatients.reduce((a, x) => a + x.revenue, 0);
  const poolCompleted = poolPatients.filter((x) => /complete/i.test(x.status)).length;
  const est = channelKey === 'paid-search' ? (p.estExtraBookings ?? 0) : 0;
  const traceQs = `&from=${range.from}&to=${range.to}`;
  const combinedRevenue = p.revenue + (p.estRevenue ?? 0);

  return (
    <Card>
      <SectionHeader
        eyebrow={`${label} · clinic outcome`}
        title={`Booked → Showed → Treated — ${label}-attributed patients only`}
        right={
          <Link
            href={`/?tab=group&gtab=growth&gchan=${channelKey}${traceQs}`}
            className="text-[12px] font-medium text-accent hover:underline"
          >
            trace the patients →
          </Link>
        }
      />
      <div className="px-5 pb-5 pt-3">
        <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
          <FunnelViz
            stages={[
              { label: est > 0 ? 'Enquiries (incl. MTA-MVM)' : 'Enquiries', value: p.enquiries + (p.estEnquiries ?? 0) },
              { label: est > 0 ? 'Booked (incl. MTA-MVM)' : 'Booked', value: p.booked + est },
              { label: 'Showed up', value: p.showed + (p.estShowed ?? 0) },
              { label: 'Treated (billed)', value: p.treated + (p.estTreated ?? 0) },
            ]}
          />
          <div className="space-y-2 text-[12.5px] text-ink-soft">
            {est > 0 ? (
              <p className="rounded-card border border-line bg-panel/40 px-3 py-2 text-[11px] leading-relaxed text-ink-soft">
                <span className="font-semibold text-ink">Measured vs MTA-MVM per stage:</span>{' '}
                enquiries <span className="font-medium text-ink">{int(p.enquiries)}</span> measured + <span className="text-watch">≈{int(p.estEnquiries ?? 0)}</span> ·{' '}
                booked <span className="font-medium text-ink">{int(p.booked)}</span> + <span className="text-watch">≈{int(est)}</span> ·{' '}
                showed <span className="font-medium text-ink">{int(p.showed)}</span> + <span className="text-watch">≈{int(p.estShowed ?? 0)}</span> ·{' '}
                treated <span className="font-medium text-ink">{int(p.treated)}</span> + <span className="text-watch">≈{int(p.estTreated ?? 0)}</span>.
                Measured enquiries are reception-tracker rows tagged “google ad” and Google-tagged widget submissions —
                an enquiry only becomes a measured booking when its phone matches a Practo appointment, so enquiries and
                bookings are different stages, not the same people twice.
              </p>
            ) : null}
            <p>
              <span className="font-medium text-ink">{est > 0 ? '≈' : ''}{combinedRevenue > 0 ? aedShort(combinedRevenue) : '—'}</span>{' '}
              attributed billed revenue
              {p.spend != null ? (
                <>
                  {' '}on <span className="font-medium text-ink">{aedShort(p.spend)}</span> spend
                  {(channelKey === 'paid-search' ? p.estRoas : p.roas) != null
                    ? ` · ROAS ${est > 0 ? '≈' : ''}${(channelKey === 'paid-search' ? p.estRoas! : p.roas!).toFixed(1)}×`
                    : ''}
                </>
              ) : null}
              .
            </p>
            {p.spend != null ? (
              <p className="text-[11.5px] leading-snug">
                Net unit costs{est > 0 ? ' (incl. MTA-MVM)' : ''}:{' '}
                {channelKey === 'paid-search' ? (
                  <>
                    enquiry {p.estCostPerEnquiry != null ? `≈${aed(p.estCostPerEnquiry)}` : '—'} · booking{' '}
                    {p.estCostPerBooked != null ? `≈${aed(p.estCostPerBooked)}` : '—'} · show{' '}
                    {p.estCostPerShowed != null ? `≈${aed(p.estCostPerShowed)}` : '—'} · treated{' '}
                    {p.estCostPerTreated != null ? `≈${aed(p.estCostPerTreated)}` : '—'}
                  </>
                ) : (
                  <>
                    enquiry {p.costPerEnquiry != null ? aed(p.costPerEnquiry) : '—'} · booking{' '}
                    {p.costPerBooked != null ? aed(p.costPerBooked) : '—'} · show{' '}
                    {p.costPerShowed != null ? aed(p.costPerShowed) : '—'} · treated{' '}
                    {p.costPerPatient != null ? aed(p.costPerPatient) : '—'}
                  </>
                )}
              </p>
            ) : null}
            {p.spendThrough ? (
              <p className="text-[11px] text-watch">Spend synced only to {p.spendThrough} — economics beyond that are understated.</p>
            ) : null}
          </div>
        </div>
        <Takeaway>
          Scope: only patients the attribution waterfall assigns to {label}
          {channelKey === 'paid-search'
            ? ' (a gclid / Google campaign tag on their widget booking, or a reception "google ad" tag), plus the Markov-chain phone-path model (≈, reconciled against untraced Dental Nation Al Wasl patients only)'
            : ' (an ads-tagged lead-form or campaign trace)'}
          . {int(p.booked)} measured booked{est > 0 ? ` + ${int(est)} MTA-MVM` : ''} in this window. MTA-MVM = multi-touch attribution · Markov model (the ≈ phone path). The all-channel
          clinic journey is under the “All channels” scope above — the two must never be read as the same population.
        </Takeaway>

        {/* The patients behind the numbers — same trace as the Growth Platform
            drill-down, with each patient's in-window billed revenue. */}
        <div className="mt-4">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
            The patients behind the numbers — {int(realPatients.length)} attributed booking{realPatients.length === 1 ? '' : 's'}
            {tracedRevenue > 0 ? ` · ${aed(tracedRevenue)} billed in window` : ''}
            {realPatients.length > shown.length ? ` (showing latest ${shown.length})` : ''}
          </p>
          {shown.length === 0 ? (
            <p className="rounded-card border border-dashed border-line px-4 py-5 text-center text-[12px] text-ink-soft">
              No booked patients attribute to {label} in this window
              {channelKey === 'paid-search'
                ? ' — measured Google tagging only went live 29 Jul, so older windows rely on reception tags and the ≈ model (whose real patient pool is listed below).'
                : '.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-ink-faint">
                    <th className="py-1.5 pl-2 pr-2 font-medium">Date</th>
                    <th className="px-2 py-1.5 font-medium">Patient</th>
                    <th className="px-2 py-1.5 font-medium">Phone</th>
                    <th className="px-2 py-1.5 font-medium">File</th>
                    <th className="px-2 py-1.5 font-medium">Status</th>
                    <th className="px-2 py-1.5 font-medium">Why {label}</th>
                    <th className="py-1.5 pl-2 pr-2 text-right font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((x, i) => (
                    <tr key={`${x.mrNo}|${x.date}|${i}`} className="border-t border-line/60 align-top">
                      <td className="whitespace-nowrap py-1.5 pl-2 pr-2 text-[11.5px] tabular-nums text-ink">{x.date ?? '—'}</td>
                      <td className="px-2 py-1.5 text-[12px] font-medium text-ink">{x.patientName}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-[11.5px] tabular-nums text-ink-soft">{x.phone || '—'}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-[11.5px] text-ink-soft">{x.mrNo || '—'}</td>
                      <td className="px-2 py-1.5 text-[11.5px] text-ink-soft">{x.status || '—'}</td>
                      <td className="px-2 py-1.5">
                        <span className={`mr-1.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${x.evidence === 'tagged' ? 'bg-good/10 text-good' : 'bg-watch/10 text-watch'}`}>
                          {x.ruleId} · {x.evidence}
                        </span>
                      </td>
                      <td className="whitespace-nowrap py-1.5 pl-2 pr-2 text-right text-[11.5px] font-medium tabular-nums text-ink">
                        {x.revenue > 0 ? aed(x.revenue) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {poolPatients.length > 0 ? (
            <div className="mt-5">
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-watch">
                Where the ≈ figures come from — the MTA-MVM pool: the model attributes ≈{int(est0)} of these{' '}
                {int(poolPatients.length)} real untraced patients to {label}; the rest remain Direct / Walk-in
                {poolRevenue > 0 ? ` · ${aed(poolRevenue)} billed in window` : ''}
                {poolPatients.length > poolShown.length ? ` · showing latest ${poolShown.length}` : ''}
              </p>
              <p className="mb-2 rounded-card border border-dashed border-watch/60 bg-watch/5 px-3 py-2 text-[11.5px] leading-snug text-ink-soft">
                The ≈{int(est0)} modelled bookings{p.estRevenue ? ` and ≈${aedShort(p.estRevenue)} revenue` : ''} are drawn
                from these <span className="font-medium text-ink">real Dental Nation Al Wasl patients</span> — booked as
                Direct / Walk-in because they arrived with no channel trace. Their bookings, shows and bills are real
                Practo records; the Markov model only estimates <span className="font-medium text-ink">how many</span> of
                them came via a Google ad call — never <span className="font-medium text-ink">which ones</span>. That is
                why they are listed as a pool here rather than claimed individually above.
                {poolCompleted > 0 ? (
                  <>
                    {' '}Worked example for this window: the pool holds {int(poolCompleted)} completed visits — the
                    model&apos;s Google share of them is the ≈{int(p.estTreated ?? 0)} treated above; the other{' '}
                    {int(Math.max(poolCompleted - (p.estTreated ?? 0), 0))} stay credited to Direct / Walk-in. The
                    funnel never claims the whole pool.
                  </>
                ) : null}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wide text-ink-faint">
                      <th className="py-1.5 pl-2 pr-2 font-medium">Date</th>
                      <th className="px-2 py-1.5 font-medium">Patient</th>
                      <th className="px-2 py-1.5 font-medium">Phone</th>
                      <th className="px-2 py-1.5 font-medium">File</th>
                      <th className="px-2 py-1.5 font-medium">Status</th>
                      <th className="py-1.5 pl-2 pr-2 text-right font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poolShown.map((x, i) => (
                      <tr key={`${x.mrNo}|${x.date}|${i}`} className="border-t border-line/60 align-top">
                        <td className="whitespace-nowrap py-1.5 pl-2 pr-2 text-[11.5px] tabular-nums text-ink">{x.date ?? '—'}</td>
                        <td className="px-2 py-1.5 text-[12px] font-medium text-ink">{x.patientName}</td>
                        <td className="whitespace-nowrap px-2 py-1.5 text-[11.5px] tabular-nums text-ink-soft">{x.phone || '—'}</td>
                        <td className="whitespace-nowrap px-2 py-1.5 text-[11.5px] text-ink-soft">{x.mrNo || '—'}</td>
                        <td className="px-2 py-1.5 text-[11.5px] text-ink-soft">{x.status || '—'}</td>
                        <td className="whitespace-nowrap py-1.5 pl-2 pr-2 text-right text-[11.5px] font-medium tabular-nums text-ink">
                          {x.revenue > 0 ? aed(x.revenue) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
