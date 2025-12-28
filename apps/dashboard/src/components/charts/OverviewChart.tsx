import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

export interface OverviewPoint {
  label: string;
  linesObserved: number;
  modulesGenerated: number;
}

interface OverviewChartProps {
  data: OverviewPoint[];
}

const tooltipStyle: React.CSSProperties = {
  backgroundColor: "#020617",
  border: "1px solid #1f2937",
  borderRadius: 12,
  padding: 8,
  fontSize: 12,
  color: "#e5e7eb"
};

export const OverviewChart: React.FC<OverviewChartProps> = ({ data }) => {
  return (
    <div className="chart-shell" style={{ height: 220 }}>
      <div className="section-header" style={{ marginBottom: 6 }}>
        <div className="section-title">Throughput</div>
        <div className="section-subtitle">Lines observed vs. modules generated</div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, bottom: 0, left: -20, right: 0 }}>
          <defs>
            <linearGradient id="lines" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="modules" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#6b7280", fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#6b7280", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ color: "#9ca3af", marginBottom: 4 }}
          />
          <Area
            type="monotone"
            dataKey="linesObserved"
            name="Lines observed"
            stroke="#22c55e"
            strokeWidth={1.6}
            fill="url(#lines)"
          />
          <Area
            type="monotone"
            dataKey="modulesGenerated"
            name="Modules generated"
            stroke="#38bdf8"
            strokeWidth={1.2}
            fill="url(#modules)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
