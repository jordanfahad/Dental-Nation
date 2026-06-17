'use client';

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts';

export interface ChannelBar {
  channel: string;
  value: number;
}

/** Horizontal bar comparison for channel mix (§D / §A). Direct value labels,
 *  muted single-hue bars — no rainbow. */
export function ChannelBars({ data, color = 'var(--accent)' }: { data: ChannelBar[]; color?: string }) {
  const sorted = [...data].sort((a, b) => b.value - a.value).slice(0, 8);
  const height = Math.max(120, sorted.length * 30);
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 2, right: 28, bottom: 2, left: 8 }}
          barCategoryGap={8}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="channel"
            width={150}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: 'var(--ink-faint)' }}
          />
          <Bar dataKey="value" radius={[0, 3, 3, 0]} isAnimationActive={false}>
            {sorted.map((_, i) => (
              <Cell key={i} fill={color} fillOpacity={1 - i * 0.07} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              style={{ fontSize: 11, fill: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
