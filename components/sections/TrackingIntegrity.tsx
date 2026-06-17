import type { ReportView } from '@/lib/types';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { ShareDonut } from '@/components/charts/ShareDonut';
import { fmtInt } from '@/lib/format';

const IDENTIFIER_CHECKLIST = [
  'channel_source', 'medium', 'campaign_name', 'creative_id',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'landing_page_url', 'whatsapp_ref', 'call_tracking_no', 'pac_owner',
  'booking_status', 'inquiry_date', 'booking_date', 'appointment_date',
];

/** §C — Tracking integrity. Renders the HEALTH of attribution, not the 25-field
 *  table: an attribution donut, missing-identifier counts, a flagged list, and a
 *  collapsible full checklist. Headline = unattributed leads today. */
export function TrackingIntegrity({ view }: { view: ReportView }) {
  const t = view.tracking;
  const unattributed = view.snapshot.unattributed_leads;
  const attributed = t?.attributed ?? Math.max(0, totalInquiries(view) - unattributed);
  const total = attributed + unattributed;

  return (
    <Card>
      <SectionHeader tag="C" eyebrow="Attribution" title="Tracking integrity" />

      <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[auto_1fr]">
        <div>
          <p className="eyebrow">Unattributed leads today</p>
          <p className="tnum mt-1 text-hero font-semibold leading-none text-stop">
            {fmtInt(unattributed)}
          </p>
          <p className="mt-1 text-[12px] text-ink-faint">
            Akbar&rsquo;s rule: no unattributed leads. Each routes to its data-gap owner.
          </p>
          <div className="mt-4">
            <ShareDonut
              centerValue={total > 0 ? `${Math.round((attributed / total) * 100)}%` : '—'}
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
          <p className="eyebrow mb-2">Leads missing a critical identifier</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(t?.missing ?? defaultMissing(unattributed)).map((m) => (
              <div key={m.label} className="rounded-md border border-line p-2.5">
                <p className="tnum text-lg font-semibold text-ink">{fmtInt(m.count)}</p>
                <p className="text-[11.5px] text-ink-soft">{m.label}</p>
                <p className="text-[10.5px] text-ink-faint">owner: {m.owner}</p>
              </div>
            ))}
          </div>

          {t?.flagged && t.flagged.length > 0 ? (
            <div className="mt-4">
              <p className="eyebrow mb-1.5">Flagged leads</p>
              <ul className="space-y-1 text-[12px]">
                {t.flagged.slice(0, 5).map((f) => (
                  <li key={f.ref} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stop" />
                    <span className="text-ink-soft">
                      <span className="font-medium text-ink">{f.ref}</span> — {f.detail}
                      <span className="text-ink-faint"> · owner: {f.owner}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <details className="mt-4 group">
            <summary className="cursor-pointer text-[12.5px] font-medium text-accent">
              Full identifier checklist ({IDENTIFIER_CHECKLIST.length} fields)
            </summary>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {IDENTIFIER_CHECKLIST.map((f) => (
                <span
                  key={f}
                  className="rounded bg-na/10 px-1.5 py-0.5 font-mono text-[10.5px] text-ink-soft"
                >
                  {f}
                </span>
              ))}
            </div>
          </details>
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
  );
}

function totalInquiries(view: ReportView): number {
  return Object.values(view.snapshot.inquiries_by_channel).reduce((a, b) => a + b, 0);
}

function defaultMissing(unattributed: number) {
  return [
    { label: 'UTM source/campaign', count: unattributed, owner: 'Data/Analytics' },
    { label: 'Campaign name', count: unattributed, owner: 'Data/Analytics' },
    { label: 'Creative id', count: unattributed, owner: 'Content/Studio' },
    { label: 'PAC owner', count: Math.ceil(unattributed / 2), owner: 'PAC' },
    { label: 'Booking status', count: Math.ceil(unattributed / 3), owner: 'Clinic ops' },
  ];
}
