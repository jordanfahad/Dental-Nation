import { getGroupRevenue, type ClinicRevenue } from '@/lib/clinics/groupRevenue';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import { HBarChart, Donut, CATEGORICAL, TOKENS, type BarDatum } from '@/components/charts/Charts';

/**
 * Group Revenue tab — the portfolio view across the three commonly-owned
 * clinics (Dr Tosun, Al Maher / AMC, Dental Nation Al Wasl), from the historical
 * PMS exports imported into lane_e.clinic_revenue_raw.
 *
 * Honest by design: Tosun & Al Wasl figures are cash COLLECTED; Al Maher is
 * gross BILLED (mostly insurance). The tab labels each clinic's measure and the
 * combined total is a portfolio sum, never presented as like-for-like.
 */

const aed = (n: number): string => `AED ${Math.round(n).toLocaleString('en-US')}`;
const aedShort = (n: number): string => {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}k`;
  return `AED ${Math.round(n)}`;
};

const CLINIC_ACCENT: Record<string, string> = {
  'dr-tosun': '#1F3A5F',
  'al-maher': '#2E7D32',
  'dn-alwasl': '#B45309',
};

function coverage(c: ClinicRevenue): string {
  if (c.yearFrom == null) return '—';
  if (c.yearFrom === c.yearTo) return String(c.yearFrom);
  return `${c.yearFrom}–${c.yearTo}`;
}

function ClinicCard({ c }: { c: ClinicRevenue }) {
  const accent = CLINIC_ACCENT[c.key] ?? TOKENS.accent;
  const years: BarDatum[] = c.byYear.map((y) => ({ label: y.label, value: y.gross, color: accent }));
  const docs: BarDatum[] = c.topDoctors.map((d) => ({ label: d.label, value: d.value, color: accent }));
  const mix: BarDatum[] = c.mix.map((m, i) => ({ label: m.label, value: m.value, color: CATEGORICAL[i % CATEGORICAL.length] }));
  const hasUndated = c.byYear.some((y) => y.year == null);

  return (
    <Card>
      <SectionHeader
        eyebrow={c.location}
        title={c.label}
        right={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-panel px-2.5 py-1 text-[11px] font-medium text-ink-soft">
            <span className="h-2 w-2 rounded-sm" style={{ background: accent }} />
            {c.metricLabel}
          </span>
        }
      />
      <div className="px-5 pb-5 pt-4">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
          <div>
            <p className="text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">
              {c.metric === 'billed' ? 'Total billed' : 'Total collected'}
            </p>
            <p className="mt-0.5 text-[30px] font-semibold leading-none tracking-tight tabular-nums text-ink">
              {aed(c.total)}
            </p>
          </div>
          <div className="text-[12px] text-ink-soft">
            <p>
              Period <span className="font-medium text-ink">{coverage(c)}</span>
            </p>
            <p className="mt-0.5">
              {Math.round(c.txnCount).toLocaleString('en-US')} {c.metric === 'billed' ? 'treatment lines' : 'transactions'}
            </p>
          </div>
          {c.payerSplit ? (
            <div className="text-[12px] text-ink-soft">
              <p>
                Insurer-paid <span className="font-medium text-ink">{aedShort(c.payerSplit.insuranceNet)}</span>
              </p>
              <p className="mt-0.5">
                Patient co-pay <span className="font-medium text-ink">{aedShort(c.payerSplit.patientShare)}</span>
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Revenue by year</p>
            <HBarChart data={years} valueFormat="aed" accent={accent} />
            {hasUndated ? (
              <p className="mt-2 text-[10.5px] leading-snug text-ink-faint">
                The 2020–2025 rows have no per-treatment service date in the source, so they can&apos;t be split by year —
                shown as one combined bucket.
              </p>
            ) : null}
          </div>
          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Top doctors</p>
            <HBarChart data={docs} valueFormat="aed" accent={accent} />
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{c.mixLabel}</p>
          <Donut data={mix} valueFormat="aed" centerLabel={c.metric === 'billed' ? 'billed' : 'collected'} />
        </div>
      </div>
    </Card>
  );
}

export async function GroupRevenue() {
  const data = await getGroupRevenue();

  if (!data.available) {
    return (
      <Card>
        <SectionHeader eyebrow="Group" title="Group Revenue" />
        <div className="px-5 pb-5 pt-4">
          <p className="rounded-card border border-dashed border-line bg-panel/40 px-4 py-6 text-center text-[13px] text-ink-soft">
            No group-clinic revenue loaded yet. Run{' '}
            <code className="rounded bg-panel px-1.5 py-0.5 text-[11.5px]">supabase/migrations/0009_clinic_revenue.sql</code> then{' '}
            <code className="rounded bg-panel px-1.5 py-0.5 text-[11.5px]">supabase/seed/clinic_revenue_data.sql</code>.
          </p>
        </div>
      </Card>
    );
  }

  const kpis: KpiItem[] = [
    { label: 'Group total', value: aedShort(data.combinedTotal), hint: 'collected + billed · portfolio' },
    ...data.clinics.map(
      (c): KpiItem => ({ label: c.label, value: aedShort(c.total), hint: `${c.metricLabel} · ${coverage(c)}` }),
    ),
  ];

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader
          eyebrow="Portfolio"
          title="Group Revenue — three clinics"
          right={<span className="text-[11px] text-ink-faint">historical import</span>}
        />
        <div className="px-5 pb-5 pt-4">
          <KpiBand items={kpis} />
          <Takeaway>
            Historical revenue for the three group clinics, from each clinic&apos;s own PMS export.{' '}
            <span className="font-medium text-ink-soft">These are not like-for-like:</span> Dr Tosun and Al Wasl figures are
            cash <span className="font-medium text-ink-soft">collected</span>, while Al Maher (AMC) is gross{' '}
            <span className="font-medium text-ink-soft">billed</span> (≈99.8% insurance) — billed always runs above what is
            ultimately collected. The group total is a portfolio sum for scale, not a single comparable number.
          </Takeaway>
          {data.overlapYears.length ? (
            <p className="mt-2 text-[11.5px] text-ink-faint">
              All three clinics have data for {data.overlapYears.join(', ')} — the only fully comparable years.
            </p>
          ) : null}
        </div>
      </Card>

      {data.clinics.map((c) => (
        <ClinicCard key={c.key} c={c} />
      ))}
    </div>
  );
}
