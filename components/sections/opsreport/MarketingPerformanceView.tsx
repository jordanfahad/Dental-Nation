import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import type { BranchPerformance, MarketingPerformance as PerformanceReport, PerformanceBranch, PerformanceCohort, PerformanceMetric, PerformancePeriod, RevenueSummary } from '@/lib/opsreport/marketingPerformanceCore';
import { buildMarketingPerformanceExport, PERFORMANCE_BRANCH_LABELS, PERFORMANCE_CHANNEL_LABELS } from '@/lib/opsreport/marketingPerformanceExport';
import { MarketingPerformanceDownload } from './MarketingPerformanceDownload';

const NAVY = '#244260';
const SERIF = { fontFamily: 'Georgia, "Palatino Linotype", serif' } as const;
const BRANCHES = Object.keys(PERFORMANCE_BRANCH_LABELS) as PerformanceBranch[];
const HEAD = 'border-b border-line bg-panel/50 text-left text-[11px] text-ink-soft';
const CELL = 'border-b border-line/60 px-3 py-3 align-top';
const date = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const month = (key: string) => new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
type Format = 'count' | 'money' | 'percent';
type Section = 'spend' | 'acquisition' | 'ltv' | 'retention';
interface Field { label: string; metric: PerformanceMetric; format?: Format }

