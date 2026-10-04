"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Bell, LogOut, Radio, Volume2, VolumeX, ShieldAlert, Sparkles } from "lucide-react";

interface TopNavProps {
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onOpenCopilot?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ soundEnabled = true, onToggleSound, onOpenCopilot }) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-surface/90 backdrop-blur-md border-b border-border px-6 flex items-center justify-between z-20 sticky top-0">
      {/* Left: System Status & Live Indicators */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-800/80 text-emerald-400 text-xs font-mono font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="w-2 h-2 rounded-full bg-emerald-500 -ml-4" />
          <span>SYSTEM LIVE</span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-950/60 border border-blue-800/60 text-blue-400 text-xs font-mono">
          <Radio className="w-3.5 h-3.5" />
          <span>CV PIPELINE ACTIVE</span>
        </div>

        {/* AI Safety Copilot Button */}
        {onOpenCopilot && (
          <button
            onClick={onOpenCopilot}
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border border-indigo-500/40 text-indigo-300 hover:text-white hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-500/20 transition-all text-xs font-medium cursor-pointer"
            title="Ask AI Safety Copilot"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span className="hidden md:inline">Safety Copilot</span>
            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-indigo-500/30 text-indigo-200">2.0</span>
          </button>
        )}
      </div>

      {/* Right: Sound toggle, Notifications, User profile & Logout */}
      <div className="flex items-center gap-3">
        {onToggleSound && (
          <button
            onClick={onToggleSound}
            title={soundEnabled ? "Mute Safety Alert Audio" : "Enable Safety Alert Audio"}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/70 border border-transparent hover:border-slate-700 transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-blue-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
        )}

        <Link
          href="/events"
          className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/70 border border-transparent hover:border-slate-700 transition-colors relative"
          title="Safety Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full" />
        </Link>

        {/* User Card */}
        {user ? (
          <div className="flex items-center gap-3 pl-3 border-l border-border/80">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-medium text-slate-200">{user.full_name}</div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">{user.role.replace("_", " ")}</div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 border border-transparent hover:border-red-900/50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
};
