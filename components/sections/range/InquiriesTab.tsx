import type { RangeReport } from '@/lib/types';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { Scorecard } from '@/components/ui/Scorecard';
import { MixList } from '@/components/ui/MixList';
import { ShareDonut } from '@/components/charts/ShareDonut';
import { DataGapInline } from '@/components/ui/DataGap';
import { PacFeedback } from '@/components/sections/PacFeedback';
import { fmtInt } from '@/lib/format';
import { ownerFor } from '@/config/data-gap-owners';

/**
 * Inquiries tab — the lead tracker over the range: total + channel attribution
 * (WhatsApp / ZAVIS / Instagram / …), by-clinic, and §C tracking integrity
 * (attributed vs unattributed + flagged leads). PAC feedback (§F) is mock-only
 * (no real source) and shown here with its honest data-gap state.
 */
export function InquiriesTab({ report }: { report: RangeReport }) {
  const { leads, pac } = report;
  const attributed = leads.attributed.value ?? 0;
  const unattributed = leads.unattributed.value ?? 0;
  const total = attributed + unattributed;
  const attrPct = total > 0 ? Math.round((attributed / total) * 100) : null;

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader eyebrow="Inquiries · lead tracker · selected range" title="Tracked inquiries" />
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
          <Scorecard label="Tracked inquiries" metric={leads.total} />
          <Scorecard label="Attributed" metric={leads.attributed} />
          <Scorecard label="Unattributed" metric={leads.unattributed} invert />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Attribution" title="Inquiries by channel" />
          <div className="p-5">
            {leads.empty ? (
              <DataGapInline detail="No inquiries in this range" owner={ownerFor('attribution')} />
            ) : (
              <MixList rows={leads.byChannel} />
            )}
          </div>
        </Card>

        <Card>
          <SectionHeader eyebrow="Clinic" title="Inquiries by clinic" />
          <div className="p-5">
            {leads.empty ? (
              <DataGapInline detail="No inquiries in this range" owner={ownerFor('clinic')} />
            ) : (
              <MixList rows={leads.byClinic} />
            )}
          </div>
        </Card>
      </div>

      <Card>
        <SectionHeader tag="C" eyebrow="Attribution" title="Tracking integrity" />
        <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[auto_1fr]">
          <div>
            <p className="eyebrow">Unattributed inquiries in range</p>
            <p className="tnum mt-1 text-hero font-semibold leading-none text-stop">
              {fmtInt(unattributed)}
            </p>
            <p className="mt-1 text-[12px] text-ink-faint">
              Akbar&rsquo;s rule: no unattributed leads. Each routes to its data-gap owner.
            </p>
            <div className="mt-4">
              <ShareDonut
                centerValue={attrPct != null ? `${attrPct}%` : '—'}
                centerLabel="attributed"
                size={120}
                slices={[
                  { label: 'Attributed', value: attributed, color: 'var(--accent)' },
                  { label: 'Unattributed', value: unattributed, color: 'var(--stop)' },
                ]}
              />
            </div>
          </div>

          <div>
            <p className="eyebrow mb-2">Flagged inquiries</p>
            {leads.flagged.length > 0 ? (
              <ul className="space-y-1 text-[12px]">
                {leads.flagged.map((f) => (
                  <li key={f.ref} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stop" />
                    <span className="text-ink-soft">
                      <span className="font-medium text-ink">{f.ref}</span> — {f.detail}
                      <span className="text-ink-faint"> · owner: {f.owner}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-good">No flagged inquiries in this range.</p>
            )}
          </div>
        </div>
        <div className="px-5 pb-5">
          <Takeaway>
            {unattributed > 0
              ? `${unattributed} inquiries can't be traced to a channel — fix tracking before trusting channel ROI.`
              : 'Every inquiry is attributed to a channel; channel ROI is trustworthy.'}
          </Takeaway>
        </div>
      </Card>

      <PacFeedback pac={pac} />
    </div>
  );
}
