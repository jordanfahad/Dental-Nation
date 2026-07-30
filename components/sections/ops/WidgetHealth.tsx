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
 * Driven by a check that queries the Practo availability (slots) API every 15
 * minutes — the same system the widget reads. Slots returned = healthy; an
 * empty list = genuinely no availability (the widget shows patients an empty
 * calendar); an API error/timeout = booking system down. An HTTP ping would
 * show 100% through all of that (the site answers 200 throughout), so this
 * panel deliberately measures bookability instead.
 */
/**
 * @param compact Executive view — status and uptime only, no incident table.
 *   The board-level reader needs "is it working and how often does it break";
 *   the outage log belongs where someone acts on it (Clinical Ops, Bookings).
 */
export async function WidgetHealth({ compact = false }: { compact?: boolean } = {}) {
  const h = await getWidgetHealth(7);

  // Status comes from the last check that actually DETERMINED something. A
  // crashed monitor tells us nothing about whether patients could book, so it
  // must never render as DOWN.
  const lc = h.latestConclusive;
  const down = Boolean(lc && !lc.ok);
  const stale = Boolean(h.latest && !h.latest.conclusive);
  const s = h.site;
  const kpis: KpiItem[] = [
    {
      label: 'Website',
      value: s.up == null ? '—' : s.up ? 'Up' : 'DOWN',
      hint: s.checkedAtIso ? `checked ${ago(s.checkedAtIso)}` : 'not measured yet',
    },
    {
      label: 'Website uptime (7d)',
      value: s.uptime == null ? '—' : pct(s.uptime),
      hint: `${int(s.totalChecks)} check${s.totalChecks === 1 ? '' : 's'}`,
    },
    {
      label: 'Booking widget',
      value: lc ? (lc.ok ? 'Up' : 'DOWN') : '—',
      hint: lc ? `checked ${ago(lc.checkedAt)}` : 'no verdict yet',
    },
    {
      label: 'Widget uptime (7d)',
      value: h.uptime == null ? '—' : pct(h.uptime),
      hint: `${int(h.totalChecks)} verdict${h.totalChecks === 1 ? '' : 's'}`,
    },
  ];

  return (
    <Card>
      <SectionHeader
        tag="OPS4"
        eyebrow="Booking widget"
        title="Website & booking availability"
        right={
          <span className={`text-[11px] font-medium ${down ? 'text-stop' : 'text-ink-faint'}`}>
            {down ? 'not bookable' : 'availability check · every 15 min'}
          </span>
        }
      />
      <div className="px-5 pb-5 pt-4">
        <p className="text-[12.5px] leading-snug text-ink-soft">
          {compact ? (
            <>
              An automated check asks the booking system&rsquo;s availability API every 15 minutes whether real
              appointment slots are on offer. A failure means a patient could not have booked at that moment.
            </>
          ) : (
            <>
              Every 15 minutes an automated check queries the availability API the booking widget itself reads, over the
              next 7 days for the monitored doctors. Slots returned means patients can book; an empty list means they see{' '}
              <span className="font-medium text-ink-soft">&ldquo;No slots available&rdquo;</span> (genuine
              no-availability); an API error or timeout means the booking system itself is down. A normal uptime ping
              would show 100% through all of that — the site keeps returning 200 during an outage — so this measures
              bookability, not page availability.
            </>
          )}
        </p>

        {down ? (
          <p className="mt-3 rounded-md bg-stop/10 px-3 py-2 text-[12.5px] font-medium leading-snug text-stop">
            The widget is failing right now — patients cannot complete an online booking. Take bookings by phone until it
            recovers.
            {lc?.detail ? <span className="block font-normal">{lc.detail}</span> : null}
          </p>
        ) : null}

        {/* A broken monitor is reported as a broken MONITOR — never as an outage. */}
        {stale || h.inconclusiveChecks > 0 ? (
          <p className="mt-3 rounded-md bg-watch/10 px-3 py-2 text-[12.5px] leading-snug text-watch">
            {stale
              ? 'The most recent check could not reach a verdict, so the status above is from the last check that did.'
              : `${int(h.inconclusiveChecks)} check${h.inconclusiveChecks === 1 ? '' : 's'} could not reach a verdict.`}{' '}
            These are monitor errors, not widget outages — they are excluded from uptime rather than counted as downtime.
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
          ) : h.incidents.length === 0 && s.incidents.length === 0 ? (
            <p className="text-[12.5px] text-ink-soft">
              No website or booking-widget outages in the last 7 days.
            </p>
          ) : (
            <>
              {s.incidents.length > 0 ? (
                <div className="mb-5">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                    Website outages — last 7 days
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-[12.5px]">
                      <thead>
                        <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                          <th className="py-2 pr-3">Started</th>
                          <th className="py-2 pr-3">Recovered</th>
                          <th className="py-2 pl-3">Down for</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.incidents.map((i) => (
                          <tr key={i.startIso} className="border-b border-line/60">
                            <td className="py-2.5 pr-3 whitespace-nowrap font-medium text-ink">{dayTime(i.startIso)}</td>
                            <td className="py-2.5 pr-3 whitespace-nowrap text-ink-soft">
                              {i.ongoing ? <span className="font-medium text-stop">still down</span> : dayTime(i.endIso)}
                            </td>
                            <td className="py-2.5 pl-3 whitespace-nowrap text-ink-soft">{dur(i.minutes)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {h.incidents.length === 0 ? (
                <p className="text-[12.5px] text-ink-soft">No booking-widget outages in the last 7 days.</p>
              ) : (
              <>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                Booking-widget outages — last 7 days
              </p>
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
            </>
          )}
        </div>
        )}
      </div>
    </Card>
  );
}
