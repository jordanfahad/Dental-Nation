import { addDays } from '../../lib/gbp/plan';
import { buildClinicComparison } from '../../lib/gbp/clinic-comparison';
import type { Signal } from '../../lib/performance/core';
import { growth } from './dn015';

export function comparisonInput(): Parameters<typeof buildClinicComparison>[0] {
  const metrics: Signal[] = ['dental-nation', 'dr-tosun', 'al-maher'].flatMap((clinic, branch) =>
    Array.from({ length: 44 }, (_, i) => addDays('2026-09-01', i)).filter((day) => !branch || day >= '2026-09-12')
      .flatMap((day) => ['calls', 'directions', 'website_clicks'].map((metric, j) => ({ clinic, channel: 'gmb', day, metric, value: (branch + 1) * 10 ** j }))))
    .filter((r) => !(r.clinic === 'dr-tosun' && r.metric === 'website_clicks' && r.day === '2026-10-02'));
  const lead = (Date: string, branch: string, tab = '') => ({ data: { Date, 'Clinic / Branch': branch, _source_tab: tab } });
  const bill = (bill_date: string, amount: number, center_name = 'Al Wasl', bill_status = '') => ({ bill_date, amount, data: { center_name, bill_status } });
  const report = (booked: number) => ({ totals: { ...growth().totals, booked } });
  return { today: '2026-10-15', metrics, bookingsAvailable: true,
    tracker: [lead('2026-09-30', 'DN Al Wasl'), lead('30/09/2026', 'Tosun Clinic'), lead('2026-09-30', 'AMC Branch'), lead('2026-09-30', 'Unknown'),
      lead('2026-10-01', 'TDC Al wasl 4 Jumeirah - Branch'), lead('2026-10-01', 'TDC Al wasl 4 Jumeirah - Branch'),
      lead('2026-10-14', '', 'DN Campaign Leads'), lead('2026-10-14', 'DR. TOSUN DENTAL CLINIC BRACH'),
      lead('2026-10-14', 'AL WASL / AL MAHER'), lead('2026-10-14', 'Unknown', 'DN Campaign Leads'),
      lead('2026-08-31', 'Al Wasl'), lead('2026-10-15', 'Al Wasl'), lead('Date', 'Clinic / Branch'), lead('bad', 'Al Wasl')],
    bills: [bill('2026-09-30', 100.25), bill('2026-09-30', 200, 'Dr Tosun'), bill('2026-10-01', 200.5),
      bill('2026-10-14', 49.5), bill('2026-10-14', 300.25, 'Dr Tosun'), bill('2026-10-14', 999, 'Al Wasl', 'CANCELLED'),
      bill('2026-08-31', 500), bill('2026-10-15', 999)],
    growth: { mtd: { 'dental-nation': report(12), 'dr-tosun': report(8) }, lastMonth: { 'dental-nation': report(30), 'dr-tosun': report(25) } },
  };
}
export const comparisonFixture = () => buildClinicComparison(comparisonInput());
