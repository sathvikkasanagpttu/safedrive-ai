"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { ShieldCheck, Lock, Mail, AlertCircle, Sparkles } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@safedrive.ai");
  const [password, setPassword] = useState("Admin@123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-surface-card border border-border rounded-2xl p-8 shadow-2xl">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30 mb-3">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100">SafeDrive AI Safety Portal</h2>
          <p className="text-xs text-slate-400 mt-1">Autonomous Driver Monitoring & Fleet Risk Analytics</p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-950/70 border border-red-800 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Corporate Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@safedrive.ai"
                className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <Button type="submit" className="w-full mt-2" loading={loading}>
            Sign In to Dashboard
          </Button>
        </form>

        {/* Quick Demo Credentials */}
        <div className="mt-6 pt-5 border-t border-border/80">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 uppercase tracking-wider mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>One-Click Role Profiles</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill("admin@safedrive.ai", "Admin@123")}
              className="px-2 py-1.5 rounded-lg bg-surface border border-border hover:border-blue-500/50 text-[11px] font-medium text-slate-300 hover:text-white transition-colors"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill("safety@safedrive.ai", "Safety@123")}
              className="px-2 py-1.5 rounded-lg bg-surface border border-border hover:border-blue-500/50 text-[11px] font-medium text-slate-300 hover:text-white transition-colors"
            >
              Safety Officer
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill("fleet@safedrive.ai", "Fleet@123")}
              className="px-2 py-1.5 rounded-lg bg-surface border border-border hover:border-blue-500/50 text-[11px] font-medium text-slate-300 hover:text-white transition-colors"
            >
              Fleet Manager
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          Need operator credentials?{" "}
          <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium">
            Register new account
          </Link>
        </div>
      </div>
    </div>
  );
}
