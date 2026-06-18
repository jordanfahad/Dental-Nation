import { getPractoSummary } from '@/lib/practo/report';
import type { CrmRange } from '@/lib/crm/types';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { ownerFor } from '@/config/data-gap-owners';

const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`;
const int = (n: number) => n.toLocaleString('en-US');

/**
 * Practo Insta (clinic PMS) revenue — finalized bills. Reads the bronze
 * practo_bills_raw table (best-effort amounts until the bill shape is confirmed
 * via /api/practo/probe). Honest states:
 *  - not configured  → "connect Practo" data gap (owner named)
 *  - configured, no bills yet → "awaiting first sync" note
 *  - bills present   → revenue + count, with an explicit amount-coverage caveat
 */
export async function CrmPractoRevenue({ range }: { range?: CrmRange }) {
  const p = await getPractoSummary(range);

  return (
    <Card>
      <SectionHeader
        tag="P"
        eyebrow="Clinic PMS · Practo Insta"
        title="Treatment revenue — finalized bills"
        right={
          <span className="text-[11px] text-ink-faint">
            {p.configured ? 'live API' : 'not connected'}
          </span>
        }
      />
      <div className="px-5 pb-5 pt-4">
        {p.source === 'empty' ? (
          !p.configured ? (
            <DataGapInline
              detail="Practo API not connected yet — set PRACTO_BASE_URL / PRACTO_HOSPITAL / PRACTO_AUTH, then run the first bills sync"
              owner={ownerFor('clinic')}
            />
          ) : (
            <DataGapInline
              detail="Practo connected, awaiting first bills sync (runs on the hourly cron; or trigger /api/practo/probe?sync=1)"
              owner={ownerFor('clinic')}
            />
          )
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Finalized revenue" value={aed(p.revenue)} hint={`${int(p.billCount)} bills`} />
              <Stat
                label="Bills (period)"
                value={int(p.billCount)}
                hint={p.periodStart ? `${p.periodStart} → ${p.periodEnd}` : undefined}
              />
              <Stat
                label="Amount coverage"
                value={`${Math.round((p.amountKnown / Math.max(p.billCount, 1)) * 100)}%`}
                hint={`${int(p.amountKnown)}/${int(p.billCount)} bills with a parsed amount`}
              />
            </div>
            <Takeaway>
              Revenue is read from Practo&apos;s finalized bills (the clinic PMS — a distinct
              population from the booking funnel). Amounts are mapped best-effort from the raw bill
              payload; once the field mapping is confirmed via the probe endpoint, the{' '}
              <span className="font-medium text-ink-soft">amount coverage</span> reaches 100%.
            </Takeaway>
          </>
        )}
      </div>
    </Card>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-card border border-line bg-card p-3.5">
      <p className="text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-1 text-[24px] font-semibold leading-none tracking-tight text-ink tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-[10.5px] text-ink-faint">{hint}</p> : null}
    </div>
  );
}
