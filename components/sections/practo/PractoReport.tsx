import { getPractoSummary } from '@/lib/practo/report';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import {
  ChartLegend,
  Donut,
  HBarChart,
  TOKENS,
  TrendChart,
  type BarDatum,
  type TrendSeries,
} from '@/components/charts/Charts';
import { ownerFor } from '@/config/data-gap-owners';
import { dubaiDateLabel } from '@/lib/dates';

const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`;
const int = (n: number) => Math.round(n).toLocaleString('en-US');

/**
 * Practo Insta tab — the clinic PMS lens. Reads finalized bills from
 * getPractoSummary() (all-time). This is a DISTINCT population from the booking
 * funnel + CRM appointments: real money the clinic invoiced.
 *
 * Honest states (CLAUDE.md §15): never a fabricated 0.
 *  - not configured           → "connect Practo (PRACTO_* env)" data gap
 *  - configured but no bills   → "awaiting first bills sync" data gap
 *  - bills present             → KPIs + trend + mix charts, amount-coverage caveat
 */
export async function PractoReport() {
  const p = await getPractoSummary();

  const period =
    p.periodStart && p.periodEnd
      ? `${dubaiDateLabel(p.periodStart)} → ${dubaiDateLabel(p.periodEnd)}`
      : null;

  const isEmpty = p.source === 'empty';

  const coverage = p.billCount > 0 ? p.amountKnown / p.billCount : null;

  const kpis: KpiItem[] = [
    {
      label: 'Finalized revenue',
      value: isEmpty ? null : aed(p.revenue),
      gapDetail: 'awaiting Practo bills',
      gapOwner: ownerFor('clinic'),
    },
    {
      label: 'Bills',
      value: isEmpty ? null : int(p.billCount),
      gapDetail: 'awaiting Practo bills',
      gapOwner: ownerFor('clinic'),
    },
    {
      label: 'Avg bill value',
      value: p.avgBill != null ? aed(p.avgBill) : null,
      gapDetail: 'no priced bills yet',
      gapOwner: ownerFor('clinic'),
      hint: p.avgBill != null ? `over ${int(p.amountKnown)} priced bills` : undefined,
    },
    {
      label: 'Amount coverage',
      value: coverage != null ? `${Math.round(coverage * 100)}%` : null,
      gapDetail: 'no bills to measure',
      gapOwner: ownerFor('clinic'),
      hint: coverage != null ? `${int(p.amountKnown)}/${int(p.billCount)} bills priced` : undefined,
    },
    {
      label: 'Period span',
      value: p.periodStart && p.periodEnd ? `${p.byDay.length} day${p.byDay.length === 1 ? '' : 's'}` : null,
      gapDetail: 'no dated bills yet',
      gapOwner: ownerFor('clinic'),
      hint: period ?? undefined,
    },
  ];

  const trendData = p.byDay.map((d) => ({ date: d.date, revenue: Math.round(d.revenue), bills: d.bills }));
  const trendSeries: TrendSeries[] = [
    { key: 'revenue', label: 'Revenue (AED)', color: TOKENS.accent, kind: 'area', axis: 'left', valueFormat: 'aed' },
    { key: 'bills', label: 'Bills', color: TOKENS.accent400, kind: 'line', axis: 'right', valueFormat: 'int' },
  ];

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader
          tag="P"
          eyebrow="Clinic PMS · Practo Insta"
          title="Practo Insta — Clinic Revenue (finalized bills)"
          right={
            <span className="text-[11px] text-ink-faint">
              {p.configured ? 'live API' : 'not connected'}
            </span>
          }
        />
        <div className="px-5 pb-5 pt-4">
          <p className="text-[12.5px] leading-snug text-ink-soft">
            This is the clinic&apos;s Practo Insta PMS — real money invoiced on finalized bills. It is its
            own population, distinct from the website booking widget and the CRM appointment funnel; do not
            fuse it with them.
            {period ? <span className="text-ink-faint"> Period: {period}.</span> : null}
          </p>
          {isEmpty ? (
            <div className="mt-4">
              {!p.configured ? (
                <DataGapInline
                  detail="Practo not connected — set PRACTO_BASE_URL / PRACTO_HOSPITAL / PRACTO_AUTH (PRACTO_* env), then run the first bills sync"
                  owner={ownerFor('clinic')}
                />
              ) : (
                <DataGapInline
                  detail="Practo connected, awaiting first bills sync (hourly cron; or trigger /api/practo/probe?sync=1)"
                  owner={ownerFor('clinic')}
                />
              )}
            </div>
          ) : null}
        </div>
      </Card>

      <Card>
        <SectionHeader tag="P1" eyebrow="Scorecard" title="Finalized revenue at a glance" />
        <div className="px-5 pb-5 pt-4">
          <KpiBand items={kpis} />
        </div>
      </Card>

      <Card>
        <SectionHeader tag="P2" eyebrow="Daily" title="Finalized revenue & bills over time" />
        <div className="px-5 pb-5 pt-4">
          {isEmpty ? (
            <DataGapInline detail="no dated bills to chart yet" owner={ownerFor('clinic')} />
          ) : (
            <>
              <TrendChart data={trendData} series={trendSeries} leftFormat="aed" rightFormat="int" />
              <ChartLegend
                items={[
                  { label: 'Revenue (AED)', color: TOKENS.accent },
                  { label: 'Bills', color: TOKENS.accent400 },
                ]}
              />
            </>
          )}
        </div>
      </Card>

      <Card>
        <SectionHeader tag="P3" eyebrow="Mix" title="Where the revenue comes from" />
        <div className="px-5 pb-5 pt-4">
          {isEmpty ? (
            <DataGapInline detail="no priced bills to break down yet" owner={ownerFor('clinic')} />
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                  Revenue by department
                </p>
                <Donut data={p.byDepartment as BarDatum[]} valueFormat="aed" centerLabel="revenue" height={200} />
              </div>
              <div>
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                  Top treatments by revenue
                </p>
                <HBarChart data={p.byTreatment as BarDatum[]} valueFormat="aed" />
              </div>
            </div>
          )}
        </div>
      </Card>

      {!isEmpty && p.byDoctor.length > 0 ? (
        <Card>
          <SectionHeader tag="P4" eyebrow="Mix" title="Revenue by conducting doctor" />
          <div className="px-5 pb-5 pt-4">
            <HBarChart data={p.byDoctor as BarDatum[]} valueFormat="aed" accent={TOKENS.accent600} />
            <Takeaway>
              This is real finalized clinic revenue from Practo&apos;s line-item charges — not a forecast or a
              booking estimate. Average bill value:{' '}
              <span className="font-medium text-ink-soft">{p.avgBill != null ? aed(p.avgBill) : '—'}</span>.
            </Takeaway>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
