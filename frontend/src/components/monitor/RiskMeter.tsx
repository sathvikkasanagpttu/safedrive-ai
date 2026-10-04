"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";
import { AlertCircle } from "lucide-react";

interface RiskMeterProps {
  score: number;
  category: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | string;
  contributors?: Array<{
    type: string;
    weight: number;
    contribution_points: number;
  }>;
}

export const RiskMeter: React.FC<RiskMeterProps> = ({ score, category, contributors = [] }) => {
  const getCategoryColor = () => {
    switch (category.toUpperCase()) {
      case "CRITICAL":
        return { text: "text-red-500", stroke: "#ef4444", bg: "bg-red-500/10", border: "border-red-500/30" };
      case "HIGH":
        return { text: "text-orange-500", stroke: "#f97316", bg: "bg-orange-500/10", border: "border-orange-500/30" };
      case "MODERATE":
        return { text: "text-amber-400", stroke: "#f59e0b", bg: "bg-amber-500/10", border: "border-amber-500/30" };
      default:
        return { text: "text-emerald-400", stroke: "#10b981", bg: "bg-emerald-500/10", border: "border-emerald-500/30" };
    }
  };

  const colors = getCategoryColor();
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  return (
    <div className="bg-surface-card border border-border rounded-xl p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Fused Safety Risk Index</span>
          <h4 className="text-sm font-semibold text-slate-200">Real-Time Risk Score</h4>
        </div>
        <Badge
          variant={
            category.toLowerCase() === "critical"
              ? "critical"
              : category.toLowerCase() === "high"
              ? "high"
              : category.toLowerCase() === "moderate"
              ? "moderate"
              : "low"
          }
        >
          {category}
        </Badge>
      </div>

      {/* Circular Gauge */}
      <div className="flex flex-col items-center justify-center my-3">
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
            {/* Background ring */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="#1e293b"
              strokeWidth="12"
              fill="transparent"
            />
            {/* Progress ring */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke={colors.stroke}
              strokeWidth="12"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-300 ease-out"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className={`text-4xl font-mono font-bold tracking-tight ${colors.text}`}>
              {Math.round(score)}
            </span>
            <span className="text-[11px] font-mono text-slate-400">/ 100</span>
          </div>
        </div>
      </div>

      {/* Mathematical Contributor Breakdown */}
      <div className="mt-4 pt-4 border-t border-border/80">
        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-2 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-slate-400" /> Signal Contributors
        </span>
        {contributors.length > 0 ? (
          <div className="space-y-1.5">
            {contributors.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-slate-300 capitalize">
                  {c.type.replace(/_/g, " ")}
                </span>
                <span className="font-mono text-slate-400">
                  +{c.contribution_points.toFixed(1)} pts ({Math.round(c.weight * 100)}%)
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">Nominal baseline. No hazardous signals active.</p>
        )}
      </div>
    </div>
  );
};
