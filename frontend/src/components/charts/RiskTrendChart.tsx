"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

interface RiskTrendChartProps {
  data: Array<{ timestamp: string; risk_score: number }>;
  height?: number;
}

export const RiskTrendChart: React.FC<RiskTrendChartProps> = ({ data, height = 260 }) => {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="timestamp"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "#334155" }}
          />
          <YAxis
            domain={[0, 100]}
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "#334155" }}
            ticks={[0, 30, 60, 80, 100]}
          />
          <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "Warning (60)", fill: "#f59e0b", fontSize: 10 }} />
          <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "Critical (80)", fill: "#ef4444", fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              borderColor: "#334155",
              borderRadius: "8px",
              color: "#f8fafc",
              fontSize: "12px",
              fontFamily: "JetBrains Mono, monospace"
            }}
            formatter={(value: any) => [`${value} / 100`, "Risk Score"]}
          />
          <Area
            type="monotone"
            dataKey="risk_score"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#riskGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
