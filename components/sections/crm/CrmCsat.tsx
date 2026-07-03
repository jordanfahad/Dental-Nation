import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { ownerFor } from '@/config/data-gap-owners';
import type { CrmReport } from '@/lib/crm/types';
import { fmtInt, fmtPct } from './format';

/**
 * CSAT section: patient-satisfaction ratings from Zavis. Average / satisfied /
 * response count scorecards, a 5→1 star distribution, and the most recent
 * written feedback ("voice of the patient"). Honest by construction — a calm
 * data gap when no ratings are ingested, and the takeaway names that CSAT only
 * covers conversations where the patient actually left a rating.
 */

/** ISO / YYYY-MM-DD → "15 Jun". Em-dash on bad input. */
function fmtDay(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return '—';
  return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function Stars({ n }: { n: number }) {
  return (
    <span className="tracking-tight" aria-label={`${n} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= n ? 'text-watch' : 'text-na/40'}>
          ★
        </span>
      ))}
    </span>
  );
}

function ScoreTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-line bg-card p-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-1 text-[18px] font-semibold leading-none tabular-nums text-ink">{value}</p>
    </div>
  );
}

export function CrmCsat({ report }: { report: CrmReport }) {
  const csat = report.csat;

  return (
    <Card>
      <SectionHeader
        eyebrow="CRM — Zavis · patient satisfaction"
        title="How patients rate their conversations (CSAT)"
      />
      <div className="px-5 pb-5 pt-4">
        {csat.empty || csat.average == null ? (
          <DataGapInline detail="no CSAT ratings ingested" owner={ownerFor('pac')} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ScoreTile label="Average rating" value={`${csat.average.toFixed(1)} / 5`} />
              <ScoreTile label="Satisfied (4–5★)" value={fmtPct(csat.satisfaction)} />
              <ScoreTile label="Responses" value={fmtInt(csat.responses)} />
              <ScoreTile label="With a comment" value={fmtInt(csat.comments.length)} />
            </div>

            <div className="mt-5">
              <p className="eyebrow mb-2">Rating distribution</p>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = csat.distribution.find((d) => d.rating === star)?.count ?? 0;
                  const pct = csat.responses > 0 ? (count / csat.responses) * 100 : 0;
                  return (
                    <div key={star} className="grid grid-cols-[34px_1fr_36px] items-center gap-3">
                      <span className="text-[12px] font-medium tabular-nums text-ink-soft">{star}★</span>
                      <span className="relative h-4 overflow-hidden rounded bg-na/10">
                        <span
                          className="absolute inset-y-0 left-0 rounded bg-accent"
                          style={{ width: `${count > 0 ? Math.max(pct, 2) : 0}%` }}
                        />
                      </span>
                      <span className="text-right text-[12px] tabular-nums text-ink">{fmtInt(count)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {csat.comments.length > 0 ? (
              <div className="mt-5">
                <p className="eyebrow mb-2">Recent patient feedback</p>
                <ul className="space-y-2.5">
                  {csat.comments.map((c, i) => (
                    <li key={c.url ?? i} className="rounded-card border border-line bg-card p-3">
                      <div className="flex items-center justify-between gap-3">
                        <Stars n={c.rating} />
                        <span className="text-[10.5px] text-ink-faint">
                          {c.agent ? `${c.agent} · ` : ''}
                          {fmtDay(c.recordedAt)}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[12.5px] leading-snug text-ink-soft">{c.feedback}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <Takeaway>
              {fmtInt(csat.responses)} patient{csat.responses === 1 ? '' : 's'} rated their conversation
              {csat.periodStart && csat.periodEnd
                ? ` between ${fmtDay(csat.periodStart)} and ${fmtDay(csat.periodEnd)}`
                : ''}
              , averaging {csat.average.toFixed(1)}/5 with {fmtPct(csat.satisfaction)} rating 4★ or higher.
              CSAT only covers conversations where the patient left a rating, so read it as sentiment, not coverage.
            </Takeaway>
          </>
        )}
      </div>
    </Card>
  );
}
