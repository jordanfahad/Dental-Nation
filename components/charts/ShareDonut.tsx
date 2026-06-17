'use client';

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

/** Share-of-total donut (channel mix, attribution, channel readiness). Center
 *  shows the headline number; a compact legend sits beside it. */
export function ShareDonut({
  slices,
  centerValue,
  centerLabel,
  size = 132,
}: {
  slices: DonutSlice[];
  centerValue: string;
  centerLabel: string;
  size?: number;
}) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  return (
    <div className="flex items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={total > 0 ? slices : [{ label: 'none', value: 1, color: 'var(--na)' }]}
              dataKey="value"
              nameKey="label"
              innerRadius={size * 0.32}
              outerRadius={size * 0.48}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
            >
              {(total > 0 ? slices : [{ color: 'var(--na)' }]).map((s, i) => (
                <Cell key={i} fill={s.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="tnum text-xl font-semibold text-ink">{centerValue}</span>
          <span className="text-[10px] uppercase tracking-eyebrow text-ink-faint">{centerLabel}</span>
        </div>
      </div>
      <ul className="space-y-1">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-[12px] text-ink-soft">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            <span className="text-ink">{s.label}</span>
            <span className="tnum text-ink-faint">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
