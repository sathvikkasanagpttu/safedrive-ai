import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-border/80">
    <div>
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">{title}</h1>
      {description && <p className="text-xs sm:text-sm text-slate-400 mt-1">{description}</p>}
    </div>
    {action && <div className="flex items-center gap-2">{action}</div>}
  </div>
);
