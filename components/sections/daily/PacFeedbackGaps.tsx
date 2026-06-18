import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { ownerFor } from '@/config/data-gap-owners';

/** The full §F PAC / WhatsApp / Call feedback row set. No real source exists for
 *  any of these in v1, so EVERY value renders an explicit, owned data gap. */
const PAC_ROWS = [
  'Total WhatsApp inquiries',
  'Total calls',
  'Avg response time',
  'Missed inquiries',
  'Bookings created',
  'Main questions',
  'Main objections',
  'Main reason for not booking',
  'Script issue',
  'Content needed',
];

/**
 * §F — PAC / WhatsApp / Call feedback. There is NO real source for front-desk /
 * PAC feedback in v1, so the full table renders with every value as a clear data
 * gap to be coordinated with PAC / the front desk. Honest by construction — never
 * a fabricated 0.
 */
export function PacFeedbackGaps() {
  return (
    <Card>
      <SectionHeader tag="F" eyebrow="PAC" title="PAC / WhatsApp / call feedback" />
      <div className="overflow-x-auto px-5 pb-2 pt-4">
        <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
          <tbody>
            {PAC_ROWS.map((label) => (
              <tr key={label} className="border-b border-line/60 align-top last:border-0">
                <th className="w-[260px] py-2 pr-4 text-left font-medium text-ink-faint">{label}</th>
                <td className="py-2">
                  <DataGapInline
                    detail="coordinate with PAC / front-desk"
                    owner={ownerFor('pac')}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-5 pb-5">
        <Takeaway>
          No system currently captures PAC / front-desk feedback. Every field above is an owned data
          gap routed to PAC until a capture method (form or daily log) is wired.
        </Takeaway>
      </div>
    </Card>
  );
}
