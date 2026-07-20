import type { ExecutiveReport } from '@/lib/executive/types';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import { ownerFor } from '@/config/data-gap-owners';
import { fmtAedCompact, fmtInt } from './parts';

const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`;

/**
 * New-patient acquisition economics — the real cost-per-acquisition, replacing
 * the manual-tracker CPL. Denominator = distinct NEW patients who were BILLED
 * (revenue-backed), split into a website-widget lens and an all-sources lens.
 */
export function ExecAcquisition({ report }: { report: ExecutiveReport }) {
  const a = report.acquisition;
  const gapOwner = ownerFor('clinic');

  const items: KpiItem[] = [
    {
      label: 'New patients (billed)',
      value: a.billedNewPatients > 0 ? fmtInt(a.billedNewPatients) : null,
      hint: 'distinct · revenue-backed',
      gapDetail: 'no billed new patients in window',
      gapOwner,
    },
    {
      label: 'Cost / new patient · All',
      value: a.cpaAll != null ? aed(a.cpaAll) : null,
      goodWhenUp: false,
      hint: 'spend ÷ all new patients (blended CAC)',
      gapDetail: 'needs spend + new patients',
      gapOwner: ownerFor('spend'),
    },
    {
      label: 'Cost / new patient · Website',
      value: a.cpaWebsite != null ? aed(a.cpaWebsite) : null,
      goodWhenUp: false,
      hint: `${fmtInt(a.websiteNewPatients)} via booking widget`,
      gapDetail: 'no website-sourced new patients yet',
      gapOwner: ownerFor('spend'),
    },
    {
      label: 'New-patient revenue',
      value: a.newPatientRevenue > 0 ? fmtAedCompact(a.newPatientRevenue) : null,
      hint: a.revenuePerNewPatient != null ? `${aed(a.revenuePerNewPatient)} / patient` : 'invoiced',
      gapDetail: 'no new-patient bills in window',
      gapOwner,
    },
    {
      label: 'New-patient ROAS',
      value: a.roas != null ? `${a.roas.toFixed(1)}×` : null,
      hint: 'new-patient revenue ÷ spend',
      gapDetail: 'needs spend + new-patient revenue',
      gapOwner: ownerFor('spend'),
    },
  ];

  return (
    <Card>
      <SectionHeader
        eyebrow="Executive dashboard · acquisition"
        title="What it costs to win a new patient"
      />
      <div className="px-5 pb-5 pt-3">
        <KpiBand items={items} />
        <Takeaway>
          A <strong>new patient</strong> is a DN-series Practo file (the Apr-2026 new-patient numbering); we count each one once,
          only when they&apos;ve been <strong>billed</strong> (revenue-backed) — a far truer demand signal than the manual lead
          tracker (which the &ldquo;Leads generated&rdquo; card above still reflects). <strong>Website</strong> counts those whose
          phone matches a website booking-widget submission; <strong>All</strong> is every new patient regardless of source.
          Note <strong>Cost / new patient · All</strong> divides <em>total</em> ad spend by <em>all</em> new patients (incl.
          organic / walk-in / referral), so it&apos;s a <strong>blended acquisition cost</strong>, not a pure paid-only CPL.
        </Takeaway>
      </div>
    </Card>
  );
}
