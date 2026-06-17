import type { PacFeedback as PacFeedbackData } from '@/lib/types';
import { Card, SectionHeader } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { RESPONSE_TIME_TARGET_MIN } from '@/config/decision-rules';
import { fmtInt } from '@/lib/format';
import { ownerFor } from '@/config/data-gap-owners';

/** §F — PAC / WhatsApp / Call feedback. Stat cards + a response-time gauge vs.
 *  target, then the qualitative blocks rendered as verbatim quote chips. */
export function PacFeedback({ pac }: { pac: PacFeedbackData | null }) {
  if (!pac) {
    return (
      <Card>
        <SectionHeader tag="F" eyebrow="PAC" title="PAC / WhatsApp / call feedback" />
        <div className="p-5">
          <DataGapInline detail="No PAC feedback recorded for this date" owner={ownerFor('pac')} />
        </div>
      </Card>
    );
  }

  const resp = pac.avg_response_minutes;
  const overTarget = resp != null && resp > RESPONSE_TIME_TARGET_MIN;
  const gaugePct = resp != null ? Math.min(100, (resp / (RESPONSE_TIME_TARGET_MIN * 2)) * 100) : 0;
  const targetPct = 50; // target sits at the midpoint of the 0..2×target scale

  return (
    <Card>
      <SectionHeader tag="F" eyebrow="PAC" title="PAC / WhatsApp / call feedback" />

      <div className="grid grid-cols-2 gap-px border-y border-line bg-line sm:grid-cols-5">
        <Stat label="WhatsApp inquiries" value={fmtInt(pac.whatsapp_inquiries)} />
        <Stat label="Calls" value={fmtInt(pac.calls)} />
        <Stat label="Avg response" value={resp != null ? `${fmtInt(resp)}m` : '—'} tone={overTarget ? 'stop' : 'good'} />
        <Stat label="Missed inquiries" value={fmtInt(pac.missed_inquiries)} tone={(pac.missed_inquiries ?? 0) > 0 ? 'watch' : undefined} />
        <Stat label="Bookings created" value={fmtInt(pac.bookings_created)} />
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between">
          <p className="eyebrow">First-response time vs. target ({RESPONSE_TIME_TARGET_MIN}m)</p>
          <p className={`text-[12px] font-medium ${overTarget ? 'text-stop' : 'text-good'}`}>
            {resp != null ? `${fmtInt(resp)} min` : '—'} {overTarget ? '· over target' : '· on target'}
          </p>
        </div>
        <div className="relative mt-2 h-3 w-full rounded-full bg-na/10">
          <div
            className={`h-full rounded-full ${overTarget ? 'bg-stop' : 'bg-good'}`}
            style={{ width: `${gaugePct}%` }}
          />
          <div
            className="absolute top-[-3px] h-[18px] w-0.5 bg-ink"
            style={{ left: `${targetPct}%` }}
            title={`Target ${RESPONSE_TIME_TARGET_MIN}m`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 border-t border-line p-5 lg:grid-cols-3">
        <QuoteBlock title="Top patient questions" items={pac.top_questions} />
        <QuoteBlock title="Top objections" items={pac.top_objections} />
        <div>
          <p className="eyebrow mb-2">Main no-booking reason</p>
          <p className="text-[13px] leading-snug text-ink">{pac.main_no_booking_reason ?? '—'}</p>
          {pac.script_issue ? (
            <p className="mt-2 text-[12px] text-watch">Script issue: {pac.script_issue}</p>
          ) : null}
          {pac.content_needed ? (
            <p className="mt-1 text-[12px] text-accent">Content needed: {pac.content_needed}</p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'stop' | 'watch' }) {
  const toneClass = tone === 'stop' ? 'text-stop' : tone === 'good' ? 'text-good' : tone === 'watch' ? 'text-watch' : 'text-ink';
  return (
    <div className="bg-card px-4 py-3">
      <p className="eyebrow">{label}</p>
      <p className={`tnum mt-1 text-xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function QuoteBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="eyebrow mb-2">{title}</p>
      <div className="flex flex-col gap-1.5">
        {items.length === 0 ? (
          <span className="text-[12px] text-ink-faint">—</span>
        ) : (
          items.map((q, i) => (
            <span
              key={i}
              className="rounded-md border border-line bg-na/5 px-2.5 py-1.5 text-[12px] italic text-ink-soft"
            >
              &ldquo;{q}&rdquo;
            </span>
          ))
        )}
      </div>
    </div>
  );
}
