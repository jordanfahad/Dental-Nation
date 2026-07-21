import { getGroupRevenue, type ClinicRevenue, type GroupRevenueReport } from '@/lib/clinics/groupRevenue';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import { HBarChart, Donut, TrendChart, CATEGORICAL, TOKENS, type BarDatum, type TrendSeries } from '@/components/charts/Charts';
import { GroupSubNav } from './GroupSubNav';
import { resolveGroupSub } from './subtabs';

/**
 * Group Revenue tab — the portfolio view across the three commonly-owned
 * clinics (Dr Tosun, Al Maher / AMC, Dental Nation Al Wasl), from the historical
 * PMS exports in lane_e.clinic_revenue_raw.
 *
 * Sub-tabs select the clinic: "All clinics" = portfolio overview; a single
 * clinic = a detailed view (monthly trend, by-year, doctors, mix). Everything
 * scopes to the dashboard date filter (except "All time"), and a coverage note
 * states how far each clinic's data actually runs.
 *
 * Honest by design: Tosun & Al Wasl are cash COLLECTED; Al Maher is gross
 * BILLED (mostly insurance). The combined total is a portfolio sum, never
 * presented as like-for-like.
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

/** The "data available through" line — states how far each clinic's source runs. */
function CoverageNote({ report }: { report: GroupRevenueReport }) {
  return (
    <p className="mt-2 rounded-card border border-line bg-panel/40 px-3 py-2 text-[11.5px] leading-snug text-ink-soft">
      <span className="font-medium text-ink-soft">Showing:</span> {report.windowLabel}.{' '}
      <span className="font-medium text-ink-soft">Data available through</span> —{' '}
      {report.clinics.map((c, i) => (
        <span key={c.key}>
          {i > 0 ? ' · ' : ''}
          {c.label.replace('Dental Nation ', '').replace(' Dental Clinic', '').replace(' Medical Centre', '')}{' '}
          <span className="font-medium text-ink">{c.dataThroughLabel}</span>
        </span>
      ))}
      . These are static historical imports, not live feeds.
    </p>
  );
}

function EmptyWindow({ label, through }: { label: string; through?: string }) {
  return (
    <p className="rounded-card border border-dashed border-line px-4 py-6 text-center text-[12.5px] text-ink-soft">
      No {label} revenue in this window.{' '}
      {through ? (
        <>
          This clinic&apos;s historical export runs only through <span className="font-medium text-ink">{through}</span> —
          nothing has been exported for later dates.{' '}
        </>
      ) : null}
      Pick “All” (or an earlier range) to see its history.
    </p>
  );
}

/* ------------------------------------------------------------- portfolio --- */

