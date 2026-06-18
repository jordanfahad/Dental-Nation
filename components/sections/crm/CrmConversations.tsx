import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { TrafficHeatmap } from '@/components/charts/TrafficHeatmap';
import { DataGapInline } from '@/components/ui/DataGap';
import { ownerFor } from '@/config/data-gap-owners';
import type { CrmReport } from '@/lib/crm/types';
import { fmtHours, fmtInt, hourLabel, WEEKDAYS } from './format';

/**
 * Conversations section: volume cards + a hour×weekday traffic heatmap, with a
 * takeaway naming the peak hours and the response-time problem. Honest gaps where
 * a source is missing.
 */
export function CrmConversations({ report }: { report: CrmReport }) {
  const c = report.conversation;
  const t = report.traffic;

  const cards: { label: string; value: string | null; hint?: string; red?: boolean }[] = [
    { label: 'Conversations', value: c?.conversations != null ? fmtInt(c.conversations) : null },
    {
      label: 'Messages received',
      value: c?.messagesReceived != null ? fmtInt(c.messagesReceived) : null,
    },
    { label: 'Messages sent', value: c?.messagesSent != null ? fmtInt(c.messagesSent) : null },
    {
      label: 'Resolutions',
      value: c?.resolutionCount != null ? fmtInt(c.resolutionCount) : null,
    },
    {
      label: 'Avg first response',
      value: c?.avgFirstResponseHours != null ? fmtHours(c.avgFirstResponseHours) : null,
      hint: c?.avgFirstResponseText ?? undefined,
      red: c?.avgFirstResponseHours != null && c.avgFirstResponseHours >= 48,
    },
    {
      label: 'Avg waiting',
      value: c?.avgWaitingHours != null ? fmtHours(c.avgWaitingHours) : null,
      hint: c?.avgWaitingText ?? undefined,
    },
  ];

  const peak = t.peak;
  const peakLine =
    peak != null
      ? `Peak traffic is ${WEEKDAYS[peak.weekday]} around ${hourLabel(peak.hour)} (${fmtInt(peak.conversations)} conversations).`
      : null;
  const frDays = c?.avgFirstResponseHours != null ? c.avgFirstResponseHours / 24 : null;
  const responseLine =
    frDays != null && frDays >= 2
      ? ` Yet first response averages ${frDays.toFixed(0)} days — staff the peak windows or warm enquiries will keep going cold.`
      : '';

  return (
    <Card>
      <SectionHeader
        eyebrow="CRM — Zavis · conversations"
        title="Engagement volume and when patients reach out"
      />
      <div className="px-5 pb-5 pt-4">
        {c ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {cards.map((card) => (
              <div
                key={card.label}
                className={`rounded-card border p-3 ${card.red ? 'border-stop/40 bg-stop/5' : 'border-line bg-card'}`}
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">
                  {card.label}
                </p>
                <p
                  className={`mt-1 text-[18px] font-semibold leading-none tabular-nums ${
                    card.value == null ? 'text-watch' : card.red ? 'text-stop' : 'text-ink'
                  }`}
                >
                  {card.value ?? 'gap'}
                </p>
                {card.hint ? (
                  <p className="mt-1 truncate text-[9.5px] text-ink-faint" title={card.hint}>
                    {card.hint}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <DataGapInline
            detail="no conversation summary ingested"
            owner={ownerFor('pac')}
          />
        )}

        <div className="mt-5">
          <p className="eyebrow mb-2">Traffic · hour × weekday</p>
          {t.empty ? (
            <DataGapInline detail="no conversation traffic ingested" owner={ownerFor('pac')} />
          ) : (
            <TrafficHeatmap matrix={t.matrix} />
          )}
        </div>

        {peakLine || responseLine ? (
          <Takeaway>
            {peakLine}
            {responseLine}
          </Takeaway>
        ) : null}
      </div>
    </Card>
  );
}
