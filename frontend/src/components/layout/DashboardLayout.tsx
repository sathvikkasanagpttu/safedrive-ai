"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { useAudioAlert } from "@/hooks/useAudioAlert";
import { CopilotDrawer } from "@/components/copilot/CopilotDrawer";
import { Sparkles } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { soundEnabled, setSoundEnabled } = useAudioAlert();
  const [copilotOpen, setCopilotOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-slate-100 relative">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          onOpenCopilot={() => setCopilotOpen(true)}
        />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Floating Copilot Quick Action */}
      <button
        onClick={() => setCopilotOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-xs shadow-xl shadow-indigo-600/30 border border-indigo-400/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
        title="Open SafeDrive 2.0 AI Safety Copilot"
      >
        <Sparkles className="w-4 h-4 text-indigo-200" />
        <span className="font-semibold tracking-wide">AI Copilot</span>
        <span className="bg-white/20 text-[10px] px-1.5 py-0.5 rounded-full font-mono">2.0</span>
      </button>

      {/* Global AI Safety Copilot Drawer */}
      <CopilotDrawer
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
      />
    </div>
  );
};
