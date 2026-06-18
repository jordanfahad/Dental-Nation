import type { FunnelStage, RangeReport } from '@/lib/types';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { Scorecard } from '@/components/ui/Scorecard';
import { MixList } from '@/components/ui/MixList';
import { FunnelChart } from '@/components/charts/FunnelChart';
import { ChannelActivation } from '@/components/sections/ChannelActivation';
import { DataGapInline } from '@/components/ui/DataGap';
import { ownerFor } from '@/config/data-gap-owners';
import { fmtPct } from '@/lib/format';

/**
 * Paid acquisition tab — the paid funnel for the range (impressions → clicks →
 * leads), channel mix (Meta / Google / Google Ads-Search), spend + cost-per-lead,
 * and the channel activation status (§B). Sourced from raw_raw_social only.
 */
export function PaidTab({ report }: { report: RangeReport }) {
  const { paid, channels } = report;

  // Build a 3-stage paid funnel (impressions → clicks → leads) from the range
  // aggregates. Conversion is stage-to-stage vs the previous measured stage.
  const stages: FunnelStage[] = paid.empty
    ? []
    : buildPaidFunnel(
        paid.impressions.value ?? 0,
        paid.clicks.value ?? 0,
        paid.leads.value ?? 0,
      );

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader eyebrow="Paid acquisition · selected range" title="Paid performance" />
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
          <Scorecard label="Spend" metric={paid.spend} prefix="AED" />
          <Scorecard label="Leads" metric={paid.leads} />
          <Scorecard
            label="Cost / lead"
            metric={paid.costPerLead}
            prefix="AED"
            invert
            gapDetail="No paid leads in range"
            gapOwner={ownerFor('cost')}
          />
          <Scorecard label="Clicks" metric={paid.clicks} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Funnel" title="Paid funnel — impressions to leads" />
          <div className="p-5">
            {stages.length > 0 ? (
              <>
                <FunnelChart stages={stages} />
                <Takeaway>
                  Click-through{' '}
                  {ctr(paid.impressions.value, paid.clicks.value)} and click→lead{' '}
                  {clr(paid.clicks.value, paid.leads.value)} over the range. Bookings/show-ups are not
                  in the paid source — see the Bookings tab for real bookings.
                </Takeaway>
              </>
            ) : (
              <DataGapInline
                detail="No paid performance rows in this range"
                owner={ownerFor('cost')}
              />
            )}
          </div>
        </Card>

        <Card>
          <SectionHeader eyebrow="Channel mix" title="Leads & spend by channel" />
          <div className="space-y-5 p-5">
            <div>
              <p className="eyebrow mb-2">Leads by channel</p>
              <MixList rows={paid.channelLeads} />
            </div>
            <div>
              <p className="eyebrow mb-2">Spend by channel</p>
              <MixList rows={paid.channelSpend} unit="AED" />
            </div>
          </div>
        </Card>
      </div>

      <ChannelActivation channels={channels} />
    </div>
  );
}

function buildPaidFunnel(impressions: number, clicks: number, leads: number): FunnelStage[] {
  const raw = [
    { key: 'impressions', label: 'Impressions', today: impressions },
    { key: 'clicks', label: 'Clicks', today: clicks },
    { key: 'leads', label: 'Leads', today: leads },
  ];
  let prev: number | null = null;
  return raw.map((s) => {
    const conversionFromPrev = prev != null && prev > 0 ? s.today / prev : null;
    prev = s.today;
    return {
      key: s.key,
      label: s.label,
      today: s.today,
      yesterday: null,
      total: s.today,
      conversionFromPrev,
    };
  });
}

function ctr(impr: number | null, clicks: number | null): string {
  if (!impr || impr === 0 || clicks == null) return 'is a data gap';
  return `is ${fmtPct(clicks / impr, 1)}`;
}
function clr(clicks: number | null, leads: number | null): string {
  if (!clicks || clicks === 0 || leads == null) return 'is a data gap';
  return `is ${fmtPct(leads / clicks, 1)}`;
}
