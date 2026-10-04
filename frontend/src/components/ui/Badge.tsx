import React from "react";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "low" | "moderate" | "high" | "critical" | "info" | "gray" | "outline";
  size?: "sm" | "md";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "gray",
  size = "md",
  className = "",
}) => {
  const variants = {
    low: "bg-emerald-950/80 text-emerald-400 border border-emerald-800/60",
    moderate: "bg-amber-950/80 text-amber-400 border border-amber-800/60",
    high: "bg-orange-950/80 text-orange-400 border border-orange-800/60",
    critical: "bg-red-950/80 text-red-400 border border-red-800/60 animate-pulse",
    info: "bg-blue-950/80 text-blue-400 border border-blue-800/60",
    gray: "bg-slate-800 text-slate-300 border border-slate-700",
    outline: "bg-transparent text-slate-300 border border-slate-700",
  };

  const sizes = {
    sm: "text-[10px] px-1.5 py-0.5 font-medium tracking-wide",
    md: "text-xs px-2.5 py-1 font-medium",
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-md uppercase tracking-wider ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
};
