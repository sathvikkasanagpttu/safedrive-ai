import React from "react";
import { LucideIcon, Inbox } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionText,
  onAction,
}) => (
  <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border rounded-xl bg-surface/30">
    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
      <Icon className="w-6 h-6" />
    </div>
    <h4 className="text-base font-semibold text-slate-200 mb-1">{title}</h4>
    <p className="text-xs text-slate-400 max-w-sm mb-5">{description}</p>
    {actionText && onAction && (
      <Button size="sm" onClick={onAction}>
        {actionText}
      </Button>
    )}
  </div>
);
