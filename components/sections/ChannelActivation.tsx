import type { ChannelStatus } from '@/lib/types';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { StatusCell } from '@/components/ui/pills';
import { ShareDonut } from '@/components/charts/ShareDonut';

function readiness(c: ChannelStatus): 'green' | 'partial' | 'notlive' {
  if (!c.is_live) return 'notlive';
  const flags = [c.content_populated, c.cta_correct, c.destination_correct, c.tracking_active];
  return flags.every((f) => f) ? 'green' : 'partial';
}

/** §B — Channel Activation Status. Donut of readiness over a dense status grid;
 *  every canonical channel is rendered (marked "not live" rather than omitted). */
export function ChannelActivation({ channels }: { channels: ChannelStatus[] }) {
  const counts = channels.reduce(
    (acc, c) => {
      acc[readiness(c)] += 1;
      return acc;
    },
    { green: 0, partial: 0, notlive: 0 },
  );

  return (
    <Card>
      <SectionHeader tag="B" eyebrow="Activation" title="Channel activation status" />
      <div className="px-5 pt-4">
        <ShareDonut
          centerValue={`${counts.green}/${channels.length}`}
          centerLabel="fully live"
          slices={[
            { label: 'Fully live', value: counts.green, color: 'var(--good)' },
            { label: 'Partial', value: counts.partial, color: 'var(--watch)' },
            { label: 'Not live', value: counts.notlive, color: 'var(--na)' },
          ]}
        />
        <Takeaway>
          {counts.green} of {channels.length} channels are fully live; {counts.partial} partial and{' '}
          {counts.notlive} not yet started — most acquisition still depends on a handful of channels.
        </Takeaway>
      </div>

      <div className="mt-4 overflow-x-auto px-5 pb-5">
        <table className="w-full min-w-[680px] border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="py-2 pr-3 font-medium text-ink-faint">Channel</th>
              {['Live', 'Content', 'CTA', 'Destination', 'Tracking'].map((h) => (
                <th key={h} className="px-2 py-2 text-center font-medium text-ink-faint">
                  {h}
                </th>
              ))}
              <th className="px-2 py-2 font-medium text-ink-faint">Owner</th>
              <th className="px-2 py-2 font-medium text-ink-faint">Blocker</th>
            </tr>
          </thead>
          <tbody>
            {channels.map((c) => (
              <tr key={c.channel} className="border-b border-line/60 last:border-0">
                <td className="py-1.5 pr-3 font-medium text-ink">{c.channel}</td>
                {[c.is_live, c.content_populated, c.cta_correct, c.destination_correct, c.tracking_active].map(
                  (v, i) => (
                    <td key={i} className="px-2 py-1.5 text-center">
                      <span className="inline-flex justify-center">
                        <StatusCell value={v} />
                      </span>
                    </td>
                  ),
                )}
                <td className="px-2 py-1.5 text-ink-soft">{c.owner ?? '—'}</td>
                <td className="px-2 py-1.5 text-ink-faint">{c.blocker ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
