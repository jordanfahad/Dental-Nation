'use client';

/**
 * Chart primitives for the Dental Nation Performance Report — recharts wrappers
 * styled to the McKinsey/consulting design tokens (near-monochrome, ONE accent,
 * disciplined semantic set). No rainbow, no gradient soup, hairline-first.
 *
 * All components are presentational: server sections pass plain data + already
 * formatted intent (colors/labels). Every component guards an empty dataset so a
 * missing source renders a calm note, never a crash or a fabricated zero-chart.
 */

import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// Design tokens (kept in sync with tailwind.config.ts / globals.css :root).
export const TOKENS = {
  accent: '#1F3A5F',
  accent600: '#264A78',
  accent400: '#5B7BA3',
  good: '#15803D',
  watch: '#B45309',
  stop: '#B91C1C',
  na: '#9CA3AF',
  line: '#E6E6E6',
  ink: '#111111',
  inkFaint: '#71717A',
};

/** Tasteful categorical sequence for channel / mix charts (no rainbow). */
export const CATEGORICAL = [
  '#1F3A5F',
  '#5B7BA3',
  '#2E7D32',
  '#B45309',
  '#264A78',
  '#7C9CC4',
  '#9CA3AF',
  '#A47148',
];

const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US');
const fmtAed = (n: number) => `AED ${fmtInt(n)}`;
const fmtPct = (n: number) => `${Math.round(n * 100)}%`;

const FORMATTERS: Record<string, (n: number) => string> = {
  int: fmtInt,
  aed: fmtAed,
  pct: fmtPct,
};
type FormatKey = keyof typeof FORMATTERS;
const fmt = (k: FormatKey | undefined, n: number) => (FORMATTERS[k ?? 'int'] ?? fmtInt)(n);