function ClinicCard({ c }: { c: ClinicRevenue }) {
  const accent = CLINIC_ACCENT[c.key] ?? TOKENS.accent;
  const years: BarDatum[] = c.byYear.map((y) => ({ label: y.label, value: y.gross, color: accent }));
  const docs: BarDatum[] = c.topDoctors.slice(0, 6).map((d) => ({ label: d.label, value: d.value, color: accent }));
  const mix: BarDatum[] = c.mix.map((m, i) => ({ label: m.label, value: m.value, color: CATEGORICAL[i % CATEGORICAL.length] }));

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
        {c.total <= 0 ? (
          <EmptyWindow label={c.label} through={c.dataThroughLabel} />
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
              <div>
                <p className="text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">
                  {c.metric === 'billed' ? 'Total billed' : 'Total collected'}
                </p>
                <p className="mt-0.5 text-[28px] font-semibold leading-none tracking-tight tabular-nums text-ink">{aed(c.total)}</p>
              </div>
              <div className="text-[12px] text-ink-soft">
                <p>
                  Period <span className="font-medium text-ink">{coverage(c)}</span>
                </p>
                <p className="mt-0.5">
                  {Math.round(c.txnCount).toLocaleString('en-US')} {c.metric === 'billed' ? 'treatment lines' : 'transactions'}
                </p>
              </div>
              {c.payerSplit && c.payerSplit.insuranceNet + c.payerSplit.patientShare > 0 ? (
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
                {c.hasUndated ? (
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
          </>
        )}
      </div>
    </Card>
  );
}

/* --------------------------------------------------------- clinic detail --- */

function ClinicDetail({ c }: { c: ClinicRevenue }) {
  const accent = CLINIC_ACCENT[c.key] ?? TOKENS.accent;
  const years: BarDatum[] = c.byYear.map((y) => ({ label: y.label, value: y.gross, color: accent }));
  const docs: BarDatum[] = c.topDoctors.map((d) => ({ label: d.label, value: d.value, color: accent }));
  const mix: BarDatum[] = c.mix.map((m, i) => ({ label: m.label, value: m.value, color: CATEGORICAL[i % CATEGORICAL.length] }));
  const trend = c.monthly.map((m) => ({ date: `${m.month}-01`, gross: m.gross }));
  const series: TrendSeries[] = [{ key: 'gross', label: c.metricLabel, color: accent, kind: 'area', valueFormat: 'aed' }];

  const kpis: KpiItem[] = [
    { label: c.metric === 'billed' ? 'Total billed' : 'Total collected', value: aed(c.total) },
    { label: c.metric === 'billed' ? 'Treatment lines' : 'Transactions', value: Math.round(c.txnCount).toLocaleString('en-US') },
    { label: 'Period in window', value: coverage(c) },
    c.payerSplit
      ? { label: 'Insurer-paid', value: aedShort(c.payerSplit.insuranceNet), hint: `patient co-pay ${aedShort(c.payerSplit.patientShare)}` }
      : { label: 'Top doctor', value: c.topDoctors[0] ? aedShort(c.topDoctors[0].value) : '—', hint: c.topDoctors[0]?.label ?? undefined },
  ];

  return (
    <div className="space-y-5">
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
          <KpiBand items={kpis} />
          <Takeaway>{c.note}</Takeaway>
        </div>
      </Card>

      {c.total <= 0 ? (
        <Card>
          <div className="p-5">
            <EmptyWindow label={c.label} through={c.dataThroughLabel} />
          </div>
        </Card>
      ) : (
        <>
          <Card>
            <SectionHeader eyebrow="Trend" title="Monthly revenue" />
            <div className="px-5 pb-5 pt-4">
              {trend.length >= 2 ? (
                <TrendChart data={trend} series={series} height={260} leftFormat="aed" xFormat="month" />
              ) : (
                <p className="text-[12.5px] text-ink-soft">
                  Not enough dated months in this window to plot a trend
                  {c.hasUndated ? ' — most of this clinic’s revenue sits in the undated 2020–2025 bucket.' : '.'}
                </p>
              )}
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <SectionHeader eyebrow="History" title="Revenue by year" />
              <div className="px-5 pb-5 pt-4">
                <HBarChart data={years} valueFormat="aed" accent={accent} />
                {c.hasUndated ? (
                  <p className="mt-2 text-[10.5px] leading-snug text-ink-faint">
                    2020–2025 has no per-treatment service date in the source, so it can&apos;t be split by year — one combined
                    bucket.
                  </p>
                ) : null}
              </div>
            </Card>
            <Card>
              <SectionHeader eyebrow="Mix" title={c.mixLabel} />
              <div className="px-5 pb-5 pt-4">
                <Donut data={mix} valueFormat="aed" centerLabel={c.metric === 'billed' ? 'billed' : 'collected'} />
              </div>
            </Card>
          </div>

          <Card>
            <SectionHeader eyebrow="Providers" title="Revenue by doctor" />
            <div className="px-5 pb-5 pt-4">
              <HBarChart data={docs} valueFormat="aed" accent={accent} />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- entry --- */

export async function GroupRevenue({ range, sub }: { range?: { from?: string; to?: string; preset?: string }; sub?: string } = {}) {
  const active = resolveGroupSub(sub);
  const data = await getGroupRevenue(range);

  if (!data.available) {
    return (
      <div className="space-y-4">
        <GroupSubNav active={active} />
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
      </div>
    );
  }

  // Single-clinic detail view.
  if (active !== 'all') {
    const c = data.clinics.find((x) => x.key === active);
    return (
      <div className="space-y-4">
        <GroupSubNav active={active} />
        {c ? (
          <>
            <ClinicDetail c={c} />
            <CoverageNote report={data} />
          </>
        ) : (
          <EmptyWindow label="clinic" />
        )}
      </div>
    );
  }

  // Portfolio (All clinics) view.
  const kpis: KpiItem[] = [
    { label: 'Group total', value: aedShort(data.combinedTotal), hint: 'collected + billed · portfolio' },
    ...data.clinics.map((c): KpiItem =>
      c.total > 0
        ? { label: c.label, value: aedShort(c.total), hint: `${c.metricLabel} · ${coverage(c)}` }
        : { label: c.label, value: '—', hint: `no data in window · ends ${c.dataThroughLabel}` },
    ),
  ];

  return (
    <div className="space-y-4">
      <GroupSubNav active={active} />
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
          <CoverageNote report={data} />
        </div>
      </Card>

      {data.clinics.map((c) => (
        <ClinicCard key={c.key} c={c} />
      ))}
    </div>
  );
}
