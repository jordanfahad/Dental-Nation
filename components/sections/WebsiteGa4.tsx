import type { Ga4Summary } from '@/lib/types';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { ShareDonut, type DonutSlice } from '@/components/charts/ShareDonut';
import { DataGapInline } from '@/components/ui/DataGap';
import { fmtInt, fmtPct } from '@/lib/format';

/**
 * §GA4 — Website analytics (Google Analytics 4), a current "last 28 days"
 * summary. DECOUPLED from the per-date paid funnel: GA4 is current through
 * today while the paid sheet is stale, so this renders as its own section with
 * its own period. Near-monochrome, single-accent, hairline aesthetic (§14).
 */

// Single-hue accent ramp for the channel donut (no rainbow — opacity steps).
const DONUT_COLORS = [
  'var(--accent)',
  '#33547C',
  '#5B7BA3',
  '#8AA2BF',
  '#B3C2D5',
  'var(--na)',
];

function KpiCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3">
      <span className="eyebrow">{label}</span>
      <span className="tnum text-kpi font-semibold leading-none text-ink">{value}</span>
    </div>
  );
}

/** One row of the on-site booking funnel: label, bar scaled to the funnel max,
 *  and the stage-to-stage conversion. Mirrors FunnelChart's consulting look. */
function FunnelRow({
  label,
  count,
  max,
  conv,
}: {
  label: string;
  count: number;
  max: number;
  conv: number | null;
}) {
  const widthPct = max > 0 ? Math.max(2, (count / max) * 100) : 0;
  return (
    <div className="grid grid-cols-[150px_1fr_72px] items-center gap-3">
      <div className="truncate text-[12px] text-ink-soft" title={label}>
        {label}
      </div>
      <div className="relative h-7 rounded bg-na/5">
        <div
          className="flex h-full items-center justify-end rounded bg-accent px-2"
          style={{ width: `${widthPct}%`, minWidth: '2.75rem' }}
        >
          <span className="tnum text-[12px] font-semibold text-white">{fmtInt(count)}</span>
        </div>
      </div>
      <div className="tnum text-right text-[11px] text-ink-faint">
        {conv != null ? <span>{fmtPct(conv)} →</span> : <span className="text-ink-ghost">—</span>}
      </div>
    </div>
  );
}

export function WebsiteGa4({ ga4 }: { ga4: Ga4Summary | null }) {
  if (!ga4) {
    return (
      <Card>
        <SectionHeader
          eyebrow="Website · Google Analytics — last 28 days"
          title="Website analytics"
        />
        <div className="px-5 pb-5 pt-3">
          <DataGapInline
            detail="Website analytics unavailable — GA4 summary not synced"
            owner="Data/Analytics"
          />
        </div>
      </Card>
    );
  }

  const funnel = ga4.onsite_funnel ?? [];
  const funnelMax = Math.max(1, ...funnel.map((s) => s.count));

  const topChannels = [...(ga4.channels ?? [])]
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 6);
  const slices: DonutSlice[] = topChannels.map((c, i) => ({
    label: c.channel,
    value: c.sessions,
    color: DONUT_COLORS[i] ?? 'var(--na)',
  }));
  const topChannel = topChannels[0]?.channel ?? null;

  // Takeaway: name the biggest source + the widget→treatment drop-off.
  const widget = funnel.find((s) => s.key === 'booking_widget_viewed');
  const treatment = funnel.find((s) => s.key === 'booking_treatment_selected');
  const widgetToTreatment =
    widget && treatment && widget.count > 0 ? treatment.count / widget.count : null;

  return (
    <Card>
      <SectionHeader
        eyebrow="Website · Google Analytics — last 28 days"
        title="Website analytics"
        right={
          <span className="tnum text-[11px] text-ink-faint">
            {ga4.period_start} → {ga4.period_end}
          </span>
        }
      />

      {/* KPI strip */}
      <div className="mx-5 mt-4 grid grid-cols-2 divide-x divide-line rounded-md border border-line sm:grid-cols-4">
        <KpiCell label="Sessions" value={fmtInt(ga4.sessions)} />
        <KpiCell label="Users" value={fmtInt(ga4.users)} />
        <KpiCell label="Leads" value={fmtInt(ga4.leads)} />
        <KpiCell label="Conversions" value={fmtInt(ga4.conversions)} />
      </div>

      <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-[1fr_1.35fr]">
        {/* Traffic by channel */}
        <div>
          <p className="eyebrow mb-3">Traffic by channel · sessions</p>
          {slices.length > 0 ? (
            <ShareDonut
              slices={slices}
              centerValue={fmtInt(ga4.sessions)}
              centerLabel="sessions"
            />
          ) : (
            <DataGapInline detail="No channel breakdown returned" owner="Data/Analytics" />
          )}
          {topChannels.length > 0 ? (
            <table className="mt-4 w-full text-[12px]">
              <thead>
                <tr className="border-b border-line text-left text-ink-faint">
                  <th className="py-1.5 font-medium">Channel</th>
                  <th className="py-1.5 text-right font-medium">Sessions</th>
                  <th className="py-1.5 text-right font-medium">Conv.</th>
                </tr>
              </thead>
              <tbody>
                {topChannels.map((c) => (
                  <tr key={c.channel} className="border-b border-line/60 last:border-0">
                    <td className="py-1.5 text-ink">{c.channel}</td>
                    <td className="tnum py-1.5 text-right font-medium text-ink">
                      {fmtInt(c.sessions)}
                    </td>
                    <td className="tnum py-1.5 text-right text-ink-faint">
                      {fmtInt(c.conversions)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>

        {/* On-site booking funnel */}
        <div>
          <p className="eyebrow mb-3">On-site booking funnel</p>
          {funnel.length > 0 ? (
            <div className="space-y-1.5">
              {funnel.map((s) => (
                <FunnelRow
                  key={s.key}
                  label={s.label}
                  count={s.count}
                  max={funnelMax}
                  conv={s.conversionFromPrev}
                />
              ))}
            </div>
          ) : (
            <DataGapInline detail="No funnel events returned" owner="Data/Analytics" />
          )}
        </div>
      </div>

      <div className="px-5 pb-5">
        <Takeaway>
          {topChannel ? `${topChannel} is the biggest traffic source` : 'Traffic is spread across channels'}
          {widgetToTreatment != null
            ? `; the booking widget is viewed often but only ${fmtPct(
                widgetToTreatment,
              )} reach treatment selection — a drop-off worth fixing.`
            : '. The booking widget sees heavy views but few reach treatment selection — a drop-off worth fixing.'}
        </Takeaway>
      </div>
    </Card>
  );
}
