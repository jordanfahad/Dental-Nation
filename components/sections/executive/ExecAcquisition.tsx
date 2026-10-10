import type { ExecutiveReport } from '@/lib/executive/types';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import { ownerFor } from '@/config/data-gap-owners';
import { fmtAedCompact, fmtInt } from './parts';

const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`;

/**
 * New-patient acquisition economics. New patient = a Dental Nation Al Wasl
 * DN-series Practo file, counted in the period of its first billed visit (see
 * lib/executive/acquisitionCore.ts). Dr Tosun files are left out: the clinic's
 * move onto Practo gave every patient a DN-series file, so new and returning
 * can't be told apart there yet.
 */
export function ExecAcquisition({ report }: { report: ExecutiveReport }) {
  const a = report.acquisition;
  const gapOwner = ownerFor('clinic');
  const tosunGap = 'Dr Tosun files were renumbered when the clinic moved onto Practo, so new and returning patients can\u2019t be told apart yet';

  const items: KpiItem[] = [
    {
      label: 'New patients · Al Wasl',
      value: a.billedNewPatients > 0 ? fmtInt(a.billedNewPatients) : null,
      hint: 'first billed visit in this period · any source',
      gapDetail: a.notMeasurable ? tosunGap : 'no new patients billed in this period',
      gapOwner,
    },
    {
      label: 'Ad spend per new patient',
      value: a.cpaAll != null ? aed(a.cpaAll) : null,
      goodWhenUp: false,
      hint: 'all ad spend ÷ all new patients (not only those from ads)',
      gapDetail: a.notMeasurable ? tosunGap : 'needs spend + new patients',
      gapOwner: ownerFor('spend'),
    },
    {
      label: 'Ad spend per new patient · Website',
      value: a.cpaWebsite != null ? aed(a.cpaWebsite) : null,
      goodWhenUp: false,
      hint: `${fmtInt(a.websiteNewPatients)} booked through the website`,
      gapDetail: a.notMeasurable ? tosunGap : 'no website-booked new patients yet',
      gapOwner: ownerFor('spend'),
    },
    {
      label: 'New-patient revenue',
      value: a.newPatientRevenue > 0 ? fmtAedCompact(a.newPatientRevenue) : null,
      hint: a.revenuePerNewPatient != null ? `${aed(a.revenuePerNewPatient)} per new patient, billed in this period` : 'billed in this period',
      gapDetail: a.notMeasurable ? tosunGap : 'no new-patient bills in this period',
      gapOwner,
    },
    {
      label: 'New-patient revenue ÷ ad spend',
      value: a.roas != null ? `${a.roas.toFixed(1)}×` : null,
      hint: 'all new patients, not only those from ads',
      gapDetail: a.notMeasurable ? tosunGap : 'needs spend + new-patient revenue',
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
          A <strong>new patient</strong> is a Dental Nation Al Wasl patient whose first billed visit falls in this period
          (a DN-series Practo file); a patient billed again later counts as returning. The ad-spend figures divide{' '}
          <em>all</em> ad spend by <em>all</em> new patients, including word of mouth, walk-ins and referrals, so they are a
          blended cost, not the cost of a patient from ads; that becomes measurable as the desk records how each patient
          found us (from 7 Oct 2026).
          {a.tosunFilesBilled > 0 ? (
            <>
              {' '}<strong>{fmtInt(a.tosunFilesBilled)}</strong> Dr Tosun patient files billed in this period are left out:
              the clinic moved onto Practo in July 2026 and every patient got a new-style file, so new and returning can&apos;t
              be told apart there yet.
            </>
          ) : null}
        </Takeaway>
      </div>
    </Card>
  );
}
