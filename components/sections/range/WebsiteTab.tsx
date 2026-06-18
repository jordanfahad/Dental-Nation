import type { Ga4RangeReport, RangeReport } from '@/lib/types';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { Scorecard } from '@/components/ui/Scorecard';
import { ShareDonut, type DonutSlice } from '@/components/charts/ShareDonut';
import { DataGapInline } from '@/components/ui/DataGap';
import { ContentPerformance } from '@/components/sections/ContentPerformance';
import { fmtInt, fmtPct } from '@/lib/format';

/**
 * Website tab — GA4 for the range: KPIs (scorecards with Δ), traffic-by-channel,
 * the nested on-site booking funnel, and content/creative (§E). On a live GA4
 * failure the data layer falls back to the stored summary + a data-gap note,
 * never crashing.
 */

const DONUT_COLORS = ['var(--accent)', '#33547C', '#5B7BA3', '#8AA2BF', '#B3C2D5', 'var(--na)'];

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

export function WebsiteTab({ report }: { report: RangeReport }) {
  const ga4 = report.ga4;

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader
          eyebrow="Website · Google Analytics"
          title="Website analytics"
          right={
            ga4 ? (
              <span className="tnum text-[11px] text-ink-faint">
                {ga4.period_start} → {ga4.period_end}
              </span>
            ) : undefined
          }
        />
        {ga4 ? (
          <Ga4Body ga4={ga4} />
        ) : (
          <div className="px-5 pb-5 pt-3">
            <DataGapInline
              detail="Website analytics unavailable — GA4 not reachable and no stored summary"
              owner="Data/Analytics"
            />
          </div>
        )}
      </Card>

      <ContentPerformance content={report.content} />
    </div>
  );
}

function Ga4Body({ ga4 }: { ga4: Ga4RangeReport }) {
  const funnel = ga4.onsite_funnel ?? [];
  const funnelMax = Math.max(1, ...funnel.map((s) => s.count));
  const topChannels = [...(ga4.channels ?? [])].sort((a, b) => b.sessions - a.sessions).slice(0, 6);
  const slices: DonutSlice[] = topChannels.map((c, i) => ({
    label: c.channel,
    value: c.sessions,
    color: DONUT_COLORS[i] ?? 'var(--na)',
  }));
  const topChannel = topChannels[0]?.channel ?? null;
  const totalSessions = ga4.sessions.value ?? 0;

  const widget = funnel.find((s) => s.key === 'booking_widget_viewed');
  const treatment = funnel.find((s) => s.key === 'booking_treatment_selected');
  const widgetToTreatment =
    widget && treatment && widget.count > 0 ? treatment.count / widget.count : null;

  return (
    <>
      {ga4.fellBack && ga4.note ? (
        <div className="px-5 pt-3">
          <DataGapInline detail={ga4.note} owner="Data/Analytics" />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 px-5 pt-4 sm:grid-cols-4">
        <Scorecard label="Sessions" metric={ga4.sessions} />
        <Scorecard label="Users" metric={ga4.users} />
        <Scorecard label="Leads" metric={ga4.leads} />
        <Scorecard label="Conversions" metric={ga4.conversions} />
      </div>

      <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-[1fr_1.35fr]">
        <div>
          <p className="eyebrow mb-3">Traffic by channel · sessions</p>
          {slices.length > 0 ? (
            <ShareDonut slices={slices} centerValue={fmtInt(totalSessions)} centerLabel="sessions" />
          ) : (
            <DataGapInline detail="No channel breakdown returned" owner="Data/Analytics" />
          )}
        </div>

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
            : '. The booking widget sees views but few reach treatment selection.'}
        </Takeaway>
      </div>
    </>
  );
}
