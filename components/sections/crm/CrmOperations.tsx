import { getCrmOperations, type InboxRow } from '@/lib/crm/operations';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';

const int = (n: number) => Math.round(n).toLocaleString('en-US');

const CHANNEL_COLOR: Record<string, string> = {
  whatsapp: '#25D366',
  instagram: '#C13584',
  facebook: '#1877F2',
  telegram: '#2AABEE',
};
const channelColor = (t: string | null) => CHANNEL_COLOR[(t ?? '').toLowerCase()] ?? '#5793A3';

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const w = max > 0 ? Math.max((value / max) * 100, value > 0 ? 3 : 0) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-panel-2">
      <div className="h-full rounded-full" style={{ width: `${w}%`, backgroundColor: color }} />
    </div>
  );
}

export async function CrmOperations() {
  const ops = await getCrmOperations();
  if (ops.source === 'empty') return null;

  const inboxMax = Math.max(1, ...ops.inbox.map((r) => r.conversations));
  const agentMax = Math.max(1, ...ops.agents.map((r) => r.assigned));
  const activeLabels = ops.labels.filter((l) => l.conversations > 0);

  return (
    <div className="space-y-5">
      {/* Inbox = channel */}
      <Card>
        <SectionHeader
          tag="Z1"
          eyebrow="Zavis operations · channels"
          title="Conversations by inbox (channel)"
          right={<span className="text-[11px] text-ink-faint">{int(ops.totals.conversations)} total</span>}
        />
        <div className="px-5 pb-5 pt-4">
          <div className="space-y-3">
            {ops.inbox.map((r: InboxRow) => (
              <div key={r.inbox} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: channelColor(r.type) }} />
                    <span className="truncate text-[12.5px] text-ink" title={r.inbox}>{r.inbox}</span>
                    <span className="shrink-0 rounded-full bg-panel-2 px-1.5 py-0.5 text-[10px] text-ink-faint">{r.type ?? '—'}</span>
                  </div>
                  <div className="mt-1"><Bar value={r.conversations} max={inboxMax} color={channelColor(r.type)} /></div>
                </div>
                <div className="text-right">
                  <span className="text-[13px] font-semibold tabular-nums text-ink">{int(r.conversations)}</span>
                  <span className="block text-[10px] text-ink-faint">
                    {r.firstResponse ? `1st reply ${r.firstResponse}` : 'no reply data'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <Takeaway>
            Where patients actually talk to the clinic. The two Al&nbsp;Wasl / Dr&nbsp;Tosun WhatsApp lines carry the vast
            majority of conversations; Instagram DMs are the fastest to first reply.
          </Takeaway>
        </div>
      </Card>

      {/* Agents */}
      <Card>
        <SectionHeader tag="Z2" eyebrow="Zavis operations · team" title="Conversations by agent" />
        <div className="px-5 pb-5 pt-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-left text-[10.5px] uppercase tracking-wide text-ink-faint">
                  <th className="py-2 pr-3">Agent</th>
                  <th className="py-2 pr-3">Assigned</th>
                  <th className="py-2 pr-3"> </th>
                  <th className="py-2 pr-3">Avg 1st response</th>
                  <th className="py-2 pr-3">Avg wait</th>
                  <th className="py-2 pl-3">Resolved</th>
                </tr>
              </thead>
              <tbody>
                {ops.agents.map((r) => (
                  <tr key={r.agent} className="border-b border-line/60">
                    <td className="py-2 pr-3 text-ink">{r.agent}</td>
                    <td className="py-2 pr-3 tabular-nums text-ink">{int(r.assigned)}</td>
                    <td className="py-2 pr-3 w-28"><Bar value={r.assigned} max={agentMax} color="#2C5E86" /></td>
                    <td className="py-2 pr-3 text-ink-soft">{r.firstResponse ?? '—'}</td>
                    <td className="py-2 pr-3 text-ink-soft">{r.waiting ?? '—'}</td>
                    <td className="py-2 pl-3 tabular-nums text-ink-soft">{int(r.resolutionCount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Labels */}
      <Card>
        <SectionHeader
          tag="Z3"
          eyebrow="Zavis operations · labels"
          title="Conversations by label (campaign / PR / segment)"
          right={<span className="text-[11px] text-ink-faint">{int(activeLabels.length)} active · {int(ops.labels.length)} total</span>}
        />
        <div className="px-5 pb-5 pt-4">
          {activeLabels.length === 0 ? (
            <p className="text-[12.5px] text-ink-soft">No labelled conversations in this export.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-[12.5px]">
                <thead>
                  <tr className="border-b border-line text-left text-[10.5px] uppercase tracking-wide text-ink-faint">
                    <th className="py-2 pr-3">Label</th>
                    <th className="py-2 pr-3">Conversations</th>
                    <th className="py-2 pr-3">Avg 1st response</th>
                    <th className="py-2 pr-3">Avg reply</th>
                    <th className="py-2 pl-3">Resolved</th>
                  </tr>
                </thead>
                <tbody>
                  {activeLabels.map((r) => (
                    <tr key={r.label} className="border-b border-line/60">
                      <td className="py-2 pr-3 font-mono text-[11.5px] text-ink">{r.label}</td>
                      <td className="py-2 pr-3 tabular-nums text-ink">{int(r.conversations)}</td>
                      <td className="py-2 pr-3 text-ink-soft">{r.firstResponse ?? '—'}</td>
                      <td className="py-2 pr-3 text-ink-soft">{r.reply ?? '—'}</td>
                      <td className="py-2 pl-3 tabular-nums text-ink-soft">{int(r.resolutionCount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Takeaway>
            Labels tag conversations by campaign (arabyads_*), doctor PR (dr_*_pr), patient segment (active_patients_*)
            and specialty (*_sv) — useful for seeing which PR pushes and campaigns actually drove inbound chat.
          </Takeaway>
        </div>
      </Card>
    </div>
  );
}
