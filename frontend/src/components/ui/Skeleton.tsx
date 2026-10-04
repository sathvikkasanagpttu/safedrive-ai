import React from "react";

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = "", ...props }) => (
  <div className={`animate-pulse rounded-md bg-slate-800/80 ${className}`} {...props} />
);
