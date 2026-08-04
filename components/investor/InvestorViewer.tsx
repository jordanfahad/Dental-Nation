'use client';

import { useState } from 'react';
import { HERO, PERIODS, STAGES, type PeriodKey, type StageId } from '@/config/investor-funnel';
import { SAMPLE_FUNNEL, SAMPLE_SCORECARD } from '@/lib/investor/sample';
import { GEOMETRY_NOTE, isComparableStep } from '@/lib/investor/geometry';
import { FunnelBand } from './FunnelBand';
import { FunnelMobile } from './FunnelMobile';
import { StagePanel } from './StagePanel';
import { MachineMap } from './MachineMap';
import { ScenarioModule } from './ScenarioModule';

/**
 * The investor viewer (spec §2) — Phase 1, sample data.
 *
 * Section order is the argument: what we produced (scorecard) → how it works
 * (funnel) → what powers each step (drill-downs) → what we built (machine) →
 * what more budget does (scenarios). A reader who stops after the funnel still
 * leaves understanding the business.
 *
 * ⚠️ Every screen is watermarked SAMPLE DATA until Phase 2 wires the real
 * aggregate views. That watermark is not decoration — it is the thing standing
 * between a design review and someone forwarding invented numbers to an
 * investor.
 */
export function InvestorViewer({ recipientLabel }: { recipientLabel: string }) {
  const [period, setPeriod] = useState<PeriodKey>('month');
  const [selected, setSelected] = useState<StageId | null>('inquiries');

  const data = SAMPLE_FUNNEL[period];
  const stages = STAGES.map((s) => ({ id: s.id, value: data[s.id].value, pending: data[s.id].pending }));

  return (
    <div className="investor">
      <SampleBanner />

      <main className="mx-auto max-w-[1180px] px-4 pb-16 sm:px-8">
        {/* ── Hero ── */}
        <header className="pt-8 sm:pt-12">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-dn-gold">{HERO.eyebrow}</p>
          <h1 className="display mt-2 max-w-[18ch] text-[32px] leading-[1.05] text-dn-navy sm:text-[52px]">
            {HERO.title}
          </h1>
          <p className="mt-4 max-w-[62ch] text-[14px] leading-relaxed text-dn-ink/75 sm:text-[15px]">
            {HERO.standfirst}
          </p>

          {/* Period selector */}
          <div className="mt-6 flex flex-wrap gap-1.5">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                className={`min-h-[36px] rounded-md border px-3.5 py-1.5 text-[12.5px] font-medium transition ${
                  period === p.key
                    ? 'border-dn-navy bg-dn-navy text-white'
                    : 'border-dn-line bg-white text-dn-ink/70 hover:bg-dn-off'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </header>

        {/* ── Delivery scorecard strip ──
            Headed explicitly, because it does NOT follow the period selector
            above it. Unlabelled, "AED 501K" sat under "This month" next to a
            funnel reading AED 298K and read as a contradiction. */}
        <section className="mt-8 border-y border-dn-line py-5">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-dn-ink/45">
            What has been delivered so far · totals since December 2025, not affected by the period above
          </p>
          <div className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
            {SAMPLE_SCORECARD.map((s) => (
              <div key={s.label}>
                <p className="tnum text-[24px] font-bold leading-none tracking-tight text-dn-navy sm:text-[28px]">
                  {s.value}
                </p>
                <p className="mt-1 text-[10.5px] leading-snug text-dn-ink/55">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── THE FUNNEL ── */}
        <section id="funnel" className="mt-12 scroll-mt-20">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-dn-gold">The funnel</p>
          <h2 className="display mt-2 max-w-[26ch] text-[26px] leading-[1.1] text-dn-navy sm:text-[36px]">
            From someone seeing our name, to treatment paid for
          </h2>
          <p className="mt-3 max-w-[70ch] text-[13px] leading-relaxed text-dn-ink/75">
            {/* Direction-neutral: the band runs left-to-right on a laptop but
                top-to-bottom on a phone, and most readers meet the phone. */}
            Follow the steps in order. Each block is a step, and each step is smaller than the one before — that is
            normal, and the job of the machine is to keep as many people moving through as possible.{' '}
            <span className="font-semibold text-dn-ink">Tap or click any step to see what feeds it.</span>
          </p>

          {/* Desktop band */}
          <div className="mt-7 hidden lg:block">
            <FunnelBand stages={stages} selected={selected} onSelect={(id) => setSelected(id === selected ? null : id)} />
            <ConversionRail stages={stages} />
          </div>

          {/* Mobile funnel */}
          <div className="mt-6 lg:hidden">
            <FunnelMobile stages={stages} selected={selected} onSelect={(id) => setSelected(id === selected ? null : id)} />
          </div>

          {/* Layman sentence — the hard requirement in spec §3 */}
          <p className="mt-6 rounded-card border-l-[3px] border-dn-navy bg-dn-off px-4 py-3.5 text-[13.5px] leading-relaxed text-dn-ink sm:text-[14.5px]">
            {laymanSentence(stages, data)}
          </p>
          {/* The page owes the reader an explanation of what the shape means,
              since Revenue is deliberately not drawn on the people scale. */}
          <p className="mt-2 text-[10.5px] leading-relaxed text-dn-ink/50">{GEOMETRY_NOTE}</p>
        </section>

        {/* ── Stage drill-down ── */}
        {selected ? (
          <section className="mt-6 overflow-hidden rounded-card border border-dn-line">
            <StagePanel id={selected} data={data[selected]} period={period} />
          </section>
        ) : (
          <p className="mt-6 rounded-card border border-dashed border-dn-line px-4 py-6 text-center text-[12.5px] text-dn-ink/50">
            Tap any step above to open what feeds it.
          </p>
        )}

        {/* ── The machine ── */}
        <div className="mt-16">
          <MachineMap />
        </div>

        {/* ── Scenarios ── */}
        <div className="mt-16">
          <ScenarioModule />
        </div>

        {/* ── Footer ── */}
        {/* The footer is the LAST provenance sentence a reader meets, and in a
            printed pack it is the only one on pages 2+ (the sticky banner
            prints once, on page 1). It previously said "Live data from the
            Dental Nation group growth platform" — the exact opposite of the
            truth on a sample-data page. In Phase 2 this becomes the live line. */}
        <footer className="mt-16 border-t border-dn-line pt-5 text-[11px] leading-relaxed text-dn-ink/50">
          <p>
            <span className="font-semibold text-dn-amber">
              Sample data — design review only · no real figures on this page
            </span>{' '}
            · Prepared for <span className="font-medium text-dn-ink/70">{recipientLabel}</span>
          </p>
          <p className="mt-1">
            Dental Nation group growth platform · this page will read live data once the design is approved.
          </p>
        </footer>
      </main>
    </div>
  );
}

/** Conversion chips sitting between the desktop band's segments. */
function ConversionRail({ stages }: { stages: { id: StageId; value: number; pending?: boolean }[] }) {
  return (
    <div className="mt-1 hidden grid-cols-7 lg:grid">
      {stages.map((s, i) => {
        const prev = i > 0 ? stages[i - 1] : null;
        // A conversion chip is only meaningful between two stages that count
        // the SAME thing. Without isComparableStep the Revenue chip divides
        // dirhams by a headcount and renders "252810%".
        const rate =
          prev && prev.value > 0 && !s.pending && !prev.pending && isComparableStep(prev.id, s.id)
            ? s.value / prev.value
            : null;
        const st = STAGES.find((x) => x.id === s.id)!;
        return (
          <div key={s.id} className="px-1 text-center">
            {rate != null ? (
              <p className="text-[10px] leading-snug text-dn-ink/55">
                <span className="tnum font-bold text-dn-navy">
                  {rate < 0.01 ? `${(rate * 100).toFixed(2)}%` : `${Math.round(rate * 100)}%`}
                </span>
                <span className="block">{st.ofPrevious}</span>
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The layman test, rendered. If this sentence does not parse for someone with
 * no marketing background, the funnel labels are wrong — not the sentence.
 */
function laymanSentence(
  stages: { id: StageId; value: number; pending?: boolean }[],
  data: Record<StageId, { value: number; pending?: boolean }>,
): string {
  const v = (id: StageId) => {
    const d = data[id];
    if (d.pending) return null;
    return d.value;
  };
  const n = (x: number | null) =>
    x == null ? null : x >= 1_000_000 ? `${(x / 1_000_000).toFixed(1)} million` : x.toLocaleString('en-US');

  const reach = n(v('reach'));
  const inq = n(v('inquiries'));
  const book = n(v('bookings'));
  const show = n(v('showups'));
  const treat = n(v('treatments'));
  const rev = v('revenue');

  const parts: string[] = [];
  if (reach) parts.push(`We reached ${reach} people`);
  if (inq) parts.push(`${inq} asked about treatment`);
  if (book) parts.push(`${book} booked an appointment`);
  if (show) parts.push(`${show} walked in`);
  if (treat) parts.push(`${treat} started treatment`);
  const tail =
    rev != null
      ? ` — and that produced AED ${Math.round(rev).toLocaleString('en-US')}.`
      : '.';
  return `In plain words: ${parts.join('; ')}${tail}`;
}

/** The Phase 1 watermark — impossible to miss, impossible to forward innocently. */
function SampleBanner() {
  return (
    <div className="sticky top-0 z-40 border-b border-dn-amber/40 bg-dn-amber/10 px-4 py-2 text-center backdrop-blur">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-dn-amber sm:text-[12px]">
        Sample data — design review only · no real figures on this page
      </p>
    </div>
  );
}
