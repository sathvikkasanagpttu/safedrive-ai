"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Video,
  Users,
  Car,
  Truck,
  AlertTriangle,
  BarChart3,
  FileText,
  Sliders,
  Shield,
  FileClock,
  ShieldCheck,
  Cpu,
  LockKeyhole,
} from "lucide-react";

const navigationItems = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Live Monitor", href: "/live-monitor", icon: Video, badge: "AI" },
  { name: "Fleet & Vehicles", href: "/fleet", icon: Truck, badge: "2.0" },
  { name: "Drivers", href: "/drivers", icon: Users },
  { name: "Sessions", href: "/sessions", icon: Car },
  { name: "Safety Events", href: "/events", icon: AlertTriangle },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Safety Reports", href: "/reports", icon: FileText },
  { name: "MLOps Models", href: "/mlops", icon: Cpu, badge: "AI" },
  { name: "Privacy Center", href: "/privacy", icon: LockKeyhole, badge: "GDPR" },
  { name: "AI Thresholds", href: "/settings", icon: Sliders },
  { name: "Admin Portal", href: "/admin", icon: Shield },
  { name: "Audit Trail", href: "/audit-logs", icon: FileClock },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-surface border-r border-border flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-border/80 gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-slate-100 tracking-tight text-base flex items-center gap-1.5">
            SafeDrive <span className="text-blue-500 text-xs font-mono font-semibold px-1 py-0.5 bg-blue-500/10 rounded border border-blue-500/20">AI</span>
          </span>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Driver Monitoring</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider uppercase text-slate-400">
          Operations
        </div>
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? "text-blue-400" : "text-slate-400"}`} />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Compliance / Disclaimer Footer */}
      <div className="p-4 border-t border-border/80 bg-surface/50 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 font-semibold text-slate-300 mb-1">
          <Shield className="w-3.5 h-3.5 text-blue-400" />
          <span>Research Prototype</span>
        </div>
        <p className="leading-tight text-slate-400">
          Portfolio prototype. Not certified under ISO 26262 functional automotive safety standard.
        </p>
      </div>
    </aside>
  );
};
