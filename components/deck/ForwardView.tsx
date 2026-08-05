import { C } from '@/components/board/design';
import {
  CERTAINTY_LABEL,
  CONFIDENCE_LABEL,
  FORWARD_NOTE,
  STATUS_LABEL,
  type Certainty,
  type Confidence,
  type PipelineStatus,
} from '@/config/pipeline';
import type { PipelineView, ProjectedInitiative } from '@/lib/deck/pipeline';

/**
 * The forward view — the pipeline of initiatives and what each is expected to
 * produce.
 *
 * The design problem here is the opposite of the rest of the deck. Everywhere
 * else the job is to show numbers with confidence; here the job is to show
 * numbers WITH THEIR UNCERTAINTY ATTACHED, so that an investor cannot take a
 * base case away as a promise. Hence: three cases always shown together, never
 * one; the band drawn as a bar so its width is the message; assumptions
 * labelled by where they came from; and initiatives whose results could not be
 * verified afterwards flagged before their cost, not after it.
 */

const aed = (n: number): string => `AED ${Math.round(n).toLocaleString('en-US')}`;
const aedShort = (n: number): string => {
  if (Math.abs(n) >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `AED ${Math.round(n / 1_000)}k`;
  return `AED ${Math.round(n)}`;
};

const CERTAINTY_STYLE: Record<Certainty, { bg: string; fg: string }> = {
  measured: { bg: C.goodWash, fg: C.good },
  benchmark: { bg: C.navyWash, fg: C.navyMid },
  estimate: { bg: C.amberWash, fg: C.amber },
};

const CONFIDENCE_STYLE: Record<Confidence, string> = {
  high: C.good,
  medium: C.navyMid,
  low: C.amber,
  unverifiable: C.stop,
};

const STATUS_STYLE: Record<PipelineStatus, { bg: string; fg: string }> = {
  live: { bg: C.goodWash, fg: C.good },
  committed: { bg: C.navyWash, fg: C.navyMid },
  proposed: { bg: C.panel, fg: C.inkFaint },
  not_recommended: { bg: C.stopWash, fg: C.stop },
};

export function ForwardView({ data }: { data: PipelineView }) {
  const { chain } = data;

  if (!data.available) {
    return (
      <p className="rounded border border-dashed px-4 py-6 text-center text-[13px]" style={{ borderColor: C.rule, color: C.inkFaint }}>
        The forward view needs the measured conversion chain, which is not available yet.
      </p>
    );
  }

  // The band across the whole pipeline sets the scale every bar is drawn on.
  const scaleMax = Math.max(data.totalHigh, 1);

  return (
    <div>
      <p className="max-w-[900px] rounded border-l-2 px-3 py-2 text-[11px] leading-snug" style={{ borderColor: C.amber, background: C.amberWash, color: C.inkSoft }}>
        {FORWARD_NOTE}
      </p>

      {/* ── The measured chain every projection runs through ──────────────── */}
      <div className="mt-4 rounded-lg border p-3" style={{ borderColor: C.rule, background: C.navyWash }}>
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.navyMid }}>
          The conversion chain every projection below is converted through — measured, not assumed
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-2">
          <ChainCell value={`${Math.round(chain.enquiries).toLocaleString('en-US')}`} label="Net enquiries" />
          <Arrow pct={chain.enquiryToBooking} />
          <ChainCell value={`${Math.round(chain.bookings).toLocaleString('en-US')}`} label="Bookings" />
          <Arrow pct={chain.bookingToAttended} />
          <ChainCell value={`${Math.round(chain.attended).toLocaleString('en-US')}`} label="Attended" />
          <span className="text-[11px]" style={{ color: C.inkFaint }}>
            × {chain.revenuePerAttended != null ? aed(chain.revenuePerAttended) : '—'}
          </span>
          <ChainCell value={aedShort(chain.revenue)} label="Billed revenue" accent />
        </div>
        <p className="mt-2 text-[10.5px] leading-snug" style={{ color: C.inkSoft }}>
          Measured across the full trading history{chain.from && chain.to ? ` (${chain.from} → ${chain.to})` : ''}, not
          the window selected at the top of the page — a forecast that moved every time a reader changed a date filter
          would be noise. On these rates <strong>one net enquiry is worth {chain.revenuePerEnquiry != null ? aed(chain.revenuePerEnquiry) : '—'}</strong> of
          billed revenue and one booking {chain.revenuePerBooking != null ? aed(chain.revenuePerBooking) : '—'}. Every
          initiative below assumes only how much demand it creates; what that demand is worth comes from here.
        </p>
      </div>

      {/* ── Totals ───────────────────────────────────────────────────────── */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Tile
          label="Pipeline at the base case"
          value={aedShort(data.totalBase)}
          sub={`a month at the modelled run rate · ${aedShort(data.totalBase * 12)} over twelve months at that rate`}
        />
        <Tile
          label="Range across the pipeline"
          value={`${aedShort(data.totalLow)} — ${aedShort(data.totalHigh)}`}
          sub="a month. The width of this band is the honest statement, not the midpoint"
        />
        <Tile
          label="Recurring cost of the whole pipeline"
          value={aedShort(data.totalMonthlyCost)}
          sub={`a month if everything below is approved · ${aedShort(data.unmeasurableMonthlyCost)} of it buys nothing this page could measure`}
          warn
        />
      </div>

      {/* ── Initiatives, grouped ─────────────────────────────────────────── */}
      {data.groups.map((g) => (
        <section key={g.name} className="mt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-b pb-1" style={{ borderColor: C.rule }}>
            <h3 className="text-[12.5px] font-semibold" style={{ color: C.ink }}>
              {g.name}
            </h3>
            <p className="text-[10.5px] tabular-nums" style={{ color: C.inkFaint }}>
              {g.baseMonthlyRevenue > 0 ? `${aedShort(g.baseMonthlyRevenue)}/month base case · ` : ''}
              {g.monthlyCost > 0 ? `${aedShort(g.monthlyCost)}/month cost` : 'no recurring cost'}
            </p>
          </div>
          {g.items.map((p) => (
            <InitiativeRow key={p.initiative.key} p={p} scaleMax={scaleMax} />
          ))}
        </section>
      ))}
    </div>
  );
}

