import { getWidgetHealth } from '@/lib/ops/widgetHealth';
import { Card, SectionHeader } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import { ownerFor } from '@/config/data-gap-owners';
import { dubaiDateLabel } from '@/lib/dates';

const int = (n: number) => Math.round(n).toLocaleString('en-US');
const pct = (n: number) => `${(n * 100).toFixed(n >= 0.999 ? 1 : 1)}%`;

function time(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai' });
}
function dayTime(iso: string): string {
  return `${dubaiDateLabel(iso.slice(0, 10))} ${time(iso)}`;
}
function ago(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (s < 90) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}
/** "35 min" / "2h 10m" — an incident's length reads better than raw minutes. */
function dur(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Booking-widget uptime — can a patient actually book right now?
 *
 * Driven by a synthetic check that opens the real widget every 15 minutes and
 * asserts the time dropdown fills. An HTTP ping would show 100% through an
 * outage (the site answers 200; only the slot list is empty), so this panel
 * deliberately measures the patient's experience instead.
 */
/**
 * @param compact Executive view — status and uptime only, no incident table.
 *   The board-level reader needs "is it working and how often does it break";
 *   the outage log belongs where someone acts on it (Clinical Ops, Bookings).
 */
export async function WidgetHealth({ compact = false }: { compact?: boolean } = {}) {
  const h = await getWidgetHealth(7);

  const down = h.latest && !h.latest.ok;
  const kpis: KpiItem[] = [
    {
      label: 'Right now',
      value: h.latest ? (h.latest.ok ? 'Working' : 'DOWN') : '—',
      hint: h.latest ? `checked ${ago(h.latest.checkedAt)}` : 'no checks yet',
    },
    { label: 'Uptime (7d)', value: h.uptime == null ? '—' : pct(h.uptime), hint: `${int(h.totalChecks)} checks` },
    { label: 'Failed checks', value: int(h.failedChecks), hint: 'patient could not book' },
    { label: 'Outages (7d)', value: int(h.incidents.length), hint: 'separate incidents' },
  ];

  return (
    <Card>
      <SectionHeader
        tag="OPS4"
        eyebrow="Booking widget"
        title="Can a patient actually book?"
        right={
          <span className={`text-[11px] font-medium ${down ? 'text-stop' : 'text-ink-faint'}`}>
            {down ? 'widget down' : 'synthetic check · every 15 min'}
          </span>
        }
      />
      <div className="px-5 pb-5 pt-4">
        <p className="text-[12.5px] leading-snug text-ink-soft">
          {compact ? (
            <>
              An automated check opens the live booking widget every 15 minutes and confirms real appointment times are
              offered. A failure means a patient could not have booked at that moment.
            </>
          ) : (
            <>
              Every 15 minutes an automated check opens the live booking widget, picks a treatment and a date, and confirms
              the time dropdown actually offers slots. A failure means a real patient hit{' '}
              <span className="font-medium text-ink-soft">&ldquo;No slots available&rdquo;</span> at that moment. This is
              measured from the patient&rsquo;s side on purpose — the site keeps returning 200 during an outage, so a normal
              uptime ping would show 100% throughout.
            </>
          )}
        </p>

        {down ? (
          <p className="mt-3 rounded-md bg-stop/10 px-3 py-2 text-[12.5px] font-medium leading-snug text-stop">
            The widget is failing right now — patients cannot complete an online booking. Take bookings by phone until it
            recovers.
            {h.latest?.detail ? <span className="block font-normal">{h.latest.detail}</span> : null}
          </p>
        ) : null}

        <div className="mt-4">
          <KpiBand items={kpis} />
        </div>

        {/* Executive view stops here: status + uptime, no incident log. */}
        {compact ? null : (
        <div className="mt-4">
          {h.source === 'missing' ? (
            <DataGapInline
              detail="Widget monitoring not set up yet — run migration 0013_widget_health.sql and enable the widget-health GitHub Action."
              owner={ownerFor('tracking')}
            />
          ) : h.source === 'empty' ? (
            <DataGapInline
              detail="No checks recorded in the last 7 days — the widget-health workflow hasn't reported yet."
              owner={ownerFor('tracking')}
            />
          ) : h.incidents.length === 0 ? (
            <p className="text-[12.5px] text-ink-soft">No outages in the last 7 days.</p>
          ) : (
            <>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-faint">Outages — last 7 days</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-[12.5px]">
                  <thead>
                    <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                      <th className="py-2 pr-3">Started</th>
                      <th className="py-2 pr-3">Recovered</th>
                      <th className="py-2 pr-3">Down for</th>
                      <th className="py-2 pl-3">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {h.incidents.map((i) => (
                      <tr key={i.startIso} className="border-b border-line/60 align-top">
                        <td className="py-2.5 pr-3 whitespace-nowrap font-medium text-ink">{dayTime(i.startIso)}</td>
                        <td className="py-2.5 pr-3 whitespace-nowrap text-ink-soft">
                          {i.ongoing ? <span className="font-medium text-stop">still down</span> : dayTime(i.endIso)}
                        </td>
                        <td className="py-2.5 pr-3 whitespace-nowrap text-ink-soft">
                          {dur(i.minutes)}
                          <span className="block text-[10.5px] text-ink-faint">{int(i.checks)} failed checks</span>
                        </td>
                        <td className="py-2.5 pl-3 text-ink-soft">{i.detail ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[11px] leading-snug text-ink-faint">
                Times are Dubai. An outage&rsquo;s start is the first failed check, so the real onset can be up to 15 minutes
                earlier.
              </p>
            </>
          )}
        </div>
        )}
      </div>
    </Card>
  );
}