function MetricValue({ metric, format = 'count' }: { metric: PerformanceMetric; format?: Format }) {
  const value = metric.value;
  return (
    <div>
      {value === null ? (
        <p className="text-[11px] leading-snug text-ink-soft">Not available because {metric.reason ?? 'the source does not contain this measure.'}</p>
      ) : (
        <p className="font-semibold tabular-nums text-ink">
          {format === 'money' ? `AED ${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : format === 'percent' ? `${(value * 100).toFixed(1)}%` : value.toLocaleString('en-GB')}
        </p>
      )}
      <details className="mt-0.5 text-[10px] leading-snug text-ink-faint">
        <summary className="cursor-pointer">Source{metric.note ? ' and coverage' : ''}</summary>
        <p className="mt-1">{metric.source}</p>
        {metric.note ? <p className="mt-1">{metric.note}</p> : null}
      </details>
    </div>
  );
}

function MetricList({ fields }: { fields: Field[] }) {
  // One reason may apply to several unavailable measures in a cell. Keep all
  // their labels while avoiding five copies of the same coverage explanation.
  const groups: Field[] = [];
  for (const field of fields) {
    const existing = field.metric.value === null ? groups.find((item) => item.metric.value === null && item.metric.reason === field.metric.reason && item.metric.source === field.metric.source) : undefined;
    if (existing) existing.label += `; ${field.label}`;
    else groups.push({ ...field });
  }
  return (
    <dl className="space-y-2.5 text-[12px]">
      {groups.map((field) => (
        <div key={field.label}>
          <dt className="mb-0.5 text-[10.5px] font-medium text-ink-soft">{field.label}</dt>
          <dd><MetricValue metric={field.metric} format={field.format} /></dd>
        </div>
      ))}
    </dl>
  );
}

function fieldsFor(section: Section, data: BranchPerformance, branch: PerformanceBranch): Field[] {
  switch (section) {
    case 'spend': return [
      { label: 'Ad accounts', metric: data.spend.adAccounts, format: 'money' },
      { label: 'Manual sheet, not in the ad account', metric: data.spend.manual, format: 'money' },
    ];
    case 'acquisition': return [
      { label: 'All new patients', metric: data.acquisition.newPatients },
      { label: 'Paid', metric: data.acquisition.paid },
      { label: 'Digital, unpaid', metric: data.acquisition.digitalUnpaid },
      { label: 'Not marketing', metric: data.acquisition.notMarketing },
      { label: 'Blended ad spend per new patient', metric: data.acquisition.blendedCost, format: 'money' },
    ];
    case 'ltv': return [
      { label: 'New-patient cohort size', metric: data.ltv.patients },
      { label: 'Cohort revenue to date', metric: data.ltv.revenue, format: 'money' },
      { label: 'Mean per patient to date', metric: data.ltv.mean, format: 'money' },
      { label: 'Median per patient to date', metric: data.ltv.median, format: 'money' },
    ];
    case 'retention': return branch === 'dr-tosun' ? [
      { label: 'New versus returning patients', metric: data.retention.returning },
      { label: 'Distinct files billed', metric: data.retention.tosunBilled },
      { label: 'Files billed in two or more months since July 2026', metric: data.retention.tosunRepeat },
    ] : branch === 'dn-alwasl' ? [
      { label: 'Returning patients, total', metric: data.retention.returning },
      { label: 'Existing file series', metric: data.retention.existingFiles },
      { label: 'New-series files after their first-bill month', metric: data.retention.returningNewFiles },
    ] : [{ label: 'Returning patients', metric: data.retention.returning }];
  }
}

function BranchCell({ section, data, branch }: { section: Section; data: BranchPerformance; branch: PerformanceBranch }) {
  const channels = section === 'acquisition' ? data.acquisition.channels : null;
  return (
    <>
      <MetricList fields={fieldsFor(section, data, branch)} />
      {channels ? (
        <details className="mt-3 text-[11px] text-ink-soft">
          <summary className="cursor-pointer font-medium">Channel detail ({Object.values(channels).reduce((total, n) => total + n, 0)} patients)</summary>
          {Object.keys(channels).length ? (
            <dl className="mt-1 space-y-1">
              {Object.entries(channels).sort(([a], [b]) => a.localeCompare(b)).map(([channel, count]) => (
                <div key={channel} className="flex justify-between gap-2"><dt>{PERFORMANCE_CHANNEL_LABELS[channel] ?? channel}</dt><dd className="tabular-nums">{count}</dd></div>
              ))}
            </dl>
          ) : <p className="mt-1">No measured new patients in this period.</p>}
          <p className="mt-1 text-[10px]">Source: {data.acquisition.paid.source}.</p>
        </details>
      ) : null}
    </>
  );
}

function TableScroll({ label, children }: { label: string; children: ReactNode }) {
  return <div className="overflow-x-auto" role="region" aria-label={label} tabIndex={0}>{children}</div>;
}

function AnnualTable({ years, section }: { years: PerformancePeriod[]; section: Section }) {
  return (
    <TableScroll label={`${section}: annual branch comparison`}>
      <table className="w-full min-w-[700px] table-fixed border-collapse text-[12px]">
        <caption className="sr-only">Annual figures by branch, with a separate column for each reporting year.</caption>
        <thead><tr className={HEAD}>
          <th scope="col" className="w-[110px] px-3 py-3">Branch</th>
          {years.map((period) => <th scope="col" key={period.key} className="px-3 py-3"><span className="block text-[13px] text-ink">{period.key}{period.key === '2026' ? ' to date' : ''}</span><span className="mt-1 block font-normal">{date(period.from)} to {date(period.to)}</span></th>)}
        </tr></thead>
        <tbody>{BRANCHES.map((branch) => <tr key={branch}>
          <th scope="row" className={`${CELL} text-left font-semibold text-ink`}>{PERFORMANCE_BRANCH_LABELS[branch]}</th>
          {years.map((period) => <td key={period.key} className={CELL}><BranchCell section={section} data={period.branches[branch]} branch={branch} /></td>)}
        </tr>)}</tbody>
      </table>
    </TableScroll>
  );
}

function MonthlyTable({ report, section }: { report: PerformanceReport; section: Section }) {
  return (
    <details className="mt-4 rounded-md border border-line">
      <summary className="cursor-pointer px-3 py-3 text-[12px] font-semibold text-ink">Month table: January 2025 to {month(report.asOf.slice(0, 7))}</summary>
      <TableScroll label={`${section}: monthly branch comparison`}>
        <table className="w-full min-w-[900px] table-fixed border-collapse text-[12px]">
          <caption className="sr-only">Every month from January 2025, split into Al Wasl, Dr Tosun and Al Maher.</caption>
          <thead><tr className={HEAD}><th scope="col" className="w-[120px] px-3 py-2">Period</th>{BRANCHES.map((branch) => <th scope="col" className="px-3 py-2" key={branch}>{PERFORMANCE_BRANCH_LABELS[branch]}</th>)}</tr></thead>
          <tbody>{report.months.map((period) => <tr key={period.key}>
            <th scope="row" className={`${CELL} text-left font-medium text-ink`}><span className="block">{month(period.key)}</span><span className="mt-1 block text-[10px] font-normal text-ink-faint">{period.from} to {period.to}</span></th>
            {BRANCHES.map((branch) => <td key={branch} className={CELL}><BranchCell section={section} data={period.branches[branch]} branch={branch} /></td>)}
          </tr>)}</tbody>
        </table>
      </TableScroll>
    </details>
  );
}

function ReportCard({ id, title, definition, source, report, section, children }: { id: string; title: string; definition: string; source: string; report: PerformanceReport; section: Section; children?: ReactNode }) {
  return (
    <Card id={id} className="overflow-hidden">
      <header className="px-5 py-4 text-white" style={{ backgroundColor: NAVY }}>
        <h2 className="text-[19px] font-semibold" style={SERIF}>{title}</h2>
        <p className="mt-1 text-[12px] text-white/90">{definition}</p>
        <p className="mt-2 text-[10.5px] text-white/75">Period: 1 January 2025 to {date(report.asOf)}. Source: {source}.</p>
      </header>
      <div className="space-y-4 p-4 sm:p-5">
        {children}
        <AnnualTable years={report.years} section={section} />
        <MonthlyTable report={report} section={section} />
      </div>
    </Card>
  );
}

function RevenueWindow({ value }: { value: RevenueSummary }) {
  return <MetricList fields={[
    { label: 'Total', metric: value.total, format: 'money' },
    { label: 'Mean per patient', metric: value.mean, format: 'money' },
    { label: 'Median per patient', metric: value.median, format: 'money' },
  ]} />;
}

function CohortValueTable({ report }: { report: PerformanceReport }) {
  if (!report.cohorts.length) return <p className="text-[12px] text-ink-soft">Not available because no eligible Al Wasl new-patient cohorts are loaded from May 2026.</p>;
  return (
    <TableScroll label="Al Wasl early patient value by first-bill cohort">
      <table className="w-full min-w-[1100px] border-collapse text-[12px]">
        <caption className="mb-2 text-left text-[12px] text-ink-soft">Al Wasl first-bill cohorts from May 2026. Loaded history as of {date(report.asOf)}; source notes give the last observed day. Source: Practo non-cancelled bills; Meta and Google ad accounts for blended cost.</caption>
        <thead><tr className={HEAD}>{['First-bill month', 'Patients', 'Minimum history', 'First 30 days', 'First 90 days', 'Revenue to date', 'Blended ad spend per new patient'].map((label) => <th key={label} scope="col" className="px-3 py-2">{label}</th>)}</tr></thead>
        <tbody>{report.cohorts.map((cohort) => <tr key={cohort.month}>
          <th scope="row" className={`${CELL} text-left font-medium`}>{month(cohort.month)}</th>
          <td className={`${CELL} tabular-nums`}>{cohort.patients}</td>
          <td className={CELL}>{cohort.historyDays} days</td>
          <td className={CELL}><RevenueWindow value={cohort.revenue30} /></td>
          <td className={CELL}><RevenueWindow value={cohort.revenue90} /></td>
          <td className={CELL}><RevenueWindow value={cohort.revenueToDate} /></td>
          <td className={CELL}><MetricValue metric={cohort.blendedCost} format="money" /></td>
        </tr>)}</tbody>
      </table>
    </TableScroll>
  );
}

function CohortRetentionTable({ cohorts, asOf }: { cohorts: PerformanceCohort[]; asOf: string }) {
  if (!cohorts.length) return <p className="text-[12px] text-ink-soft">Not available because no eligible Al Wasl new-patient cohorts are loaded from May 2026.</p>;
  return (
    <TableScroll label="Al Wasl retained patients by first-bill cohort">
      <table className="w-full min-w-[900px] border-collapse text-[12px]">
        <caption className="mb-2 text-left text-[12px] text-ink-soft">Al Wasl loaded cohorts as of {date(asOf)}; source notes give the last observed day. Month 1, 2 and 3 each mean that exact calendar month after the first-bill month. Source: Practo non-cancelled bills.</caption>
        <thead><tr className={HEAD}>{['First-bill month', 'Original patients', 'Billed in any later month', 'Month 1', 'Month 2', 'Month 3'].map((label) => <th key={label} scope="col" className="px-3 py-2">{label}</th>)}</tr></thead>
        <tbody>{cohorts.map((cohort) => <tr key={cohort.month}>
          <th scope="row" className={`${CELL} text-left font-medium`}>{month(cohort.month)}</th>
          <td className={`${CELL} tabular-nums`}>{cohort.patients}</td>
          <td className={CELL}><MetricValue metric={cohort.retainedLater} /></td>
          {cohort.retentionMonths.map((retention) => <td key={retention.month} className={CELL}><MetricList fields={[
            { label: 'Patients', metric: retention.patients },
            { label: 'Share of original cohort', metric: retention.share, format: 'percent' },
          ]} /></td>)}
        </tr>)}</tbody>
      </table>
    </TableScroll>
  );
}

function RevenueContextTable({ years }: { years: PerformancePeriod[] }) {
  return (
    <TableScroll label="Branch revenue by year and accounting measure">
      <table className="w-full min-w-[1050px] table-fixed border-collapse text-[12px]">
        <caption className="sr-only">Legacy collected money, legacy billed revenue, Zoho billed revenue and Practo bills are separate measures.</caption>
        <thead><tr className={HEAD}>
          <th scope="col" className="w-[130px] px-3 py-2">Branch and period</th>
          <th scope="col" className="px-3 py-2">Collected money<br /><span className="font-normal">Legacy practice system</span></th>
          <th scope="col" className="px-3 py-2">Billed revenue<br /><span className="font-normal">Legacy practice system</span></th>
          <th scope="col" className="px-3 py-2">Billed revenue<br /><span className="font-normal">Zoho</span></th>
          <th scope="col" className="px-3 py-2">Practo bills<br /><span className="font-normal">Loaded patient-level history</span></th>
        </tr></thead>
        <tbody>{BRANCHES.flatMap((branch) => years.map((period) => <tr key={`${branch}-${period.key}`}>
          <th scope="row" className={`${CELL} text-left font-medium`}><span className="block">{PERFORMANCE_BRANCH_LABELS[branch]}</span><span className="mt-1 block">{period.key}{period.key === '2026' ? ' to date' : ''}</span><span className="mt-1 block text-[10px] font-normal text-ink-faint">{period.from} to {period.to}</span></th>
          {(['collected', 'legacyBilled', 'billed', 'practo'] as const).map((measure) => <td key={measure} className={CELL}><MetricValue metric={period.branches[branch].revenue[measure]} format="money" /></td>)}
        </tr>))}</tbody>
      </table>
    </TableScroll>
  );
}

/** Pure, aggregate-only view shared by the operations tab and internal room. */
export function MarketingPerformanceView({ report }: { report: PerformanceReport }) {
  return (
    <div className="mt-5 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-card bg-panel px-5 py-5">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">Head of Operations</p><h1 className="mt-1 text-[24px] font-bold leading-tight text-ink" style={SERIF}>Marketing performance, 2025 and 2026</h1><p className="mt-2 text-[12px] text-ink-soft">As of {date(report.asOf)}. Current branches: Al Wasl, Dr Tosun and Al Maher. Amounts are in AED.</p></div>
        <MarketingPerformanceDownload data={buildMarketingPerformanceExport(report)} />
        <p className="w-full text-[11.5px] text-ink-soft">Measured figures only. Each table names its period; open a figure&apos;s source and coverage note for its feed and limitations. Missing data is labelled with the reason.</p>
      </header>

      <ReportCard id="marketing-spend" title="1. Marketing spend by branch" definition="Ad-account spend is the sum of Meta and Google spend in the period; separately recorded manual campaigns remain a separate line." source="Meta and Google ad accounts; the manual campaign sheet" report={report} section="spend">
        <p className="text-[12px] leading-relaxed text-ink-soft">One ad account per platform; ads ran for Dental Nation Al Wasl. The ad-account figure and the blended cost use the same spend measure as the Executive dashboard. Dr Tosun&apos;s manual-sheet campaign is shown separately as recorded, never added into the ad-account total. Al Maher has no spend recorded.</p>
        <p className="text-[12px] leading-relaxed text-ink-soft">Meta ads were paused from 27 April to the end of August 2026. That pause is real, rather than a missing-spend estimate. Each source note shows the loaded dates for both platforms. Before the accounts began in November 2025, spend is unavailable; the Executive dashboard can instead fall back to its manual tracker for an empty ad-account window.</p>
      </ReportCard>

      <ReportCard id="marketing-patients" title="2. Patients acquired through marketing" definition="New patients follow the Executive dashboard's first non-cancelled bill definition and are grouped by the Growth Platform channel verdict on their first appointment." source="Practo bills and first appointments; Growth Platform attribution waterfall; ad accounts for blended cost" report={report} section="acquisition">
        <div className="space-y-2 text-[12px] leading-relaxed text-ink-soft">
          <p><strong>Paid:</strong> paid search, paid social and affiliate. <strong>Digital, unpaid:</strong> website, organic social, Google Business Profile and AI concierge. <strong>Not marketing:</strong> Direct / Walk-in, patient referral, partnership and any other channel. These three groups add up to all measured new patients.</p>
          <p>Reception was reported to begin recording how new patients found us on 7 October 2026. That source field is not present in the synced feed used here. Patients without another attributable trace fall to Direct / Walk-in by default. This default means no source was recorded in the available feed. Phone-path estimates are excluded.</p>
          <p>Dr Tosun is not measurable yet because files were renumbered at the July move. Blended ad spend per new patient includes all new patients, regardless of channel.</p>
        </div>
      </ReportCard>

      <ReportCard id="marketing-value" title="3. Patient value (early LTV)" definition="For each first-bill cohort, patient value is the observed non-cancelled bill revenue per patient since their first bill, including patients who have not returned." source="Practo non-cancelled bills; Meta and Google ad accounts for blended cost" report={report} section="ltv">
        <p className="rounded-md bg-panel px-3 py-3 text-[13px] font-semibold text-ink">{report.cohorts.length ? `Early: at most ${report.historyMonths} months of history; not a lifetime value yet.` : 'History not available because no eligible Al Wasl cohorts are loaded.'}</p>
        <p className="text-[12px] leading-relaxed text-ink-soft">Al Wasl cohorts start in May 2026 because April history is incomplete. A 30-day or 90-day figure appears only after every patient in the cohort has that much history. Annual and monthly summaries refer to patients first billed in that period, with their revenue through {date(report.asOf)}. Blended acquisition cost is alongside observed value in the cohort table.</p>
        <CohortValueTable report={report} />
      </ReportCard>

      <ReportCard id="marketing-retention" title="4. Retained patients and retention" definition="A retained cohort patient has a non-cancelled bill in a later calendar month; monthly returning patients combine existing file series with new-series files billed after their first-bill month." source="Practo non-cancelled bills" report={report} section="retention">
        <p className="text-[12px] leading-relaxed text-ink-soft">The cohort table shows people billed again and their share of the original cohort in month 1, 2 and 3, only after each month has finished. Returning totals are distinct within each displayed period, so monthly counts should not be added to obtain annual unique patients. Dr Tosun shows files billed and files seen in at least two months since July 2026; new and returning cannot be told apart.</p>
        <CohortRetentionTable cohorts={report.cohorts} asOf={report.asOf} />
      </ReportCard>

      <Card id="marketing-revenue-context">
        <div className="space-y-3 p-4 sm:p-5">
          <h2 className="text-[18px] font-semibold text-ink" style={SERIF}>Branch revenue, 2025 and 2026</h2>
          <p className="text-[12px] leading-relaxed text-ink-soft">Context only. Legacy collected money, legacy billed revenue, Zoho billed revenue and Practo bills are separate source measures. Do not add these columns together. Period: 1 January 2025 to {date(report.asOf)}. Sources: legacy practice-system monthly export, Zoho finance monthly export and Practo bills. Recorded-month coverage is listed on each figure; missing months and an undated multi-year total are not allocated or estimated.</p>
          <RevenueContextTable years={report.years} />
        </div>
      </Card>

      <Card id="marketing-measurement-gaps">
        <div className="p-4 sm:p-5">
          <h2 className="text-[18px] font-semibold text-ink" style={SERIF}>What we can&apos;t measure yet, and what would fix it</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[12px] leading-relaxed text-ink-soft">
            <li><strong>2025 new patients, value and retention:</strong> no patient-level data was loaded. Obtain the legacy practice-system visit exports for Al Wasl and Dr Tosun.</li>
            <li><strong>How patients found us:</strong> reception source recording was reported to begin on 7 October 2026, but that field is not present in the synced feed used here. Verify the recording process and sync the source field with each appointment.</li>
            <li><strong>Dr Tosun new versus returning patients:</strong> the July move renumbered every file. Obtain a pre-migration patient list and a mapping to the current records.</li>
            <li><strong>Al Maher patient acquisition, value and retention:</strong> no patient or channel feed exists. Load dated patient-level bills and appointment sources.</li>
            <li><strong>Lifetime value:</strong> the loaded cohorts have only early follow-up. Continue recording bills and returns as cohorts mature; no projected lifetime value or payback is inferred.</li>
          </ul>
          <p className="mt-3 text-[10.5px] text-ink-faint">Coverage assessed as of {date(report.asOf)} from the source feeds named above. Any failed feed is shown as not available in its affected cells.</p>
        </div>
      </Card>
    </div>
  );
}
