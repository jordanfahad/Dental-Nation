import type { ExecutiveReport } from '@/lib/executive/types';
import { CLINICS } from '@/config/clinics';
import { Card, SectionHeader } from '@/components/ui/Card';
import { HBarChart, type BarDatum } from '@/components/charts/Charts';

const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`;
const int = (n: number) => Math.round(n).toLocaleString('en-US');

/**
 * Executive clinic split — Dental Nation vs Dr Tosun side by side on the two
 * clinic-specific populations: CRM appointments (by conducting doctor) and Practo
 * finalized revenue (by bill center). Always shows BOTH clinics even while the
 * dashboard is filtered to one, so the CEO gets the comparison at a glance.
 *
 * Acquisition (ad spend, leads, GA4, the website booking widget) is SHARED — the
 * same website + booking widget feeds both clinics — so it is never split here;
 * the note says so explicitly rather than implying a fabricated per-clinic figure.
 */
export function ExecClinicSplit({ report }: { report: ExecutiveReport }) {
  const appt = report.crm.byClinic;
  const rev = report.practo.byClinic;
  if (!appt.length && !rev.length) return null;

  const revByKey = new Map(rev.map((c) => [c.clinic, c]));
  const apptByKey = new Map(appt.map((c) => [c.clinic, c]));

  const apptBars: BarDatum[] = appt.map((c) => ({ label: c.label, value: c.total }));
  const revBars: BarDatum[] = rev.map((c) => ({ label: c.label, value: c.revenue }));

  const tosunNoBills = rev.some((c) => c.clinic === 'dr-tosun' && c.bills === 0);

  return (
    <Card>
      <SectionHeader
        tag="X-clinic"
        eyebrow="Executive dashboard · clinic comparison"
        title="Dental Nation vs Dr Tosun Dental Clinic"
      />
      <div className="px-5 pb-5 pt-3">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
              CRM appointments
            </p>
            {apptBars.length ? (
              <HBarChart data={apptBars} valueFormat="int" />
            ) : (
              <p className="text-[12.5px] text-ink-faint">No appointments in range.</p>
            )}
          </div>
          <div>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
              Practo finalized revenue
            </p>
            {revBars.length ? (
              <HBarChart data={revBars} valueFormat="aed" />
            ) : (
              <p className="text-[12.5px] text-ink-faint">No finalized bills in range.</p>
            )}
          </div>
        </div>

        <div
          className="mt-4 grid gap-3"
          style={{ gridTemplateColumns: `repeat(${CLINICS.length}, minmax(0,1fr))` }}
        >
          {CLINICS.map((c) => {
            const a = apptByKey.get(c.key);
            const r = revByKey.get(c.key);
            return (
              <div key={c.key} className="rounded-card border border-line p-3.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{c.label}</p>
                <p className="tnum mt-1 text-[22px] font-semibold tracking-tight text-ink">
                  {a ? int(a.total) : '0'} <span className="text-[13px] font-normal text-ink-faint">appts</span>
                </p>
                <p className="mt-0.5 text-[12px] text-ink-faint">
                  {a ? `${int(a.booked)} booked · ${int(a.completed)} completed` : 'no appointments'}
                </p>
                <p className="tnum mt-2 text-[15px] font-medium text-ink-soft">
                  {r ? aed(r.revenue) : 'AED 0'}{' '}
                  <span className="text-[12px] font-normal text-ink-faint">
                    · {r ? int(r.bills) : 0} bill{r && r.bills === 1 ? '' : 's'}
                  </span>
                </p>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-[11.5px] leading-snug text-ink-faint">
          Ad spend, leads, website (GA4) and the booking widget are shared across both clinics — the same
          dentalnation.com site feeds both — so they stay all-clinic and aren&apos;t split here. Only the
          clinic-specific populations (CRM appointments, split by conducting doctor; Practo revenue, by bill
          center) are compared.
          {tosunNoBills
            ? ' Dr Tosun revenue reads AED 0 because its Practo bills aren’t syncing yet — its appointments already show from the CRM, and revenue fills in automatically once bills arrive.'
            : ''}
        </p>
      </div>
    </Card>
  );
}
