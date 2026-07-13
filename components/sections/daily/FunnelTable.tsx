import type { FunnelStage, ReportView } from '@/lib/types';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { FunnelChart } from '@/components/charts/FunnelChart';
import { DataGapInline } from '@/components/ui/DataGap';
import { fmtInt, fmtPct } from '@/lib/format';
import { ownerFor } from '@/config/data-gap-owners';

/** The canonical §D stage order. Stages not present in the snapshot funnel (or
 *  present but unmeasured/upstream) render as explicit owned data gaps — never 0. */
const STAGE_ORDER: { key: string; label: string; gapOwner: string }[] = [
  { key: 'reach', label: 'Reach', gapOwner: ownerFor('channel') },
  { key: 'impressions', label: 'Impressions', gapOwner: ownerFor('channel') },
  { key: 'clicks', label: 'Clicks', gapOwner: ownerFor('channel') },
  { key: 'lp_visits', label: 'Landing-page visits', gapOwner: ownerFor('tracking') },
  { key: 'wa_clicks', label: 'WhatsApp clicks', gapOwner: ownerFor('tracking') },
  { key: 'call_clicks', label: 'Call clicks', gapOwner: ownerFor('tracking') },
  { key: 'valid_inquiries', label: 'Valid inquiries', gapOwner: ownerFor('pac') },
  { key: 'qualified_inquiries', label: 'Qualified inquiries', gapOwner: ownerFor('pac') },
  { key: 'glow_up_bookings', label: 'Glow Up bookings', gapOwner: ownerFor('clinic') },
  { key: 'attended_visits', label: 'Attended visits', gapOwner: ownerFor('attendance') },
  { key: 'treatment_opportunities', label: 'Treatment / upgrade opportunities', gapOwner: ownerFor('clinic') },
  { key: 'proof_captured', label: 'Proof captured', gapOwner: ownerFor('content') },
  { key: 'reviews_captured', label: 'Reviews captured', gapOwner: ownerFor('content') },
];

/**
 * §D — Daily Funnel Performance. Horizontal funnel + a full stage table with
 * Today / Yesterday / Total-since-launch + a notes/source column. Every canonical
 * stage is rendered: stages with no real source show an explicit DATA GAP with an
 * owner in the Notes column (never a fabricated 0). Rates + costs follow.
 */
export function FunnelTable({ view }: { view: ReportView }) {
  const s = view.snapshot;
  const bySource = new Map<string, FunnelStage>(s.funnel.map((f) => [f.key, f]));

  return (
    <Card>
      <SectionHeader tag="D" eyebrow="Funnel" title="Daily funnel performance" />

      <div className="px-5 pt-4">
        <FunnelChart stages={s.funnel} />
      </div>

      <div className="overflow-x-auto px-5 pb-2 pt-4">
        <table className="w-full min-w-[720px] border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-line text-left text-ink-faint">
              <th className="py-2 pr-3 font-medium">Stage</th>
              <th className="px-2 py-2 text-right font-medium">Today</th>
              <th className="px-2 py-2 text-right font-medium">Yesterday</th>
              <th className="px-2 py-2 text-right font-medium">Total since launch</th>
              <th className="px-2 py-2 font-medium">Notes / source</th>
            </tr>
          </thead>
          <tbody>
            {STAGE_ORDER.map((st) => {
              const f = bySource.get(st.key);
              const isGap = !f || f.upstream || f.today == null;
              return (
                <tr key={st.key} className="border-b border-line/60 align-top last:border-0">
                  <td className="py-1.5 pr-3 font-medium text-ink">{st.label}</td>
                  {isGap ? (
                    <>
                      <td className="px-2 py-1.5 text-right text-ink-ghost">—</td>
                      <td className="px-2 py-1.5 text-right text-ink-ghost">—</td>
                      <td className="px-2 py-1.5 text-right text-ink-ghost">—</td>
                      <td className="px-2 py-1.5">
                        <DataGapInline detail="no source mapped in v1" owner={st.gapOwner} />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="tnum px-2 py-1.5 text-right font-medium text-ink">
                        {fmtInt(f!.today)}
                      </td>
                      <td className="tnum px-2 py-1.5 text-right text-ink-faint">
                        {fmtInt(f!.yesterday)}
                      </td>
                      <td className="tnum px-2 py-1.5 text-right text-ink-faint">
                        {fmtInt(f!.total)}
                      </td>
                      <td className="px-2 py-1.5 text-ink-faint">{f!.source ?? 'Lead tracker'}</td>
                    </>
                  )}
                </tr>
              );
            })}

            {/* Derived rates + costs */}
            <RateRow
              label="Lead → booking rate"
              value={s.lead_to_booking_rate}
              fmt={(v) => fmtPct(v)}
              gapOwner={ownerFor('clinic')}
              note="qualified → Glow Up booking"
            />
            <RateRow
              label="Cost per inquiry"
              value={s.cost_per_inquiry}
              fmt={(v) => `${Math.round(v)} AED`}
              gapOwner={ownerFor('cost')}
              note="needs ad-spend source"
            />
            <RateRow
              label="Cost per booking"
              value={s.cost_per_booking}
              fmt={(v) => `${Math.round(v)} AED`}
              gapOwner={ownerFor('cost')}
              note="needs ad-spend source"
            />
            <RateRow
              label="Show rate"
              value={s.show_rate}
              fmt={(v) => fmtPct(v)}
              gapOwner={ownerFor('attendance')}
              note="needs attendance source"
            />
          </tbody>
        </table>
      </div>

      <div className="px-5 pb-5">
        <Takeaway>
          Most stages are now measured live: clicks / impressions from the ad platforms, landing-page
          visits + WhatsApp / call clicks from GA4, bookings from the website widget, show-ups from the
          Zavis CRM and reviews from CSAT (see each row&rsquo;s source). Reach still needs a live Meta
          feed (its token is stale), and Proof capture has no source yet — those stay owned data gaps,
          never zeros.
        </Takeaway>
      </div>
    </Card>
  );
}

function RateRow({
  label,
  value,
  fmt,
  gapOwner,
  note,
}: {
  label: string;
  value: number | null;
  fmt: (v: number) => string;
  gapOwner: string;
  note: string;
}) {
  const isGap = value == null;
  return (
    <tr className="border-b border-line/60 align-top last:border-0">
      <td className="py-1.5 pr-3 font-medium text-ink">{label}</td>
      {isGap ? (
        <>
          <td className="px-2 py-1.5 text-right text-ink-ghost">—</td>
          <td className="px-2 py-1.5 text-right text-ink-ghost">—</td>
          <td className="px-2 py-1.5 text-right text-ink-ghost">—</td>
          <td className="px-2 py-1.5">
            <DataGapInline detail={note} owner={gapOwner} />
          </td>
        </>
      ) : (
        <>
          <td className="tnum px-2 py-1.5 text-right font-medium text-ink">{fmt(value)}</td>
          <td className="px-2 py-1.5 text-right text-ink-ghost">—</td>
          <td className="px-2 py-1.5 text-right text-ink-ghost">—</td>
          <td className="px-2 py-1.5 text-ink-faint">{note}</td>
        </>
      )}
    </tr>
  );
}
