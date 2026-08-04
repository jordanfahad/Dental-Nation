'use client';

import { STAGES, type StageId } from '@/config/investor-funnel';
import { funnelScale } from '@/lib/investor/geometry';

/**
 * THE SIGNATURE ELEMENT — one tapering band, seven segments.
 *
 * Deliberately hand-drawn SVG rather than a chart library: a charting default
 * would make this page look like every other dashboard, and the spec's bar is
 * an investor-grade infographic. The geometry is the argument — the band
 * narrows because the business narrows, and the eye reads that before it reads
 * a single number.
 *
 * Two design rules doing real work here:
 *
 *  1. Segment heights encode volume on a LOG scale with a floor. Reach is
 *     ~600× the treatment count; on a linear scale every late stage would be a
 *     hairline — unreadable and untappable, and it would imply "we lose
 *     everything", which is not what the data says. The printed numbers stay
 *     exact.
 *  2. Colour is a single navy progression, dark → light, EXCEPT Revenue, which
 *     is the one warm accent on the page. A reader learns "gold = money" once
 *     and never has to look it up.
 */

const W = 1120;
const H = 300;
const PAD_TOP = 34;
const PAD_BOTTOM = 74;
const BAND_H = H - PAD_TOP - PAD_BOTTOM;

/**
 * Navy dark → light across stages 1–6; gold reserved for Revenue; green for
 * the two loop stages, because Retention and Referral are not more of the
 * same journey — they send the patient back to the beginning.
 */
const FILL: string[] = [
  '#16293C', // navyDeep
  '#244260', // navy — the brand hue
  '#315779', // navy2
  '#3E6B8E', // navy3
  '#5793A3', // soft
  '#8FBAC4', // between soft and pale
  '#B8873B', // gold — Revenue only
  '#2E7D32', // green — the loop: patients who come back
  '#4E9A54', // green — the loop: patients who bring someone
];

export interface BandStage {
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

export function FunnelBand({
  stages,
  selected,
  onSelect,
}: {
  stages: BandStage[];
  selected: StageId | null;
  onSelect: (id: StageId) => void;
}) {
  // Shared geometry — see lib/investor/geometry.ts for why raw values cannot
  // drive this directly (money and people are not one scale).
  const scale = funnelScale(stages);
  const heights = scale.map((s) => BAND_H * s);
  const heightAt = (i: number) => heights[i];

  const segW = W / stages.length;
  const mid = PAD_TOP + BAND_H / 2;

  return (
    <div className="overflow-x-auto print:overflow-visible">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full min-w-[860px]"
        role="img"
        aria-label="The growth funnel from visibility through to revenue"
      >
        <defs>
          <clipPath id="fb-clip">
            <path
              d={bandPath(
                heights,
                segW,
                mid,
                W,
              )}
            />
          </clipPath>
        </defs>

        {/* The band itself: each stage paints a full-height column, clipped to
            the tapering silhouette. One shape, seven colours. */}
        <g clipPath="url(#fb-clip)">
          {stages.map((s, i) => (
            <rect key={s.id} x={i * segW} y={0} width={segW + 0.5} height={H} fill={FILL[i]} />
          ))}
        </g>

        {/* Hairline separators, drawn over the fills */}
        {stages.slice(1).map((s, i) => (
          <line
            key={`sep-${s.id}`}
            x1={(i + 1) * segW}
            x2={(i + 1) * segW}
            y1={mid - heightAt(i) / 2}
            y2={mid + heightAt(i) / 2}
            stroke="#FFFFFF"
            strokeOpacity={0.28}
            strokeWidth={1}
          />
        ))}

        {stages.map((s, i) => {
          const st = STAGES.find((x) => x.id === s.id)!;
          const h = heightAt(i);
          const cx = i * segW + segW / 2;
          const isSel = selected === s.id;
          return (
            <g
              key={s.id}
              role="button"
              tabIndex={0}
              aria-label={`${st.label} — ${fmt(s.value, st.unit)}. Open details.`}
              aria-pressed={isSel}
              className="cursor-pointer outline-none"
              onClick={() => onSelect(s.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(s.id);
                }
              }}
            >
              {/* Full-column hit area — the whole stage is tappable, not just the band */}
              <rect x={i * segW} y={0} width={segW} height={H} fill="transparent" />

              {/* Selection ring */}
              {isSel ? (
                <rect
                  x={i * segW + 2}
                  y={mid - h / 2 - 5}
                  width={segW - 4}
                  height={h + 10}
                  fill="none"
                  stroke="#B8873B"
                  strokeWidth={2}
                  rx={3}
                />
              ) : null}

              {/* Big number inside the band */}
              <text
                x={cx}
                y={mid + 2}
                textAnchor="middle"
                className="tnum"
                fontSize={h > 92 ? 30 : h > 62 ? 24 : 19}
                fontWeight={700}
                fill="#FFFFFF"
                style={{ paintOrder: 'stroke' }}
              >
                {s.pending ? '—' : fmt(s.value, st.unit)}
              </text>
              {s.pending ? (
                <text x={cx} y={mid + 22} textAnchor="middle" fontSize={9.5} fill="#FFFFFF" fillOpacity={0.85}>
                  connecting data
                </text>
              ) : null}

              {/* Stage number above */}
              <text x={cx} y={PAD_TOP - 14} textAnchor="middle" fontSize={11} fontWeight={700} fill="#B8873B">
                {String(st.n).padStart(2, '0')}
              </text>

              {/* Plain-words label below, technical caption under it */}
              <text
                x={cx}
                y={PAD_TOP + BAND_H + 26}
                textAnchor="middle"
                fontSize={13}
                fontWeight={600}
                fill="#2C3233"
              >
                {wrap(st.label)[0]}
              </text>
              {wrap(st.label)[1] ? (
                <text x={cx} y={PAD_TOP + BAND_H + 42} textAnchor="middle" fontSize={13} fontWeight={600} fill="#2C3233">
                  {wrap(st.label)[1]}
                </text>
              ) : null}
              <text
                x={cx}
                y={PAD_TOP + BAND_H + (wrap(st.label)[1] ? 58 : 42)}
                textAnchor="middle"
                fontSize={10}
                fill="#7A8386"
              >
                {st.caption}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * The tapering silhouette: a closed path down the top edge and back along the
 * bottom, mirrored about the centre line so the band narrows symmetrically.
 */
function bandPath(heights: number[], segW: number, mid: number, w: number): string {
  const top: string[] = [];
  const bottom: string[] = [];
  heights.forEach((h, i) => {
    const x0 = i * segW;
    const x1 = (i + 1) * segW;
    top.push(`${i === 0 ? 'M' : 'L'} ${x0} ${mid - h / 2}`, `L ${x1} ${mid - h / 2}`);
    bottom.unshift(`L ${x0} ${mid + h / 2}`);
    bottom.unshift(`L ${x1} ${mid + h / 2}`);
  });
  return `${top.join(' ')} ${bottom.join(' ')} Z`.replace(`L 0 ${mid - heights[0] / 2}`, '');
}

/** Two-line wrap for the plain-words labels under each segment. */
function wrap(label: string): [string, string?] {
  const words = label.split(' ');
  if (words.length <= 3) return [label];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}
