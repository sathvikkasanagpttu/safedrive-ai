"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { CabinVisualization } from "./CabinVisualization";
import {
  UserCheck,
  Eye,
  Smartphone,
  Compass,
  Cpu,
  Activity,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Car,
  Navigation,
} from "lucide-react";

interface TelemetryHUDProps {
  telemetry: any;
}

export const TelemetryHUD: React.FC<TelemetryHUDProps> = ({ telemetry }) => {
  const [activeTab, setActiveTab] = useState<"telematics" | "cockpit">("telematics");

  if (!telemetry) {
    return (
      <div className="bg-surface-card border border-border rounded-xl p-5 text-center text-slate-500 text-sm">
        Connecting to Driver Monitoring Engine...
      </div>
    );
  }

  const {
    driver,
    attention_state,
    drowsiness_state,
    phone_state,
    telemetry: cvTelemetry,
    system,
    attention_score = 85,
    contributing_factors = ["Head aligned with road axis", "Forward gaze cone maintained", "No active phone distraction"],
    vehicle_telemetry = {
      speed_kmh: 62.5,
      acceleration_mps2: 0.15,
      brake_pedal_pct: 0,
      hard_braking: false,
      gps_lat: 37.7749,
      gps_lng: -122.4194,
      heading_deg: 92.0,
    },
  } = telemetry;

  const getDrowsinessBadge = (state: string) => {
    switch (state) {
      case "CRITICAL_DROWSINESS":
      case "ALERTED":
      case "DROWSINESS":
        return <Badge variant="critical">{state.replace("_", " ")}</Badge>;
      case "CONFIRMED_DROWSINESS":
      case "SUSPECTED_DROWSINESS":
      case "POSSIBLE_DROWSINESS":
      case "EARLY_FATIGUE":
      case "EYES_CLOSING":
        return <Badge variant="moderate">{state.replace("_", " ")}</Badge>;
      default:
        return <Badge variant="low">{state === "EYES_OPEN" ? "NORMAL" : state}</Badge>;
    }
  };

  const getAttentionBadge = (state: string) => {
    if (state === "FOCUSED") return <Badge variant="low">FOCUSED</Badge>;
    if (state.includes("DISTRACTED")) return <Badge variant="high">{state.replace("_", " ")}</Badge>;
    if (state === "EYES_CLOSED") return <Badge variant="critical">EYES CLOSED</Badge>;
    return <Badge variant="gray">{state}</Badge>;
  };

  const getPhoneBadge = (state: string) => {
    if (state === "CONFIRMED_PHONE_USAGE") return <Badge variant="critical">CONFIRMED USAGE</Badge>;
    if (state === "POSSIBLE_PHONE_USAGE") return <Badge variant="high">POSSIBLE USAGE</Badge>;
    if (state === "PHONE_DETECTED") return <Badge variant="moderate">DETECTED</Badge>;
    return <Badge variant="low">NOT DETECTED</Badge>;
  };

  return (
    <div className="bg-surface-card border border-border rounded-xl p-5 space-y-4">
      {/* Driver Identity Card & Perspective Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/80 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <span>{driver?.name || "Unassigned"}</span>
              {driver?.code && (
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                  {driver.code}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>Identity Match:</span>
              <span className={`font-mono font-medium ${driver?.is_authorized ? "text-emerald-400" : "text-amber-400"}`}>
                {driver?.status || "Unknown"} ({Math.round((driver?.confidence || 0) * 100)}%)
              </span>
            </div>
          </div>
        </div>

        {/* View Mode Switch */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-lg border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("telematics")}
            className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
              activeTab === "telematics"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            2D Telematics
          </button>
          <button
            onClick={() => setActiveTab("cockpit")}
            className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
              activeTab === "cockpit"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            3D Cockpit
          </button>
        </div>
      </div>

      {activeTab === "cockpit" ? (
        <CabinVisualization telemetry={telemetry} />
      ) : (
        <>
          {/* Primary Behavioral States Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Attention State */}
            <div className="bg-surface p-3 rounded-lg border border-border/60">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
                <Compass className="w-3.5 h-3.5 text-blue-400" />
                <span>Attention State</span>
              </div>
              {getAttentionBadge(attention_state)}
            </div>

            {/* Drowsiness State */}
            <div className="bg-surface p-3 rounded-lg border border-border/60">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>Drowsiness State</span>
              </div>
              {getDrowsinessBadge(drowsiness_state)}
            </div>

            {/* Phone State */}
            <div className="bg-surface p-3 rounded-lg border border-border/60">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
                <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                <span>Phone Interaction</span>
              </div>
              {getPhoneBadge(phone_state)}
            </div>

            {/* Head Pose Orientation */}
            <div className="bg-surface p-3 rounded-lg border border-border/60">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Gaze Direction</span>
              </div>
              <span className="text-xs font-mono font-medium text-slate-200">
                {cvTelemetry?.head_pose?.direction?.replace(/_/g, " ") || "FOCUSED"}
              </span>
            </div>
          </div>

          {/* Attention Score & Explainability Checklist */}
          <div className="p-3.5 rounded-lg bg-surface border border-border/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-slate-200">Attention Intelligence Score</span>
              </div>
              <span className="text-xs font-mono font-bold text-blue-400">
                {attention_score.toFixed(0)} / 100
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  attention_score >= 80 ? "bg-emerald-500" : attention_score >= 50 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${Math.min(100, attention_score)}%` }}
              />
            </div>
            <div className="space-y-1 pt-1">
              {contributing_factors.map((factor: string, i: number) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-300 font-sans">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>{factor}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CAN-Bus Vehicle Telemetry HUD */}
          <div className="pt-2 border-t border-border/80">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
              CAN-Bus Vehicle Telematics (ECU Data)
            </span>
            <div className="grid grid-cols-4 gap-2 text-center font-mono">
              <div className="bg-surface/60 p-2 rounded border border-border/40">
                <span className="text-[10px] text-slate-400 block">Speed</span>
                <span className="text-xs font-bold text-slate-200">
                  {vehicle_telemetry.speed_kmh?.toFixed(1)} km/h
                </span>
              </div>
              <div className="bg-surface/60 p-2 rounded border border-border/40">
                <span className="text-[10px] text-slate-400 block">Accel</span>
                <span className="text-xs font-bold text-slate-200">
                  {vehicle_telemetry.acceleration_mps2 >= 0
                    ? `+${vehicle_telemetry.acceleration_mps2?.toFixed(2)}`
                    : vehicle_telemetry.acceleration_mps2?.toFixed(2)}
                </span>
              </div>
              <div className="bg-surface/60 p-2 rounded border border-border/40">
                <span className="text-[10px] text-slate-400 block">Braking</span>
                <span
                  className={`text-xs font-bold ${
                    vehicle_telemetry.hard_braking ? "text-red-400 animate-pulse" : "text-slate-300"
                  }`}
                >
                  {vehicle_telemetry.hard_braking ? "HARD" : "0%"}
                </span>
              </div>
              <div className="bg-surface/60 p-2 rounded border border-border/40">
                <span className="text-[10px] text-slate-400 block">Heading</span>
                <span className="text-xs font-bold text-slate-200">
                  {vehicle_telemetry.heading_deg?.toFixed(0)}°
                </span>
              </div>
            </div>
          </div>

          {/* Raw Computer Vision Signals */}
          <div className="pt-2 border-t border-border/80">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
              Computer Vision Landmark Telemetry
            </span>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-surface/60 p-2 rounded border border-border/40">
                <span className="text-[10px] text-slate-400 block">EAR (Eyes)</span>
                <span className="text-xs font-mono font-bold text-slate-200">
                  {cvTelemetry?.ear !== undefined ? cvTelemetry.ear.toFixed(3) : "--"}
                </span>
              </div>
              <div className="bg-surface/60 p-2 rounded border border-border/40">
                <span className="text-[10px] text-slate-400 block">MAR (Mouth)</span>
                <span className="text-xs font-mono font-bold text-slate-200">
                  {cvTelemetry?.mar !== undefined ? cvTelemetry.mar.toFixed(3) : "--"}
                </span>
              </div>
              <div className="bg-surface/60 p-2 rounded border border-border/40">
                <span className="text-[10px] text-slate-400 block">Pose (Yaw)</span>
                <span className="text-xs font-mono font-bold text-slate-200">
                  {cvTelemetry?.head_pose?.yaw !== undefined ? `${cvTelemetry.head_pose.yaw.toFixed(1)}°` : "--"}
                </span>
              </div>
            </div>
          </div>

          {/* Engine Performance Diagnostics */}
          <div className="flex items-center justify-between pt-2 border-t border-border/80 text-[11px] font-mono text-slate-400">
            <div className="flex items-center gap-1">
              <Cpu className="w-3 h-3 text-slate-400" />
              <span>Inference: <strong className="text-slate-300">{system?.latency_ms || 18} ms</strong></span>
            </div>
            <div>
              <span>Throughput: <strong className="text-slate-300">{system?.fps || 30.0} FPS</strong></span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
