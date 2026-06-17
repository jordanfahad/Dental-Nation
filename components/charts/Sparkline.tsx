'use client';

import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';

/** Minimal trend-vs-7-day sparkline for the §A KPI strip. No axes, no chrome. */
export function Sparkline({
  data,
  tone = 'accent',
  height = 28,
}: {
  data: number[];
  tone?: 'accent' | 'good' | 'stop' | 'watch';
  height?: number;
}) {
  const color =
    tone === 'good'
      ? 'var(--good)'
      : tone === 'stop'
        ? 'var(--stop)'
        : tone === 'watch'
          ? 'var(--watch)'
          : 'var(--accent-400)';
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 3, right: 2, bottom: 3, left: 2 }}>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.75}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
