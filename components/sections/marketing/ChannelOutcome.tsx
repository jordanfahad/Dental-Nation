import Link from 'next/link';
import { getChannelPerformance } from '@/lib/growth/channelPerformance';
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
  const report = await getChannelPerformance(range);
  const p = report.channels.find((c) => c.key === channelKey);
  if (!p) return null;
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
              { label: est > 0 ? 'Enquiries (incl. ≈ model)' : 'Enquiries', value: p.enquiries + (p.estEnquiries ?? 0) },
              { label: est > 0 ? 'Booked (incl. ≈ model)' : 'Booked', value: p.booked + est },
              { label: 'Showed up', value: p.showed + (p.estShowed ?? 0) },
              { label: 'Treated (billed)', value: p.treated + (p.estTreated ?? 0) },
            ]}
          />
          <div className="space-y-2 text-[12.5px] text-ink-soft">
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
                Net unit costs{est > 0 ? ' (incl. the ≈ phone-path model)' : ''}:{' '}
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
          . {int(p.booked)} measured booked{est > 0 ? ` + ${int(est)} modelled` : ''} in this window. The all-channel
          clinic journey is under the “All channels” scope above — the two must never be read as the same population.
        </Takeaway>
      </div>
    </Card>
  );
}