function ChainCell({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <span className="inline-block rounded bg-white px-2 py-1">
      <span className="block text-[13px] font-semibold tabular-nums leading-none" style={{ color: accent ? C.amber : C.ink }}>
        {value}
      </span>
      <span className="mt-0.5 block text-[9px] uppercase tracking-wide" style={{ color: C.inkFaint }}>
        {label}
      </span>
    </span>
  );
}

function Arrow({ pct }: { pct: number | null }) {
  return (
    <span className="text-[10px] tabular-nums" style={{ color: C.navyMid }}>
      →&nbsp;{pct != null ? `${(pct * 100).toFixed(1)}%` : '—'}&nbsp;→
    </span>
  );
}

function Tile({ label, value, sub, warn }: { label: string; value: string; sub: string; warn?: boolean }) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: warn ? C.amberSoft : C.rule, background: warn ? C.amberWash : C.paper }}>
      <p className="text-[19px] font-semibold tabular-nums leading-none" style={{ color: warn ? C.amber : C.ink }}>
        {value}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-wide" style={{ color: C.inkFaint }}>
        {label}
      </p>
      <p className="mt-1 text-[10px] leading-snug" style={{ color: C.inkSoft }}>
        {sub}
      </p>
    </div>
  );
}

function InitiativeRow({ p, scaleMax }: { p: ProjectedInitiative; scaleMax: number }) {
  const i = p.initiative;
  const st = STATUS_STYLE[i.status];
  const hasRevenue = p.base.monthlyRevenue != null;

  const lowPct = ((p.low.monthlyRevenue ?? 0) / scaleMax) * 100;
  const basePct = ((p.base.monthlyRevenue ?? 0) / scaleMax) * 100;
  const highPct = ((p.high.monthlyRevenue ?? 0) / scaleMax) * 100;

  return (
    <details className="group border-b" style={{ borderColor: C.ruleSoft }}>
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
        <span className="w-[11px] text-[11px]" style={{ color: C.navyMid }}>
          <span className="inline-block group-open:hidden">▸</span>
          <span className="hidden group-open:inline-block">▾</span>
        </span>

        <span className="min-w-[200px] flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-semibold" style={{ color: C.ink }}>
              {i.name}
            </span>
            <span className="rounded px-1.5 py-[1px] text-[9px] font-medium uppercase tracking-wide" style={{ background: st.bg, color: st.fg }}>
              {STATUS_LABEL[i.status]}
            </span>
          </span>
          {/* The band, drawn. Its width is the point. */}
          {hasRevenue ? (
            <span className="mt-1.5 block h-[7px] w-full max-w-[320px] rounded-sm" style={{ background: C.ruleSoft }}>
              <span className="relative block h-full">
                <span
                  className="absolute top-0 h-full rounded-sm"
                  style={{ left: `${lowPct}%`, width: `${Math.max(highPct - lowPct, 0.6)}%`, background: C.navyPale }}
                />
                <span
                  className="absolute top-[-2px] h-[11px] w-[2px]"
                  style={{ left: `${basePct}%`, background: C.navy }}
                />
              </span>
            </span>
          ) : null}
        </span>

        <span className="w-[150px] text-right">
          {hasRevenue ? (
            <>
              <span className="block text-[12.5px] font-semibold tabular-nums" style={{ color: C.ink }}>
                {aedShort(p.base.monthlyRevenue ?? 0)}
                <span className="text-[9.5px] font-normal" style={{ color: C.inkFaint }}>
                  /mo
                </span>
              </span>
              <span className="block text-[9.5px] tabular-nums" style={{ color: C.inkFaint }}>
                {aedShort(p.low.monthlyRevenue ?? 0)} — {aedShort(p.high.monthlyRevenue ?? 0)}
              </span>
            </>
          ) : (
            <span className="block text-[10.5px]" style={{ color: i.status === 'not_recommended' ? C.stop : C.inkFaint }}>
              {i.status === 'not_recommended' ? 'Not projected — unverifiable' : 'Enabler — no revenue of its own'}
            </span>
          )}
        </span>

        <span className="w-[96px] text-right text-[10.5px] tabular-nums" style={{ color: C.inkSoft }}>
          {i.monthlyCost != null ? `${aedShort(i.monthlyCost)}/mo` : 'no cost'}
        </span>

        <span className="w-[74px] text-right text-[10.5px] font-medium" style={{ color: CONFIDENCE_STYLE[i.confidence] }}>
          {CONFIDENCE_LABEL[i.confidence]}
        </span>
      </summary>

      <div className="grid gap-4 pb-4 pl-[26px] pr-1 lg:grid-cols-2">
        <div>
          <p className="text-[11px] leading-snug" style={{ color: C.inkSoft }}>
            {i.thesis}
          </p>

          <p className="mt-3 text-[9.5px] font-semibold uppercase tracking-wide" style={{ color: C.inkFaint }}>
            How it turns into patients
          </p>
          <ol className="mt-1">
            {i.chain.map((step, n) => (
              <li key={step} className="flex gap-2 py-[3px] text-[10.5px] leading-snug" style={{ color: C.inkSoft }}>
                <span className="tabular-nums" style={{ color: C.navyPale }}>
                  {n + 1}.
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          {(p.returnMultiple != null || p.paybackMonths != null || i.oneOffCost) ? (
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 rounded px-3 py-2" style={{ background: C.navyWash }}>
              {p.returnMultiple != null ? (
                <Mini
                  value={`${p.returnMultiple.toFixed(1)}×`}
                  label="Return on its own monthly cost"
                  danger={p.belowCost}
                />
              ) : null}
              {p.paybackMonths != null ? (
                <Mini value={`${p.paybackMonths.toFixed(1)} mo`} label="Payback on setup cost" />
              ) : null}
              {i.oneOffCost ? <Mini value={aedShort(i.oneOffCost)} label="One-off setup" /> : null}
              <Mini value={`${i.leadMonths}–${i.maturityMonths} mo`} label="First effect → run rate" />
            </div>
          ) : null}
        </div>

        <div>
          <p className="text-[9.5px] font-semibold uppercase tracking-wide" style={{ color: C.inkFaint }}>
            Assumptions, and where each comes from
          </p>
          <div className="mt-1">
            {i.assumptions.map((a) => {
              const cs = CERTAINTY_STYLE[a.basis];
              return (
                <div key={a.label} className="border-t py-1.5" style={{ borderColor: C.ruleSoft }}>
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-[10.5px] font-medium" style={{ color: C.ink }}>
                      {a.label}
                    </span>
                    <span className="rounded px-1.5 py-[1px] text-[8.5px] font-medium uppercase tracking-wide" style={{ background: cs.bg, color: cs.fg }}>
                      {CERTAINTY_LABEL[a.basis]}
                    </span>
                  </div>
                  <p className="text-[10.5px] leading-snug" style={{ color: C.inkSoft }}>
                    {a.value}
                  </p>
                  <p className="text-[9.5px] leading-snug" style={{ color: C.inkFaint }}>
                    {a.source}
                  </p>
                </div>
              );
            })}
          </div>

          {p.base.workings ? (
            <p className="mt-2 rounded px-3 py-2 text-[10px] leading-snug tabular-nums" style={{ background: C.panel, color: C.inkSoft }}>
              <span className="font-semibold" style={{ color: C.ink }}>
                Base case arithmetic:{' '}
              </span>
              {p.base.workings}
            </p>
          ) : null}

          <p className="mt-2 text-[10.5px] leading-snug" style={{ color: CONFIDENCE_STYLE[i.confidence] }}>
            <span className="font-semibold">Confidence — {CONFIDENCE_LABEL[i.confidence]}: </span>
            <span style={{ color: C.inkSoft }}>{i.confidenceNote}</span>
          </p>

          <p className="mt-1.5 rounded border-l-2 px-2.5 py-1.5 text-[10.5px] leading-snug" style={{ borderColor: p.lowCaseLoses || i.status === 'not_recommended' ? C.stop : C.amberSoft, background: p.lowCaseLoses || i.status === 'not_recommended' ? C.stopWash : C.amberWash, color: C.inkSoft }}>
            <span className="font-semibold" style={{ color: C.ink }}>
              What would make this wrong:{' '}
            </span>
            {i.risk}
          </p>

          {i.softImpact ? (
            <p className="mt-1.5 text-[10.5px] leading-snug" style={{ color: C.inkFaint }}>
              <span className="font-semibold">Not in the numbers: </span>
              {i.softImpact}
            </p>
          ) : null}

          {i.dependsOn && i.dependsOn.length > 0 ? (
            <p className="mt-1.5 text-[10.5px]" style={{ color: C.navyMid }}>
              Not deliverable without: {i.dependsOn.map((d) => d.replace(/^hire_/, '').replace(/_/g, ' ')).join(', ')}
            </p>
          ) : null}
        </div>
      </div>
    </details>
  );
}

function Mini({ value, label, danger }: { value: string; label: string; danger?: boolean }) {
  return (
    <div>
      <p className="text-[14px] font-semibold tabular-nums leading-none" style={{ color: danger ? C.stop : C.ink }}>
        {value}
      </p>
      <p className="mt-1 text-[9px] uppercase tracking-wide" style={{ color: C.inkFaint }}>
        {label}
      </p>
    </div>
  );
}
