import { getArabyDropOff } from '@/lib/arabyads/dropOff';
import { Card, SectionHeader } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { HBarChart, TOKENS, type BarDatum } from '@/components/charts/Charts';
import { ownerFor } from '@/config/data-gap-owners';

const int = (n: number) => Math.round(n).toLocaleString('en-US');

/**
 * "Started but didn't verify" — enquiries that began the booking flow and never
 * completed WhatsApp/OTP verification, per campaign lane.
 *
 * Counts only: this report goes to the ads vendor, who has no need for patient
 * names or numbers. The working list with contact details stays internal, on
 * Clinical Operations.
 *
 * Always rendered, even with nothing to show. An enquiry can only be credited to
 * a lane if the widget writes the campaign into the Leads tab's Source column,
 * and today it does that for the Bookings tab but not (so far) for Leads — so a
 * hidden panel would read as "no drop-off", when the truth is "not tracked yet".
 * Same reasoning as the source/medium panel above.
 */
export async function ArabyDropOff({ range }: { range: { from: string; to: string } }) {
  const d = await getArabyDropOff(range);
  const bars: BarDatum[] = d.lanes.map((l) => ({ label: l.label, value: l.unverified }));

  return (
    <Card>
      <SectionHeader
        tag="A6"
        eyebrow="Drop-off"
        title="Started a booking but never verified"
        right={<span className="text-[11px] text-ink-faint">booking widget → Leads</span>}
      />
      <div className="px-5 pb-5 pt-4">
        <p className="text-[12.5px] leading-snug text-ink-soft">
          People who reached the booking form, gave their details and requested an OTP, but never completed WhatsApp
          verification — so they never became a booking and were never billed. This is demand the campaign generated that
          stops one step short, and it is counted separately from the bookings above.
        </p>

        <div className="mt-4">
          {d.source === 'missing' ? (
            <DataGapInline
              detail="Unverified-enquiry feed not available yet."
              owner={ownerFor('clinic')}
            />
          ) : d.source === 'empty' ? (
            <DataGapInline detail="No unverified enquiries recorded in this period." owner={ownerFor('clinic')} />
          ) : !d.attributable ? (
            <DataGapInline
              detail={`${int(d.total)} unverified ${
                d.total === 1 ? 'enquiry' : 'enquiries'
              } in this period, none carrying a campaign tag — the booking widget fills the Source column on its Bookings tab but leaves it blank on the Leads tab, so drop-offs can't yet be credited to a lane. Same tagging gap as the [PID]/[SUB_ID] placeholders.`}
              owner={ownerFor('tracking')}
            />
          ) : (
            <>
              <HBarChart data={bars} valueFormat="int" accent={TOKENS.accent600} />
              <p className="mt-3 text-[11.5px] leading-snug text-ink-faint">
                {int(d.total)} unverified {d.total === 1 ? 'enquiry' : 'enquiries'} in total
                {d.untagged > 0 ? (
                  <>
                    , of which {int(d.untagged)} carried no campaign tag and could not be credited to a lane
                  </>
                ) : null}
                .
              </p>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
