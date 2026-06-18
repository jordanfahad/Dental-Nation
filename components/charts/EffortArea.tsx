"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Lane E accent (#1F3A5F) — single structural accent, matched across both tabs.
const ACCENT = "#1F3A5F";

export function EffortArea({ data }: { data: { date: string; hours: number }[] }) {
  return (
    <div className="h-[210px] w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="effortFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity={0.18} />
              <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E6E6E6" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#71717A" }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis tick={{ fontSize: 11, fill: "#71717A" }} axisLine={false} tickLine={false} width={36} />
          <Tooltip
            formatter={(value) => [`${value} hrs`, "Effort"]}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #E6E6E6",
              fontSize: 12,
              boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
            }}
          />
          <Area
            type="monotone"
            dataKey="hours"
            stroke={ACCENT}
            strokeWidth={2}
            fill="url(#effortFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