function shortDate(iso: string): string {
  // 'YYYY-MM-DD' → 'D MMM'
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function EmptyChart({ height = 160, note = 'No data in this window.' }: { height?: number; note?: string }) {
  return (
    <div
      className="flex items-center justify-center rounded-md border border-dashed border-line text-[12px] text-ink-faint"
      style={{ height }}
    >
      {note}
    </div>
  );
}

/* ---------------------------------------------------------------- Tooltip --- */

interface TipItem {
  name: string;
  value: number;
  color: string;
  payload?: Record<string, unknown>;
}
function ChartTooltip({
  active,
  payload,
  label,
  valueFormat,
  labelIsDate,
}: {
  active?: boolean;
  payload?: TipItem[];
  label?: string;
  valueFormat?: FormatKey;
  labelIsDate?: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-line bg-card px-2.5 py-1.5 shadow-card">
      {label != null ? (
        <p className="mb-1 text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">
          {labelIsDate ? shortDate(String(label)) : String(label)}
        </p>
      ) : null}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-1.5 text-[12px] text-ink">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
          <span className="text-ink-faint">{p.name}</span>
          <span className="ml-auto font-medium tabular-nums">{fmt(valueFormat, p.value)}</span>
        </p>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- Sparkline --- */

export function Sparkline({
  data,
  color = TOKENS.accent,
  height = 34,
  width = 92,
}: {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}) {
  if (!data || data.length < 2) return <div style={{ height, width }} />;
  const rows = data.map((v, i) => ({ i, v }));
  const id = `spark-${color.replace('#', '')}`;
  return (
    <div style={{ height, width }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 2, right: 1, bottom: 0, left: 1 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${id})`}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------- TrendChart --- */

export interface TrendSeries {
  key: string;
  label: string;
  color: string;
  kind?: 'area' | 'line' | 'bar';
  /** Plot on the right-hand axis (e.g. a money series next to a count series). */
  axis?: 'left' | 'right';
  valueFormat?: FormatKey;
}

export function TrendChart({
  data,
  series,
  height = 240,
  leftFormat = 'int',
  rightFormat = 'aed',
}: {
  data: Record<string, number | string>[];
  series: TrendSeries[];
  height?: number;
  leftFormat?: FormatKey;
  rightFormat?: FormatKey;
}) {
  if (!data || data.length === 0) return <EmptyChart height={height} />;
  const hasRight = series.some((s) => s.axis === 'right');
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: hasRight ? 6 : 10, bottom: 0, left: -6 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke={TOKENS.line} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={{ fontSize: 10.5, fill: TOKENS.inkFaint }}
            tickLine={false}
            axisLine={{ stroke: TOKENS.line }}
            minTickGap={24}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 10.5, fill: TOKENS.inkFaint }}
            tickLine={false}
            axisLine={false}
            width={42}
            tickFormatter={(v) => fmt(leftFormat, Number(v))}
          />
          {hasRight ? (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10.5, fill: TOKENS.inkFaint }}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v) => fmt(rightFormat, Number(v))}
            />
          ) : null}
          <Tooltip
            content={<ChartTooltip labelIsDate valueFormat={leftFormat} />}
            cursor={{ stroke: TOKENS.line }}
          />
          {series.map((s) =>
            s.kind === 'bar' ? (
              <Bar
                key={s.key}
                yAxisId={s.axis ?? 'left'}
                dataKey={s.key}
                name={s.label}
                fill={s.color}
                radius={[2, 2, 0, 0]}
                maxBarSize={26}
                isAnimationActive={false}
              />
            ) : s.kind === 'line' ? (
              <Line
                key={s.key}
                yAxisId={s.axis ?? 'left'}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ) : (
              <Area
                key={s.key}
                yAxisId={s.axis ?? 'left'}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                fill={`url(#grad-${s.key})`}
                dot={false}
                isAnimationActive={false}
              />
            ),
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** A compact legend row for a TrendChart's series. */
export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-faint">
          <span className="h-2 w-2 rounded-sm" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- HBarChart --- */

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
  /** Optional sub-label rendered under the value (e.g. a decision word). */
  note?: string;
}

export function HBarChart({
  data,
  valueFormat = 'int',
  accent = TOKENS.accent,
}: {
  data: BarDatum[];
  valueFormat?: FormatKey;
  accent?: string;
}) {
  if (!data || data.length === 0) return <EmptyChart height={120} />;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label} className="grid grid-cols-[120px_1fr_auto] items-center gap-3">
          <span className="truncate text-[12px] text-ink-soft" title={d.label}>
            {d.label}
          </span>
          <span className="relative h-5 overflow-hidden rounded bg-na/10">
            <span
              className="absolute inset-y-0 left-0 rounded"
              style={{ width: `${Math.max((d.value / max) * 100, 1.5)}%`, background: d.color ?? accent }}
            />
          </span>
          <span className="w-20 text-right text-[12px] font-medium tabular-nums text-ink">
            {fmt(valueFormat, d.value)}
            {d.note ? <span className="block text-[10px] font-normal text-ink-faint">{d.note}</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------- Donut --- */

export function Donut({
  data,
  height = 200,
  valueFormat = 'int',
  centerLabel,
}: {
  data: BarDatum[];
  height?: number;
  valueFormat?: FormatKey;
  centerLabel?: string;
}) {
  const rows = (data ?? []).filter((d) => d.value > 0);
  if (rows.length === 0) return <EmptyChart height={height} />;
  const total = rows.reduce((a, d) => a + d.value, 0);
  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius="62%"
              outerRadius="100%"
              paddingAngle={1.5}
              stroke="none"
              isAnimationActive={false}
            >
              {rows.map((d, i) => (
                <Cell key={d.label} fill={d.color ?? CATEGORICAL[i % CATEGORICAL.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip valueFormat={valueFormat} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[18px] font-semibold tabular-nums text-ink">{fmt(valueFormat, total)}</span>
          {centerLabel ? (
            <span className="text-[10px] uppercase tracking-wide text-ink-faint">{centerLabel}</span>
          ) : null}
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {rows.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2 text-[12px]">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: d.color ?? CATEGORICAL[i % CATEGORICAL.length] }}
            />
            <span className="truncate text-ink-soft" title={d.label}>
              {d.label}
            </span>
            <span className="ml-auto shrink-0 font-medium tabular-nums text-ink">
              {fmt(valueFormat, d.value)}
            </span>
            <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-ink-faint">
              {Math.round((d.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
