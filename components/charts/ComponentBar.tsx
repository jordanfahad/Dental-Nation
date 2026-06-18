"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ComponentBar({
  data,
  unit = "",
}: {
  data: { name: string; value: number; hue: string }[];
  unit?: string;
}) {
  return (
    <div className="h-[210px] w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 24, top: 4, bottom: 4 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={128}
            tick={{ fontSize: 12, fill: "#3F3F46" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "#F4F4F6" }}
            formatter={(value) => [`${value}${unit ? " " + unit : ""}`, ""]}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #E6E6E6",
              fontSize: 12,
              boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={15} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.hue} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
