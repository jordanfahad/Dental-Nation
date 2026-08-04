'use client';

import { STAGES, type StageId } from '@/config/investor-funnel';
import { funnelScale, isComparableStep } from '@/lib/investor/geometry';

/**
 * The funnel on a phone — designed as an equal, not a squeezed desktop.
 *
 * A horizontal band cannot survive 375px: seven segments would be 50px wide
 * each. So mobile gets the same idea rotated — full-width bars narrowing
 * downward, with the conversion chip sitting in the gap between them, which is
 * exactly where the eye already is when reading top to bottom.
 *
 * Board members open this on phones (spec §8), so this is the layout most
 * readers will actually meet.
 */

const FILL = ['#16293C', '#244260', '#315779', '#3E6B8E', '#5793A3', '#8FBAC4', '#B8873B', '#2E7D32', '#4E9A54'];

export interface MobileStage {
  id: StageId;
  value: number;
  pending?: boolean;
}

const fmt = (n: number, unit: string): string => {
  if (unit === 'aed') {
    if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1000) return `AED ${Math.round(n / 1000)}K`;
    return `AED ${n}`;
  }
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(Math.round(n));
};

export function FunnelMobile({
  stages,
  selected,
  onSelect,
}: {
  stages: MobileStage[];
  selected: StageId | null;
  onSelect: (id: StageId) => void;
}) {
  // Same shared geometry as the desktop band, remapped into a 52–100% width
  // so a phone-width bar always has room for its own number.
  const scale = funnelScale(stages);
  const widthAt = (i: number) => 52 + scale[i] * 48;

  return (
    <ol className="space-y-0">
      {stages.map((s, i) => {
        const st = STAGES.find((x) => x.id === s.id)!;
        const prev = i > 0 ? stages[i - 1] : null;
        // Same unit guard as the desktop rail — see isComparableStep.
        const rate =
          prev && prev.value > 0 && !s.pending && !prev.pending && isComparableStep(prev.id, s.id)
            ? s.value / prev.value
            : null;
        const isSel = selected === s.id;
        return (
          <li key={s.id}>
            {/* Conversion chip lives in the gap, where the eye already is */}
            {rate != null ? (
              <p className="py-1.5 pl-1 text-[11px] text-dn-ink/55">
                <span aria-hidden className="mr-1.5">↓</span>
                <span className="tnum font-semibold text-dn-navy">
                  {rate < 0.01 ? `${(rate * 100).toFixed(2)}%` : `${Math.round(rate * 100)}%`}
                </span>{' '}
                {st.ofPrevious}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => onSelect(s.id)}
              aria-expanded={isSel}
              className="block w-full text-left"
            >
              <span
                className="flex min-h-[62px] items-center justify-between rounded-[3px] px-4 py-3 transition-all"
                style={{
                  width: `${widthAt(i)}%`,
                  background: FILL[i],
                  outline: isSel ? '2px solid #B8873B' : 'none',
                  outlineOffset: '2px',
                }}
              >
                <span className="min-w-0 pr-3">
                  <span className="block text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white/60">
                    {String(st.n).padStart(2, '0')}
                  </span>
                  <span className="block text-[12.5px] font-semibold leading-tight text-white">{st.label}</span>
                </span>
                <span className="tnum shrink-0 text-[20px] font-bold leading-none text-white">
                  {s.pending ? '—' : fmt(s.value, st.unit)}
                </span>
              </span>
            </button>
            <p className="mt-1 pl-1 text-[10.5px] text-dn-ink/50">
              {st.caption}
              {s.pending ? ' · connecting data' : ''}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
