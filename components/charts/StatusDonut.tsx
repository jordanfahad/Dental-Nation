"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export function StatusDonut({
  data,
}: {
  data: { label: string; count: number; hex: string }[];
}) {
  const total = data.reduce((a, d) => a + d.count, 0);
  if (total === 0) {
    return <p className="py-6 text-center text-sm text-ink-3">No projects yet</p>;
  }
  return (
    <div className="flex items-center gap-6">
      <div className="relative h-[150px] w-[150px] shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.label} fill={d.hex} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="tnum text-2xl font-semibold text-ink">{total}</span>
          <span className="text-[10px] uppercase tracking-wide text-ink-3">projects</span>
        </div>
      </div>
      <ul className="space-y-1.5">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.hex }} />
            <span className="text-ink-2">{d.label}</span>
            <span className="tnum ml-3 font-medium text-ink">{d.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
